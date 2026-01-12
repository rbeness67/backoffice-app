import { useState } from "react";
import { updateInvoice, type InvoiceRow } from "@/api/invoices";
import { getSuppliers, type Supplier } from "@/api/suppliers";
import { toYMD, type InvoiceStructure } from "../../utils/format";

export function useInvoiceEdit(opts: {
  suppliers: Supplier[];
  setSuppliers: (s: Supplier[]) => void;
  onUpdated: (updated: InvoiceRow) => void;
}) {
  const { setSuppliers, onUpdated } = opts;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<InvoiceRow | null>(null);

  const [supplierMode, setSupplierMode] = useState<"existing" | "new">("existing");
  const [supplierId, setSupplierId] = useState("");
  const [supplierNewName, setSupplierNewName] = useState("");

  const [invoiceDate, setInvoiceDate] = useState("");
  const [amountTTC, setAmountTTC] = useState<string>("");

  const [structure, setStructure] = useState<InvoiceStructure>("STRUCTURE_1");

  function openEdit(inv: InvoiceRow) {
    setEditing(inv);
    setError("");

    // UX: par défaut "new" + pré-rempli avec le nom
    setSupplierMode("new");
    setSupplierId("");
    setSupplierNewName(inv.supplierName ?? "");

    setInvoiceDate(toYMD(inv.invoiceDate));
    setAmountTTC(inv.amountTTC != null ? String(inv.amountTTC) : "");

    // IMPORTANT: c'est inv.structure maintenant
    setStructure((inv.invoiceStructure as any) ?? "STRUCTURE_1");

    setOpen(true);
  }

  function close() {
    setOpen(false);
    setSaving(false);
    setError("");
    setEditing(null);

    setSupplierMode("existing");
    setSupplierId("");
    setSupplierNewName("");

    setInvoiceDate("");
    setAmountTTC("");
    setStructure("STRUCTURE_1");
  }

  async function submit() {
    setError("");
    if (!editing) return;

    if (!invoiceDate || !amountTTC) {
      setError("Tous les champs sont requis.");
      return;
    }

    if (supplierMode === "existing" && !supplierId) {
      setError("Choisis un fournisseur.");
      return;
    }
    if (supplierMode === "new" && !supplierNewName.trim()) {
      setError("Renseigne le nom du fournisseur.");
      return;
    }

    const ttc = Number(String(amountTTC).replace(",", "."));
    if (!Number.isFinite(ttc) || ttc <= 0) {
      setError("Montant TTC invalide.");
      return;
    }

    setSaving(true);
    try {
      const patch: any = {
        invoiceDate,
        amountTTC: ttc,
        structure, // ✅ plus status
      };

      if (supplierMode === "existing") patch.supplierId = supplierId;
      else patch.supplierName = supplierNewName.trim();

      const updated = await updateInvoice(editing.id, patch);
      onUpdated(updated);

      // refresh suppliers list (optional)
      try {
        const sup = await getSuppliers();
        setSuppliers(sup.items);
      } catch {}

      close();
    } catch (e: any) {
      setError(e?.message ?? "Erreur édition");
    } finally {
      setSaving(false);
    }
  }

  return {
    open,
    setOpen,
    saving,
    error,
    editing,

    supplierMode,
    setSupplierMode,
    supplierId,
    setSupplierId,
    supplierNewName,
    setSupplierNewName,

    invoiceDate,
    setInvoiceDate,
    amountTTC,
    setAmountTTC,

    structure,
    setStructure,

    openEdit,
    close,
    submit,
  };
}
