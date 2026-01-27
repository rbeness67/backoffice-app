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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  MoreHorizontal,
  Download,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  DownloadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateFR } from "../../utils/format";
import { getStructureLabel } from "@/utils/stuctureLabel";
import type { InvoiceRow } from "@/api/invoices";
import { useMonthInvoicesZipDownload } from "@/hooks/invoices/useMonthInvoicesZipDownload";
import styles from "./InvoicesTable.module.css";

type Group = { key: string; title: string; items: InvoiceRow[] };

function sumTTC(items: InvoiceRow[]) {
  return items.reduce((acc, i) => acc + Number(i.amountTTC || 0), 0);
}

export function InvoicesTable(props: {
  loading: boolean;
  items: InvoiceRow[];
  groups?: Group[];
  onDownload: (inv: InvoiceRow) => void | Promise<void>;
  onEdit: (inv: InvoiceRow) => void;
  onDelete: (inv: InvoiceRow) => void;
  compact?: boolean;
  setGlobalError?: (msg: string) => void; // optional
}) {
  const { loading, items, groups } = props;
  const hasGroups = Array.isArray(groups) && groups.length > 0;

  // Responsive compact fallback
  const autoCompact =
    typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : false;
  const compact = props.compact ?? autoCompact;

  // Collapsible state per month (default: closed)
  const [openByMonth, setOpenByMonth] = React.useState<Record<string, boolean>>({});

  const isMonthOpen = React.useCallback(
    (key: string) => openByMonth[key] ?? false,
    [openByMonth]
  );

  const setMonthOpen = React.useCallback((key: string, open: boolean) => {
    setOpenByMonth((prev) => ({ ...prev, [key]: open }));
  }, []);

  // Month ZIP download hook
  const downloadMonthZip = useMonthInvoicesZipDownload(props.setGlobalError);

  // Download dialog + progress state
  const [downloadDialog, setDownloadDialog] = React.useState<{
    open: boolean;
    monthKey: string | null;
    monthTitle: string;
    progress: number | null; // 0..1 or null (unknown)
  }>({
    open: false,
    monthKey: null,
    monthTitle: "",
    progress: null,
  });

  const [downloadingMonthKey, setDownloadingMonthKey] = React.useState<string | null>(null);

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

  // ─────────────────────────────────────────
  // GROUPED VIEW (per month)
  // ─────────────────────────────────────────
  if (hasGroups) {
    return (
      <>
        {/* Centered download dialog */}
        <Dialog open={downloadDialog.open}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Téléchargement en cours</DialogTitle>
              <DialogDescription>
                Factures du mois de <strong>{downloadDialog.monthTitle}</strong>
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

        <div className={styles.monthGrid}>
          {groups!.map((g) => {
            const totalTTC = sumTTC(g.items);
            const open = isMonthOpen(g.key);
            const isDownloading = downloadingMonthKey === g.key;

            return (
              <Card key={g.key} className={styles.card}>
                <Collapsible open={open} onOpenChange={(v) => setMonthOpen(g.key, v)}>
                  <div className={styles.inner}>
                    {/* Month header */}
                    <div className={styles.monthHeader}>
                      {/* stacked vertically */}
                      <div className={styles.monthHeaderStack}>
                        <div className="month-title">{g.title}</div>

                        <Badge variant="outline" className="month-badge">
                          {g.items.length} Factures
                        </Badge>

                        {/* total when collapsed */}
                        {!open && (
                          <div className={styles.monthTotal}>
                            Total TTC&nbsp;: <strong>{totalTTC.toFixed(2)} €</strong>
                          </div>
                        )}
                      </div>

                      <div className={styles.monthHeaderActions}>
                        {/* Download month ZIP (confirmed) */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5"
                              disabled={isDownloading}
                              title="Exporter toutes les factures du mois (ZIP)"
                            >
                              <DownloadCloud className="mr-2 h-4 w-4" />
                              {isDownloading ? "Téléchargement…" : "Exporter les factures du mois"}
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Télécharger les factures</AlertDialogTitle>
                              <AlertDialogDescription>
                                Voulez-vous télécharger <strong>l'ensemble es documents</strong> correspondant aux factures du
                                mois de <strong>{g.title}</strong> ?
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  setDownloadingMonthKey(g.key);
                                  setDownloadDialog({
                                    open: true,
                                    monthKey: g.key,
                                    monthTitle: g.title,
                                    progress: null,
                                  });

                                  try {
                                    await downloadMonthZip(g.key, g.title, {
                                      onProgress: (p) =>
                                        setDownloadDialog((prev) => ({ ...prev, progress: p })),
                                    });
                                    toast.success(`Factures de ${g.title} téléchargées`);
                                  } catch (e: any) {
                                    toast.error(e?.message ?? "Erreur lors du téléchargement");
                                  } finally {
                                    setDownloadingMonthKey(null);
                                    setTimeout(() => {
                                      setDownloadDialog((prev) => ({ ...prev, open: false }));
                                    }, 600);
                                  }
                                }}
                              >
                                Télécharger
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {/* Open/close month */}
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
                                  {/* Order: Date Structure Fournisseur Montant Action */}
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
                            {g.items.map((row) => (
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
                                  {/* Date + Structure + Fournisseur */}
                                  <TableCell colSpan={3} className="text-muted-foreground">
                                    Total TTC
                                  </TableCell>

                                  {/* Montant */}
                                  <TableCell className="text-right font-semibold">
                                    {totalTTC.toFixed(2)} €
                                  </TableCell>

                                  {/* Action */}
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

  return null;
}
