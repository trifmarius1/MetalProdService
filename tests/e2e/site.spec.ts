import { expect, test, type Page } from "@playwright/test";

const LOCALES = ["en", "ro", "de", "hu", "fr", "es", "it"] as const;

async function open(page: Page, lang = "en") {
  await page.goto(`/?lang=${lang}`);
  await page.waitForSelector("h1");
  const cookie = page.locator("#cookie-reject");
  if (await cookie.isVisible().catch(() => false)) await cookie.click();
}

test.describe("functional buttons & navigation", () => {
  test("logo returns to top", async ({ page }) => {
    await open(page);
    await page.locator("#about").scrollIntoViewIfNeeded();
    await page.locator("#logo-home").click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(40);
  });

  test("primary nav reaches every spec section", async ({ page }) => {
    await open(page);
    const mobile = (page.viewportSize()?.width ?? 1200) < 800;
    if (mobile) {
      const jumps: Array<[string, string]> = [
        [".mobile-nav a[href='#services']", "#services"],
        [".mobile-nav a[href='#catalogue']", "#catalogue"],
        [".mobile-nav a[href='#rfq']", "#rfq"],
        [".mobile-nav a[href='#contact']", "#contact"],
      ];
      for (const [sel, id] of jumps) {
        await page.locator(sel).click();
        await expect(page.locator(`${id} h2, ${id} h1, ${id} .kicker`).first()).toBeInViewport();
      }
      return;
    }
    const jumps: Array<[string, string]> = [
      ["header a[href='#about']", "#about"],
      ["#svc-btn", "#services"],
      ["header a[href='#catalogue']", "#catalogue"],
      ["header a[href='#equipment']", "#equipment"],
      ["header a[href='#contact']", "#contact"],
      [".header-cta", "#rfq"],
    ];
    for (const [sel, id] of jumps) {
      await page.locator(sel).click();
      await expect(page.locator(id)).toBeInViewport({ ratio: 0.08 });
    }
  });

  test("services mega-menu exposes six disciplines", async ({ page }) => {
    await open(page);
    const mobile = (page.viewportSize()?.width ?? 1200) < 800;
    if (mobile) {
      await page.locator("#burger").click();
      await expect(page.locator("#drawer")).toHaveClass(/open/);
      await page.locator("#drawer a[href='#services']").click();
      await expect(page.locator("#services h2")).toBeInViewport();
      await expect(page.locator("#services .svc")).toHaveCount(6);
      return;
    }
    await page.locator("#svc-btn").hover();
    await expect(page.locator("#mega a")).toHaveCount(6);
    await page.locator("#mega a").first().click();
    await expect(page.locator("#svc-milling")).toBeInViewport();
  });

  test("catalogue filters redraw the grid", async ({ page }) => {
    await open(page);
    await page.locator("#catalogue").scrollIntoViewIfNeeded();
    const all = page.locator("#cat-grid .card");
    await expect(all).toHaveCount(6);
    await page.locator('button[data-filter="plastics"]').click();
    await expect(page.locator("#cat-grid .card:visible")).toHaveCount(2);
    await page.locator('button[data-filter="all"]').click();
    await expect(page.locator("#cat-grid .card:visible")).toHaveCount(6);
  });

  test("RFQ tabs switch between specifications, CAD upload and contact", async ({ page }) => {
    await open(page);
    await page.locator("#rfq").scrollIntoViewIfNeeded();
    await expect(page.locator('[data-step="1"]')).toBeVisible();
    await page.locator('.progress-tab[data-goto="2"]').click();
    await expect(page.locator('[data-step="2"]')).toBeVisible();
    await expect(page.locator("#drop")).toBeVisible();
    await expect(page.locator('[data-step="1"]')).toBeHidden();
    await page.locator('.progress-tab[data-goto="3"]').click();
    await expect(page.locator('[data-step="3"]')).toBeVisible();
    await expect(page.locator("#company")).toBeVisible();
    await expect(page.locator("#rfq-submit")).toBeVisible();
    await page.locator('.progress-tab[data-goto="1"]').click();
    await expect(page.locator('[data-step="1"]')).toBeVisible();
    await expect(page.locator("#material")).toBeVisible();
  });

  test("RFQ validates empty submit and accepts a clean PDF", async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-step="2"]')).toBeHidden();
    await expect(page.locator('[data-step="3"]')).toBeHidden();
    await page.locator("#rfq-next").click();
    await expect(page.locator('[data-step="2"]')).toBeVisible();
    const pdf = Buffer.from("%PDF-1.7\n1 0 obj<<>>endobj\ntrailer<<>>\n", "ascii");
    await page.locator("#files").setInputFiles({ name: "drawing.pdf", mimeType: "application/pdf", buffer: pdf });
    await expect(page.locator(".file-chip.ok")).toBeVisible();
    const exe = Buffer.from("MZ\x90\x00", "ascii");
    await page.locator("#files").setInputFiles({ name: "payload.exe", mimeType: "application/octet-stream", buffer: exe });
    await expect(page.locator(".file-chip.bad")).toBeVisible();
    await page.locator("#rfq-next").click();
    await page.locator("#rfq-submit").click();
    await expect(page.locator('[data-err="company"]')).not.toHaveText("");
    await page.locator("#company").fill("Acme Hydraulics SRL");
    await page.locator("#engineer").fill("Ioan Pop");
    await page.locator("#email").fill("ioan@acme.example");
    await page.locator("#phone").fill("+40 744 123 456");
    await page.locator("#date").fill("2026-10-01");
    await page.locator("#gdpr").check();
  });

  test("RFQ happy path emails the request and shows success", async ({ page }) => {
    await page.route("https://formsubmit.co/ajax/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: "true" }),
      });
    });
    await open(page);
    await page.locator("#rfq").scrollIntoViewIfNeeded();
    await page.locator("#rfq-next").click();
    await page.locator("#rfq-next").click();
    await page.locator("#company").fill("Acme Hydraulics SRL");
    await page.locator("#engineer").fill("Ioan Pop");
    await page.locator("#email").fill("ioan@acme.example");
    await page.locator("#phone").fill("+40 744 123 456");
    await page.locator("#date").fill("2026-10-15");
    await page.locator("#notes").fill("Prototype splined shaft 16MnCr5, h6, qty 1.");
    await page.locator("#gdpr").check();
    await page.locator("#rfq-submit").click();
    await expect(page.locator("#rfq-success")).toBeVisible();
    await expect(page.locator("#rfq-sent-note")).toContainText("emailed");
  });
});

test.describe("language regression", () => {
  const headlines: Record<(typeof LOCALES)[number], string> = {
    en: "High-Precision CNC Machining",
    ro: "Prelucrări CNC de înaltă precizie",
    de: "Hochpräzise CNC-Bearbeitung",
    hu: "Nagy pontosságú CNC megmunkálás",
    fr: "Usinage CNC de haute précision",
    es: "Mecanizado CNC de alta precisión",
    it: "Lavorazioni CNC ad alta precisione",
  };

  for (const lang of LOCALES) {
    test(`locale ${lang} swaps every heading and keeps html lang`, async ({ page }) => {
      await open(page, lang);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.locator("h1")).toContainText(headlines[lang]);
      const cta = page.locator(".header-cta").first();
      await expect(cta).not.toHaveText("nav.");
      const texts = await page.locator("[data-i18n]").allTextContents();
      const leaked = texts.filter((s) => s.includes("undefined") || /^[a-z]+\.[a-z]/.test(s));
      expect(leaked, leaked.join(", ")).toEqual([]);
    });
  }
});

test.describe("language flags", () => {
  test("English shows the UK flag, not the French tricolour", async ({ page }) => {
    await open(page, "en");
    await page.locator("#lang-btn").click();
    const enFlag = page.locator('#lang-menu [data-flag="en"] svg');
    const frFlag = page.locator('#lang-menu [data-flag="fr"] svg');
    await expect(enFlag.locator("title")).toHaveText("United Kingdom");
    await expect(frFlag.locator("title")).toHaveText("France");
    await expect(enFlag.locator("path")).toHaveCount(4);
    await expect(frFlag.locator("rect")).toHaveCount(3);
    const enFills = await enFlag.locator("rect, path").evaluateAll((nodes) =>
      nodes.map((n) => (n as SVGElement).getAttribute("fill") || (n as SVGElement).getAttribute("stroke")),
    );
    expect(enFills).toContain("#012169");
    expect(enFills).toContain("#C8102E");
    const headerTitle = await page.locator("#lang-btn .flag svg title").textContent();
    expect(headerTitle).toBe("United Kingdom");
  });
});

test.describe("about factory photography", () => {
  test("both specification photographs render in About", async ({ page }) => {
    await open(page);
    const shots = page.locator("#about-gallery img");
    await expect(shots).toHaveCount(2);
    await expect(shots.nth(0)).toHaveAttribute("src", /FactoryPhoto/i);
    await expect(shots.nth(1)).toHaveAttribute("src", /Factory_Interior/i);
    await expect.poll(async () => shots.nth(0).evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(100);
  });
});
