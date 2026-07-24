import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for R2 storage operations.`);
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

export async function writeR2Object(input: { key: string; body: Buffer; contentType: string }) {
  await client().send(
    new PutObjectCommand({ Bucket: bucket(), Key: input.key, Body: input.body, ContentType: input.contentType }),
  );
}

export async function deleteR2Object(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
