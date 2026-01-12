import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Download, Pencil, Trash2 } from "lucide-react";
import { formatDateFR } from "../../utils/format";
import type { InvoiceRow } from "@/api/invoices";
import styles from "./InvoicesTable.module.css";

export function InvoicesTable(props: {
  loading: boolean;
  items: InvoiceRow[];
  onDownload: (inv: InvoiceRow) => void;
  onEdit: (inv: InvoiceRow) => void;
  onDelete: (inv: InvoiceRow) => void;
}) {
  const { loading, items } = props;

  return (
    <Card className={styles.card}>
      <div className={styles.inner}>
        {loading ? (
          <p className={styles.loading}>Chargement…</p>
        ) : (
          <div className={styles.tableWrap}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">TTC</TableHead>
                  <TableHead>Structure</TableHead>
                  <TableHead className="text-right">Docs</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.invoiceNumber}</TableCell>
                    <TableCell>{r.supplierName ?? "—"}</TableCell>
                    <TableCell>{formatDateFR(r.invoiceDate)}</TableCell>
                    <TableCell className="text-right">
                      {Number(r.amountTTC).toFixed(2)} €
                    </TableCell>
                    <TableCell>{r.structure ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.documentsCount}</TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => props.onDownload(r)}>
                            <Download className="mr-2 h-4 w-4" />
                            Télécharger document
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => props.onEdit(r)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Éditer
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => props.onDelete(r)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}

                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      Aucune facture pour le moment.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Card>
  );
}
