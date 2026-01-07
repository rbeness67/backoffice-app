import { useEffect, useState } from "react";
import { getInvoices, type InvoiceRow } from "@/api/invoices";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Invoices() {
  const [items, setItems] = useState<InvoiceRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getInvoices(1, 20);
        setItems(data.items);
      } catch (e: any) {
        setError(e?.message ?? "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Gestion des factures</h1>
        <p className="text-muted-foreground">
          Liste paginée (v1) — filtres et recherche après.
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead className="text-right">TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Docs</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.invoiceNumber}</TableCell>
                  <TableCell>{r.supplierName ?? "—"}</TableCell>
                  <TableCell>{new Date(r.invoiceDate).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(r.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {r.amountTTC.toFixed(2)} €
                  </TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell className="text-right">{r.documentsCount}</TableCell>
                </TableRow>
              ))}

              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Aucune facture pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
