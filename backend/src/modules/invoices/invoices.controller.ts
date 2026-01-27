// backend/src/modules/invoices/invoices.controller.ts
import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { InvoiceStructure, Prisma, PrismaClient } from "@prisma/client";
import archiver from "archiver";
import { getS3ObjectStream } from "../../lib/s3";

/**
 * Prisma client utilisable en dehors ou à l'intérieur d'une transaction
 */
type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Helpers (monthKey + safe filenames)
 */
function monthKeyToRange(monthKey: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) {
    throw new Error("Invalid monthKey. Expected format YYYY-MM (e.g. 2026-01)");
  }
  const year = Number(m[1]);
  const month = Number(m[2]); // 01..12
  if (month < 1 || month > 12) {
    throw new Error("Invalid month in monthKey. Expected 01..12");
  }

  // Use UTC to avoid timezone off-by-one
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { start, end };
}

function safeName(name: string) {
  return (name || "file").replace(/[\\/:*?"<>|]+/g, "-").trim();
}

/**
 * Génère le prochain numéro de facture pour l'année en cours :
 * Format: JEL-YY-XXX (ex: JEL-26-001)
 */
async function getNextInvoiceNumberForCurrentYear(db: DbClient) {
  const year = new Date().getFullYear();
  const yy = String(year).slice(-2);
  const prefix = `JEL-${yy}-`;

  const last = await db.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  let next = 1;
  if (last?.invoiceNumber) {
    const parts = last.invoiceNumber.split("-");
    const lastSeq = Number(parts[2]); // "001" -> 1
    if (Number.isFinite(lastSeq)) next = lastSeq + 1;
  }

  const seq = String(next).padStart(3, "0");
  return `${prefix}${seq}`;
}

/**
 * GET /invoices
 * Pagination basique + include supplier/documents
 */
export async function listInvoices(req: Request, res: Response) {
  const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
  const pageSize = Math.min(
    Math.max(parseInt(String(req.query.pageSize ?? "20"), 10), 1),
    100
  );
  const skip = (page - 1) * pageSize;

  const [total, items] = await Promise.all([
    prisma.invoice.count(),
    prisma.invoice.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: true,
        documents: { select: { id: true, type: true, url: true } },
      },
    }),
  ]);

  res.json({
    page,
    pageSize,
    total,
    items: items.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      supplierName: inv.supplier?.name ?? null,
      invoiceDate: inv.invoiceDate,
      amountTTC: inv.amountTTC,
      structure: inv.structure,
      documentsCount: inv.documents.length,
      documents: inv.documents.map((d) => ({ id: d.id, type: d.type })),
      createdAt: inv.createdAt,
    })),
  });
}

export async function getInvoiceDocuments(req: Request, res: Response) {
  const { id } = req.params;

  const inv = await prisma.invoice.findUnique({
    where: { id },
    select: { id: true, invoiceNumber: true, documents: true },
  });

  if (!inv) return res.status(404).json({ message: "Not found" });

  return res.json({
    invoiceId: inv.id,
    invoiceNumber: inv.invoiceNumber,
    documentsCount: inv.documents.length,
    documents: inv.documents,
  });
}

/**
 * GET /invoices/next-number
 */
export async function getNextInvoiceNumber(req: Request, res: Response) {
  const nextNumber = await getNextInvoiceNumberForCurrentYear(prisma);
  return res.json({ nextNumber });
}

/**
 * POST /invoices
 * - invoiceNumber généré automatiquement
 * - supplier: soit supplierId, soit supplierName (create-if-not-exists)
 * - documents: [{ url: <s3-key>, type: "PDF"|"IMAGE" }]
 * - structure: "STRUCTURE_1" | "STRUCTURE_2"
 *
 * NOTE: on accepte temporairement invoiceStructure côté front (transition)
 */
export async function createInvoice(req: Request, res: Response) {
  const {
    supplierId,
    supplierName,
    invoiceDate,
    amountTTC,
    structure,
    invoiceStructure,
    documents,
  } = req.body ?? {};

  const finalStructure = (structure ?? invoiceStructure) as InvoiceStructure | undefined;

  if (
    !invoiceDate ||
    amountTTC === undefined ||
    !finalStructure ||
    (!supplierId && !supplierName)
  ) {
    console.log("POST /invoices body =", req.body);
    return res.status(400).json({ message: "Missing required fields" });
  }

  // validate amount
  const ttc = Number(amountTTC);
  if (!Number.isFinite(ttc) || ttc <= 0) {
    return res.status(400).json({ message: "Invalid amountTTC" });
  }

  // validate structure (enum)
  if (!Object.values(InvoiceStructure).includes(finalStructure)) {
    return res.status(400).json({ message: "Invalid structure" });
  }

  const docs = Array.isArray(documents) ? documents : [];
  if (docs.length < 1) {
    return res.status(400).json({ message: "At least one document is required" });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      // 1) supplier (existing or create)
      let finalSupplierId: string | undefined = supplierId;

      if (!finalSupplierId) {
        const name = String(supplierName).trim();
        if (!name) return Promise.reject(new Error("Invalid supplierName"));

        const existing = await tx.supplier.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
          select: { id: true },
        });

        finalSupplierId =
          existing?.id ??
          (await tx.supplier.create({ data: { name }, select: { id: true } })).id;
      }

      // 2) invoice number auto
      const invoiceNumber = await getNextInvoiceNumberForCurrentYear(tx);

      // 3) create invoice + documents
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          supplierId: finalSupplierId!,
          invoiceDate: new Date(invoiceDate),
          amountTTC: ttc,
          structure: finalStructure,
          documents: {
            create: docs.map((d: any) => ({
              url: String(d.url),
              type: String(d.type), // PDF | IMAGE
            })),
          },
        },
        include: { supplier: true, documents: true },
      });

      return invoice;
    });

    return res.status(201).json({
      id: created.id,
      invoiceNumber: created.invoiceNumber,
      supplierName: created.supplier?.name ?? null,
      invoiceDate: created.invoiceDate,
      amountTTC: created.amountTTC,
      structure: created.structure,
      documentsCount: created.documents.length,
      documents: created.documents.map((d) => ({ id: d.id, type: d.type })),
      createdAt: created.createdAt,
    });
  } catch (e: any) {
    console.error(e);
    if (e?.code === "P2002") {
      return res.status(409).json({ message: "Invoice number conflict, retry" });
    }
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * PATCH /invoices/:id
 * Edit des champs principaux (pas de gestion docs ici)
 * - structure peut être modifiée
 *
 * NOTE: on accepte temporairement invoiceStructure côté front (transition)
 */
export async function updateInvoice(req: Request, res: Response) {
  const { id } = req.params;

  const {
    supplierId,
    supplierName,
    invoiceDate,
    amountTTC,
    structure,
    invoiceStructure,
  } = req.body ?? {};

  const finalStructure = (structure ?? invoiceStructure) as InvoiceStructure | undefined;

  // validate structure if provided
  if (
    finalStructure !== undefined &&
    !Object.values(InvoiceStructure).includes(finalStructure)
  ) {
    return res.status(400).json({ message: "Invalid structure" });
  }

  // validate amount if provided
  if (amountTTC !== undefined) {
    const ttc = Number(amountTTC);
    if (!Number.isFinite(ttc) || ttc <= 0) {
      return res.status(400).json({ message: "Invalid amountTTC" });
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      let finalSupplierId: string | undefined = supplierId;

      if (!finalSupplierId && supplierName !== undefined) {
        const name = String(supplierName).trim();
        if (!name) return Promise.reject(new Error("Invalid supplierName"));

        const existing = await tx.supplier.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
          select: { id: true },
        });

        finalSupplierId =
          existing?.id ??
          (await tx.supplier.create({ data: { name }, select: { id: true } })).id;
      }

      const inv = await tx.invoice.update({
        where: { id },
        data: {
          supplierId: finalSupplierId,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
          amountTTC: amountTTC !== undefined ? Number(amountTTC) : undefined,
          structure: finalStructure !== undefined ? finalStructure : undefined,
        },
        include: { supplier: true, documents: true },
      });

      return inv;
    });

    return res.json({
      id: updated.id,
      invoiceNumber: updated.invoiceNumber,
      supplierName: updated.supplier?.name ?? null,
      invoiceDate: updated.invoiceDate,
      amountTTC: updated.amountTTC,
      structure: updated.structure,
      documentsCount: updated.documents.length,
      documents: updated.documents.map((d) => ({ id: d.id, type: d.type })),
      createdAt: updated.createdAt,
    });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * DELETE /invoices/:id
 * Supprime d'abord les Document rows (pas les fichiers S3 pour l'instant)
 */
export async function deleteInvoice(req: Request, res: Response) {
  const { id } = req.params;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.document.deleteMany({ where: { invoiceId: id } });
      await tx.invoice.delete({ where: { id } });
    });

    return res.status(204).send();
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
}


function monthKeyToFrenchTitle(monthKey: string) {
  const { start } = monthKeyToRange(monthKey);
  // "janvier 2026"
  const s = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(start);
  // "Janvier 2026"
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function structureToFolderName(structure: string) {
  // ⚠️ adapte si tu as d'autres valeurs d'enum
  if (structure === "STRUCTURE_1") return "Cocci'Bulles";
  if (structure === "STRUCTURE_2") return "Milles et une Bulles";
  return structure;
}



/**
 * GET /invoices/month/:monthKey/documents.zip
 * Télécharge un ZIP contenant tous les documents de toutes les factures du mois.
 *
 * monthKey format: YYYY-MM (ex: 2026-01)
 *
 * ZIP structure:
 *   SupplierName/InvoiceNumber/<docIndex>-<docType>.<ext>
 */
export async function downloadMonthDocumentsZip(req: Request, res: Response) {
  try {
    const { monthKey } = req.params;
    const { start, end } = monthKeyToRange(monthKey);

    const invoices = await prisma.invoice.findMany({
      where: {
        invoiceDate: { gte: start, lt: end },
      },
      include: {
        supplier: true,
        documents: { select: { id: true, type: true, url: true } },
      },
      orderBy: { invoiceDate: "asc" },
    });

    if (!invoices.length) {
      return res.status(404).json({ message: "Aucune facture pour ce mois." });
    }

    // Collect docs entries
    const docEntries: Array<{
      supplierName: string;
      invoiceNumber: string;
      structure: string;   // ✅ add
      docId: string;
      docType: string;
      s3Key: string;
      docIndex: number;
    }> = [];

    for (const inv of invoices) {
      const supplierName = inv.supplier?.name ?? "Fournisseur";
      const invoiceNumber = inv.invoiceNumber ?? String(inv.id);

      inv.documents.forEach((d, idx) => {
        if (!d?.url) return; // url = S3 key in your app
        docEntries.push({
          supplierName,
          invoiceNumber,
          structure:String(inv.structure??"STRUCTURE"),
          docId: d.id,
          docType: String(d.type ?? "DOC"),
          s3Key: String(d.url),
          docIndex: idx + 1,
        });
      });
    }

    if (!docEntries.length) {
      return res.status(404).json({ message: "Aucun document à télécharger pour ce mois." });
    }

    // Stream ZIP
    res.status(200);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName(`factures-${monthKey}`)}.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("warning", (err) => {
      console.warn("ZIP warning:", err);
    });

    archive.on("error", (err) => {
      console.error("ZIP error:", err);
      if (!res.headersSent) res.status(500);
      res.end();
    });

    archive.pipe(res);

    const monthFolder = safeName(monthKeyToFrenchTitle(monthKey));

    for (const e of docEntries) {
      try {
        const stream = await getS3ObjectStream(e.s3Key);

        const structureFolder = safeName(structureToFolderName(String(e.structure)));
        const supplierFolder = safeName(e.supplierName);

        const ext =
          e.docType.toUpperCase() === "PDF" ? "pdf" :
          e.docType.toUpperCase() === "IMAGE" ? "jpg" :
          "bin";

        const fileName = `${String(e.docIndex).padStart(2, "0")}-${safeName(e.docType)}.${ext}`;

        // ✅ Final structure:
        // "Janvier 2026/Nom_De_La_Structure/Nom_Du_Fournisseur/Fichier"
        const zipPath = `${monthFolder}/${structureFolder}/${supplierFolder}/${fileName}`;

        archive.append(stream, { name: zipPath });
      } catch (err: any) {
        archive.append(
          `Failed to add docId=${e.docId}\n${String(err?.message ?? err)}\n`,
          { name: `__FAILED__/${safeName(e.invoiceNumber)}-${safeName(e.docId)}.txt` }
        );
      }
    }


    await archive.finalize();
  } catch (e: any) {
    console.error(e);
    return res.status(400).json({ message: e?.message ?? "Erreur génération ZIP" });
  }
}
