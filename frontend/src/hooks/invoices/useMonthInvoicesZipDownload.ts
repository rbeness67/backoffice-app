// frontend/src/hooks/invoices/useMonthInvoicesZipDownload.ts
import { downloadMonthInvoicesZip } from "@/api/invoicesZip";

function safeName(name: string) {
  return (name || "factures").replace(/[\\/:*?"<>|]+/g, "-").trim();
}

export function useMonthInvoicesZipDownload(setGlobalError?: (msg: string) => void) {
  return async function downloadZip(
    monthKey: string,
    monthTitle: string,
    opts?: { onProgress?: (p: number | null) => void }
  ) {
    try {
      setGlobalError?.("");

      const blob = await downloadMonthInvoicesZip(monthKey, opts?.onProgress);

      const fileName = `${safeName(monthTitle)}-${monthKey}.zip`;
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (e: any) {
      setGlobalError?.(e?.message ?? "Erreur téléchargement ZIP");
      throw e;
    }
  };
}
