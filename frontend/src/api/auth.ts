import { setToken } from "@/utils/authtoken";

export async function login(email: string, password: string) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("LOGIN ERROR", res.status, txt);
    throw new Error("Invalid credentials");
  }

  const data = (await res.json()) as { token: string };
  setToken(data.token);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
}
