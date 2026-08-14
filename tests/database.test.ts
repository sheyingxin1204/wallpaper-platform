import assert from "node:assert/strict";
import test from "node:test";
import { parseDatabaseUrl } from "@/db";

test("database URL guard accepts complete TiDB serverless connection strings", () => {
  assert.equal(parseDatabaseUrl("mysql://user:pass@host:4000/dbname?ssl-mode=VERIFY_IDENTITY"), "mysql://user:pass@host:4000/dbname?ssl-mode=VERIFY_IDENTITY");
});

test("database URL guard rejects placeholders and malformed values", () => {
  assert.equal(parseDatabaseUrl(undefined), undefined);
  assert.equal(parseDatabaseUrl(""), undefined);
  assert.equal(parseDatabaseUrl("   "), undefined);
  assert.equal(parseDatabaseUrl("https://\"\":/"), undefined);
  assert.equal(parseDatabaseUrl("mysql://host/db"), undefined);
  assert.equal(parseDatabaseUrl("mysql://user:pass@host"), undefined);
  assert.equal(parseDatabaseUrl("not-a-url"), undefined);
});
