import { Request, Response } from "express";
import prisma from "../../prisma/client";

async function getNextInvoiceNumberForCurrentYear(prisma: any) {
  const year = new Date().getFullYear(); // année en cours
  const yy = String(year).slice(-2); // "24"
  const prefix = `JEL-${yy}-`;

  const last = await prisma.invoice.findFirst({
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


export async function listInvoices(req: Request, res: Response) {
  const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
  const pageSize = Math.min(Math.max(parseInt(String(req.query.pageSize ?? "20"), 10), 1), 100);

  const skip = (page - 1) * pageSize;

  const [total, items] = await Promise.all([
    prisma.invoice.count(),
    prisma.invoice.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: true,
        documents: true,
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
  dueDate: inv.dueDate,
  amountTTC: inv.amountTTC,
  status: inv.status,
  documentsCount: inv.documents.length,
  documents: inv.documents.map((d) => ({ id: d.id, type: d.type })), // ✅
  createdAt: inv.createdAt,
})),

  });
}

export async function createInvoice(req: Request, res: Response) {
  const {
    supplierId,
    supplierName,
    invoiceDate,
    dueDate,
    amountHT,
    amountTVA,
    amountTTC,
    status,
    documents,
  } = req.body ?? {};

  if (
    !invoiceDate ||
    !dueDate ||
    amountHT === undefined ||
    amountTVA === undefined ||
    amountTTC === undefined ||
    !status ||
    (!supplierId && !supplierName)
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      // 1) supplier: use existing or create-if-not-exists
      let finalSupplierId = supplierId as string | undefined;

      if (!finalSupplierId) {
        const name = String(supplierName).trim();
        if (!name) throw new Error("Supplier name is required");

        const existing = await tx.supplier.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
          select: { id: true },
        });

        if (existing) {
          finalSupplierId = existing.id;
        } else {
          const createdSupplier = await tx.supplier.create({
            data: { name },
            select: { id: true },
          });
          const docs = Array.isArray(documents) ? documents : [];
        if (docs.length) {
            await tx.document.createMany({
                data: docs.map((d: any) => ({
                invoiceId: invoice.id,
                url: String(d.url),   // la "key" S3
                type: String(d.type), // "PDF" / "IMAGE"
                })),
            });
    }
          finalSupplierId = createdSupplier.id;
        }
      }

      // 2) invoice number auto for current year
      // (simple approach + unique constraint on invoiceNumber)
      const invoiceNumber = await getNextInvoiceNumberForCurrentYear(tx);

      // 3) create invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          supplierId: finalSupplierId!,
          invoiceDate: new Date(invoiceDate),
          dueDate: new Date(dueDate),
          amountHT: Number(amountHT),
          amountTVA: Number(amountTVA),
          amountTTC: Number(amountTTC),
          status,
        },
        include: { supplier: true, documents: true },
      });

      return invoice;
    });

    return res.status(201).json({
      id: created.id,
      invoiceNumber: created.invoiceNumber,
      supplierName: created.supplier.name,
      invoiceDate: created.invoiceDate,
      dueDate: created.dueDate,
      amountTTC: created.amountTTC,
      status: created.status,
      documentsCount: created.documents.length,
      createdAt: created.createdAt,
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      // collision invoiceNumber (rare). Tu peux relancer une 2ème fois si tu veux.
      return res.status(409).json({ message: "Invoice number conflict, retry" });
    }
    return res.status(500).json({ message: "Server error" });
  }
}


export async function getNextInvoiceNumber(req: Request, res: Response) {
  const nextNumber = await getNextInvoiceNumberForCurrentYear(prisma);
  return res.json({ nextNumber });
}
export async function deleteInvoice(req: Request, res: Response) {
  const { id } = req.params;

  await prisma.$transaction(async (tx) => {
    await tx.document.deleteMany({ where: { invoiceId: id } });
    await tx.invoice.delete({ where: { id } });
  });

  return res.status(204).send();
}

export async function updateInvoice(req: Request, res: Response) {
  const { id } = req.params;

  const {
    supplierId,
    supplierName,
    invoiceDate,
    dueDate,
    amountHT,
    amountTVA,
    amountTTC,
    status,
  } = req.body ?? {};

  const updated = await prisma.$transaction(async (tx) => {
    let finalSupplierId: string | undefined = supplierId;

    if (!finalSupplierId && supplierName) {
      const name = String(supplierName).trim();
      const existing = await tx.supplier.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
        select: { id: true },
      });
      finalSupplierId = existing?.id ?? (await tx.supplier.create({ data: { name }, select: { id: true } })).id;
    }

    const inv = await tx.invoice.update({
      where: { id },
      data: {
        supplierId: finalSupplierId,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        amountHT: amountHT !== undefined ? Number(amountHT) : undefined,
        amountTVA: amountTVA !== undefined ? Number(amountTVA) : undefined,
        amountTTC: amountTTC !== undefined ? Number(amountTTC) : undefined,
        status: status ?? undefined,
      },
      include: { supplier: true, documents: true },
    });

    return inv;
  });

  return res.json({
    id: updated.id,
    invoiceNumber: updated.invoiceNumber,
    supplierName: updated.supplier.name,
    invoiceDate: updated.invoiceDate,
    dueDate: updated.dueDate,
    amountTTC: updated.amountTTC,
    status: updated.status,
    documentsCount: updated.documents.length,
    documents: updated.documents.map((d) => ({ id: d.id, type: d.type })),
    createdAt: updated.createdAt,
  });
}
