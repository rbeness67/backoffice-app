import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Toaster } from "@/components/ui/sonner";

export default function AppLayout() {
  return (
    <div className="min-h-svh flex">
      <Sidebar />

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>

      {/* ✅ shadcn Sonner */}
      <Toaster position="top-right" richColors />
    </div>
  );
}
