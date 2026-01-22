import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoutes from "./auth/ProtectedRoute";

import Login from "@/pages/Login";
import InvoicesPage from "@/pages/Invoices";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoutes />}>
          <Route path="/" element={<Navigate to="/invoices" replace />} />
          <Route path="/invoices" element={<InvoicesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/invoices" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
