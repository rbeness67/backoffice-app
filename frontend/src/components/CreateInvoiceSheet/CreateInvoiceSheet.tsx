"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

function controlClass(opts: { filled: boolean; invalid?: boolean }) {
  const { filled, invalid } = opts;

  // Keep shadcn base behavior, just adjust colors based on state
  const base =
    "w-full min-h-11 rounded-md";

  if (invalid) {
    return `${base} border-destructive focus-visible:ring-destructive focus-visible:ring-2`;
  }

  if (filled) {
    return `${base} focus-visible:border-emerald-500 focus-visible:ring-emerald-500 focus-visible:ring-2`;
  }

  return `${base} focus-visible:ring-2`;
}

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

  invoiceDate: string; // "YYYY-MM-DD"
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

  onSubmit: () => Promise<void> | void;
}) {
  const p = props;

  const [submitted, setSubmitted] = useState(false);

  const [resultOpen, setResultOpen] = useState(false);
  const [resultKind, setResultKind] = useState<"success" | "error">("success");
  const [resultMsg, setResultMsg] = useState<string>("");

  useEffect(() => {
    if (!p.open) {
      setSubmitted(false);
      setResultOpen(false);
      setResultMsg("");
    }
  }, [p.open]);

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

  const showInvalid = submitted;

  const invoiceDateAsDate = useMemo(() => {
    if (!p.invoiceDate) return undefined;
    const d = parseISO(p.invoiceDate);
    return isValid(d) ? d : undefined;
  }, [p.invoiceDate]);

  async function handleSubmit() {
    setSubmitted(true);
    if (!canSubmit) return;

    await Promise.resolve(p.onSubmit());

    if (p.confirmDuplicateOpen) return;

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
              {/* Numéro */}
              <div className={styles.section}>
                <FieldGroup>
                  <FieldSet>
                    <Field>
                      <FieldLabel>Numéro de facture</FieldLabel>
                      <div className={styles.readonly}>{p.nextNumber || "…"}</div>
                      <FieldDescription>
                        Généré automatiquement (JEL-YY-XXX) basé sur l’année en cours.
                      </FieldDescription>
                    </Field>
                  </FieldSet>
                </FieldGroup>
              </div>

              {/* Champs */}
              <div className={styles.section}>
                <FieldGroup>
                  <FieldSet>
                    {/* Fournisseur */}
                    <Field>
                      <div className={styles.rowBetween}>
                        <FieldLabel>Fournisseur</FieldLabel>
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
                            className={controlClass({
                              filled: p.supplierId.trim().length > 0,
                              invalid: showInvalid && !supplierOk,
                            })}
                            aria-invalid={showInvalid ? !supplierOk : undefined}
                          >
                            <SelectValue placeholder="Choisir un fournisseur" />
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
                          className={controlClass({
                            filled: p.supplierNewName.trim().length > 0,
                            invalid: showInvalid && !supplierOk,
                          })}
                          value={p.supplierNewName}
                          onChange={(e) => p.setSupplierNewName(e.target.value)}
                          placeholder="Nom du fournisseur"
                          aria-invalid={showInvalid ? !supplierOk : undefined}
                        />
                      )}

                      {showInvalid && !supplierOk && (
                        <FieldDescription className={styles.fieldError}>Champ requis.</FieldDescription>
                      )}
                    </Field>

                    {/* Date facture */}
                    <Field>
                      <FieldLabel>Date facture</FieldLabel>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            data-empty={!p.invoiceDate}
                            className={[
                              "w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
                              controlClass({
                                filled: p.invoiceDate.trim().length > 0,
                                invalid: showInvalid && !invoiceDateOk,
                              }),
                            ].join(" ")}
                            aria-invalid={showInvalid ? !invoiceDateOk : undefined}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {invoiceDateAsDate ? format(invoiceDateAsDate, "PPP") : "Choisir une date"}
                          </Button>
                        </PopoverTrigger>

                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={invoiceDateAsDate}
                            onSelect={(date) => {
                              if (!date) return;
                              p.setInvoiceDate(format(date, "yyyy-MM-dd"));
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      {showInvalid && !invoiceDateOk && (
                        <FieldDescription className={styles.fieldError}>Champ requis.</FieldDescription>
                      )}
                    </Field>

                    {/* Structure */}
                    <Field>
                      <FieldLabel>Structure</FieldLabel>

                      <Select value={p.structure} onValueChange={p.setStructure}>
                        <SelectTrigger
                          className={controlClass({
                            filled: String(p.structure ?? "").trim().length > 0,
                            invalid: showInvalid && !structureOk,
                          })}
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

                      {showInvalid && !structureOk && (
                        <FieldDescription className={styles.fieldError}>Champ requis.</FieldDescription>
                      )}
                    </Field>

                    {/* Montant */}
                    <Field>
                      <FieldLabel htmlFor="createAmountTTC">Montant TTC</FieldLabel>
                      <Input
                        id="createAmountTTC"
                        inputMode="decimal"
                        className={controlClass({
                          filled: p.amountTTC.trim().length > 0,
                          invalid: showInvalid && !amountOk,
                        })}
                        value={p.amountTTC}
                        onChange={(e) => p.setAmountTTC(e.target.value)}
                        placeholder="120.00"
                        aria-invalid={showInvalid ? !amountOk : undefined}
                      />
                      {showInvalid && !amountOk && (
                        <FieldDescription className={styles.fieldError}>
                          Champ requis. Saisis un montant valide (&gt; 0).
                        </FieldDescription>
                      )}
                    </Field>

                    {/* Documents */}
                    <Field>
                      <FieldLabel>Documents (PDF ou images)</FieldLabel>
                      <Input
                        type="file"
                        accept="application/pdf,image/*"
                        multiple
                        className={controlClass({
                          filled: (p.files?.length ?? 0) > 0,
                          invalid: showInvalid && !filesOk,
                        })}
                        onChange={(e) => p.setFiles(Array.from(e.target.files ?? []))}
                        aria-invalid={showInvalid ? !filesOk : undefined}
                      />

                      {p.files.length > 0 ? (
                        <FieldDescription className={styles.hint}>
                          {p.files.length} fichier(s) sélectionné(s)
                        </FieldDescription>
                      ) : (
                        <FieldDescription className={styles.hintMuted}>
                          Ajoute au moins un document.
                        </FieldDescription>
                      )}

                      {showInvalid && !filesOk && (
                        <FieldDescription className={styles.fieldError}>Champ requis.</FieldDescription>
                      )}
                    </Field>
                  </FieldSet>
                </FieldGroup>
              </div>

              {/* Totaux */}
              <div className={styles.section}>
                <div className={styles.totals}>
                  <div className={styles.totalRowStrong}>
                    <span>Total TTC</span>
                    <span>{amountOk ? `${amountNum.toFixed(2)} €` : "—"}</span>
                  </div>
                </div>
              </div>

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

      {/* Duplicate confirmation dialog */}
      <AlertDialog open={p.confirmDuplicateOpen} onOpenChange={(v) => (!v ? p.cancelDuplicate() : null)}>
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

      {/* Result dialog */}
      <AlertDialog open={resultOpen} onOpenChange={setResultOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{resultKind === "success" ? "Succès" : "Erreur"}</AlertDialogTitle>
            <AlertDialogDescription>{resultMsg}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setResultOpen(false);
                if (resultKind === "success") {
                  p.setOpen(false);
                  p.onCancel();
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
