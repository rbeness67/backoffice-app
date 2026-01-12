import { deleteInvoice, type InvoiceRow } from "@/api/invoices";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoice: InvoiceRow | null;
  onDeleted: (id: string) => void;
};

export function DeleteInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onDeleted,
}: Props) {
  async function onConfirm() {
    if (!invoice) return;
    await deleteInvoice(invoice.id);
    onDeleted(invoice.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer la facture ?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Cette action est irréversible.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onConfirm}>Supprimer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
