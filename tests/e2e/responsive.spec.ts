import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "iPhone SE compact", width: 320, height: 568 },
  { name: "Galaxy S 2026", width: 360, height: 800 },
  { name: "iPhone 16", width: 390, height: 844 },
  { name: "iPhone 16 Pro", width: 393, height: 852 },
  { name: "Pixel 10", width: 412, height: 915 },
  { name: "iPhone 16 Plus", width: 430, height: 932 },
  { name: "Z Fold cover", width: 344, height: 882 },
  { name: "Z Fold inner", width: 673, height: 841 },
  { name: "iPad mini", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
];

async function open(page: Page) {
  await page.goto("/?lang=en");
  await page.waitForSelector("h1");
  const cookie = page.locator("#cookie-reject");
  if (await cookie.isVisible().catch(() => false)) await cookie.click();
}

test.describe("2026 viewport layout", () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name} ${vp.width}x${vp.height} has no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await open(page);
      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        inner: window.innerWidth,
      }));
      expect(overflow.scroll, `${vp.name} overflow`).toBeLessThanOrEqual(overflow.inner + 8);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("#logo-home")).toBeVisible();
    });
  }

  test("RFQ tabs work on Galaxy-width 360", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await open(page);
    await page.locator("#rfq").scrollIntoViewIfNeeded();
    await page.locator('.progress-tab[data-goto="2"]').click();
    await expect(page.locator("#drop")).toBeVisible();
    await page.locator('.progress-tab[data-goto="3"]').click();
    await expect(page.locator("#company")).toBeVisible();
    await page.locator('.progress-tab[data-goto="1"]').click();
    await expect(page.locator("#material")).toBeVisible();
  });

  test("phone 360 header stays clear and drawer opens", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await open(page);
    await expect(page.locator("#logo-home")).toBeVisible();
    await expect(page.locator("#burger")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".header-cta")).toBeVisible();
    await page.locator("#burger").click({ force: true });
    await expect(page.locator("#drawer")).toHaveClass(/open/);
    await page.locator("#drawer a[href='#contact']").evaluate((el: HTMLAnchorElement) => el.click());
    await expect(page.locator("#contact h2")).toBeInViewport();
  });

  test("landscape phone keeps hero readable without bottom nav overlap", async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await open(page);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".hero-actions .cta").first()).toBeVisible();
    await expect(page.locator(".mobile-nav")).toBeHidden();
  });

  test("phone 390 uses a single catalogue column and short German nav", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await page.locator("#catalogue").scrollIntoViewIfNeeded();
    const cardWidth = await page.locator(".card").first().evaluate((el) => el.getBoundingClientRect().width);
    expect(cardWidth).toBeGreaterThan(280);
    await page.goto("/?lang=de");
    await page.waitForSelector("h1");
    const cookie = page.locator("#cookie-reject");
    if (await cookie.isVisible().catch(() => false)) await cookie.click();
    const overflow = await page.evaluate(() => {
      const nav = document.querySelector(".mobile-nav");
      if (!nav) return true;
      return [...nav.querySelectorAll("a")].some((a) => a.scrollWidth > a.clientWidth + 2);
    });
    expect(overflow).toBe(false);
  });

  test("fold inner 673 shows about photos and services", async ({ page }) => {
    await page.setViewportSize({ width: 673, height: 841 });
    await open(page);
    await page.locator("#about").scrollIntoViewIfNeeded();
    await expect(page.locator("#about-gallery img")).toHaveCount(2);
    await page.locator("#burger").click();
    await page.locator("#drawer a[href='#services']").click();
    await expect(page.locator("#services h2")).toBeVisible();
  });
});

/** 2026 book-style + clamshell foldables: cover, inner, inner-landscape, flip cover, flip open. */
const FOLDABLES_2026 = [
  { name: "Z Fold6 cover", width: 323, height: 792 },
  { name: "Z Fold6 inner", width: 619, height: 720 },
  { name: "Z Fold6 inner landscape", width: 720, height: 619 },
  { name: "Z Fold7 cover", width: 412, height: 960 },
  { name: "Z Fold7 inner", width: 750, height: 832 },
  { name: "Z Fold7 inner landscape", width: 832, height: 750 },
  { name: "Z Fold8 cover", width: 412, height: 660 },
  { name: "Z Fold8 inner 4:3", width: 800, height: 600 },
  { name: "Z Fold8 Ultra inner", width: 840, height: 700 },
  { name: "Pixel 9 Pro Fold cover", width: 444, height: 995 },
  { name: "Pixel 9 Pro Fold inner", width: 755, height: 783 },
  { name: "Pixel 10 Pro Fold cover", width: 412, height: 923 },
  { name: "Pixel 10 Pro Fold inner", width: 692, height: 717 },
  { name: "Honor Magic V6 cover", width: 400, height: 880 },
  { name: "Honor Magic V6 inner", width: 784, height: 724 },
  { name: "OnePlus Open cover", width: 400, height: 900 },
  { name: "OnePlus Open inner", width: 780, height: 748 },
  { name: "Z Flip8 open", width: 393, height: 916 },
  { name: "Z Flip8 cover", width: 360, height: 340 },
  { name: "Z Flip6 open", width: 393, height: 960 },
  { name: "Razr cover", width: 360, height: 400 },
  { name: "Flip flex top pane", width: 393, height: 420 },
];

test.describe("2026 foldable smartphones", () => {
  test("cover, inner, landscape and flip panes have no overflow and a visible hero", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    for (const vp of FOLDABLES_2026) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        inner: window.innerWidth,
      }));
      expect(overflow.scroll, `${vp.name} overflow`).toBeLessThanOrEqual(overflow.inner + 8);
      await expect(page.locator("h1"), vp.name).toBeVisible();
      await expect(page.locator("#logo-home"), vp.name).toBeVisible();
      await expect(page.locator(".hero-actions .cta").first(), vp.name).toBeVisible();
    }
  });

  test("near-square inner uses two service columns and a two-column hero", async ({ page }) => {
    await page.setViewportSize({ width: 692, height: 717 });
    await open(page);
    const heroCols = await page.locator(".hero-inner").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(heroCols).toBeGreaterThanOrEqual(2);
    await page.locator("#services").scrollIntoViewIfNeeded();
    const svcWidth = await page.locator(".svc").first().evaluate((el) => el.getBoundingClientRect().width);
    expect(svcWidth).toBeLessThan(480);
    await expect(page.locator("#services .svc")).toHaveCount(6);
  });

  test("Fold6 inner 619 keeps RFQ tabs usable", async ({ page }) => {
    await page.setViewportSize({ width: 619, height: 720 });
    await open(page);
    await page.locator("#rfq").scrollIntoViewIfNeeded();
    await page.locator('.progress-tab[data-goto="2"]').click();
    await expect(page.locator("#drop")).toBeVisible();
    await page.locator('.progress-tab[data-goto="3"]').click();
    await expect(page.locator("#company")).toBeVisible();
  });
});
