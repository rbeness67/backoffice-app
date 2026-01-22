import { Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../../lib/s3";

function extFromName(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i) : "";
}

function sanitize(input: string) {
  return String(input ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-().]/g, "") // keep letters/numbers/_-().
    .slice(0, 80) || "UNKNOWN";
}

function parseYearMonth(invoiceDate: string) {
  const d = String(invoiceDate ?? "").slice(0, 10);
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: m[1], month: m[2] };
}

/**
 * POST /uploads/presign
 * body: {
 *   filename: string,
 *   mimeType: string,
 *   invoiceDate: string (YYYY-MM-DD),
 *   supplierName: string,
 *   invoiceNumber: string,
 *   structure: string,
 *   fileIndex?: number (1-based)
 * }
 */
export async function presignUpload(req: Request, res: Response) {
  const {
    filename,
    mimeType,
    invoiceDate,
    supplierName,
    invoiceNumber,
    structure,
    fileIndex,
  } = req.body ?? {};

  if (!filename || !mimeType) {
    return res.status(400).json({ message: "filename and mimeType required" });
  }
  if (!invoiceDate || !supplierName || !invoiceNumber || !structure) {
    return res.status(400).json({
      message:
        "invoiceDate, supplierName, invoiceNumber and structure are required",
    });
  }

  const ym = parseYearMonth(String(invoiceDate));
  if (!ym) {
    return res.status(400).json({ message: "invoiceDate must be YYYY-MM-DD" });
  }

  const structureSeg = sanitize(String(structure));
  const supplierSeg = sanitize(String(supplierName));
  const invoiceNumberSeg = sanitize(String(invoiceNumber));

  // extension: prefer filename extension; fallback for PDF
  let ext = extFromName(String(filename));
  if (!ext && String(mimeType) === "application/pdf") ext = ".pdf";

  // If multiple files, add suffix _2, _3... (keep first without suffix)
  const idx = Number(fileIndex);
  const suffix =
    Number.isFinite(idx) && idx >= 2 ? `_${Math.floor(idx)}` : "";

  // ✅ NEW PATH FORMAT:
  // invoices/<STRUCTURE>/<YEAR>/<MONTH>/<SUPPLIER>/FACTURE_<INVOICE_NUMBER>.pdf
  const key = `invoices/${structureSeg}/${ym.year}/${ym.month}/${supplierSeg}/FACTURE_${invoiceNumberSeg}${suffix}${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    ContentType: String(mimeType),
  });

  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 120 });

  return res.json({ uploadUrl, key });
}
