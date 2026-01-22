import { Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../../lib/s3";
import crypto from "crypto";

function extFromName(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i) : "";
}

// keep path safe (no slashes, weird chars)
function sanitizePathSegment(input: string) {
  return String(input ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-().]/g, "") // keep letters/numbers/_-().
    .slice(0, 80) || "UNKNOWN";
}

function parseYearMonth(invoiceDate: string) {
  // expects YYYY-MM-DD (or ISO). We'll take first 10 chars.
  const d = String(invoiceDate ?? "").slice(0, 10);
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: m[1], month: m[2] };
}

export async function presignUpload(req: Request, res: Response) {
  const { filename, mimeType, invoiceDate, supplierName } = req.body ?? {};

  if (!filename || !mimeType) {
    return res.status(400).json({ message: "filename and mimeType required" });
  }

  // We need these to build invoices/YEAR/MONTH/FOURNISSEUR/...
  if (!invoiceDate || !supplierName) {
    return res.status(400).json({
      message: "invoiceDate and supplierName required to build S3 key",
    });
  }

  const ym = parseYearMonth(String(invoiceDate));
  if (!ym) {
    return res.status(400).json({ message: "invoiceDate must be YYYY-MM-DD" });
  }

  const ext = extFromName(String(filename));
  const id = crypto.randomUUID();

  const supplierSeg = sanitizePathSegment(String(supplierName));
  const key = `invoices/${ym.year}/${ym.month}/${supplierSeg}/${id}${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    ContentType: String(mimeType),
  });

  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 120 });

  return res.json({ uploadUrl, key });
}
