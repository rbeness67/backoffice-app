import { Request, Response } from "express";
import { login } from "./auth.service";

export async function loginController(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    res.json(result);
  } catch {
    res.status(401).json({ message: "Invalid credentials" });
  }
}
