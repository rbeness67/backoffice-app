import { Request, Response } from "express";
import { login } from "./auth.service";

export async function loginController(req: Request, res: Response) {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");

    // 🔍 DEBUG (safe)
    console.log("[LOGIN] email:", email);
    console.log("[LOGIN] password length:", password.length);

    const result = await login(email, password);
    return res.json(result);
  } catch (e: any) {
    const msg = String(e?.message ?? "");

    console.error("[LOGIN ERROR]", msg);

    // erreurs serveur (ex: JWT_SECRET manquant)
    if (msg.includes("JWT_SECRET")) {
      console.error("LOGIN SERVER MISCONFIG:", e);
      return res.status(500).json({ message: "Server misconfigured" });
    }

    return res.status(401).json({ message: "Invalid credentials" });
  }
}
