import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const dir = "test-results/verify";
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();

const shots = [
  { name: "se-hero", w: 320, h: 568, lang: "en" },
  { name: "iphone-hero", w: 390, h: 844, lang: "en" },
  { name: "iphone-about", w: 390, h: 844, lang: "en", scroll: "#about" },
  { name: "iphone-services", w: 390, h: 844, lang: "en", scroll: "#services" },
  { name: "iphone-cat", w: 390, h: 844, lang: "en", scroll: "#catalogue" },
  { name: "iphone-eq", w: 390, h: 844, lang: "en", scroll: "#equipment" },
  { name: "iphone-rfq", w: 390, h: 844, lang: "en", scroll: "#rfq" },
  { name: "iphone-contact", w: 390, h: 844, lang: "en", scroll: "#contact" },
  { name: "iphone-de", w: 390, h: 844, lang: "de" },
  { name: "galaxy-hero", w: 360, h: 800, lang: "en" },
  { name: "fold-inner-hero", w: 673, h: 841, lang: "en" },
  { name: "ipad-hero", w: 768, h: 1024, lang: "en" },
  { name: "ipad-services", w: 768, h: 1024, lang: "en", scroll: "#services" },
  { name: "land-hero", w: 844, h: 390, lang: "en" },
  { name: "desktop-hero", w: 1440, h: 900, lang: "en" },
  { name: "desktop-about", w: 1440, h: 900, lang: "en", scroll: "#about" },
];

for (const s of shots) {
  const page = await browser.newPage({
    viewport: { width: s.w, height: s.h },
    isMobile: s.w < 900,
    hasTouch: s.w < 900,
  });
  await page.goto(`http://127.0.0.1:4173/?lang=${s.lang}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1");
  const cookie = page.locator("#cookie-reject");
  if (await cookie.isVisible().catch(() => false)) await cookie.click();
  if (s.scroll) {
    await page.locator(s.scroll).scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
  } else {
    await page.waitForTimeout(250);
  }
  await page.screenshot({ path: `${dir}/${s.name}.png` });
  const metrics = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    inner: window.innerWidth,
  }));
  const overflow = metrics.scrollW > metrics.inner + 8;
  console.log(s.name, overflow ? `OVERFLOW ${metrics.scrollW}>${metrics.inner}` : "ok");
  await page.close();
}

await browser.close();
console.log("done");
