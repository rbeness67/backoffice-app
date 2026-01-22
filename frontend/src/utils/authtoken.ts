const TOKEN_KEY = "token";

type JwtPayload = {
  exp?: number; // seconds since epoch
  [k: string]: any;
};

function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isTokenValid(token: string | null): boolean {
  if (!token) return false;

  const payload = parseJwt(token);
  if (!payload) return false;

  // if no exp, consider invalid (safer)
  if (!payload.exp) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp > nowSec;
}

export function getValidToken(): string | null {
  const t = getToken();
  if (!isTokenValid(t)) {
    if (t) clearToken();
    return null;
  }
  return t;
}
