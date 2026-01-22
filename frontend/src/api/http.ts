import { getToken } from "../utils/authtoken";

export class ApiError extends Error {
  status: number;
  bodyText?: string;

  constructor(message: string, status: number, bodyText?: string) {
    super(message);
    this.status = status;
    this.bodyText = bodyText;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const base = import.meta.env.VITE_API_URL;
  if (!base) throw new Error("VITE_API_URL is missing");

  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const auth = init.auth !== false; // default true
  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new ApiError(`API error ${res.status}`, res.status, txt);
  }

  // handle empty response
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
