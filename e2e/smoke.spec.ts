import { expect, test } from "@playwright/test";

test("health endpoint reports ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});

test("homepage renders filters and empty state without a database", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "最新发布" })).toBeVisible();
  await expect(page.locator('select[name="orientation"]')).toBeVisible();
  await expect(page.locator('select[name="category"]')).toBeVisible();
  await expect(page.locator('select[name="resolution"]')).toBeVisible();
  await expect(page.locator('select[name="color"]')).toBeVisible();
  await expect(page.getByText("暂时没有符合条件的已发布壁纸")).toBeVisible();
});

test("sign-in page exposes the email form", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("admin redirects anonymous visitors to sign-in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("SEO endpoints respond with published content", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Sitemap:");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("<urlset");
});

test("security headers are present on page responses", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("unpublished wallpaper detail is not indexed", async ({ request }) => {
  const response = await request.get("/wallpapers/does-not-exist");
  // Next 16 streams not-found pages with a 200 status but always emits
  // `noindex` so search engines never index missing wallpapers.
  expect([200, 404]).toContain(response.status());
  expect(await response.text()).toContain('name="robots" content="noindex"');
});

test("unknown asset kinds return 404", async ({ request }) => {
  const response = await request.get("/api/wallpapers/missing/assets/not-a-kind");
  expect(response.status()).toBe(404);
});

test("sign-in rejects invalid credentials without crashing", async ({ request }) => {
  const response = await request.post("/api/auth/sign-in/email", {
    data: { email: "missing@example.com", password: "wrong-password" },
  });
  // Without a database the auth service is deliberately unavailable, so the
  // response must be a readable 503 instead of an internal 500.
  expect(response.status()).toBe(503);
  const body = (await response.json()) as { error?: string };
  expect(body.error).toContain("数据库");
});
