import { drizzle } from "drizzle-orm/tidb-serverless";
import * as schema from "./schema";

// TiDB Cloud's serverless driver uses HTTPS, so the same client works in
// local Node.js processes and Cloudflare Workers without a TCP connection pool.
// The invalid fallback keeps route/build checks importable without secrets; the
// explicit guard below prevents any real query from using it.
const databaseUrl = process.env.DATABASE_URL?.trim();
const configured = Boolean(databaseUrl);
export const db = drizzle(databaseUrl || "mysql://invalid:invalid@127.0.0.1:4000/wallpaper_platform", { schema });

export function requireDatabase() {
  if (!configured) throw new Error("DATABASE_URL is required for database access.");
  return db;
}

export function isDatabaseConfigured() {
  return configured;
}

export { schema };
