import { Request, Response } from "express";
import prisma from "../../prisma/client";

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
      createdAt: inv.createdAt,
    })),
  });
}
