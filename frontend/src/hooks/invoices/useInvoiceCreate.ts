import { useEffect, useMemo, useState } from "react";
import {
  createInvoice,
  getNextInvoiceNumber,
  type CreateInvoiceInput,
  type InvoiceRow,
} from "@/api/invoices";
import { getSuppliers, type Supplier } from "@/api/suppliers";
import { presignUpload, uploadToSignedUrl } from "@/api/uploads";
import { type InvoiceStructure } from "@/utils/format";

type ExistingInvoiceLike = {
  invoiceDate: string;
  amountTTC: number | string;
  invoiceStructure?: string;
  structure?: string;
  invoiceNumber?: string;
  supplierName?: string | null;
};

function normalizeDate(value: string) {
  const s = String(value ?? "").trim();
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function normalizeAmountToCents(value: number | string) {
  const n = Number(String(value).replace(",", ".").trim());
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

function normalizeStructure(inv: ExistingInvoiceLike) {
  // some places use invoiceStructure, others structure
  return String(inv.invoiceStructure ?? inv.structure ?? "").trim();
}

export function useInvoiceCreate(opts: {
  suppliers: Supplier[];
  setSuppliers: (s: Supplier[]) => void;
  onCreated: (created: InvoiceRow) => void;
  existingInvoices: ExistingInvoiceLike[];
}) {
  const { suppliers, setSuppliers, onCreated, existingInvoices } = opts;

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

  // duplicate confirmation
  const [confirmDuplicateOpen, setConfirmDuplicateOpen] = useState(false);
  const [duplicateFound, setDuplicateFound] = useState<{
    number?: string;
    supplierName?: string;
  } | null>(null);

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

    setConfirmDuplicateOpen(false);
    setDuplicateFound(null);
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

  const potentialDuplicate = useMemo(() => {
    const d = normalizeDate(invoiceDate);
    const cents = normalizeAmountToCents(amountTTC);
    const s = String(structure).trim();

    if (!d || !Number.isFinite(cents) || cents <= 0 || !s) return null;

    return (
      (existingInvoices ?? []).find((inv) => {
        const invD = normalizeDate(inv.invoiceDate);
        const invC = normalizeAmountToCents(inv.amountTTC);
        const invS = normalizeStructure(inv);
        return invD === d && invC === cents && invS === s;
      }) ?? null
    );
  }, [existingInvoices, invoiceDate, amountTTC, structure]);

  useEffect(() => {
    setConfirmDuplicateOpen(false);
    setDuplicateFound(null);
  }, [invoiceDate, amountTTC, structure, supplierMode, supplierId, supplierNewName]);

  function resolveSupplierName() {
    if (supplierMode === "new") return supplierNewName.trim();
    const found = suppliers.find((s) => s.id === supplierId);
    return found?.name ?? "";
  }

  async function doCreate() {
    setSaving(true);
    setError("");

    try {
      const normalizedInvoiceDate = normalizeDate(invoiceDate);
      const ttc = Number(String(amountTTC).replace(",", "."));

      const supplierNameForKey = resolveSupplierName();
      if (!supplierNameForKey) {
        throw new Error("Impossible de déterminer le fournisseur.");
      }

      // invoice number used for S3 filename
      const invoiceNumberForKey = String(nextNumber ?? "").trim();
      if (!invoiceNumberForKey) {
        throw new Error("Numéro de facture indisponible.");
      }

      const uploadedDocs: CreateInvoiceInput["documents"] = [];

      // Desired key format:
      // invoices/<STRUCTURE>/<YEAR>/<MONTH>/<SUPPLIER>/FACTURE_<INVOICE_NUMBER>.pdf
      // If multiple files: ..._2.pdf, ..._3.pdf
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const fileIndex = i + 1;

        const { uploadUrl, key } = await presignUpload({
          filename: f.name,
          mimeType: f.type,
          invoiceDate: normalizedInvoiceDate,
          supplierName: supplierNameForKey,
          invoiceNumber: invoiceNumberForKey,
          structure: String(structure),
          fileIndex,
        });

        await uploadToSignedUrl(uploadUrl, f);

        uploadedDocs.push({
          url: key,
          type: f.type === "application/pdf" ? "PDF" : "IMAGE",
        });
      }

      const payload: CreateInvoiceInput = {
        invoiceDate: normalizedInvoiceDate,
        amountTTC: ttc,
        structure: String(structure),
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

    if (potentialDuplicate) {
      setDuplicateFound({
        number: potentialDuplicate.invoiceNumber,
        supplierName: potentialDuplicate.supplierName ?? undefined, // null -> undefined
      });
      setConfirmDuplicateOpen(true);
      return;
    }

    await doCreate();
  }

  async function confirmDuplicateAndSubmit() {
    setConfirmDuplicateOpen(false);
    await doCreate();
  }

  function cancelDuplicate() {
    setConfirmDuplicateOpen(false);
    setDuplicateFound(null);
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

    confirmDuplicateOpen,
    duplicateFound,
    confirmDuplicateAndSubmit,
    cancelDuplicate,

    reset,
    submit,
  };
}
