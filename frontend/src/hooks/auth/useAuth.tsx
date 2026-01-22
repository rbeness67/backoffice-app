import React, { createContext, useContext, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginApi } from "@/api/auth";
import { clearToken, getValidToken, setToken } from "@/utils/authToken";

type AuthContextValue = {
  token: string | null;
  isAuthed: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loginLoading: boolean;
  loginError: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();

  // ✅ only keep token if it's valid (not expired, well-formed)
  const [token, setTokenState] = useState<string | null>(() => getValidToken());
  const [loginError, setLoginError] = useState("");

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginApi(email, password),

    onSuccess: (data) => {
      setToken(data.token);
      setTokenState(data.token);
      setLoginError("");
      qc.clear();
    },

    onError: (e: any) => {
      const msg =
        e?.status === 401 || String(e?.bodyText ?? "").toLowerCase().includes("invalid")
          ? "Email ou mot de passe incorrect"
          : "Erreur serveur (login)";
      setLoginError(msg);
    },
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isAuthed: !!token,
      loginLoading: loginMutation.isPending,
      loginError,
      login: async (email: string, password: string) => {
        await loginMutation.mutateAsync({
          email: email.trim(),
          password,
        });
      },
      logout: () => {
        clearToken();
        setTokenState(null);
        qc.clear();
      },
    }),
    [token, loginMutation, qc, loginError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
