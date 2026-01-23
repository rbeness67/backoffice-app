import { useEffect, useMemo, useState } from "react";
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

import { STRUCTURES } from "../../utils/format";
import { getStructureLabel } from "@/utils/stuctureLabel";
import type { Supplier } from "@/api/suppliers";
import styles from "./CreateInvoiceSheet.module.css";

export function CreateInvoiceSheet(props: {
  open: boolean;
  setOpen: (v: boolean) => void;
  saving: boolean;
  error: string;

  nextNumber: string;

  suppliers: Supplier[];

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

  structure: string;
  setStructure: (v: any) => void;

  files: File[];
  setFiles: (v: File[]) => void;

  confirmDuplicateOpen: boolean;
  duplicateFound: { number?: string; supplierName?: string } | null;
  confirmDuplicateAndSubmit: () => void;
  cancelDuplicate: () => void;

  onCancel: () => void;

  /**
   * NOTE: onSubmit may set p.error asynchronously (via hook).
   * We wrap it to show success dialog when no error occurs.
   */
  onSubmit: () => Promise<void> | void;
}) {
  const p = props;

  // ✅ Only show validation UI after user tries to submit
  const [submitted, setSubmitted] = useState(false);

  // ✅ Success / Error dialog
  const [resultOpen, setResultOpen] = useState(false);
  const [resultKind, setResultKind] = useState<"success" | "error">("success");
  const [resultMsg, setResultMsg] = useState<string>("");

  // Reset local UI states when opening/closing
  useEffect(() => {
    if (!p.open) {
      setSubmitted(false);
      setResultOpen(false);
      setResultMsg("");
    }
  }, [p.open]);

  // If the external error prop changes -> show error dialog
  useEffect(() => {
    if (!p.open) return;
    if (!p.error) return;

    setResultKind("error");
    setResultMsg(p.error);
    setResultOpen(true);
  }, [p.error, p.open]);

  const supplierOk =
    p.supplierMode === "existing"
      ? p.supplierId.trim().length > 0
      : p.supplierNewName.trim().length > 0;

  const invoiceDateOk = p.invoiceDate.trim().length > 0;
  const structureOk = String(p.structure ?? "").trim().length > 0;

  const amountNum = Number(String(p.amountTTC).replace(",", "."));
  const amountOk = Number.isFinite(amountNum) && amountNum > 0;

  const filesOk = (p.files?.length ?? 0) > 0;

  const canSubmit = supplierOk && invoiceDateOk && structureOk && amountOk && filesOk;

  // ✅ apply invalid only after submit attempt
  const showInvalid = submitted;

  async function handleSubmit() {
    setSubmitted(true);

    // If client-side invalid -> do not open dialogs, just show inline errors
    if (!canSubmit) return;

    // Call parent submit
    await Promise.resolve(p.onSubmit());

    // If duplicate dialog opens, we don't show "success" yet
    if (p.confirmDuplicateOpen) return;

    // If parent sets error synchronously, effect will show error dialog
    // If no error, show success dialog
    if (!p.error) {
      setResultKind("success");
      setResultMsg("Facture créée avec succès.");
      setResultOpen(true);
    }
  }

  return (
    <>
      <Sheet
        open={p.open}
        onOpenChange={(v) => {
          p.setOpen(v);
          if (v) setSubmitted(false);
        }}
      >
        <SheetContent className={styles.sheet}>
          <SheetHeader className={styles.header}>
            <SheetTitle>Création d&apos;une nouvelle facture</SheetTitle>
          </SheetHeader>

          <div className={styles.scroll}>
            <div className={styles.body}>
              <div className={styles.section}>
                <div className={styles.block}>
                  <Label>Numéro de facture</Label>
                  <div className={styles.readonly}>{p.nextNumber || "…"}</div>
                  <p className={styles.hint}>
                    Généré automatiquement (JEL-YY-XXX) basé sur l’année en cours.
                  </p>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.block}>
                  <div className={styles.rowBetween}>
                    <Label>Fournisseur</Label>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => {
                        p.setSupplierMode(p.supplierMode === "existing" ? "new" : "existing");
                        p.setSupplierId("");
                        p.setSupplierNewName("");
                      }}
                    >
                      {p.supplierMode === "existing"
                        ? "Créer un nouveau fournisseur"
                        : "Choisir un fournisseur existant"}
                    </button>
                  </div>

                  {p.supplierMode === "existing" ? (
                    <Select value={p.supplierId} onValueChange={p.setSupplierId}>
                      <SelectTrigger
                        className={styles.control}
                        aria-invalid={showInvalid ? !supplierOk : undefined}
                      >
                        <SelectValue placeholder="Choisir un fournisseur parmi ceux existants" />
                      </SelectTrigger>
                      <SelectContent>
                        {p.suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className={styles.control}
                      value={p.supplierNewName}
                      onChange={(e) => p.setSupplierNewName(e.target.value)}
                      placeholder="Nom du fournisseur"
                      aria-invalid={showInvalid ? !supplierOk : undefined}
                    />
                  )}

                  {showInvalid && !supplierOk && <p className={styles.fieldError}>Champ requis.</p>}
                </div>

                <div className={styles.block}>
                  <Label htmlFor="createInvoiceDate">Date facture</Label>
                  <Input
                    id="createInvoiceDate"
                    type="date"
                    className={styles.control}
                    value={p.invoiceDate}
                    onChange={(e) => p.setInvoiceDate(e.target.value)}
                    aria-invalid={showInvalid ? !invoiceDateOk : undefined}
                  />
                  {showInvalid && !invoiceDateOk && <p className={styles.fieldError}>Champ requis.</p>}
                </div>

                <div className={styles.block}>
                  <Label>Structure</Label>

                  <Select value={p.structure} onValueChange={p.setStructure}>
                    <SelectTrigger
                      className={styles.control}
                      aria-invalid={showInvalid ? !structureOk : undefined}
                    >
                      <SelectValue placeholder="Sélectionner une structure" />
                    </SelectTrigger>

                    <SelectContent>
                      {STRUCTURES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {getStructureLabel(code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {showInvalid && !structureOk && <p className={styles.fieldError}>Champ requis.</p>}
                </div>

                <div className={styles.block}>
                  <Label htmlFor="createAmountTTC">Montant TTC</Label>
                  <Input
                    id="createAmountTTC"
                    className={styles.control}
                    inputMode="decimal"
                    value={p.amountTTC}
                    onChange={(e) => p.setAmountTTC(e.target.value)}
                    placeholder="120.00"
                    aria-invalid={showInvalid ? !amountOk : undefined}
                  />
                  {showInvalid && !amountOk && (
                    <p className={styles.fieldError}>
                      Champ requis. Saisis un montant valide (&gt; 0).
                    </p>
                  )}
                </div>

                <div className={styles.block}>
                  <Label>Documents (PDF ou images)</Label>
                  <Input
                    className={styles.control}
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    onChange={(e) => p.setFiles(Array.from(e.target.files ?? []))}
                    aria-invalid={showInvalid ? !filesOk : undefined}
                  />
                  <div className={styles.filesMeta}>
                    {p.files.length > 0 ? (
                      <p className={styles.hint}>{p.files.length} fichier(s) sélectionné(s)</p>
                    ) : (
                      <p className={styles.hintMuted}>Ajoute au moins un document.</p>
                    )}
                  </div>
                  {showInvalid && !filesOk && <p className={styles.fieldError}>Champ requis.</p>}
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.totals}>
                  <div className={styles.totalRowStrong}>
                    <span>Total TTC</span>
                    <span>{amountOk ? `${amountNum.toFixed(2)} €` : "—"}</span>
                  </div>
                </div>
              </div>

              {/* Keep inline error if you still want it (optional) */}
              {p.error && <div className={styles.error}>{p.error}</div>}
            </div>
          </div>

          <div className={styles.footer}>
            <div className={styles.actions}>
              <Button
                className={styles.primaryBtn}
                onClick={handleSubmit}
                disabled={p.saving}
                title={!canSubmit ? "Complète tous les champs pour continuer" : undefined}
              >
                {p.saving ? "Création..." : "Créer"}
              </Button>
              <Button
                variant="outline"
                className={styles.secondaryBtn}
                onClick={p.onCancel}
                disabled={p.saving}
              >
                Annuler
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Duplicate confirmation dialog (unchanged) */}
      <AlertDialog
        open={p.confirmDuplicateOpen}
        onOpenChange={(v) => (!v ? p.cancelDuplicate() : null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Facture potentiellement en doublon</AlertDialogTitle>
            <AlertDialogDescription>
              Une facture existe déjà avec la même <b>date</b>, le même <b>montant</b> et la même{" "}
              <b>structure</b>.
              <br />
              {structureOk ? (
                <span>
                  Structure sélectionnée : <b>{getStructureLabel(p.structure)}</b>.
                </span>
              ) : null}
              <br />
              {p.duplicateFound ? (
                <span>
                  Doublon trouvé :{" "}
                  <b>{p.duplicateFound.number ? p.duplicateFound.number : "facture existante"}</b>
                  {p.duplicateFound.supplierName ? ` — ${p.duplicateFound.supplierName}` : ""}.
                </span>
              ) : null}
              <br />
              Veux-tu quand même créer cette facture ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={p.saving} onClick={p.cancelDuplicate}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction disabled={p.saving} onClick={p.confirmDuplicateAndSubmit}>
              Créer quand même
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ✅ Result dialog (success / error) */}
      <AlertDialog open={resultOpen} onOpenChange={setResultOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {resultKind === "success" ? "Succès" : "Erreur"}
            </AlertDialogTitle>
            <AlertDialogDescription>{resultMsg}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setResultOpen(false);
                // optional: close the sheet after success
                if (resultKind === "success") {
                  p.setOpen(false);
                  p.onCancel(); // resets form in your page
                }
              }}
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
