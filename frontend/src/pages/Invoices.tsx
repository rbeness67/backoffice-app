import styles from "./Invoices.module.css";
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

export default function InvoicesPage() {
  const data = useInvoicesData();

  const onDownload = useInvoiceDownload(data.setError);

  const create = useInvoiceCreate({
    suppliers: data.suppliers,
    setSuppliers: data.setSuppliers,
    existingInvoices: (data.items ?? []).map((i: any) => ({
      invoiceDate: i.invoiceDate,
      amountTTC: i.amountTTC,
      structure: i.structure,
      number: i.number,
      supplierName: i.supplier?.name,
    })),
    onCreated: (created) => data.setItems((prev) => [created, ...prev]),
  });

  const edit = useInvoiceEdit({
    suppliers: data.suppliers,
    setSuppliers: data.setSuppliers,
    onUpdated: (updated) =>
      data.setItems((prev) => prev.map((x: any) => (x.id === updated.id ? updated : x))),
  });

  const del = useInvoiceDelete({
    onDeleted: (id) => data.setItems((prev) => prev.filter((x: any) => x.id !== id)),
    setGlobalError: data.setError,
  });

  return (
    <div className={styles.page}>
      <InvoicesHeader onCreateClick={() => create.setOpen(true)} />

      {data.error && <div className={styles.globalError}>{data.error}</div>}

      <InvoicesTable
        loading={data.loading}
        items={data.items}
        onDownload={onDownload}
        onEdit={edit.openEdit}
        onDelete={del.ask}
      />

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
    </div>
  );
}
