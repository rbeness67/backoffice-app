import { NavLink } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

type SidebarProps = {
  onNavigate?: () => void;
};

const linkBase =
  "block rounded-md px-3 py-2 text-sm font-medium transition-all " +
  "outline-none focus-visible:ring-2 focus-visible:ring-ring/50 " +
  "focus-visible:ring-offset-2";

const linkInactive =
  "text-foreground hover:bg-muted";

const linkActive =
  "bg-primary text-primary-foreground hover:bg-primary/90";

export default function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full min-h-svh flex-col bg-background">
      <div className="px-4 py-4">
        <div className="text-lg font-semibold leading-tight">
          Back-office SARL Jelato
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Gestion interne
        </div>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 p-3">
        <NavLink
          to="/"
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkInactive}`
          }
        >
          Accueil
        </NavLink>

        <NavLink
          to="/invoices"
          onClick={onNavigate}
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkInactive}`
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
