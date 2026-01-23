import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import styles from "./InvoicesHeader.module.css";

export function InvoicesHeader(props: { onCreateClick: () => void }) {
  return (
    <div className={styles.header}>
      <div className={styles.titleBlock}>
        <h1 className={styles.title}>Gestion des factures</h1>
      </div>

      <Button className="gap-2" onClick={props.onCreateClick}>
        <Plus className="h-4 w-4" />
        Ajouter une facture
      </Button>
    </div>
  );
}
