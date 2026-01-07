import { NavLink } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const linkBase =
  "block rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted";
const linkActive = "bg-muted font-medium";

export default function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      <div className="px-4 py-4">
        <div className="text-lg font-semibold">Back-office</div>
        <div className="text-xs text-muted-foreground">v0</div>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 p-3">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : ""}`
          }
        >
          Accueil
        </NavLink>

        <NavLink
          to="/invoices"
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
    </aside>
  );
}
