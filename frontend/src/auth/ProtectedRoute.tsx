import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/auth/useAuth";

export default function ProtectedRoutes() {
  const { isAuthed } = useAuth();
  const location = useLocation();

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
