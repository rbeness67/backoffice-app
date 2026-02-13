// frontend/src/components/InvoicesTable/InvoicesTable.tsx
import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  MoreHorizontal,
  Download,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  DownloadCloud,
  Mail,
  MonitorDown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateFR } from "../../utils/format";
import { getStructureLabel } from "@/utils/stuctureLabel";
import type { InvoiceRow } from "@/api/invoices";
import { useMonthInvoicesZipDownload } from "@/hooks/invoices/useMonthInvoicesZipDownload";
import { useMonthInvoicesZipEmail } from "@/hooks/invoices/useMonthInvoicesZipEmail";
import styles from "./InvoicesTable.module.css";

type Group = { key: string; title: string; items: InvoiceRow[] };

function sumTTC(items: InvoiceRow[]) {
  return items.reduce((acc, i) => acc + Number(i.amountTTC || 0), 0);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function InvoicesTable(props: {
  loading: boolean;
  items: InvoiceRow[];
  groups?: Group[];
  onDownload: (inv: InvoiceRow) => void | Promise<void>;
  onEdit: (inv: InvoiceRow) => void;
  onDelete: (inv: InvoiceRow) => void;
  compact?: boolean;
  setGlobalError?: (msg: string) => void;
}) {
  const { loading, items, groups } = props;
  const hasGroups = Array.isArray(groups) && groups.length > 0;

  const autoCompact =
    typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : false;
  const compact = props.compact ?? autoCompact;

  // Collapsible per month
  const [openByMonth, setOpenByMonth] = React.useState<Record<string, boolean>>({});
  const isMonthOpen = React.useCallback((key: string) => openByMonth[key] ?? false, [openByMonth]);
  const setMonthOpen = React.useCallback((key: string, open: boolean) => {
    setOpenByMonth((prev) => ({ ...prev, [key]: open }));
  }, []);

  // Hooks
  const downloadMonthZip = useMonthInvoicesZipDownload(props.setGlobalError);
  const emailMonthZip = useMonthInvoicesZipEmail(props.setGlobalError);

  // Progress dialog (local download)
  const [downloadDialog, setDownloadDialog] = React.useState<{
    open: boolean;
    monthKey: string | null;
    monthTitle: string;
    progress: number | null;
  }>({
    open: false,
    monthKey: null,
    monthTitle: "",
    progress: null,
  });

  // Export choice dialog state
  const [exportDialog, setExportDialog] = React.useState<{
    open: boolean;
    monthKey: string;
    monthTitle: string;
    invoices: InvoiceRow[];
    totalTTC: number;
  } | null>(null);

  const [exportMode, setExportMode] = React.useState<"local" | "email">("local");
  const [email, setEmail] = React.useState("");
  const [emailTouched, setEmailTouched] = React.useState(false);
  const [exportBusy, setExportBusy] = React.useState(false);

  // ✅ AlertDialog spinner while sending email
  const [emailSending, setEmailSending] = React.useState<{
    open: boolean;
    monthTitle: string;
    email: string;
  }>({ open: false, monthTitle: "", email: "" });

  const emailOk = exportMode !== "email" || isValidEmail(email);
  const emailError = exportMode === "email" && emailTouched && !isValidEmail(email);

  const openExportDialog = React.useCallback((g: Group) => {
    const totalTTC = sumTTC(g.items);
    setExportMode("local");
    setEmail("");
    setEmailTouched(false);
    setExportBusy(false);
    setExportDialog({
      open: true,
      monthKey: g.key,
      monthTitle: g.title,
      invoices: g.items,
      totalTTC,
    });
  }, []);

  if (loading) {
    return (
      <Card className={styles.card}>
        <div className={styles.inner}>
          <p className={styles.loading}>Chargement…</p>
        </div>
      </Card>
    );
  }

  if (!items?.length) {
    return (
      <Card className={styles.card}>
        <div className={styles.inner}>
          <div className="py-10 text-center text-sm text-muted-foreground">
            Aucune facture pour le moment.
          </div>
        </div>
      </Card>
    );
  }

  if (!hasGroups) return null;

  return (
    <>
      {/* Centered progress dialog (local download) */}
      <Dialog open={downloadDialog.open}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Téléchargement en cours</DialogTitle>
            <DialogDescription>
              Export ZIP — <strong>{downloadDialog.monthTitle}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-150"
                style={{
                  width:
                    downloadDialog.progress == null
                      ? "40%"
                      : `${Math.max(5, Math.round(downloadDialog.progress * 100))}%`,
                }}
              />
            </div>

            <div className="text-center text-sm text-muted-foreground">
              {downloadDialog.progress == null
                ? "Préparation des documents…"
                : `${Math.round(downloadDialog.progress * 100)} %`}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ AlertDialog spinner while sending email */}
      <AlertDialog open={emailSending.open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Envoi en cours…</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="mt-2 flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <div className="space-y-1">
                  <div className="text-sm">
                    Factures : <strong>{emailSending.monthTitle}</strong>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Destinataire : <strong>{emailSending.email}</strong>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Merci de patienter, l’envoi peut prendre quelques secondes.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export choice dialog */}
      <Dialog
        open={!!exportDialog?.open}
        onOpenChange={(v) => {
          if (!v) setExportDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Exporter les factures</DialogTitle>
            <DialogDescription>
              Mois : <strong>{exportDialog?.monthTitle}</strong> —{" "}
              <span className="text-muted-foreground">
                {exportDialog?.invoices.length ?? 0} factures · Total TTC{" "}
                <strong>{exportDialog ? exportDialog.totalTTC.toFixed(2) : "0.00"} €</strong>
              </span>
            </DialogDescription>
          </DialogHeader>

          {/* List invoices that will be included */}
          <div className="mt-2 rounded-lg border bg-background">
            <div className="max-h-56 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Structure</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(exportDialog?.invoices ?? []).map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDateFR(inv.invoiceDate)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getStructureLabel(inv.structure)}
                      </TableCell>
                      <TableCell>{inv.supplierName ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(inv.amountTTC).toFixed(2)} €
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      Total TTC
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {exportDialog ? exportDialog.totalTTC.toFixed(2) : "0.00"} €
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>

          {/* Choice (FieldLabel clickable cards) */}
          <div className="mt-4 grid gap-3">
            <Label>Mode d’export</Label>

            <RadioGroup
              value={exportMode}
              onValueChange={(v) => setExportMode(v as "local" | "email")}
              className="grid gap-2"
            >
              <FieldLabel htmlFor="export-local">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle className="flex items-center gap-2">
                      <MonitorDown className="h-4 w-4" />
                      Télécharger sur cet ordinateur
                    </FieldTitle>
                    <FieldDescription>Télécharge un ZIP localement (recommandé).</FieldDescription>
                  </FieldContent>
                  <RadioGroupItem value="local" id="export-local" />
                </Field>
              </FieldLabel>

              <FieldLabel htmlFor="export-email">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Envoyer par email
                    </FieldTitle>
                    <FieldDescription>Envoie un lien de téléchargement par mail.</FieldDescription>
                  </FieldContent>
                  <RadioGroupItem value="email" id="export-email" />
                </Field>
              </FieldLabel>
            </RadioGroup>

            {/* Email input */}
            <div className="grid gap-2">
              <Label
                htmlFor="export-email-input"
                className={exportMode === "email" ? "" : "opacity-50"}
              >
                Adresse email
              </Label>
              <Input
                id="export-email-input"
                placeholder="ex: compta@entreprise.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                disabled={exportMode !== "email" || exportBusy}
                className={emailError ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {emailError && (
                <div className="text-xs text-red-600">Veuillez entrer une adresse email valide.</div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExportDialog(null)}
              disabled={exportBusy}
            >
              Annuler
            </Button>

            <Button
              type="button"
              disabled={exportBusy || !exportDialog || !emailOk}
              onClick={async () => {
                if (!exportDialog) return;

                setExportBusy(true);

                try {
                  if (exportMode === "local") {
                    setDownloadDialog({
                      open: true,
                      monthKey: exportDialog.monthKey,
                      monthTitle: exportDialog.monthTitle,
                      progress: null,
                    });

                    await downloadMonthZip(exportDialog.monthKey, exportDialog.monthTitle, {
                      onProgress: (p) => setDownloadDialog((prev) => ({ ...prev, progress: p })),
                    });

                    toast.success(`ZIP téléchargé — ${exportDialog.monthTitle}`);
                    setTimeout(() => setDownloadDialog((prev) => ({ ...prev, open: false })), 600);
                    setExportDialog(null);
                  } else {
                    setEmailTouched(true);
                    const mail = email.trim();
                    if (!isValidEmail(mail)) {
                      toast.error("Email invalide");
                      return;
                    }

                    // ✅ show AlertDialog spinner
                    setEmailSending({ open: true, monthTitle: exportDialog.monthTitle, email: mail });

                    await emailMonthZip(exportDialog.monthKey, mail);

                    toast.success(`Lien envoyé à ${mail}`);

                    // small delay to feel smooth before returning to main UI
                    await new Promise((r) => setTimeout(r, 700));

                    setEmailSending((prev) => ({ ...prev, open: false }));
                    setExportDialog(null);
                  }
                } catch (e: any) {
                  toast.error(e?.message ?? "Erreur export");
                  setTimeout(() => setEmailSending((prev) => ({ ...prev, open: false })), 400);
                } finally {
                  setExportBusy(false);
                }
              }}
            >
              {exportBusy
                ? "Traitement…"
                : exportMode === "local"
                  ? "Télécharger le ZIP"
                  : "Envoyer par email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Month cards */}
      <div className={styles.monthGrid}>
        {groups!.map((g) => {
          const totalTTC = sumTTC(g.items);
          const open = isMonthOpen(g.key);

          return (
            <Card key={g.key} className={styles.card}>
              <Collapsible open={open} onOpenChange={(v) => setMonthOpen(g.key, v)}>
                <div className={styles.inner}>
                  <div className={styles.monthHeader}>
                    <div className={styles.monthHeaderStack}>
                      <div className="month-title">{g.title}</div>

                      <Badge variant="outline" className="month-badge">
                        {g.items.length} Factures
                      </Badge>

                      {!open && (
                        <div className={styles.monthTotal}>
                          Total TTC&nbsp;: <strong>{totalTTC.toFixed(2)} €</strong>
                        </div>
                      )}
                    </div>

                    <div className={styles.monthHeaderActions}>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 px-2.5"
                        onClick={() => openExportDialog(g)}
                        title="Exporter les factures"
                      >
                        <DownloadCloud className="mr-2 h-4 w-4" />
                        Exporter les factures du mois
                      </Button>

                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 px-2.5">
                          {open ? (
                            <>
                              <ChevronUp className="mr-2 h-4 w-4" />
                              Masquer l'ensemble des factures
                            </>
                          ) : (
                            <>
                              <ChevronDown className="mr-2 h-4 w-4" />
                              Afficher l'ensemble des factures
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className={styles.tableWrap}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {compact ? (
                              <>
                                <TableHead>Fournisseur</TableHead>
                                <TableHead className="text-right">TTC</TableHead>
                              </>
                            ) : (
                              <>
                                <TableHead>Date</TableHead>
                                <TableHead>Structure</TableHead>
                                <TableHead>Fournisseur</TableHead>
                                <TableHead className="text-right">Montant</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                              </>
                            )}
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {[...g.items]
                          .sort(
                            (a, b) =>
                              new Date(b.invoiceDate).getTime() -
                              new Date(a.invoiceDate).getTime()
                          )
                          .map((row) => (
                            <TableRow key={row.id} className="group">
                              {compact ? (
                                <>
                                  <TableCell className={styles.supplierCellCompact}>
                                    <div className={styles.supplierCompactMain}>
                                      {row.supplierName ?? "—"}
                                    </div>
                                    <div className={styles.supplierCompactSub}>
                                      {row.invoiceNumber ?? "—"} · {formatDateFR(row.invoiceDate)}
                                    </div>
                                  </TableCell>

                                  <TableCell className="text-right font-medium">
                                    {Number(row.amountTTC).toFixed(2)} €
                                  </TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell className="text-muted-foreground">
                                    {formatDateFR(row.invoiceDate)}
                                  </TableCell>

                                  <TableCell className="text-muted-foreground">
                                    <Badge
                                      className={`${styles.structureBadgeBase} ${
                                        getStructureLabel(row.structure) === "Cocci'Bulles"
                                          ? styles.structureBadgePrimary
                                          : styles.structureBadgeSecondary
                                      }`}
                                    >
                                      {getStructureLabel(row.structure)}
                                    </Badge>
                                  </TableCell>

                                  <TableCell>{row.supplierName ?? "—"}</TableCell>

                                  <TableCell className="text-right font-medium">
                                    {Number(row.amountTTC).toFixed(2)} €
                                  </TableCell>

                                  <TableCell className="text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-8 w-8">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => void props.onDownload(row)}>
                                          <Download className="mr-2 h-4 w-4" />
                                          Télécharger document
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => props.onEdit(row)}>
                                          <Pencil className="mr-2 h-4 w-4" />
                                          Éditer
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-red-600"
                                          onClick={() => props.onDelete(row)}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Supprimer
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>

                        <TableFooter>
                          <TableRow>
                            {compact ? (
                              <>
                                <TableCell className="text-muted-foreground">Total TTC</TableCell>
                                <TableCell className="text-right font-semibold">
                                  {totalTTC.toFixed(2)} €
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell colSpan={3} className="text-muted-foreground">
                                  Total TTC
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {totalTTC.toFixed(2)} €
                                </TableCell>
                                <TableCell />
                              </>
                            )}
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </>
  );
}
