import { apiFetch } from "@/api/http";

export type LoginResponse = { token: string };

export function loginApi(email: string, password: string) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    auth: false, // no token needed for login
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}
