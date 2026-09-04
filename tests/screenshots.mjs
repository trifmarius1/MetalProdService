import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const dir = "test-results/visual";
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();

async function shoot(name, opts, fn) {
  const page = await browser.newPage(opts);
  await page.goto("http://127.0.0.1:4173/?lang=en", { waitUntil: "networkidle" });
  const reject = page.locator("#cookie-reject");
  if (await reject.isVisible().catch(() => false)) await reject.click();
  await page.waitForTimeout(800);
  if (fn) await fn(page);
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: name.includes("full") });
  await page.close();
  console.log("saved", name);
}

const desktop = { viewport: { width: 1440, height: 900 } };
const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

await shoot("desktop-hero", desktop);
await shoot("desktop-about", desktop, async (p) => {
  await p.locator("#about").scrollIntoViewIfNeeded();
});
await shoot("desktop-services", desktop, async (p) => {
  await p.locator("#services").scrollIntoViewIfNeeded();
});
await shoot("desktop-catalogue", desktop, async (p) => {
  await p.locator("#catalogue").scrollIntoViewIfNeeded();
});
await shoot("desktop-equipment", desktop, async (p) => {
  await p.locator("#equipment").scrollIntoViewIfNeeded();
});
await shoot("desktop-rfq", desktop, async (p) => {
  await p.locator("#rfq").scrollIntoViewIfNeeded();
});
await shoot("desktop-contact", desktop, async (p) => {
  await p.locator("#contact").scrollIntoViewIfNeeded();
});
await shoot("desktop-full", desktop, async (p) => {
  await p.evaluate(() => window.scrollTo(0, 0));
});
await shoot("mobile-hero", mobile);
await shoot("mobile-about", mobile, async (p) => {
  await p.locator("#about").scrollIntoViewIfNeeded();
});
await shoot("mobile-nav", mobile, async (p) => {
  await p.evaluate(() => window.scrollTo(0, 400));
});
await shoot("ro-hero", desktop, async (p) => {
  await p.goto("http://127.0.0.1:4173/?lang=ro", { waitUntil: "networkidle" });
  const reject = p.locator("#cookie-reject");
  if (await reject.isVisible().catch(() => false)) await reject.click();
});
await shoot("light-hero", desktop, async (p) => {
  await p.locator("#theme-btn").click();
  await p.waitForTimeout(300);
});

await browser.close();
console.log("done");
