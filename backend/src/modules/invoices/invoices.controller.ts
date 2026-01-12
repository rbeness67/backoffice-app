// backend/src/modules/invoices/invoices.controller.ts
import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { InvoiceStructure } from "@prisma/client";

/**
 * Génère le prochain numéro de facture pour l'année en cours :
 * Format: JEL-YY-XXX (ex: JEL-26-001)
 */
async function getNextInvoiceNumberForCurrentYear(tx: typeof prisma) {
  const year = new Date().getFullYear();
  const yy = String(year).slice(-2);
  const prefix = `JEL-${yy}-`;

  const last = await tx.invoice.findFirst({
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
