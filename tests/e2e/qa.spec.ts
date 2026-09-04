import { expect, test, type Page } from "@playwright/test";

async function open(page: Page) {
  await page.goto("/?lang=en");
  await page.waitForSelector("h1");
  const cookie = page.locator("#cookie-reject");
  if (await cookie.isVisible().catch(() => false)) await cookie.click();
}

test.describe("security headers & RFQ hardening", () => {
  test("preview sends nosniff, frame, and CSP headers", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const headers = res.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'self'");
    expect(headers["content-security-policy"]).toContain("upgrade-insecure-requests");
    expect(headers["content-security-policy"]).toContain("worker-src 'none'");
    expect(headers["content-security-policy"]).not.toContain("unsafe-eval");
    expect(headers["content-security-policy"]).toContain("connect-src 'self' https://formsubmit.co");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
  });

  test("RFQ rejects executable payload on CAD tab", async ({ page }) => {
    await open(page);
    await page.locator('.progress-tab[data-goto="2"]').click();
    const exe = Buffer.from("MZ\x90\x00payload", "ascii");
    await page.locator("#files").setInputFiles({
      name: "setup.exe",
      mimeType: "application/octet-stream",
      buffer: exe,
    });
    await expect(page.locator(".file-chip.bad")).toBeVisible();
  });
});

test.describe("functional buttons", () => {
  test("theme toggle switches data-theme", async ({ page }) => {
    await open(page);
    const root = page.locator("html");
    const before = await root.getAttribute("data-theme");
    await page.locator("#theme-btn").click({ force: true });
    await expect(root).not.toHaveAttribute("data-theme", before ?? "dark");
  });

  test("privacy modal opens and closes", async ({ page }) => {
    await open(page);
    await page.locator("#privacy-btn").click({ force: true });
    await expect(page.locator("#modal.open")).toBeVisible();
    await expect(page.locator("#modal-title")).not.toHaveText("");
    await page.locator("#modal-close").click({ force: true });
    await expect(page.locator("#modal.open")).toHaveCount(0);
  });

  test("language menu switches Romanian and English", async ({ page }) => {
    await open(page);
    await page.locator("#lang-btn").click({ force: true });
    await expect(page.locator("#lang-menu")).toBeVisible();
    await page.locator('#lang-menu button[data-lang="ro"]').click({ force: true });
    await expect(page.locator("html")).toHaveAttribute("lang", "ro");
    await page.locator("#lang-btn").click({ force: true });
    await page.locator('#lang-menu button[data-lang="en"]').click({ force: true });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("header CTA scrolls to RFQ", async ({ page }) => {
    await open(page);
    await page.locator(".header-cta").click({ force: true });
    await expect(page.locator("#rfq h2")).toBeInViewport();
  });
});
