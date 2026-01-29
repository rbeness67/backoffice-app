"use client";

import { useEffect, useMemo, useState } from "react";
import { updateInvoice, type InvoiceRow } from "@/api/invoices";
import type { Supplier } from "@/api/suppliers";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";

import styles from "./EditInvoiceSheet.module.css";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoice: InvoiceRow | null;
  suppliers: Supplier[];
  onUpdated: (invoice: InvoiceRow) => void;
};

function controlClass(opts: { filled: boolean; invalid?: boolean }) {
  const { filled, invalid } = opts;

  const base = "w-full min-h-11 rounded-md";

  if (invalid) {
    return `${base} border-destructive focus-visible:ring-destructive focus-visible:ring-2`;
  }
  if (filled) {
    return `${base} focus-visible:border-emerald-500 focus-visible:ring-emerald-500 focus-visible:ring-2`;
  }
  return `${base} focus-visible:ring-2`;
}

export function EditInvoiceSheet({ open, onOpenChange, invoice, onUpdated }: Props) {
  const [amountHT, setAmountHT] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setSubmitted(false);
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!invoice) {
      setAmountHT("");
      return;
    }
    // Load HT from the invoice if available; fallback to TTC if that's all you store.
    // If you only store TTC in your backend, you can compute HT or leave this empty.
    const initial =
      typeof (invoice as any)?.amountHT === "number"
        ? String((invoice as any).amountHT)
        : "";
    setAmountHT(initial);
  }, [invoice]);

  const htNum = useMemo(() => {
    const n = Number(String(amountHT).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }, [amountHT]);

  const amountOk = Number.isFinite(htNum) && htNum > 0;

  const tva = useMemo(() => {
    return amountOk ? Math.round(htNum * 0.2 * 100) / 100 : 0;
  }, [amountOk, htNum]);

  const ttc = useMemo(() => {
    return amountOk ? Math.round((htNum + tva) * 100) / 100 : 0;
  }, [amountOk, htNum, tva]);

  async function onSave() {
    setSubmitted(true);
    setError("");

    if (!invoice) return;
    if (!amountOk) return;

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

  const showInvalid = submitted;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={styles.sheet}>
        <SheetHeader className={styles.header}>
          <SheetTitle>Éditer facture</SheetTitle>
        </SheetHeader>

        <div className={styles.scroll}>
          <div className={styles.body}>
            {/* Champs */}
            <div className={styles.section}>
              <FieldGroup>
                <FieldSet>
                  <Field>
                    <FieldLabel htmlFor="editAmountHT">Montant HT</FieldLabel>
                    <Input
                      id="editAmountHT"
                      inputMode="decimal"
                      value={amountHT}
                      onChange={(e) => setAmountHT(e.target.value)}
                      placeholder="100.00"
                      className={controlClass({
                        filled: amountHT.trim().length > 0,
                        invalid: showInvalid && !amountOk,
                      })}
                      aria-invalid={showInvalid ? !amountOk : undefined}
                    />

                    {showInvalid && !amountOk && (
                      <FieldDescription className={styles.fieldError}>
                        Champ requis. Saisis un montant valide (&gt; 0).
                      </FieldDescription>
                    )}
                  </Field>
                </FieldSet>
              </FieldGroup>
            </div>

            {/* Totaux */}
            <div className={styles.section}>
              <div className={styles.totals}>
                <div className={styles.totalRow}>
                  <span>TVA (20%)</span>
                  <span>{amountOk ? `${tva.toFixed(2)} €` : "—"}</span>
                </div>
                <div className={styles.totalRowStrong}>
                  <span>Total TTC</span>
                  <span>{amountOk ? `${ttc.toFixed(2)} €` : "—"}</span>
                </div>
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.actions}>
            <Button className={styles.primaryBtn} onClick={onSave} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button
              variant="outline"
              className={styles.secondaryBtn}
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Annuler
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
