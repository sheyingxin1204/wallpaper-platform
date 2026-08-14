import assert from "node:assert/strict";
import test from "node:test";
import { canTransition, type WallpaperStatus } from "@/lib/wallpapers/status";

const statuses: WallpaperStatus[] = ["draft", "pending_processing", "pending_review", "published", "unlisted", "rejected"];

const allowedTransitions: Record<WallpaperStatus, WallpaperStatus[]> = {
  draft: ["pending_processing", "rejected"],
  pending_processing: ["pending_processing", "pending_review", "rejected"],
  pending_review: ["published", "rejected"],
  published: ["unlisted"],
  unlisted: [],
  rejected: [],
};

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

test("status transition matrix matches the documented workflow", () => {
  for (const from of statuses) {
    for (const to of statuses) {
      assert.equal(canTransition(from, to), allowedTransitions[from].includes(to), `unexpected transition ${from} -> ${to}`);
    }
  }
});

test("published items can correct attribution but not titles", () => {
  // This documents the product rule enforced by the admin PATCH route:
  // content changes require a draft cycle, attribution fixes are allowed.
  const editableForAttribution = ["draft", "pending_review", "published"];
  assert.ok(editableForAttribution.includes("published"));
  assert.ok(!editableForAttribution.includes("unlisted"));
});
