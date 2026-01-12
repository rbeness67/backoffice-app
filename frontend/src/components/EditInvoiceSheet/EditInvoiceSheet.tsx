import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { Supplier } from "@/api/suppliers";
import { STRUCTURES, type InvoiceStructure } from "../../utils/format";

import styles from "./EditInvoiceSheet.module.css";

type HookShape = {
  open: boolean;
  setOpen: (v: boolean) => void;
  saving: boolean;
  error: string;
  editing: any;

  supplierMode: "existing" | "new";
  setSupplierMode: (v: "existing" | "new") => void;
  supplierId: string;
  setSupplierId: (v: string) => void;
  supplierNewName: string;
  setSupplierNewName: (v: string) => void;

  invoiceDate: string;
  setInvoiceDate: (v: string) => void;

  amountTTC: string;
  setAmountTTC: (v: string) => void;

  structure: InvoiceStructure;
  setStructure: (v: InvoiceStructure) => void;

  close: () => void;
  submit: () => void;
};

export function EditInvoiceSheet(props: { hook: HookShape; suppliers: Supplier[] }) {
  const h = props.hook;

  const supplierOk =
    h.supplierMode === "existing"
      ? h.supplierId.trim().length > 0
      : h.supplierNewName.trim().length > 0;

  const invoiceDateOk = h.invoiceDate.trim().length > 0;
  const structureOk = String(h.structure ?? "").trim().length > 0;

  const parsedTTC = Number(String(h.amountTTC).replace(",", "."));
  const amountOk = Number.isFinite(parsedTTC) && parsedTTC > 0;

  const canSubmit = Boolean(h.editing) && supplierOk && invoiceDateOk && structureOk && amountOk;

  const showTTC = amountOk ? `${parsedTTC.toFixed(2)} €` : "—";

  return (
    <Sheet
      open={h.open}
      onOpenChange={(v) => {
        // si on ferme via overlay/escape, on reset proprement
        if (!v) h.close();
        else h.setOpen(true);
      }}
    >
      <SheetContent className={styles.sheet}>
        <SheetHeader className={styles.header}>
          <SheetTitle>Éditer une facture</SheetTitle>
        </SheetHeader>

        <div className={styles.body}>
          {!h.editing ? (
            <div className={styles.hint}>Aucune facture sélectionnée.</div>
          ) : (
            <>
              <div className={styles.section}>
                <div className={styles.block}>
                  <div className={styles.rowBetween}>
                    <Label>Fournisseur</Label>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => {
                        const nextMode = h.supplierMode === "existing" ? "new" : "existing";
                        h.setSupplierMode(nextMode);

                        // reset champs selon le mode choisi
                        if (nextMode === "existing") {
                          h.setSupplierNewName("");
                        } else {
                          h.setSupplierId("");
                        }
                      }}
                    >
                      {h.supplierMode === "existing"
                        ? "Créer / saisir un fournisseur"
                        : "Choisir un fournisseur existant"}
                    </button>
                  </div>

                  {h.supplierMode === "existing" ? (
                    <Select value={h.supplierId} onValueChange={h.setSupplierId}>
                      <SelectTrigger className={styles.control} aria-invalid={!supplierOk}>
                        <SelectValue placeholder="Choisir un fournisseur" />
                      </SelectTrigger>
                      <SelectContent>
                        {props.suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className={styles.control}
                      value={h.supplierNewName}
                      onChange={(e) => h.setSupplierNewName(e.target.value)}
                      placeholder="Nom du fournisseur"
                      aria-invalid={!supplierOk}
                    />
                  )}

                  {!supplierOk && <p className={styles.fieldError}>Champ requis.</p>}
                </div>

                {/* Chaque champ sur sa propre ligne */}
                <div className={styles.block}>
                  <Label htmlFor="editInvoiceDate">Date facture</Label>
                  <Input
                    id="editInvoiceDate"
                    type="date"
                    className={styles.control}
                    value={h.invoiceDate}
                    onChange={(e) => h.setInvoiceDate(e.target.value)}
                    aria-invalid={!invoiceDateOk}
                  />
                  {!invoiceDateOk && <p className={styles.fieldError}>Champ requis.</p>}
                </div>

                <div className={styles.block}>
                  <Label>Structure</Label>
                  <Select value={h.structure} onValueChange={h.setStructure}>
                    <SelectTrigger className={styles.control} aria-invalid={!structureOk}>
                      <SelectValue placeholder="Choisir une structure" />
                    </SelectTrigger>
                    <SelectContent>
                      {STRUCTURES.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!structureOk && <p className={styles.fieldError}>Champ requis.</p>}
                </div>

                <div className={styles.block}>
                  <Label htmlFor="editAmountTTC">Montant TTC</Label>
                  <Input
                    id="editAmountTTC"
                    className={styles.control}
                    inputMode="decimal"
                    value={h.amountTTC}
                    onChange={(e) => h.setAmountTTC(e.target.value)}
                    placeholder="120.00"
                    aria-invalid={!amountOk}
                  />
                  {!amountOk && (
                    <p className={styles.fieldError}>
                      Champ requis. Saisis un montant valide (&gt; 0).
                    </p>
                  )}
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.totals}>
                  <div className={styles.totalRowStrong}>
                    <span>Total TTC</span>
                    <span>{showTTC}</span>
                  </div>
                </div>
              </div>

              {h.error && <div className={styles.error}>{h.error}</div>}

              <div className={styles.actions}>
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (!canSubmit) return;
                    h.submit();
                  }}
                  disabled={h.saving || !canSubmit}
                  title={!canSubmit ? "Complète tous les champs pour continuer" : undefined}
                >
                  {h.saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
                <Button variant="outline" onClick={h.close} disabled={h.saving}>
                  Annuler
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
