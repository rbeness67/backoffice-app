import { Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../../lib/s3";
import crypto from "crypto";

function extFromName(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i) : "";
}

export async function presignUpload(req: Request, res: Response) {
  const { filename, mimeType } = req.body ?? {};

  if (!filename || !mimeType) {
    return res.status(400).json({ message: "filename and mimeType required" });
  }

  const id = crypto.randomUUID();
  const ext = extFromName(String(filename));
  const key = `invoices/uploads/${id}${ext}`; // clé cloud

  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    ContentType: String(mimeType),
  });

  // URL temporaire (ex: 2 minutes)
  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 120 });

  return res.json({ uploadUrl, key });
}
