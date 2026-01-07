// frontend/src/api/invoices.ts
export type InvoiceDocRef = { id: string; type: "PDF" | "IMAGE" | string };

export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  supplierName: string | null;
  invoiceDate: string;
  dueDate: string;
  amountTTC: number;
  status: string;
  documentsCount: number;
  documents?: InvoiceDocRef[]; // ✅
  createdAt: string;
};

export type InvoiceDocumentInput = {
  url: string; // S3 key (ex: invoices/uploads/uuid.pdf)
  type: "PDF" | "IMAGE";
};

export type CreateInvoiceInput = {
  // supplier: either existing id OR new name
  supplierId?: string;
  supplierName?: string;

  invoiceDate: string; // YYYY-MM-DD
  dueDate: string;     // YYYY-MM-DD

  amountHT: number;
  amountTVA: number;
  amountTTC: number;

  status: string; // "PAID" | "PENDING" | "OVERDUE"

  // at least one document
  documents: InvoiceDocumentInput[];
};

function getAuthHeaders(extra?: Record<string, string>) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing token");
  return {
    Authorization: `Bearer ${token}`,
    ...(extra ?? {}),
  };
}

export async function getInvoices(page = 1, pageSize = 20) {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/invoices?page=${page}&pageSize=${pageSize}`,
    { headers: getAuthHeaders() }
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

export async function getNextInvoiceNumber() {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/invoices/next-number`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Failed to fetch next invoice number");
  }

  return res.json() as Promise<{ nextNumber: string }>;
}

export async function createInvoice(input: CreateInvoiceInput) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/invoices`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to create invoice");

  return JSON.parse(text) as InvoiceRow;
}

export async function deleteInvoice(id: string) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/invoices/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function updateInvoice(id: string, input: Partial<CreateInvoiceInput>) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/invoices/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to update invoice");
  return JSON.parse(text) as InvoiceRow;
}