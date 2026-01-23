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
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Download, Pencil, Trash2 } from "lucide-react";
import { formatDateFR } from "../../utils/format";
import { getStructureLabel } from "@/utils/stuctureLabel";
import type { InvoiceRow } from "@/api/invoices";
import styles from "./InvoicesTable.module.css";

type Group = { key: string; title: string; items: InvoiceRow[] };

function sumTTC(items: InvoiceRow[]) {
  return items.reduce((acc, i) => acc + Number(i.amountTTC || 0), 0);
}

export function InvoicesTable(props: {
  loading: boolean;
  items: InvoiceRow[];
  groups?: Group[];
  onDownload: (inv: InvoiceRow) => void | Promise<void>; // ✅ allow async
  onEdit: (inv: InvoiceRow) => void;
  onDelete: (inv: InvoiceRow) => void;
  compact?: boolean; // ✅ NEW
}) {
  const { loading, items, groups } = props;
  const hasGroups = Array.isArray(groups) && groups.length > 0;

  // ✅ Use prop if provided, otherwise fallback to responsive auto
  const autoCompact =
    typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : false;
  const compact = props.compact ?? autoCompact;

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
      <div className="space-y-4">
        {groups!.map((g, idx) => {
          const totalTTC = sumTTC(g.items);

          return (
            <React.Fragment key={g.key}>
              {idx !== 0 && <Separator />}

              <Card className={styles.card}>
                <div className={styles.inner}>
                  {/* Month header */}
                  <div className="mb-3 flex items-center gap-4">
                    <div className="month-title">{g.title}</div>
                    <Badge variant="outline" className="month-badge">
                      {g.items.length} Factures
                    </Badge>
                  </div>

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
                              <TableHead>N°</TableHead>
                              <TableHead>Fournisseur</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Structure</TableHead>
                              <TableHead className="text-right">Docs</TableHead>
                              <TableHead className="text-right">TTC</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
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
                                <TableCell className="font-semibold tracking-tight">
                                  {row.invoiceNumber ?? "—"}
                                </TableCell>

                                <TableCell>{row.supplierName ?? "—"}</TableCell>

                                <TableCell className="text-muted-foreground">
                                  {formatDateFR(row.invoiceDate)}
                                </TableCell>

                                <TableCell className="text-muted-foreground">
                                  {getStructureLabel(row.structure)}
                                </TableCell>

                                <TableCell className="text-right text-muted-foreground">
                                  {row.documentsCount}
                                </TableCell>

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
                              <TableCell colSpan={5} className="text-muted-foreground">
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
                </div>
              </Card>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return null;
}
