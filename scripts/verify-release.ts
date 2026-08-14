import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseDatabaseUrl } from "@/db";

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

const root = process.cwd();

function check(name: string, condition: boolean, detail?: string) {
  checks.push({ name, ok: condition, detail });
}

function envValue(key: string) {
  return env.get(key)?.replace(/^"|"$/g, "").trim() ?? "";
}

function looksLikePlaceholder(value: string) {
  const normalized = value.toLowerCase();
  return value.length < 8 || ["xx", "xxxx", "changeme", "placeholder", "your-", "example"].some((marker) => normalized.includes(marker));
}

for (const file of [
  "open-next.config.ts",
  "wrangler.jsonc",
  "patches/@opennextjs__cloudflare.patch",
  "src/db/migrations",
  ".github/workflows/deploy.yml",
  ".github/workflows/migrate.yml",
  ".github/workflows/ci.yml",
]) {
  check(`required file ${file}`, existsSync(path.join(root, file)));
}

const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
for (const script of ["release:check", "cf:build", "cf:deploy", "db:migrate", "backup", "e2e"]) {
  check(`package script ${script}`, Boolean(packageJson.scripts?.[script]));
}

const gitStatus = execSync("git status --porcelain", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
check("git working tree is clean", gitStatus.length === 0, gitStatus || undefined);

const envFiles = [".env.local", ".env"];
const envSource = envFiles
  .map((file) => path.join(root, file))
  .filter((file) => existsSync(file))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
const env = new Map<string, string>();
for (const line of envSource.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (match) env.set(match[1], match[2]);
}

const databaseUrl = parseDatabaseUrl(env.get("DATABASE_URL"));
check("DATABASE_URL is a valid TiDB serverless connection string", Boolean(databaseUrl));

for (const key of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]) {
  const value = envValue(key);
  check(`env ${key} is configured`, Boolean(value) && !looksLikePlaceholder(value), value ? `${value.length} chars` : "missing");
}

check("BETTER_AUTH_SECRET is at least 32 characters", envValue("BETTER_AUTH_SECRET").length >= 32, `${envValue("BETTER_AUTH_SECRET").length} chars`);
check("BETTER_AUTH_URL is a valid URL", Boolean(envValue("BETTER_AUTH_URL") && new URL(envValue("BETTER_AUTH_URL")).protocol.startsWith("http")));
check("NEXT_PUBLIC_SITE_URL is a valid URL", Boolean(envValue("NEXT_PUBLIC_SITE_URL") && new URL(envValue("NEXT_PUBLIC_SITE_URL")).protocol.startsWith("http")), envValue("NEXT_PUBLIC_SITE_URL") || "missing");

const failures = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.name}${item.detail ? `  (${item.detail})` : ""}`);
}
console.log(`\n${checks.length - failures.length}/${checks.length} checks passed.`);
if (failures.length) {
  console.error("Release prerequisites are not complete. Resolve the FAIL items above before deploying.");
  process.exitCode = 1;
}
