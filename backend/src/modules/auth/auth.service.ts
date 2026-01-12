import prisma from "../../prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function login(email: string, password: string) {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  const normalizedPassword = String(password ?? "").trim();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) throw new Error("Invalid email");

  const isValid = await bcrypt.compare(normalizedPassword, user.password);
  if (!isValid) throw new Error("Invalid password");

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");

  const token = jwt.sign({ userId: user.id, role: user.role }, secret, { expiresIn: "7d" });
  return { token };
}
