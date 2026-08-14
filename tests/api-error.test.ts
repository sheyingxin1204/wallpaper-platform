import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { UnauthorizedError } from "@/lib/auth-guard";
import { ConflictError, InfrastructureError } from "@/lib/errors";

test("apiError maps unauthorized to 401", async () => {
  const response = apiError(new UnauthorizedError("请先登录。"));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "请先登录。" });
});

test("apiError maps infrastructure failures to 503", async () => {
  const response = apiError(new InfrastructureError("DATABASE_URL is required."));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "DATABASE_URL is required." });
});

test("apiError maps duplicate key conflicts to 409", async () => {
  const response = apiError(new ConflictError("分类 slug 已存在。"));
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "分类 slug 已存在。" });
});

test("apiError maps unexpected errors to 500", async () => {
  const response = apiError(new Error("boom"));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "boom" });
});

test("apiError maps zod errors to 400 with details", async () => {
  const parsed = z.object({ title: z.string().min(1) }).safeParse({ title: "" });
  assert.equal(parsed.success, false);
  const response = apiError(parsed.success ? new Error("unreachable") : parsed.error);
  assert.equal(response.status, 400);
  const body = (await response.json()) as { details?: unknown[] };
  assert.equal(body.details?.length, 1);
});
