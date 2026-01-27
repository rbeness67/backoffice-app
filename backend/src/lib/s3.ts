import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "stream";

export const s3 = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

export async function getS3ObjectStream(key: string): Promise<Readable> {
  const bucket = process.env.S3_BUCKET!;
  if (!bucket) throw new Error("Missing S3_BUCKET env var");
  if (!key) throw new Error("Missing S3 key");

  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  const out = await s3.send(cmd);
  if (!out.Body) throw new Error("S3 object has no body");
  return out.Body as Readable;
}

/**
 * Uploads a stream to S3 (streaming, no huge memory usage).
 */
export async function uploadStreamToS3(params: {
  key: string;
  body: Readable;
  contentType?: string;
}) {
  const bucket = process.env.S3_BUCKET!;
  if (!bucket) throw new Error("Missing S3_BUCKET env var");

  const uploader = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType ?? "application/octet-stream",
    },
  });

  await uploader.done();
  return { bucket, key: params.key };
}

/**
 * Presigned GET URL (e.g. valid for 24h)
 */
export async function getPresignedGetUrl(key: string, expiresInSeconds: number) {
  const bucket = process.env.S3_BUCKET!;
  if (!bucket) throw new Error("Missing S3_BUCKET env var");

  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
}
