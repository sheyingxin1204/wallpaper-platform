import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { InfrastructureError } from "@/lib/errors";

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new InfrastructureError(`${name} is required for R2 storage operations.`);
  return value;
};

const client = () =>
  new S3Client({
    region: "auto",
    endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
  });

const bucket = () => required("R2_BUCKET");

// When a custom public domain is configured, optimized variants can be served
// directly from R2 instead of through a per-request presigned URL. Returns null
// when no domain is set so callers keep using private presigned links.
export function publicAssetUrl(key: string) {
  const base = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/${key}`;
}

export async function createR2UploadUrl(input: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresInSeconds: number;
}) {
  return getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: input.key,
      ContentType: input.contentType,
      ContentLength: input.contentLength,
    }),
    { expiresIn: input.expiresInSeconds },
  );
}

export async function headR2Object(key: string) {
  return client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
}

export async function readR2Object(key: string): Promise<Buffer> {
  const response = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!response.Body) throw new Error(`R2 object ${key} has no body.`);
  return Buffer.from(await response.Body.transformToByteArray());
}

export async function createR2DownloadUrl(input: {
  key: string;
  expiresInSeconds: number;
  contentType?: string;
  downloadFilename?: string;
}) {
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: input.key,
    ...(input.contentType ? { ResponseContentType: input.contentType } : {}),
    ...(input.downloadFilename
      ? { ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(input.downloadFilename)}` }
      : {}),
  });
  return getSignedUrl(client(), command, { expiresIn: input.expiresInSeconds });
}

export async function writeR2Object(input: { key: string; body: Buffer; contentType: string }) {
  await client().send(
    new PutObjectCommand({ Bucket: bucket(), Key: input.key, Body: input.body, ContentType: input.contentType }),
  );
}

export async function deleteR2Object(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
