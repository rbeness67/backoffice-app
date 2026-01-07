export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  supplierName: string | null;
  invoiceDate: string;
  dueDate: string;
  amountTTC: number;
  status: string;
  documentsCount: number;
  createdAt: string;
};

export async function getInvoices(page = 1, pageSize = 20) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing token");

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/invoices?page=${page}&pageSize=${pageSize}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Failed to fetch invoices");
  }

  return res.json() as Promise<{
    page: number;
    pageSize: number;
    total: number;
    items: InvoiceRow[];
  }>;
}
