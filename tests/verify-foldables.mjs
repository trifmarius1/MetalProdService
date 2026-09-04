import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const dir = "test-results/foldables";
mkdirSync(dir, { recursive: true });

const shots = [
  { name: "fold6-cover", w: 323, h: 792 },
  { name: "fold6-inner", w: 619, h: 720 },
  { name: "fold6-inner-land", w: 720, h: 619 },
  { name: "fold7-inner", w: 750, h: 832 },
  { name: "fold8-43", w: 800, h: 600 },
  { name: "pixel10-inner", w: 692, h: 717 },
  { name: "pixel9-cover", w: 444, h: 995 },
  { name: "magic-v6-inner", w: 784, h: 724 },
  { name: "flip8-cover", w: 360, h: 340 },
  { name: "flip8-open", w: 393, h: 916 },
  { name: "flip-flex", w: 393, h: 420 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await page.goto("http://127.0.0.1:4173/?lang=en", { waitUntil: "domcontentloaded" });
await page.waitForSelector("h1");
const cookie = page.locator("#cookie-reject");
if (await cookie.isVisible().catch(() => false)) await cookie.click();

for (const s of shots) {
  await page.setViewportSize({ width: s.w, height: s.h });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${dir}/${s.name}-hero.png` });
  const m = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
    h1: !!document.querySelector("h1")?.getClientRects().length,
    cta: !!document.querySelector(".hero-actions .cta")?.getClientRects().length,
  }));
  const overflow = m.sw > m.iw + 8;
  console.log(s.name, overflow ? `OVERFLOW ${m.sw}>${m.iw}` : "ok", "h1", m.h1, "cta", m.cta);
}

await page.setViewportSize({ width: 692, height: 717 });
await page.locator("#services").scrollIntoViewIfNeeded();
await page.waitForTimeout(150);
await page.screenshot({ path: `${dir}/pixel10-inner-services.png` });
await page.locator("#rfq").scrollIntoViewIfNeeded();
await page.waitForTimeout(150);
await page.screenshot({ path: `${dir}/pixel10-inner-rfq.png` });

await browser.close();
console.log("done");
