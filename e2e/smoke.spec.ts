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
});
