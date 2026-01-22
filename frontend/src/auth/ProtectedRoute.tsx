import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/auth/useAuth";

export default function ProtectedRoute() {
  const { isAuthed } = useAuth();
  const location = useLocation();

  if (!isAuthed) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}
