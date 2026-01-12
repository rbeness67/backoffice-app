import { useEffect, useMemo, useState } from "react";
import { updateInvoice, type InvoiceRow } from "@/api/invoices";
import { type Supplier } from "@/api/suppliers";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import styles from "./EditInvoiceSheet.module.css";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoice: InvoiceRow | null;
  suppliers: Supplier[];
  onUpdated: (invoice: InvoiceRow) => void;
};

export function EditInvoiceSheet({
  open,
  onOpenChange,
  invoice,
  onUpdated,
}: Props) {
  const [amountHT, setAmountHT] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!invoice) return;
    setAmountHT(String(amountHT ?? ""));
  }, [invoice]);

  const tva = useMemo(() => {
    const ht = Number(amountHT);
    return ht > 0 ? Math.round(ht * 0.2 * 100) / 100 : 0;
  }, [amountHT]);

  const ttc = useMemo(() => {
    const ht = Number(amountHT);
    return ht > 0 ? Math.round((ht + tva) * 100) / 100 : 0;
  }, [amountHT, tva]);

  async function onSave() {
    if (!invoice) return;
    setSaving(true);
    try {
      const updated = await updateInvoice(invoice.id, {
        amountTTC: ttc,
      });
      onUpdated(updated);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message ?? "Erreur édition");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Éditer facture</SheetTitle>
        </SheetHeader>

        <div className={styles.container}>
          <Label>Montant HT</Label>
          <Input value={amountHT} onChange={(e) => setAmountHT(e.target.value)} />

          <div className={styles.totals}>
            <div>TVA : {tva.toFixed(2)} €</div>
            <strong>Total : {ttc.toFixed(2)} €</strong>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <Button onClick={onSave} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
