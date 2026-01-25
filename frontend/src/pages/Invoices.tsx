import styles from "./Invoices.module.css";
import { useEffect, useMemo, useState } from "react";

import { useInvoicesData } from "@/hooks/invoices/useInvoicesData";
import { useInvoiceCreate } from "@/hooks/invoices/useInvoiceCreate";
import { useInvoiceEdit } from "@/hooks/invoices/useInvoiceEdit";
import { useInvoiceDelete } from "@/hooks/invoices/useInvoiceDelete";
import { useInvoiceDownload } from "@/hooks/invoices/useInvoiceDownload";

import { InvoicesHeader } from "@/components/InvoicesHeader/InvoicesHeader";
import { InvoicesTable } from "@/components/InvoicesTable/InvoicesTable";
import { CreateInvoiceSheet } from "@/components/CreateInvoiceSheet/CreateInvoiceSheet";
import { DeleteInvoiceDialog } from "@/components/DeleteInvoiceDialog/DeleteInvoiceDialog";
import { EditInvoiceSheet } from "@/components/EditInvoiceSheet/EditInvoiceSheet";

// shadcn tabs + badge
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// ✅ shadcn Sonner toaster (render once somewhere in your app)
import { Toaster } from "@/components/ui/sonner";
// ✅ sonner API
import { toast } from "sonner";

// single source of truth for names
import { getStructureLabel } from "@/utils/stuctureLabel";

type StructureTab = "all" | string;

function toDateSafe(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelFR(d: Date) {
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** ✅ tiny hook to detect mobile */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);

    const onChange = () => setMatches(mql.matches);
    onChange();

    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

export default function InvoicesPage() {
  const data = useInvoicesData();
  const onDownload = useInvoiceDownload(data.setError);

  const [tab, setTab] = useState<StructureTab>("all");

  // ✅ small screens: show only supplier + amount in table
  const isCompact = useMediaQuery("(max-width: 640px)");

  // ✅ Normalize items so UI always has the fields it needs
  const normalizedItems = useMemo(() => {
    return (data.items ?? []).map((i: any) => {
      const structure = i.structure ?? i.invoiceStructure ?? i.invoice_structure ?? "";
      const supplierName = i.supplierName ?? i.supplier?.name ?? i.supplier_name ?? null;
      const invoiceNumber = i.invoiceNumber ?? i.number ?? i.invoice_number ?? "";

      return {
        ...i,
        structure,
        structureLabel: getStructureLabel(structure),
        supplierName,
        invoiceNumber,
      };
    });
  }, [data.items]);

  // ✅ Structure labels (tabs) derived from actual data
  const structureLabels = useMemo(() => {
    const set = new Set<string>();
    for (const it of normalizedItems) {
      const label = String(it.structureLabel ?? "").trim();
      if (label) set.add(label);
    }
    return Array.from(set);
  }, [normalizedItems]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: normalizedItems.length };
    for (const label of structureLabels) map[label] = 0;

    for (const it of normalizedItems) {
      const label = String(it.structureLabel ?? "").trim();
      if (label && map[label] !== undefined) map[label] += 1;
    }
    return map;
  }, [normalizedItems, structureLabels]);

  const filteredItems = useMemo(() => {
    if (tab === "all") return normalizedItems;
    return normalizedItems.filter((it: any) => it.structureLabel === tab);
  }, [normalizedItems, tab]);

  // ✅ Group the currently displayed items by Month
  const monthGroups = useMemo(() => {
    const sorted = [...filteredItems].sort((a: any, b: any) => {
      const da = toDateSafe(a.invoiceDate);
      const db = toDateSafe(b.invoiceDate);
      const ta = da ? da.getTime() : -Infinity;
      const tb = db ? db.getTime() : -Infinity;
      return tb - ta;
    });

    const map = new Map<string, { key: string; title: string; monthDate: Date | null; items: any[] }>();

    for (const inv of sorted) {
      const d = toDateSafe(inv.invoiceDate);

      if (!d) {
        const k = "no-date";
        if (!map.has(k)) map.set(k, { key: k, title: "Sans date", monthDate: null, items: [] });
        map.get(k)!.items.push(inv);
        continue;
      }

      const k = monthKey(d);
      if (!map.has(k)) {
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        map.set(k, { key: k, title: monthLabelFR(monthStart), monthDate: monthStart, items: [] });
      }
      map.get(k)!.items.push(inv);
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.key === "no-date") return 1;
      if (b.key === "no-date") return -1;
      return (b.monthDate?.getTime() ?? 0) - (a.monthDate?.getTime() ?? 0);
    });
  }, [filteredItems]);

  const create = useInvoiceCreate({
    suppliers: data.suppliers,
    setSuppliers: data.setSuppliers,
    existingInvoices: normalizedItems.map((i: any) => ({
      invoiceDate: i.invoiceDate,
      amountTTC: i.amountTTC,
      structure: i.structure,
      invoiceNumber: i.invoiceNumber,
      supplierName: i.supplierName,
    })),
    onCreated: (created) => {
      data.setItems((prev: any[]) => [created, ...prev]);
      toast.success("Facture créée", {
        description: `${created.invoiceNumber ?? "Facture"} ajoutée avec succès.`,
      });
    },
  });

  const edit = useInvoiceEdit({
    suppliers: data.suppliers,
    setSuppliers: data.setSuppliers,
    onUpdated: (updated) =>
      data.setItems((prev: any[]) => prev.map((x: any) => (x.id === updated.id ? updated : x))),
  });

  const del = useInvoiceDelete({
    onDeleted: (id) => data.setItems((prev: any[]) => prev.filter((x: any) => x.id !== id)),
    setGlobalError: data.setError,
  });

  useEffect(() => {
    if (!data.error) return;
    toast.error("Erreur", { description: data.error });
  }, [data.error]);

  useEffect(() => {
    if (!create.error) return;
    toast.error("Erreur création", { description: create.error });
  }, [create.error]);

  return (
    <div className={styles.page}>
      <InvoicesHeader onCreateClick={() => create.setOpen(true)} />

      {data.error && <div className={styles.globalError}>{data.error}</div>}

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        {/* ✅ No horizontal scroll: tabs wrap */}
        <TabsList className={styles.tabsListNoScroll}>
          <TabsTrigger
            value="all"
            className={`${styles.tabTriggerNoScroll} group gap-2`}
          >
            Toutes les structures
            <Badge variant="secondary" className={styles.badge}>
              {counts.all ?? 0}
            </Badge>
          </TabsTrigger>

          {structureLabels.map((label) => (
            <TabsTrigger
              key={label}
              value={label}
              className={`${styles.tabTriggerNoScroll} group gap-2`}
            >
              {label}
              <Badge variant="secondary" className={styles.badge}>
                {counts[label] ?? 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>



        <TabsContent value={tab} className="mt-4">
          <InvoicesTable
            loading={data.loading}
            items={filteredItems}
            groups={monthGroups}
            onDownload={onDownload}
            onEdit={edit.openEdit}
            onDelete={del.ask}
            compact={isCompact} // ✅ NEW: table will render only Supplier+Amount on small screens
          />
        </TabsContent>
      </Tabs>

      <CreateInvoiceSheet
        open={create.open}
        setOpen={create.setOpen}
        saving={create.saving}
        error={create.error}
        nextNumber={create.nextNumber}
        suppliers={data.suppliers}
        supplierMode={create.supplierMode}
        setSupplierMode={create.setSupplierMode}
        supplierId={create.supplierId}
        setSupplierId={create.setSupplierId}
        supplierNewName={create.supplierNewName}
        setSupplierNewName={create.setSupplierNewName}
        invoiceDate={create.invoiceDate}
        setInvoiceDate={create.setInvoiceDate}
        amountTTC={create.amountTTC}
        setAmountTTC={create.setAmountTTC}
        structure={create.structure}
        setStructure={create.setStructure}
        files={create.files}
        setFiles={create.setFiles}
        confirmDuplicateOpen={create.confirmDuplicateOpen}
        duplicateFound={create.duplicateFound}
        confirmDuplicateAndSubmit={create.confirmDuplicateAndSubmit}
        cancelDuplicate={create.cancelDuplicate}
        onCancel={() => {
          create.setOpen(false);
          create.reset();
        }}
        onSubmit={create.submit}
      />

      <EditInvoiceSheet hook={edit} suppliers={data.suppliers} />
      <DeleteInvoiceDialog hook={del} />

      <Toaster position="top-right" richColors />
    </div>
  );
}
