import assert from "node:assert/strict";
import test from "node:test";
import { parseColorMode, parseResolutionPreset } from "@/lib/wallpapers/filters";

test("resolution preset parsing maps known values and rejects unknown", () => {
  assert.equal(parseResolutionPreset("hd")?.minWidth, 1920);
  assert.equal(parseResolutionPreset("qhd")?.minHeight, 1440);
  assert.equal(parseResolutionPreset("uhd")?.minWidth, 3840);
  assert.equal(parseResolutionPreset("8k"), undefined);
  assert.equal(parseResolutionPreset(undefined), undefined);
});

test("color mode parsing only accepts dark and light", () => {
  assert.equal(parseColorMode("dark"), "dark");
  assert.equal(parseColorMode("light"), "light");
  assert.equal(parseColorMode("blue"), undefined);
  assert.equal(parseColorMode(undefined), undefined);
});
