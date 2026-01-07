import { Request, Response } from "express";
import prisma from "../../prisma/client";

export async function listSuppliers(req: Request, res: Response) {
  const items = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  res.json({ items });
}
