import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../../lib/s3";

export async function getDocumentDownloadUrl(req: Request, res: Response) {
  const { id } = req.params;

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, url: true, type: true },
  });

  if (!doc) return res.status(404).json({ message: "Document not found" });

  const cmd = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: doc.url, // doc.url = key S3
  });

  const downloadUrl = await getSignedUrl(s3, cmd, { expiresIn: 120 }); // 2 minutes
  return res.json({ downloadUrl });
}
