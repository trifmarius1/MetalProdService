import "./styles.css";
import {
  LOCALES,
  LOCALE_META,
  isLocale,
  t,
  type Locale,
} from "./i18n";

import {
  buildMailto,
  emptyState,
  fileChipHtml,
  persistDraft,
  submitRfq,
  validateStep,
  vetFile,
  buildRfqPlainText,
  type RfqState,
} from "./rfq";
import { MAX_FILES } from "./security";

const LANG_KEY = "mps.lang";
const THEME_KEY = "mps.theme";
const COOKIE_KEY = "mps.cookie";

let locale: Locale = "en";
let theme: "dark" | "light" = "dark";
const rfq: RfqState = emptyState();

function applyI18n(): void {
  document.documentElement.lang = locale;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;
    el.textContent = t(locale, key);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((el) => {
    const key = el.dataset.i18nAria;
    if (!key) return;
    el.setAttribute("aria-label", t(locale, key));
  });
  document.querySelectorAll<HTMLImageElement>("[data-i18n-alt]").forEach((el) => {
    const key = el.dataset.i18nAlt;
    if (!key) return;
    el.alt = t(locale, key);
  });
  const title = t(locale, "hero.title");
  document.title = `Metal Prod Service — ${title}`;
  const btn = document.getElementById("lang-btn");
  if (btn) {
    btn.innerHTML = `<span class="flag" data-flag="${locale}" aria-hidden="true">${flagSvg(locale)}</span><span>${locale.toUpperCase()}</span>`;
  }
  document.querySelectorAll<HTMLButtonElement>("#lang-menu button").forEach((b) => {
    b.setAttribute("aria-current", b.dataset.lang === locale ? "true" : "false");
  });
}

function setLocale(next: Locale): void {
  locale = next;
  localStorage.setItem(LANG_KEY, next);
  const url = new URL(window.location.href);
  url.searchParams.set("lang", next);
  history.replaceState(null, "", url);
  applyI18n();
}

function setTheme(next: "dark" | "light"): void {
  theme = next;
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  const btn = document.getElementById("theme-btn");
  if (btn) btn.setAttribute("aria-label", t(locale, next === "dark" ? "theme.light" : "theme.dark"));
}

function bootLocale(): void {
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get("lang");
  const stored = localStorage.getItem(LANG_KEY);
  const nav = navigator.language.slice(0, 2);
  if (isLocale(fromUrl)) locale = fromUrl;
  else if (isLocale(stored)) locale = stored;
  else if (isLocale(nav)) locale = nav;
}

function bootTheme(): void {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") theme = stored;
  else theme = "dark";
  setTheme(theme);
}

function renderLangMenu(): void {
  const menu = document.getElementById("lang-menu");
  if (!menu) return;
  menu.innerHTML = LOCALES.map((code) => {
    const meta = LOCALE_META[code];
    return `<button type="button" role="option" data-lang="${code}" aria-current="${code === locale}">
      <span class="flag" data-flag="${code}" aria-hidden="true">${flagSvg(code)}</span>${meta.native}
    </button>`;
  }).join("");
  paintFlags();
}

function flagSvg(code: string): string {
  const flags: Record<string, string> = {
    en: `<svg viewBox="0 0 60 30" focusable="false"><title>United Kingdom</title><rect width="60" height="30" fill="#012169"/><path d="M0,0 60,30 M60,0 0,30" stroke="#fff" stroke-width="10"/><path d="M0,0 60,30 M60,0 0,30" stroke="#C8102E" stroke-width="6"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="16"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="10"/></svg>`,
    ro: `<svg viewBox="0 0 60 30" focusable="false"><title>Romania</title><rect width="20" height="30" fill="#002B7F"/><rect x="20" width="20" height="30" fill="#FCD116"/><rect x="40" width="20" height="30" fill="#CE1126"/></svg>`,
    de: `<svg viewBox="0 0 60 30" focusable="false"><title>Germany</title><rect width="60" height="10" fill="#000"/><rect y="10" width="60" height="10" fill="#DD0000"/><rect y="20" width="60" height="10" fill="#FFCE00"/></svg>`,
    hu: `<svg viewBox="0 0 60 30" focusable="false"><title>Hungary</title><rect width="60" height="10" fill="#CE2939"/><rect y="10" width="60" height="10" fill="#fff"/><rect y="20" width="60" height="10" fill="#477050"/></svg>`,
    fr: `<svg viewBox="0 0 60 30" focusable="false"><title>France</title><rect width="20" height="30" fill="#002395"/><rect x="20" width="20" height="30" fill="#fff"/><rect x="40" width="20" height="30" fill="#ED2939"/></svg>`,
    es: `<svg viewBox="0 0 60 30" focusable="false"><title>Spain</title><rect width="60" height="30" fill="#AA151B"/><rect y="7.5" width="60" height="15" fill="#F1BF00"/></svg>`,
    it: `<svg viewBox="0 0 60 30" focusable="false"><title>Italy</title><rect width="20" height="30" fill="#009246"/><rect x="20" width="20" height="30" fill="#fff"/><rect x="40" width="20" height="30" fill="#CE2B37"/></svg>`,
  };
  return flags[code] ?? flags.en;
}

function paintFlags(): void {
  document.querySelectorAll<HTMLElement>("[data-flag]").forEach((el) => {
    const code = el.dataset.flag ?? "en";
    el.innerHTML = flagSvg(code);
    el.style.background = "none";
  });
}

function wireHeader(): void {
  document.getElementById("logo-home")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", `${location.pathname}${location.search}#top`);
  });

  const langWrap = document.getElementById("lang-wrap");
  const langBtn = document.getElementById("lang-btn");
  langBtn?.addEventListener("click", () => {
    const open = langWrap?.classList.toggle("open");
    langBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.getElementById("lang-menu")?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("button[data-lang]");
    const code = btn?.getAttribute("data-lang");
    if (isLocale(code)) setLocale(code);
    langWrap?.classList.remove("open");
  });
  document.getElementById("theme-btn")?.addEventListener("click", () => {
    setTheme(theme === "dark" ? "light" : "dark");
  });

  const svcBtn = document.getElementById("svc-btn");
  const mega = document.getElementById("mega");
  svcBtn?.addEventListener("click", () => {
    mega?.classList.toggle("open");
    svcBtn.setAttribute("aria-expanded", mega?.classList.contains("open") ? "true" : "false");
    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
  });
  mega?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => mega.classList.remove("open")),
  );

  const drawer = document.getElementById("drawer");
  const backdrop = document.getElementById("backdrop");
  const burger = document.getElementById("burger");
  const openDrawer = (open: boolean) => {
    drawer?.classList.toggle("open", open);
    backdrop?.classList.toggle("show", open);
    drawer?.setAttribute("aria-hidden", open ? "false" : "true");
    burger?.setAttribute("aria-expanded", open ? "true" : "false");
    if (backdrop) backdrop.hidden = !open;
  };
  burger?.addEventListener("click", () => openDrawer(true));
  document.getElementById("drawer-close")?.addEventListener("click", () => openDrawer(false));
  backdrop?.addEventListener("click", () => openDrawer(false));
  drawer?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => openDrawer(false)));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      langWrap?.classList.remove("open");
      langBtn?.setAttribute("aria-expanded", "false");
      mega?.classList.remove("open");
      svcBtn?.setAttribute("aria-expanded", "false");
      openDrawer(false);
      document.getElementById("modal")?.classList.remove("open");
    }
  });
  document.addEventListener("pointerdown", (e) => {
    const target = e.target as Node;
    if (langWrap && !langWrap.contains(target)) {
      langWrap.classList.remove("open");
      langBtn?.setAttribute("aria-expanded", "false");
    }
    const megaWrap = document.querySelector(".mega-wrap");
    if (mega && megaWrap && !megaWrap.contains(target)) {
      mega.classList.remove("open");
      svcBtn?.setAttribute("aria-expanded", "false");
    }
  });
}

function wireCatalogue(): void {
  const filters = document.getElementById("filters");
  const grid = document.getElementById("cat-grid");
  filters?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("button[data-filter]") as HTMLButtonElement | null;
    if (!btn) return;
    const filter = btn.dataset.filter ?? "all";
    filters.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    grid?.querySelectorAll<HTMLElement>(".card").forEach((card) => {
      const show = filter === "all" || card.dataset.cat === filter;
      card.hidden = !show;
    });
  });
}

function showStep(step: 1 | 2 | 3): void {
  if (rfq.submitted) return;
  rfq.step = step;
  document.querySelectorAll<HTMLElement>("[data-step]").forEach((el) => {
    el.hidden = Number(el.dataset.step) !== step;
  });
  document.querySelectorAll<HTMLButtonElement>(".progress-tab").forEach((tab) => {
    const active = Number(tab.dataset.goto) === step;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  const back = document.getElementById("rfq-back") as HTMLButtonElement;
  const next = document.getElementById("rfq-next") as HTMLButtonElement;
  const submit = document.getElementById("rfq-submit") as HTMLButtonElement;
  if (back) back.hidden = step === 1;
  if (next) next.hidden = step === 3;
  if (submit) submit.hidden = step !== 3;
  if (step === 3) {
    const date = document.getElementById("date") as HTMLInputElement | null;
    if (date) {
      const today = new Date().toISOString().slice(0, 10);
      date.min = today;
      if (!date.value) {
        const soon = new Date();
        soon.setDate(soon.getDate() + 14);
        date.value = soon.toISOString().slice(0, 10);
      }
    }
    document.getElementById("company")?.focus();
  }
}

function paintErrors(errors: Record<string, string>): void {
  document.querySelectorAll<HTMLElement>("[data-err]").forEach((el) => {
    const key = el.dataset.err ?? "";
    el.textContent = errors[key] ?? "";
  });
  ["company", "engineer", "email", "phone", "date"].forEach((id) => {
    const input = document.getElementById(id);
    input?.setAttribute("aria-invalid", errors[id] ? "true" : "false");
  });
}

function collectRfq(): void {
  rfq.mode = (document.querySelector('input[name="mode"]:checked') as HTMLInputElement | null)?.value ?? "proto";
  rfq.material = (document.getElementById("material") as HTMLSelectElement).value;
  rfq.heat = (document.getElementById("heat") as HTMLSelectElement).value;
  rfq.company = (document.getElementById("company") as HTMLInputElement).value;
  rfq.tax = (document.getElementById("tax") as HTMLInputElement).value;
  rfq.engineer = (document.getElementById("engineer") as HTMLInputElement).value;
  rfq.email = (document.getElementById("email") as HTMLInputElement).value;
  rfq.phone = (document.getElementById("phone") as HTMLInputElement).value;
  rfq.date = (document.getElementById("date") as HTMLInputElement).value;
  rfq.notes = (document.getElementById("notes") as HTMLTextAreaElement).value;
  rfq.gdpr = (document.getElementById("gdpr") as HTMLInputElement).checked;
  rfq.honeypot = (document.getElementById("honeypot") as HTMLInputElement).value;
}

function wireRfq(): void {
  const drop = document.getElementById("drop");
  const input = document.getElementById("files") as HTMLInputElement;
  const list = document.getElementById("file-list");
  const browse = document.getElementById("browse");

  const ingest = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (rfq.files.length >= MAX_FILES) {
        rfq.files.push({ name: file.name, size: file.size, ok: false, message: t(locale, "rfq.fileLimit") });
        break;
      }
      const vetted = await vetFile(file, locale);
      rfq.files.push(vetted);
    }
    if (list) list.innerHTML = rfq.files.map(fileChipHtml).join("");
  };

  drop?.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("over");
  });
  drop?.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop?.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    if (e.dataTransfer?.files) void ingest(e.dataTransfer.files);
  });
  browse?.addEventListener("click", (e) => {
    e.stopPropagation();
    input.click();
  });
  drop?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("button, input")) return;
    input.click();
  });
  drop?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      input.click();
    }
  });
  input?.addEventListener("change", () => {
    if (input.files) void ingest(input.files);
    input.value = "";
  });

  document.getElementById("rfq-progress")?.addEventListener("click", (e) => {
    const tab = (e.target as HTMLElement).closest<HTMLElement>("[data-goto]");
    if (!tab) return;
    const nextStep = Number(tab.dataset.goto);
    if (nextStep !== 1 && nextStep !== 2 && nextStep !== 3) return;
    showStep(nextStep);
    persistDraft(rfq);
  });
  document.getElementById("rfq-next")?.addEventListener("click", () => {
    collectRfq();
    const errors = validateStep(rfq, locale, rfq.step);
    paintErrors(errors);
    if (Object.keys(errors).length) return;
    showStep(rfq.step === 1 ? 2 : 3);
    persistDraft(rfq);
  });
  document.getElementById("rfq-back")?.addEventListener("click", () => {
    showStep(rfq.step === 3 ? 2 : 1);
  });
  document.getElementById("rfq-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    void (async () => {
      collectRfq();
      const errors = validateStep(rfq, locale, 3);
      paintErrors(errors);
      if (Object.keys(errors).length) {
        document.querySelectorAll("[data-step='3'] input, [data-step='3'] select").forEach((el) => {
          if ((el as HTMLInputElement).required && !(el as HTMLInputElement).value) {
            (el as HTMLElement).style.outline = "2px solid #ef4444";
          }
        });
        return;
      }
      const submitBtn = document.getElementById("rfq-submit") as HTMLButtonElement | null;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = t(locale, "rfq.sending");
      }
      const result = await submitRfq(rfq);
      rfq.submitted = true;
      document.getElementById("rfq-form")?.querySelectorAll("[data-step]").forEach((el) => {
        (el as HTMLElement).hidden = true;
      });
      document.getElementById("rfq-nav")!.hidden = true;
      document.getElementById("rfq-success")!.hidden = false;
      document.querySelectorAll<HTMLButtonElement>(".progress-tab").forEach((tab) => {
        tab.disabled = true;
      });
      const note = document.getElementById("rfq-sent-note");
      if (note) note.textContent = result.ok ? t(locale, "rfq.sentHttp") : t(locale, "rfq.sentMailto");
      if (!result.ok) {
        const a = document.createElement("a");
        a.href = buildMailto(rfq);
        a.click();
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = t(locale, "rfq.submit");
      }
    })();
  });
  document.getElementById("rfq-copy")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(buildRfqPlainText(rfq));
      const btn = document.getElementById("rfq-copy");
      if (btn) btn.textContent = t(locale, "rfq.copied");
    } catch {
      /* clipboard blocked */
    }
  });
  document.getElementById("rfq-reset")?.addEventListener("click", () => {
    Object.assign(rfq, emptyState());
    (document.getElementById("rfq-form") as HTMLFormElement).reset();
    if (list) list.innerHTML = "";
    document.getElementById("rfq-success")!.hidden = true;
    document.getElementById("rfq-nav")!.hidden = false;
    document.querySelectorAll<HTMLButtonElement>(".progress-tab").forEach((tab) => {
      tab.disabled = false;
    });
    showStep(1);
  });
}

function wireCookies(): void {
  const box = document.getElementById("cookie");
  if (!localStorage.getItem(COOKIE_KEY)) box?.classList.add("show");
  document.getElementById("cookie-accept")?.addEventListener("click", () => {
    localStorage.setItem(COOKIE_KEY, "all");
    box?.classList.remove("show");
  });
  document.getElementById("cookie-reject")?.addEventListener("click", () => {
    localStorage.setItem(COOKIE_KEY, "necessary");
    box?.classList.remove("show");
  });
}

function openModal(titleKey: string, bodyKey: string): void {
  const modal = document.getElementById("modal");
  const title = document.getElementById("modal-title");
  const body = document.getElementById("modal-body");
  if (title) title.textContent = t(locale, titleKey);
  if (body) body.textContent = t(locale, bodyKey);
  modal?.classList.add("open");
  document.getElementById("modal-close")?.focus();
}

function wireModals(): void {
  document.getElementById("privacy-btn")?.addEventListener("click", () => openModal("privacy.title", "privacy.body"));
  document.getElementById("terms-btn")?.addEventListener("click", () => openModal("terms.title", "terms.body"));
  document.getElementById("modal-close")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById("modal")?.classList.remove("open");
  });
  document.getElementById("modal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) document.getElementById("modal")?.classList.remove("open");
  });
}

function wireScrollSpy(): void {
  const map: Array<[string, string]> = [
    ["home", "home"],
    ["about", "about"],
    ["services", "services"],
    ["catalogue", "catalogue"],
    ["equipment", "equipment"],
    ["contact", "contact"],
  ];
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        document.querySelectorAll("nav a[data-nav]").forEach((a) => {
          a.setAttribute("aria-current", a.getAttribute("data-nav") === id ? "true" : "false");
        });
        document.querySelectorAll(".mobile-nav a").forEach((a) => {
          const href = a.getAttribute("href") ?? "";
          a.classList.toggle("active", href === `#${id}` || (id === "home" && href === "#top"));
        });
      });
    },
    { rootMargin: "-40% 0px -50% 0px" },
  );
  map.forEach(([id]) => {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  });
}

function tiltCards(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.matchMedia("(pointer: coarse)").matches) return;
  document.querySelectorAll<HTMLElement>(".svc").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

function boot3d(): void {
  const canvas = document.getElementById("hero-3d") as HTMLCanvasElement | null;
  const fallback = document.getElementById("stage-fallback");
  if (!canvas) return;
  void import("./logo3d")
    .then(({ mountHeroScene }) => {
      const handle = mountHeroScene(canvas);
      if (!handle) {
        canvas.remove();
        return;
      }
      fallback?.remove();
      window.addEventListener("resize", handle.resize, { passive: true });
      window.visualViewport?.addEventListener("resize", handle.resize, { passive: true });
      screen.orientation?.addEventListener("change", () => handle.resize());
    })
    .catch(() => {
      canvas.remove();
    });
}

function hideLoader(): void {
  const loader = document.getElementById("loader");
  requestAnimationFrame(() => {
    loader?.classList.add("hide");
    loader?.setAttribute("aria-hidden", "true");
    setTimeout(() => loader?.remove(), 600);
  });
}

bootLocale();
bootTheme();
renderLangMenu();
applyI18n();
wireHeader();
wireCatalogue();
wireRfq();
wireCookies();
wireModals();
wireScrollSpy();
tiltCards();
void boot3d();
window.addEventListener("load", hideLoader);
setTimeout(hideLoader, 1800);
