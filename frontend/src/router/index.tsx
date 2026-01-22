import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "@/auth/ProtectedRoute";
import Login from "@/pages/Login";
import InvoicesPage from "@/pages/Invoices";
import AppLayout from "@/layouts/AppLayout";
import Home from "@/pages/Home";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          {/* Layout avec sidebar */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/invoices" element={<InvoicesPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
