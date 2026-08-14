import assert from "node:assert/strict";
import test from "node:test";
import { canTransition } from "@/lib/wallpapers/status";

test("wallpaper status flow allows processing retry and publication", () => {
  assert.equal(canTransition("draft", "pending_processing"), true);
  assert.equal(canTransition("pending_processing", "pending_processing"), true);
  assert.equal(canTransition("pending_processing", "pending_review"), true);
  assert.equal(canTransition("pending_review", "published"), true);
  assert.equal(canTransition("published", "draft"), false);
});

test("unlisted and rejected records are terminal states", () => {
  assert.equal(canTransition("unlisted", "published"), false);
  assert.equal(canTransition("rejected", "pending_processing"), false);
});
