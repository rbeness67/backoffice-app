import { useState } from "react";
import { deleteInvoice, type InvoiceRow } from "@/api/invoices";

export function useInvoiceDelete(opts: {
  onDeleted: (id: string) => void;
  setGlobalError: (msg: string) => void;
}) {
  const { onDeleted, setGlobalError } = opts;

  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<InvoiceRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  function ask(inv: InvoiceRow) {
    setToDelete(inv);
    setOpen(true);
  }

  async function confirm() {
    if (!toDelete) return;

    setDeleting(true);
    try {
      await deleteInvoice(toDelete.id);
      onDeleted(toDelete.id);
      setOpen(false);
      setToDelete(null);
    } catch (e: any) {
      setGlobalError(e?.message ?? "Erreur suppression");
    } finally {
      setDeleting(false);
    }
  }

  return { open, setOpen, toDelete, deleting, ask, confirm };
}
