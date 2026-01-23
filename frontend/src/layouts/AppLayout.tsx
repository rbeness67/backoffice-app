import { Outlet } from "react-router-dom";
import { useState } from "react";

import Sidebar from "../components/Sidebar";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function AppLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-svh flex">
      {/* ✅ Desktop sidebar only */}
      <aside className="hidden md:block w-64 shrink-0 border-r bg-background">
        <Sidebar />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* ✅ Mobile top bar + burger */}
        <header className="md:hidden sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
          <div className="h-14 px-3 flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Ouvrir le menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="p-0 w-[280px]">
                {/* ✅ Sidebar in drawer (mobile) */}
                <Sidebar onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">Back-office</div>
              <div className="text-xs text-muted-foreground truncate">
                SARL Jelato
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
