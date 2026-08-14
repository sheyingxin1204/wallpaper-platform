import assert from "node:assert/strict";
import test from "node:test";
import { createCategorySchema, createTagSchema, httpUrlSchema } from "@/lib/taxonomy/schemas";

test("category schema accepts valid slugs and trims names", () => {
  const result = createCategorySchema.safeParse({ name: "  自然风光  ", slug: "Nature-Scenes", sortOrder: 3, enabled: true });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.name, "自然风光");
    assert.equal(result.data.slug, "nature-scenes");
  }
});

test("category schema rejects invalid slugs and empty names", () => {
  assert.equal(createCategorySchema.safeParse({ name: "", slug: "nature" }).success, false);
  assert.equal(createCategorySchema.safeParse({ name: "自然", slug: "Nature_Scenes" }).success, false);
  assert.equal(createCategorySchema.safeParse({ name: "自然", slug: "nature-" }).success, false);
});

test("tag schema validates name and slug", () => {
  assert.equal(createTagSchema.safeParse({ name: "蓝色", slug: "blue" }).success, true);
  assert.equal(createTagSchema.safeParse({ name: "蓝色", slug: "Blue Sky" }).success, false);
});

test("http URL schema rejects javascript and data schemes", () => {
  assert.equal(httpUrlSchema.safeParse("https://example.com/license").success, true);
  assert.equal(httpUrlSchema.safeParse("http://example.com/license").success, true);
  assert.equal(httpUrlSchema.safeParse("javascript:alert(1)").success, false);
  assert.equal(httpUrlSchema.safeParse("data:text/html,hello").success, false);
  assert.equal(httpUrlSchema.safeParse("/relative/path").success, false);
});
