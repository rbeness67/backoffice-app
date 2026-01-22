import { apiFetch } from "@/api/http";

export async function presignUpload(args: {
  filename: string;
  mimeType: string;
  invoiceDate: string; // YYYY-MM-DD
  supplierName: string;
  invoiceNumber: string; // ex: JEL-26-001
  structure: string; // ex: STRUCTURE_1
  fileIndex?: number; // 1-based (optional)
}) {
  return apiFetch<{ uploadUrl: string; key: string }>(`/uploads/presign`, {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export async function uploadToSignedUrl(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error("Upload failed");
}
