import { Request, Response } from "express";
import { login } from "./auth.service";

export async function loginController(req: Request, res: Response) {
  try {
    const email = String(req.body?.email ?? "");
    const password = String(req.body?.password ?? "");

    const result = await login(email, password);
    return res.json(result);
  } catch (e) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
}
