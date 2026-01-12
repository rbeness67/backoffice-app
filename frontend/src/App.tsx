import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoutes from "@/utils/ProtectedRoutes";

// pages
import LoginPage from "@/pages/Login"; // <- adjust if different
import InvoicesPage from "@/pages/Invoices"; // your invoices page

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route element={<ProtectedRoutes />}>
          <Route path="/" element={<Navigate to="/invoices" replace />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          {/* add more protected pages here */}
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/invoices" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
