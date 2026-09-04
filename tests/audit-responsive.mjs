import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const dir = "test-results/audit";
mkdirSync(dir, { recursive: true });

const VIEWPORTS = [
  { name: "iphone-se", width: 320, height: 568, touch: true },
  { name: "galaxy-s", width: 360, height: 800, touch: true },
  { name: "iphone-16", width: 390, height: 844, touch: true },
  { name: "pixel", width: 412, height: 915, touch: true },
  { name: "iphone-plus", width: 430, height: 932, touch: true },
  { name: "fold-cover", width: 344, height: 882, touch: true },
  { name: "fold-inner", width: 673, height: 841, touch: true },
  { name: "ipad-mini", width: 768, height: 1024, touch: true },
  { name: "ipad-landscape", width: 1024, height: 768, touch: true },
  { name: "iphone-landscape", width: 844, height: 390, touch: true },
  { name: "android-landscape", width: 800, height: 360, touch: true },
  { name: "laptop", width: 1280, height: 800, touch: false },
  { name: "desktop", width: 1440, height: 900, touch: false },
];

const SECTIONS = ["home", "about", "services", "catalogue", "equipment", "rfq", "contact"];

const browser = await chromium.launch();
const findings = [];

function note(vp, severity, issue, extra = {}) {
  findings.push({ vp: vp.name, size: `${vp.width}x${vp.height}`, severity, issue, ...extra });
  console.log(`[${severity}] ${vp.name}: ${issue}`);
}

async function audit(vp) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.touch && vp.width < 900,
    hasTouch: vp.touch,
    deviceScaleFactor: vp.touch ? 2 : 1,
  });
  await page.goto("http://127.0.0.1:4173/?lang=en", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1");
  const cookie = page.locator("#cookie-reject");
  if (await cookie.isVisible().catch(() => false)) await cookie.click();
  await page.waitForTimeout(400);

  const metrics = await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scrollW = document.documentElement.scrollWidth;
    const issues = [];
    if (scrollW > vw + 2) issues.push({ kind: "overflow-x", scrollW, vw });

    const header = document.querySelector(".header");
    const headerRect = header?.getBoundingClientRect();
    const tools = [...document.querySelectorAll(".header-tools > *, .brand")];
    for (const el of tools) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.right > vw + 1 || r.left < -1) issues.push({ kind: "header-clip", id: el.id || el.className, r: { l: r.left, r: r.right, w: r.width } });
    }
    const overlapping = [];
    const headerKids = [...document.querySelectorAll(".header-inner > *, .header-tools > *")];
    for (let i = 0; i < headerKids.length; i++) {
      const a = headerKids[i].getBoundingClientRect();
      for (let j = i + 1; j < headerKids.length; j++) {
        if (headerKids[j].parentElement === headerKids[i] || headerKids[i].contains(headerKids[j])) continue;
        const b = headerKids[j].getBoundingClientRect();
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 4 && oy > 8) overlapping.push({ a: headerKids[i].className, b: headerKids[j].className || headerKids[j].id, ox, oy });
      }
    }
    if (overlapping.length) issues.push({ kind: "header-overlap", overlapping });

    const tap = [];
    const tapEls = document.querySelectorAll(".icon-btn, .cta, .cta-ghost, .burger, .mobile-nav a, .filters button, .progress-tab, .header-cta");
    tapEls.forEach((el) => {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.width < 40 || r.height < 40) tap.push({ tag: el.tagName, cls: el.className, text: (el.textContent || "").trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
    });
    if (tap.length) issues.push({ kind: "small-tap", tap });

    const h1 = document.querySelector("h1");
    const h1r = h1?.getBoundingClientRect();
    if (h1r && (h1r.bottom < 0 || h1r.top > vh || h1r.right < 0 || h1r.left > vw)) {
      issues.push({ kind: "h1-offscreen", r: { t: h1r.top, b: h1r.bottom, l: h1r.left } });
    }
    if (h1 && h1.scrollWidth > h1.clientWidth + 4) issues.push({ kind: "h1-text-overflow", sw: h1.scrollWidth, cw: h1.clientWidth });

    const nav = document.querySelector(".mobile-nav");
    const navStyle = nav ? getComputedStyle(nav) : null;
    if (nav && navStyle?.display !== "none") {
      const labels = [...nav.querySelectorAll("a")].map((a) => {
        const r = a.getBoundingClientRect();
        return { text: (a.textContent || "").trim(), w: Math.round(r.width), h: Math.round(r.height), overflow: a.scrollWidth > a.clientWidth + 2 };
      });
      if (labels.some((l) => l.overflow || l.w < 44)) issues.push({ kind: "mobile-nav", labels });
    }

    const wordmark = document.querySelector(".wordmark");
    const wmVisible = wordmark && getComputedStyle(wordmark).display !== "none";
    const logo = document.querySelector("#logo-home");
    const logoR = logo?.getBoundingClientRect();

    return {
      scrollW, vw, vh,
      headerH: headerRect?.height ?? 0,
      issues,
      wmVisible,
      logo: logoR ? { w: logoR.width, h: logoR.height, r: logoR.right } : null,
      h1: h1r ? { t: Math.round(h1r.top), b: Math.round(h1r.bottom), w: Math.round(h1r.width), h: Math.round(h1r.height) } : null,
      burger: (() => {
        const b = document.getElementById("burger");
        if (!b) return null;
        const s = getComputedStyle(b);
        const r = b.getBoundingClientRect();
        return { display: s.display, w: r.width, h: r.height };
      })(),
    };
  });

  for (const iss of metrics.issues) {
    if (iss.kind === "overflow-x") note(vp, "FAIL", `horizontal overflow ${iss.scrollW} > ${iss.vw}`);
    else if (iss.kind === "header-clip") note(vp, "FAIL", `header element clipped: ${iss.id}`, iss);
    else if (iss.kind === "header-overlap") note(vp, "FAIL", `header overlap`, iss);
    else if (iss.kind === "small-tap") note(vp, "WARN", `tap targets < 40px (${iss.tap.length})`, { tap: iss.tap.slice(0, 8) });
    else if (iss.kind === "h1-offscreen") note(vp, "FAIL", `h1 offscreen`, iss);
    else if (iss.kind === "h1-text-overflow") note(vp, "FAIL", `h1 text overflow`, iss);
    else if (iss.kind === "mobile-nav") note(vp, "WARN", `mobile nav labels cramped`, iss);
    else note(vp, "WARN", iss.kind, iss);
  }

  if (!metrics.logo || metrics.logo.w < 24) note(vp, "FAIL", "logo too small or missing", metrics.logo);
  if (metrics.h1 && metrics.h1.h < 20) note(vp, "FAIL", "h1 too small", metrics.h1);

  await page.screenshot({ path: `${dir}/${vp.name}-hero.png` });

  for (const id of SECTIONS.slice(1)) {
    const loc = page.locator(`#${id}`);
    if (await loc.count()) {
      await loc.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
      await page.screenshot({ path: `${dir}/${vp.name}-${id}.png` });
    }
  }

  if (vp.width <= 980) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator("#burger").click({ force: true }).catch(() => {});
    await page.waitForTimeout(250);
    const drawerOpen = await page.locator("#drawer").evaluate((el) => el.classList.contains("open"));
    if (!drawerOpen) note(vp, "FAIL", "drawer did not open");
    else await page.screenshot({ path: `${dir}/${vp.name}-drawer.png` });
    await page.locator("#drawer-close").click({ force: true }).catch(() => {});
  }

  // German nav labels (longest-ish)
  if (vp.width <= 430) {
    await page.goto("http://127.0.0.1:4173/?lang=de", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");
    const c2 = page.locator("#cookie-reject");
    if (await c2.isVisible().catch(() => false)) await c2.click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${dir}/${vp.name}-de-hero.png` });
    const deNav = await page.evaluate(() => {
      const nav = document.querySelector(".mobile-nav");
      if (!nav) return null;
      const s = getComputedStyle(nav);
      if (s.display === "none") return { hidden: true };
      return [...nav.querySelectorAll("a")].map((a) => {
        const r = a.getBoundingClientRect();
        return { text: (a.textContent || "").trim(), w: Math.round(r.width), overflow: a.scrollWidth > a.clientWidth + 2, wrap: a.scrollHeight > 40 };
      });
    });
    if (deNav && !deNav.hidden && deNav.some((l) => l.overflow)) {
      note(vp, "FAIL", "DE mobile nav overflow", { deNav });
    }
    await page.screenshot({ path: `${dir}/${vp.name}-de-nav.png` });
  }

  // RFQ tab switch
  await page.goto("http://127.0.0.1:4173/?lang=en", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1");
  const c3 = page.locator("#cookie-reject");
  if (await c3.isVisible().catch(() => false)) await c3.click();
  await page.locator("#rfq").scrollIntoViewIfNeeded();
  await page.locator('.progress-tab[data-goto="2"]').click();
  const dropVisible = await page.locator("#drop").isVisible();
  if (!dropVisible) note(vp, "FAIL", "RFQ tab 2 not visible");
  await page.screenshot({ path: `${dir}/${vp.name}-rfq-tab2.png` });

  await page.close();
}

for (const vp of VIEWPORTS) {
  console.log("\n===", vp.name, vp.width, "x", vp.height, "===");
  await audit(vp);
}

writeFileSync(`${dir}/findings.json`, JSON.stringify(findings, null, 2));
const fails = findings.filter((f) => f.severity === "FAIL");
const warns = findings.filter((f) => f.severity === "WARN");
console.log("\n==== SUMMARY ====");
console.log("FAIL", fails.length, "WARN", warns.length);
await browser.close();
process.exit(fails.length ? 1 : 0);
