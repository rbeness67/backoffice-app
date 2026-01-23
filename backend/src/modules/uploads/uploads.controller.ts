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
    .replace(/[^\w\-().]/g, "")
    .slice(0, 80) || "UNKNOWN";
}

function parseYearMonth(invoiceDate: string) {
  const d = String(invoiceDate ?? "").slice(0, 10);
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: m[1], month: m[2] };
}

/**
 * ✅ BACKEND source of truth for S3 structure names
 */
function getStructureLabelBackend(code: string) {
  switch (code) {
    case "STRUCTURE_1":
      return "Cocci Bulles";
    case "STRUCTURE_2":
      return "Mille Et Une Bulles";
    default:
      return code;
  }
}

/**
 * POST /uploads/presign
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

  // ✅ convert STRUCTURE_X → human label → safe S3 segment
  const structureLabel = getStructureLabelBackend(String(structure));
  const structureSeg = sanitize(structureLabel);

  const supplierSeg = sanitize(String(supplierName));
  const invoiceNumberSeg = sanitize(String(invoiceNumber));

  let ext = extFromName(String(filename));
  if (!ext && String(mimeType) === "application/pdf") ext = ".pdf";

  const idx = Number(fileIndex);
  const suffix =
    Number.isFinite(idx) && idx >= 2 ? `_${Math.floor(idx)}` : "";

  /**
   * FINAL PATH:
   * invoices/Cocci_Bulles/2026/01/Orange/FACTURE_JEL-26-004.pdf
   */
  const key = `invoices/${structureSeg}/${ym.year}/${ym.month}/${supplierSeg}/FACTURE_${invoiceNumberSeg}${suffix}${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    ContentType: String(mimeType),
  });

  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 120 });

  return res.json({ uploadUrl, key });
}
