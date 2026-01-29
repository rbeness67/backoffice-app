import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type HookShape = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toDelete: { id: string; invoiceNumber?: string; supplierName?: string | null } | null;
  deleting: boolean;
  confirm: () => void;
};

export function DeleteInvoiceDialog({ hook }: { hook: HookShape }) {
  const h = hook;

  const label =
    h.toDelete?.invoiceNumber
      ? `la facture ${h.toDelete.invoiceNumber}`
      : "cette facture";

  return (
    <AlertDialog open={h.open} onOpenChange={h.setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer une facture</AlertDialogTitle>
          <AlertDialogDescription>
            Vous êtes sur le point de supprimer {label}
            {h.toDelete?.supplierName ? ` (${h.toDelete.supplierName})` : ""}. Cette
            action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={h.deleting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              h.confirm();
            }}
            disabled={h.deleting || !h.toDelete}
          >
            {h.deleting ? "Suppression…" : "Supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
