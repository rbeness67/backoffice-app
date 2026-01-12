import { useCallback, useEffect, useState } from "react";
import { getInvoices, type InvoiceRow } from "@/api/invoices";
import { getSuppliers, type Supplier } from "@/api/suppliers";

export function useInvoicesData() {
  const [items, setItems] = useState<InvoiceRow[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [inv, sup] = await Promise.all([getInvoices(1, 50), getSuppliers()]);
      setItems(inv.items);
      setSuppliers(sup.items);
    } catch (e: any) {
      setError(e?.message ?? "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  return {
    items,
    setItems,
    suppliers,
    setSuppliers,
    loading,
    error,
    setError,
    refreshList,
  };
}
