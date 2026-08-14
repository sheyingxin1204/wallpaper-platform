import { drizzle } from "drizzle-orm/tidb-serverless";
import * as schema from "./schema";

// TiDB Cloud's serverless driver uses HTTPS, so the same client works in
// local Node.js processes and Cloudflare Workers without a TCP connection pool.
// Only accept a complete `mysql://user:pass@host/db` connection string; empty
// or malformed placeholders must not be treated as a configured database.
function parseDatabaseUrl(raw: string | undefined) {
  const value = raw?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (
      url.protocol === "mysql:" &&
      url.hostname &&
      url.username &&
      url.password &&
      url.pathname &&
      url.pathname !== "/"
    ) {
      return value;
    }
  } catch {
    // Ignore malformed values so pages render without a database configured.
  }
  return undefined;
}

const databaseUrl = parseDatabaseUrl(process.env.DATABASE_URL);
// The fallback keeps route/build checks importable without secrets; the guard
// below prevents any real query from using it.
export const db = drizzle(databaseUrl ?? "mysql://invalid:invalid@127.0.0.1:4000/wallpaper_platform", { schema });

export function requireDatabase() {
  if (!databaseUrl) throw new Error("DATABASE_URL is required for database access.");
  return db;
}

export function isDatabaseConfigured() {
  return Boolean(databaseUrl);
}

export { schema };
