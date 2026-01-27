import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";

export const s3 = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

/**
 * Returns a Node.js Readable stream for an object stored in S3.
 * `key` is the S3 object key (in your DB this is stored in Document.url).
 */
export async function getS3ObjectStream(key: string): Promise<Readable> {
  const bucket = process.env.S3_BUCKET!;
  if (!bucket) throw new Error("Missing S3_BUCKET env var");
  if (!key) throw new Error("Missing S3 key");

  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const out = await s3.send(cmd);

  if (!out.Body) {
    throw new Error("S3 object has no body");
  }

  // AWS SDK v3 returns a Readable stream in Node
  return out.Body as Readable;
}
