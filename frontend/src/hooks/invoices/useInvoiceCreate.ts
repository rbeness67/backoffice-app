import { useEffect, useState } from "react";
import {
  createInvoice,
  getNextInvoiceNumber,
  type CreateInvoiceInput,
} from "@/api/invoices";
import { getSuppliers, type Supplier } from "@/api/suppliers";
import { presignUpload, uploadToSignedUrl } from "@/api/uploads";
import { type InvoiceStructure } from "../../utils/format";

function slugify(input: string) {
  return (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function normalizeDateToYMD(value: string) {
  const s = String(value ?? "").trim();
  return s.length >= 10 ? s.slice(0, 10) : s; // supports ISO too
}

function getYearMonth(dateStr: string) {
  const d = normalizeDateToYMD(dateStr); // YYYY-MM-DD
  return { year: d.slice(0, 4), month: d.slice(5, 7) };
}

function getExtension(filename: string, fallbackMime?: string) {
  const parts = (filename || "").split(".");
  if (parts.length > 1) return parts.pop()!.toLowerCase();

  // fallback from mime type
  if (fallbackMime === "application/pdf") return "pdf";
  if (fallbackMime?.startsWith("image/")) return fallbackMime.split("/")[1] || "png";
  return "bin";
}

export function useInvoiceCreate(opts: {
  suppliers: Supplier[];
  setSuppliers: (s: Supplier[]) => void;
  onCreated: (created: any) => void; // can be InvoiceRow if you import it
}) {
  const { suppliers, setSuppliers, onCreated } = opts;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [nextNumber, setNextNumber] = useState("");

  const [supplierMode, setSupplierMode] = useState<"existing" | "new">("existing");
  const [supplierId, setSupplierId] = useState("");
  const [supplierNewName, setSupplierNewName] = useState("");

  const [invoiceDate, setInvoiceDate] = useState("");
  const [amountTTC, setAmountTTC] = useState<string>("");
  const [structure, setStructure] = useState<InvoiceStructure>("STRUCTURE_1");
  const [files, setFiles] = useState<File[]>([]);

  function reset() {
    setError("");
    setSaving(false);
    setNextNumber("");

    setSupplierMode("existing");
    setSupplierId("");
    setSupplierNewName("");

    setInvoiceDate("");
    setAmountTTC("");
    setStructure("STRUCTURE_1");

    setFiles([]);
  }

  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const [{ nextNumber }, sup] = await Promise.all([
          getNextInvoiceNumber(),
          suppliers.length ? Promise.resolve({ items: suppliers }) : getSuppliers(),
        ]);
        setNextNumber(nextNumber);
        if (!suppliers.length) setSuppliers(sup.items);
      } catch (e: any) {
        console.error(e?.message ?? e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    setError("");

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

    if (!files.length) {
      setError("Ajoute au moins un document (PDF ou image).");
      return;
    }

    // IMPORTANT: with the requested naming scheme, best to allow only 1 file
    // because key ends with FACTURE_XXX.ext. Multiple files would collide.
    if (files.length > 1) {
      setError("Un seul document est autorisé (sinon le nom de fichier entrerait en conflit).");
      return;
    }

    setSaving(true);
    try {
      const uploadedDocs: CreateInvoiceInput["documents"] = [];

      const supplierName =
        supplierMode === "existing"
          ? suppliers.find((s) => s.id === supplierId)?.name || "UNKNOWN_SUPPLIER"
          : supplierNewName.trim();

      const { year, month } = getYearMonth(invoiceDate);

      const structureFolder = slugify(String(structure));
      const supplierFolder = slugify(supplierName);

      const invoiceName = `FACTURE_${slugify(nextNumber || "INVOICE")}`;
      const ext = getExtension(files[0].name, files[0].type);

      const key = `${structureFolder}/${year}/${month}/${supplierFolder}/${invoiceName}.${ext}`;

      // ✅ NEW: ask backend to presign for this key
      const { uploadUrl, key: returnedKey } = await presignUpload({
        key,
        mimeType: files[0].type,
        filename: `${invoiceName}.${ext}`, // optional
      });

      // use returnedKey in case backend changes/normalizes it
      await uploadToSignedUrl(uploadUrl, files[0]);

      uploadedDocs.push({
        url: returnedKey,
        type: files[0].type === "application/pdf" ? "PDF" : "IMAGE",
      });

      const payload: CreateInvoiceInput = {
        invoiceDate: normalizeDateToYMD(invoiceDate),
        amountTTC: ttc,
        structure,
        documents: uploadedDocs,
        ...(supplierMode === "existing"
          ? { supplierId }
          : { supplierName: supplierNewName.trim() }),
      };

      const created = await createInvoice(payload);
      onCreated(created);

      // refresh suppliers list (optional)
      try {
        const sup = await getSuppliers();
        setSuppliers(sup.items);
      } catch {}

      setOpen(false);
      reset();
    } catch (e: any) {
      setError(e?.message ?? "Erreur création");
    } finally {
      setSaving(false);
    }
  }

  return {
    open,
    setOpen,
    saving,
    error,
    nextNumber,

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

    files,
    setFiles,

    reset,
    submit,
  };
}
