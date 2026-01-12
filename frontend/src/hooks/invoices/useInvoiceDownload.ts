import { getDocumentDownloadUrl } from "@/api/documents";
import { type InvoiceRow } from "@/api/invoices";

export function useInvoiceDownload(setGlobalError: (msg: string) => void) {
  return async function onDownloadFirstDoc(inv: InvoiceRow) {
    try {
      setGlobalError("");
      const docId = inv.documents?.[0]?.id;
      if (!docId) {
        setGlobalError("Aucun document associé à cette facture.");
        return;
      }
      const { downloadUrl } = await getDocumentDownloadUrl(docId);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setGlobalError(e?.message ?? "Erreur téléchargement");
    }
  };
}
