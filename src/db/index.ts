import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import * as schema from "./schema";

// Creating a pool is lazy; the explicit guard below keeps builds from requiring
// production secrets while still producing a clear runtime error for requests.
const databaseUrl = process.env.DATABASE_URL ?? "mysql://invalid:invalid@127.0.0.1:3306/wallpaper_platform";
const configured = Boolean(process.env.DATABASE_URL);
const pool = createPool({ uri: databaseUrl, connectionLimit: 5 });

export const db = drizzle(pool, { schema, mode: "default" });

export function requireDatabase() {
  if (!configured) throw new Error("DATABASE_URL is required for database access.");
  return db;
}

export function isDatabaseConfigured() {
  return configured;
}

export { schema };
