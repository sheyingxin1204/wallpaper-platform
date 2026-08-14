import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  // The schema is MySQL-compatible; runtime queries use TiDB's HTTPS
  // serverless driver, while Drizzle Kit still emits MySQL migrations.
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
