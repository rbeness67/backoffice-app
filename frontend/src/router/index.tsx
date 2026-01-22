import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "@/auth/ProtectedRoute";
import Login from "@/pages/Login";
import InvoicesPage from "@/pages/Invoices";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route index element={<Navigate to="/invoices" replace />} />
          <Route path="invoices" element={<InvoicesPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/invoices" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
