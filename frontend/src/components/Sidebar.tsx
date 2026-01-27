import { NavLink } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import styles from "./Sidebar.module.css";

type SidebarProps = {
  onNavigate?: () => void;
};

export default function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>Back-office SARL Jelato</div>
        <div className={styles.subtitle}>Gestion interne</div>
      </div>

      <Separator />

      <nav className={styles.nav}>
        <NavLink
          to="/"
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            `${styles.linkBase} ${isActive ? styles.linkActive : styles.linkInactive}`
          }
        >
          Accueil
        </NavLink>

        <NavLink
          to="/invoices"
          onClick={onNavigate}
          className={({ isActive }) =>
            `${styles.linkBase} ${isActive ? styles.linkActive : styles.linkInactive}`
          }
        >
          Gestion des factures
        </NavLink>
      </nav>


      <div className={styles.footer}>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            localStorage.removeItem("token");
            window.location.href = "/login";
          }}
        >
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}
