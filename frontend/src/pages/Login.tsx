import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/auth/useAuth";

export default function Login() {
  const { isAuthed, login, loginLoading, loginError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;

  const [email, setEmail] = useState("rayane@test.com");
  const [password, setPassword] = useState("Rayane2406!");
  const [localError, setLocalError] = useState("");

  useEffect(() => setLocalError(""), [email, password]);

  // ✅ only happens when token is valid
  if (isAuthed) return <Navigate to="/invoices" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError("");

    try {
      await login(email, password);
      const to = location?.state?.from || "/invoices";
      navigate(to, { replace: true });
    } catch {
      setLocalError("Email ou mot de passe incorrect");
    }
  }

  const errorToShow = localError || loginError;

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {errorToShow && <p className="text-sm text-red-500">{errorToShow}</p>}

            <Button className="w-full" type="submit" disabled={loginLoading}>
              {loginLoading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
