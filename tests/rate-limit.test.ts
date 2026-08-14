import assert from "node:assert/strict";
import test from "node:test";
import { rateLimit } from "@/lib/rate-limit";

function request(ip: string) {
  return new Request("https://example.com/", { headers: { "x-forwarded-for": ip } });
}

test("rate limit allows requests up to the window limit", () => {
  const name = `test-allow-${Date.now()}`;
  for (let index = 0; index < 3; index += 1) {
    assert.equal(rateLimit(request("1.1.1.1"), name, 3, 60_000).allowed, true);
  }
  assert.equal(rateLimit(request("1.1.1.1"), name, 3, 60_000).allowed, false);
});

test("rate limit windows are per client and name", () => {
  const name = `test-client-${Date.now()}`;
  assert.equal(rateLimit(request("2.2.2.2"), name, 2, 60_000).allowed, true);
  assert.equal(rateLimit(request("2.2.2.2"), name, 2, 60_000).allowed, true);
  assert.equal(rateLimit(request("2.2.2.2"), name, 2, 60_000).allowed, false);
  assert.equal(rateLimit(request("3.3.3.3"), name, 2, 60_000).allowed, true);
});
