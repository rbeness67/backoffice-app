// frontend/src/pages/Invoices.tsx
import { useEffect, useMemo, useState } from "react";
import {
  createInvoice,
  deleteInvoice,
  getInvoices,
  getNextInvoiceNumber,
  updateInvoice,
  type CreateInvoiceInput,
  type InvoiceRow,
} from "@/api/invoices";
import { getSuppliers, type Supplier } from "@/api/suppliers";
import { presignUpload, uploadToSignedUrl } from "@/api/uploads";
import { getDocumentDownloadUrl } from "@/api/documents";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { MoreHorizontal, Download, Pencil, Trash2, Plus } from "lucide-react";

const STATUSES = ["PAID", "PENDING", "OVERDUE"] as const;

function formatDateFR(d: string) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("fr-FR");
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export default function Invoices() {
  // =========================
  // Table data
  // =========================
  const [items, setItems] = useState<InvoiceRow[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refreshList() {
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
  }

  useEffect(() => {
    refreshList();
  }, []);

  // =========================
  // Create drawer state
  // =========================
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  const [nextNumber, setNextNumber] = useState<string>("");

  const [createSupplierMode, setCreateSupplierMode] = useState<
    "existing" | "new"
  >("existing");
  const [createSupplierId, setCreateSupplierId] = useState("");
  const [createSupplierNewName, setCreateSupplierNewName] = useState("");

  const [createInvoiceDate, setCreateInvoiceDate] = useState("");
  const [createDueDate, setCreateDueDate] = useState("");
  const [createAmountHT, setCreateAmountHT] = useState<string>("");
  const [createStatus, setCreateStatus] = useState<
    (typeof STATUSES)[number]
  >("PENDING");

  const [createFiles, setCreateFiles] = useState<File[]>([]);

  const createAmountTVA = useMemo(() => {
    const ht = Number(createAmountHT);
    if (!Number.isFinite(ht) || ht <= 0) return 0;
    return round2(ht * 0.2);
  }, [createAmountHT]);

  const createAmountTTC = useMemo(() => {
    const ht = Number(createAmountHT);
    if (!Number.isFinite(ht) || ht <= 0) return 0;
    return round2(ht + createAmountTVA);
  }, [createAmountHT, createAmountTVA]);

  function resetCreateForm() {
    setCreateError("");
    setCreateSaving(false);
    setNextNumber("");

    setCreateSupplierMode("existing");
    setCreateSupplierId("");
    setCreateSupplierNewName("");

    setCreateInvoiceDate("");
    setCreateDueDate("");
    setCreateAmountHT("");
    setCreateStatus("PENDING");

    setCreateFiles([]);
  }

  useEffect(() => {
    if (!createOpen) return;

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
  }, [createOpen]);

  async function onCreateInvoice() {
    setCreateError("");

    if (!createInvoiceDate || !createDueDate || !createAmountHT) {
      setCreateError("Tous les champs sont requis.");
      return;
    }

    if (createSupplierMode === "existing" && !createSupplierId) {
      setCreateError("Choisis un fournisseur.");
      return;
    }
    if (createSupplierMode === "new" && !createSupplierNewName.trim()) {
      setCreateError("Renseigne le nom du fournisseur.");
      return;
    }

    const ht = Number(createAmountHT);
    if (!Number.isFinite(ht) || ht <= 0) {
      setCreateError("Montant HT invalide.");
      return;
    }

    if (!createFiles.length) {
      setCreateError("Ajoute au moins un document (PDF ou image).");
      return;
    }

    setCreateSaving(true);
    try {
      const uploadedDocs: CreateInvoiceInput["documents"] = [];

      for (const f of createFiles) {
        const { uploadUrl, key } = await presignUpload(f.name, f.type);
        await uploadToSignedUrl(uploadUrl, f);

        uploadedDocs.push({
          url: key,
          type: f.type === "application/pdf" ? "PDF" : "IMAGE",
        });
      }

      const payload: CreateInvoiceInput = {
        invoiceDate: createInvoiceDate,
        dueDate: createDueDate,
        amountHT: ht,
        amountTVA: createAmountTVA,
        amountTTC: createAmountTTC,
        status: createStatus,
        documents: uploadedDocs,
        ...(createSupplierMode === "existing"
          ? { supplierId: createSupplierId }
          : { supplierName: createSupplierNewName.trim() }),
      };

      const created = await createInvoice(payload);
      setItems((prev) => [created, ...prev]);

      try {
        const sup = await getSuppliers();
        setSuppliers(sup.items);
      } catch {}

      setCreateOpen(false);
      resetCreateForm();
    } catch (e: any) {
      setCreateError(e?.message ?? "Erreur création");
    } finally {
      setCreateSaving(false);
    }
  }

  // =========================
  // Download document
  // =========================
  async function onDownloadFirstDoc(inv: InvoiceRow) {
    try {
      setError("");
      const docId = inv.documents?.[0]?.id;
      if (!docId) {
        setError("Aucun document associé à cette facture.");
        return;
      }
      const { downloadUrl } = await getDocumentDownloadUrl(docId);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setError(e?.message ?? "Erreur téléchargement");
    }
  }

  // =========================
  // Delete flow (confirm dialog)
  // =========================
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<InvoiceRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;

    setDeleting(true);
    try {
      await deleteInvoice(toDelete.id);
      setItems((prev) => prev.filter((x) => x.id !== toDelete.id));
      setDeleteOpen(false);
      setToDelete(null);
    } catch (e: any) {
      setError(e?.message ?? "Erreur suppression");
    } finally {
      setDeleting(false);
    }
  }

  // =========================
  // Edit drawer (v1)
  // =========================
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editing, setEditing] = useState<InvoiceRow | null>(null);

  const [editSupplierMode, setEditSupplierMode] = useState<
    "existing" | "new"
  >("existing");
  const [editSupplierId, setEditSupplierId] = useState("");
  const [editSupplierNewName, setEditSupplierNewName] = useState("");

  const [editInvoiceDate, setEditInvoiceDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAmountHT, setEditAmountHT] = useState<string>("");
  const [editStatus, setEditStatus] = useState<(typeof STATUSES)[number]>("PENDING");

  const editAmountTVA = useMemo(() => {
    const ht = Number(editAmountHT);
    if (!Number.isFinite(ht) || ht <= 0) return 0;
    return round2(ht * 0.2);
  }, [editAmountHT]);

  const editAmountTTC = useMemo(() => {
    const ht = Number(editAmountHT);
    if (!Number.isFinite(ht) || ht <= 0) return 0;
    return round2(ht + editAmountTVA);
  }, [editAmountHT, editAmountTVA]);

  function openEdit(inv: InvoiceRow) {
    setEditing(inv);
    setEditError("");

    setEditSupplierMode("new");
    setEditSupplierId("");
    setEditSupplierNewName(inv.supplierName ?? "");

    const toYMD = (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      return d.toISOString().slice(0, 10);
    };

    setEditInvoiceDate(toYMD(inv.invoiceDate));
    setEditDueDate(toYMD(inv.dueDate));
    setEditAmountHT("");
    setEditStatus((inv.status as any) ?? "PENDING");

    setEditOpen(true);
  }

  async function onUpdateInvoice() {
    setEditError("");
    if (!editing) return;

    if (!editInvoiceDate || !editDueDate || !editAmountHT) {
      setEditError("Tous les champs sont requis (v1).");
      return;
    }

    if (editSupplierMode === "existing" && !editSupplierId) {
      setEditError("Choisis un fournisseur.");
      return;
    }
    if (editSupplierMode === "new" && !editSupplierNewName.trim()) {
      setEditError("Renseigne le nom du fournisseur.");
      return;
    }

    const ht = Number(editAmountHT);
    if (!Number.isFinite(ht) || ht <= 0) {
      setEditError("Montant HT invalide.");
      return;
    }

    setEditSaving(true);
    try {
      const patch: any = {
        invoiceDate: editInvoiceDate,
        dueDate: editDueDate,
        amountHT: ht,
        amountTVA: editAmountTVA,
        amountTTC: editAmountTTC,
        status: editStatus,
      };

      if (editSupplierMode === "existing") patch.supplierId = editSupplierId;
      else patch.supplierName = editSupplierNewName.trim();

      const updated = await updateInvoice(editing.id, patch);
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));

      try {
        const sup = await getSuppliers();
        setSuppliers(sup.items);
      } catch {}

      setEditOpen(false);
      setEditing(null);
    } catch (e: any) {
      setEditError(e?.message ?? "Erreur édition");
    } finally {
      setEditSaving(false);
    }
  }

  // =========================
  // UI
  // =========================
  return (
      <div className="w-full space-y-6 px-4 py-6 md:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Gestion des factures</h1>
          <p className="text-sm text-muted-foreground">
            Upload cloud + téléchargement + édition + suppression.
          </p>
        </div>

        {/* CREATE */}
        <Sheet
          open={createOpen}
          onOpenChange={(v) => {
            setCreateOpen(v);
            if (!v) resetCreateForm();
          }}
        >
          <SheetTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter une facture
            </Button>
          </SheetTrigger>

          <SheetContent className="w-full sm:max-w-lg px-6 sm:px-8">
            <SheetHeader>
              <SheetTitle>Création d'une nouvelle facture</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-6 pb-8">
              {/* Auto invoice number */}
              <div className="space-y-2">
                <Label>Numéro de facture</Label>
                <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                  {nextNumber || "…"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Généré automatiquement (JEL-YY-XXX) basé sur l’année en cours.
                </p>
              </div>

              {/* Supplier */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Fournisseur</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline underline-offset-4"
                    onClick={() => {
                      setCreateSupplierMode((m) => (m === "existing" ? "new" : "existing"));
                      setCreateSupplierId("");
                      setCreateSupplierNewName("");
                    }}
                  >
                    {createSupplierMode === "existing" ? "Créer un nouveau fournisseur" : "Choisir un fournisseur existant"}
                  </button>
                </div>

                {createSupplierMode === "existing" ? (
                  <Select value={createSupplierId} onValueChange={setCreateSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un fournisseur parmi ceux existant" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={createSupplierNewName}
                    onChange={(e) => setCreateSupplierNewName(e.target.value)}
                    placeholder="Nom du fournisseur"
                  />
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="createInvoiceDate">Date facture</Label>
                  <Input
                    id="createInvoiceDate"
                    type="date"
                    value={createInvoiceDate}
                    onChange={(e) => setCreateInvoiceDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createDueDate">Échéance</Label>
                  <Input
                    id="createDueDate"
                    type="date"
                    value={createDueDate}
                    onChange={(e) => setCreateDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Amount + status */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="createAmountHT">Montant HT</Label>
                  <Input
                    id="createAmountHT"
                    inputMode="decimal"
                    value={createAmountHT}
                    onChange={(e) => setCreateAmountHT(e.target.value)}
                    placeholder="100.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={createStatus} onValueChange={(v) => setCreateStatus(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-2">
                <Label>Documents (PDF ou images)</Label>
                <Input
                  type="file"
                  accept="application/pdf,image/*"
                  multiple
                  onChange={(e) => setCreateFiles(Array.from(e.target.files ?? []))}
                />
                {createFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {createFiles.length} fichier(s) sélectionné(s)
                  </p>
                )}
              </div>

              {/* Totals */}
              <div className="rounded-md border bg-muted/20 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TVA (20%)</span>
                  <span>{createAmountTVA.toFixed(2)} €</span>
                </div>
                <div className="mt-2 flex justify-between font-medium">
                  <span>Total TTC</span>
                  <span>{createAmountTTC.toFixed(2)} €</span>
                </div>
              </div>

              {createError && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {createError}
                </div>
              )}

              <div className="flex gap-2">
                <Button className="flex-1" onClick={onCreateInvoice} disabled={createSaving}>
                  {createSaving ? "Création..." : "Créer"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false);
                    resetCreateForm();
                  }}
                  disabled={createSaving}
                >
                  Annuler
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Global error */}
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <div className="rounded-md border">
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {items.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.invoiceNumber}</TableCell>
                      <TableCell>{r.supplierName ?? "—"}</TableCell>
                      <TableCell>{formatDateFR(r.invoiceDate)}</TableCell>
                      <TableCell>{formatDateFR(r.dueDate)}</TableCell>
                      <TableCell className="text-right">
                        {Number(r.amountTTC).toFixed(2)} €
                      </TableCell>
                      <TableCell>{r.status}</TableCell>
                      <TableCell className="text-right">{r.documentsCount}</TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onDownloadFirstDoc(r)}>
                              <Download className="mr-2 h-4 w-4" />
                              Télécharger document
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(r)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Éditer
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setToDelete(r);
                                setDeleteOpen(true);
                              }}
                            >
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

      {/* DELETE CONFIRM */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la facture ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. Les documents resteront dans le cloud pour l’instant.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Annuler
            </Button>
            <Button onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DRAWER (v1) */}
      <Sheet
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) {
            setEditing(null);
            setEditError("");
            setEditSaving(false);
            setEditSupplierMode("existing");
            setEditSupplierId("");
            setEditSupplierNewName("");
            setEditInvoiceDate("");
            setEditDueDate("");
            setEditAmountHT("");
            setEditStatus("PENDING");
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Éditer la facture</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label>Numéro de facture</Label>
              <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                {editing?.invoiceNumber ?? "—"}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Fournisseur</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline underline-offset-4"
                  onClick={() => {
                    setEditSupplierMode((m) => (m === "existing" ? "new" : "existing"));
                    setEditSupplierId("");
                    if (editSupplierMode === "existing" && editing?.supplierName) {
                      setEditSupplierNewName(editing.supplierName);
                    }
                  }}
                >
                  {editSupplierMode === "existing" ? "Créer/choisir par nom" : "Choisir existant"}
                </button>
              </div>

              {editSupplierMode === "existing" ? (
                <Select value={editSupplierId} onValueChange={setEditSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={editSupplierNewName}
                  onChange={(e) => setEditSupplierNewName(e.target.value)}
                  placeholder="Nom du fournisseur"
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="editInvoiceDate">Date facture</Label>
                <Input
                  id="editInvoiceDate"
                  type="date"
                  value={editInvoiceDate}
                  onChange={(e) => setEditInvoiceDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDueDate">Échéance</Label>
                <Input
                  id="editDueDate"
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="editAmountHT">Montant HT</Label>
                <Input
                  id="editAmountHT"
                  inputMode="decimal"
                  value={editAmountHT}
                  onChange={(e) => setEditAmountHT(e.target.value)}
                  placeholder="100.00"
                />
                <p className="text-xs text-muted-foreground">
                  (v1) à remplir manuellement : on ne renvoie pas encore amountHT dans la liste.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border bg-muted/20 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">TVA (20%)</span>
                <span>{editAmountTVA.toFixed(2)} €</span>
              </div>
              <div className="mt-2 flex justify-between font-medium">
                <span>Total TTC</span>
                <span>{editAmountTTC.toFixed(2)} €</span>
              </div>
            </div>

            {editError && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {editError}
              </div>
            )}

            <div className="flex gap-2">
              <Button className="flex-1" onClick={onUpdateInvoice} disabled={editSaving || !editing}>
                {editSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
                Fermer
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
