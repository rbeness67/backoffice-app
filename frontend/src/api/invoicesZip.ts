// frontend/src/api/invoicesZip.ts



/**
 * Download ZIP as Blob with progress callback.
 * Progress is best-effort: depends on server sending Content-Length.
 */
// frontend/src/api/invoicesZip.ts

function getAuthHeaders(extra?: Record<string, string>) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing token");
  return {
    Authorization: `Bearer ${token}`,
    ...(extra ?? {}),
  };
}

export async function downloadMonthInvoicesZip(
  monthKey: string,
  onProgress?: (progress: number | null) => void
) {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/invoices/month/${encodeURIComponent(monthKey)}/documents.zip`,
    { method: "GET", headers: getAuthHeaders() }
  );

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Failed to download invoices ZIP");
  }

  const total = Number(res.headers.get("Content-Length") || 0) || null;

  if (!res.body) {
    onProgress?.(null);
    const blob = await res.blob();
    onProgress?.(1);
    return blob;
  }

  const reader = res.body.getReader();

  // ✅ Use ArrayBuffer[] to satisfy BlobPart typing in TS
  const chunks: ArrayBuffer[] = [];
  let received = 0;

  onProgress?.(total ? 0 : null);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      received += value.byteLength;

      // ✅ Convert Uint8Array -> ArrayBuffer slice
      chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));

      if (total) onProgress?.(Math.min(received / total, 0.999));
    }
  }

  const blob = new Blob(chunks, { type: "application/zip" });
  onProgress?.(1);
  return blob;
}

export async function emailMonthInvoicesZip(monthKey: string, email: string) {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/invoices/month/${encodeURIComponent(monthKey)}/documents.zip/email`,
    {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ email }),
    }
  );

  const txt = await res.text();
  if (!res.ok) throw new Error(txt || "Failed to send ZIP by email");
  return JSON.parse(txt) as { ok: true };
}
