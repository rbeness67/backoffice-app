import { NavLink } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

type SidebarProps = {
  onNavigate?: () => void;
};

const linkBase =
  "block rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
const linkActive = "bg-muted font-medium";

export default function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full min-h-svh flex-col bg-background">
      <div className="px-4 py-4">
        <div className="text-lg font-semibold leading-tight">
          Back-office SARL Jelato
        </div>
        <div className="text-xs text-muted-foreground mt-1">Gestion interne</div>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 p-3">
        <NavLink
          to="/"
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : ""}`
          }
        >
          Accueil
        </NavLink>

        <NavLink
          to="/invoices"
          onClick={onNavigate}
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : ""}`
          }
        >
          Gestion des factures
        </NavLink>
      </nav>

      <Separator />

      <div className="p-3">
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
