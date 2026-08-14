import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { isDatabaseConfigured, requireDatabase } from "@/db";
import {
  categories,
  crawlRecords,
  crawlTasks,
  licenses,
  sources,
  tags,
  users,
  wallpaperAssets,
  wallpaperAuditLogs,
  wallpaperTags,
  wallpapers,
} from "@/db/schema";

async function main() {
  if (!isDatabaseConfigured()) {
    console.error("DATABASE_URL is required to create a backup.");
    process.exitCode = 1;
    return;
  }

  const db = requireDatabase();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.resolve("backups");
  await mkdir(backupDir, { recursive: true });

  const [wallpaperRows, assetRows, categoryRows, tagRows, wallpaperTagRows, sourceRows, licenseRows, auditRows, crawlTaskRows, crawlRecordRows, userRows] = await Promise.all([
    db.select().from(wallpapers),
    db.select().from(wallpaperAssets),
    db.select().from(categories),
    db.select().from(tags),
    db.select().from(wallpaperTags),
    db.select().from(sources),
    db.select().from(licenses),
    db.select().from(wallpaperAuditLogs),
    db.select().from(crawlTasks),
    db.select().from(crawlRecords),
    db.select().from(users),
  ]);

  const databaseFile = path.join(backupDir, `backup-${timestamp}.json`);
  await writeFile(
    databaseFile,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        counts: {
          wallpapers: wallpaperRows.length,
          assets: assetRows.length,
          categories: categoryRows.length,
          tags: tagRows.length,
          sources: sourceRows.length,
          licenses: licenseRows.length,
          auditLogs: auditRows.length,
          crawlTasks: crawlTaskRows.length,
          crawlRecords: crawlRecordRows.length,
          users: userRows.length,
        },
        tables: {
          wallpapers: wallpaperRows,
          wallpaperAssets: assetRows,
          categories: categoryRows,
          tags: tagRows,
          wallpaperTags: wallpaperTagRows,
          sources: sourceRows,
          licenses: licenseRows,
          wallpaperAuditLogs: auditRows,
          crawlTasks: crawlTaskRows,
          crawlRecords: crawlRecordRows,
          users: userRows,
        },
      },
      null,
      2,
    ),
  );

  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();

  let objectCount = 0;
  let objectFile: string | undefined;
  if (accountId && accessKeyId && secretAccessKey && bucket) {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    const keys: string[] = [];
    let continuationToken: string | undefined;
    do {
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        }),
      );
      for (const item of result.Contents ?? []) {
        if (item.Key) keys.push(item.Key);
      }
      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);
    objectCount = keys.length;
    objectFile = path.join(backupDir, `r2-inventory-${timestamp}.json`);
    await writeFile(objectFile, JSON.stringify({ createdAt: new Date().toISOString(), bucket, objects: keys }, null, 2));
  }

  console.log(`Database backup written to ${databaseFile}`);
  if (objectFile) {
    console.log(`R2 object inventory (${objectCount} objects) written to ${objectFile}`);
  } else {
    console.log("R2 inventory skipped: configure R2_* variables to include object keys.");
  }
}

void main();
