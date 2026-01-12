import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { getToken } from "@/utils/authtoken";

export default function ProtectedRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = getToken();
    if (!token) navigate("/login", { replace: true });
  }, [navigate]);

  return <Outlet />;
}
