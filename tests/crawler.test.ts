import assert from "node:assert/strict";
import test from "node:test";
import { assertCrawlerUrlAllowed } from "@/lib/crawler/allowlist";
import { computeTaskInputHash } from "@/lib/crawler/service";
import { crawlManifestSchema } from "@/lib/crawler/types";

test("crawler manifest validates candidate license metadata", () => {
  const result = crawlManifestSchema.safeParse({
    provider: "test-provider",
    version: "1.0.0",
    items: [{
      pageUrl: "https://wallpapers.example/source/one",
      imageUrl: "https://cdn.example/images/one.webp",
      title: "One",
      sourceName: "Example",
      license: { type: "CC BY 4.0", evidenceUrl: "https://wallpapers.example/license" },
    }],
  });
  assert.equal(result.success, true);
});

test("crawler URL allowlist only accepts HTTPS hosts and subdomains", () => {
  assert.doesNotThrow(() => assertCrawlerUrlAllowed("https://cdn.example.com/one.webp", ["example.com"]));
  assert.throws(() => assertCrawlerUrlAllowed("http://example.com/one.webp", ["example.com"]));
  assert.throws(() => assertCrawlerUrlAllowed("https://example.net/one.webp", ["example.com"]));
});

test("crawl task input hash is stable and 64 hex chars", () => {
  const first = computeTaskInputHash("provider:demo\nitems:[]");
  const second = computeTaskInputHash("provider:demo\nitems:[]");
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.notEqual(first, computeTaskInputHash("provider:demo\nitems:[1]"));
});
