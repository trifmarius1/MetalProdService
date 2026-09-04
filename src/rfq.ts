import type { Locale } from "./i18n";
import { t } from "./i18n";
import {
  escapeHtml,
  inspectMagicBytes,
  isValidEmail,
  isValidName,
  isValidPhone,
  looksLikeBot,
  sanitizeMultiline,
  sanitizeText,
  validateFileMeta,
} from "./security";

export type RfqFile = {
  name: string;
  size: number;
  ok: boolean;
  message: string;
};

export type RfqState = {
  step: 1 | 2 | 3;
  mode: string;
  material: string;
  heat: string;
  files: RfqFile[];
  company: string;
  tax: string;
  engineer: string;
  email: string;
  phone: string;
  date: string;
  notes: string;
  gdpr: boolean;
  honeypot: string;
  startedAt: number;
  submitted: boolean;
};

const STORAGE_KEY = "mps.rfq.draft";

export function emptyState(): RfqState {
  return {
    step: 1,
    mode: "proto",
    material: "steel",
    heat: "none",
    files: [],
    company: "",
    tax: "",
    engineer: "",
    email: "",
    phone: "",
    date: "",
    notes: "",
    gdpr: false,
    honeypot: "",
    startedAt: Date.now(),
    submitted: false,
  };
}

export function persistDraft(state: RfqState): void {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        step: state.step,
        mode: state.mode,
        material: state.material,
        heat: state.heat,
      }),
    );
  } catch {
    /* private mode */
  }
}

export async function vetFile(file: File, locale: Locale): Promise<RfqFile> {
  const meta = validateFileMeta(file);
  if (!meta.ok) {
    const map: Record<string, string> = {
      extension: t(locale, "rfq.fileBad"),
      "blocked-extension": t(locale, "rfq.fileExe"),
      "too-large": t(locale, "rfq.fileBig"),
      "path-traversal": t(locale, "rfq.fileBad"),
      filename: t(locale, "rfq.fileBad"),
      empty: t(locale, "rfq.fileBad"),
    };
    return { name: file.name, size: file.size, ok: false, message: map[meta.error ?? ""] ?? t(locale, "rfq.fileBad") };
  }
  const head = await file.slice(0, 512).arrayBuffer();
  const magic = inspectMagicBytes(head, file.name);
  if (!magic.ok) {
    return { name: file.name, size: file.size, ok: false, message: t(locale, "rfq.fileMagic") };
  }
  return { name: file.name, size: file.size, ok: true, message: t(locale, "rfq.fileOk") };
}

export type FieldErrors = Record<string, string>;

export function validateStep(state: RfqState, locale: Locale, step: 1 | 2 | 3): FieldErrors {
  const errors: FieldErrors = {};
  if (step === 1) {
    if (!state.mode) errors.mode = t(locale, "rfq.required");
    if (!state.material) errors.material = t(locale, "rfq.required");
  }
  if (step === 3) {
    if (!isValidName(state.company)) errors.company = t(locale, "rfq.invalidName");
    if (!state.company.trim()) errors.company = t(locale, "rfq.required");
    if (!isValidName(state.engineer)) errors.engineer = t(locale, "rfq.invalidName");
    if (!state.engineer.trim()) errors.engineer = t(locale, "rfq.required");
    if (!isValidEmail(state.email)) errors.email = t(locale, "rfq.invalidEmail");
    if (!isValidPhone(state.phone)) errors.phone = t(locale, "rfq.invalidPhone");
    if (!state.date) errors.date = t(locale, "rfq.required");
    if (!state.gdpr) errors.gdpr = t(locale, "rfq.gdprNeeded");
    if (looksLikeBot(state.honeypot, state.startedAt)) errors.form = t(locale, "rfq.bot");
  }
  return errors;
}

export const RFQ_MAILBOX = "rfq@metalprodservice.com";
/** Owner inbox used for live delivery until rfq@ DNS/mailbox is live. */
export const RFQ_OWNER_MAIL = "trif_marius1@yahoo.com";

export function buildRfqPlainText(state: RfqState): string {
  return [
    "Metal Prod Service RFQ",
    `Official desk: ${RFQ_MAILBOX}`,
    `Mode: ${state.mode}`,
    `Material: ${state.material}`,
    `Heat treatment: ${state.heat}`,
    `Company: ${sanitizeText(state.company)}`,
    `Tax/CUI: ${sanitizeText(state.tax, 40)}`,
    `Engineer: ${sanitizeText(state.engineer)}`,
    `Email: ${sanitizeText(state.email, 120)}`,
    `Phone: ${sanitizeText(state.phone, 24)}`,
    `Delivery: ${sanitizeText(state.date, 32)}`,
    `Files: ${state.files.filter((f) => f.ok).map((f) => sanitizeText(f.name, 80)).join(", ") || "(none attached — follow-up)"}`,
    "",
    sanitizeMultiline(state.notes, 1200),
  ].join("\n");
}

export function buildMailto(state: RfqState): string {
  const subject = "RFQ — " + sanitizeText(state.company, 80);
  return `mailto:${RFQ_OWNER_MAIL}?cc=${encodeURIComponent(RFQ_MAILBOX)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildRfqPlainText(state))}`;
}

export type RfqSubmitResult = { ok: boolean; via: "http" | "mailto"; detail?: string };

export async function submitRfq(state: RfqState): Promise<RfqSubmitResult> {
  const subject = "RFQ — " + sanitizeText(state.company, 80);
  const payload: Record<string, string> = {
    _subject: subject,
    _template: "table",
    _captcha: "false",
    _replyto: sanitizeText(state.email, 120),
    name: sanitizeText(state.engineer),
    email: sanitizeText(state.email, 120),
    company: sanitizeText(state.company),
    tax: sanitizeText(state.tax, 40),
    phone: sanitizeText(state.phone, 24),
    mode: sanitizeText(state.mode, 40),
    material: sanitizeText(state.material, 40),
    heat: sanitizeText(state.heat, 40),
    delivery: sanitizeText(state.date, 32),
    files: state.files.filter((f) => f.ok).map((f) => sanitizeText(f.name, 80)).join(", ") || "(none)",
    message: buildRfqPlainText(state),
  };
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${RFQ_OWNER_MAIL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { success?: boolean | string; message?: string };
    const ok = data.success === true || data.success === "true";
    if (ok) return { ok: true, via: "http" };
    return { ok: false, via: "mailto", detail: data.message };
  } catch {
    return { ok: false, via: "mailto" };
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileChipHtml(file: RfqFile): string {
  const cls = file.ok ? "ok" : "bad";
  return `<li class="file-chip ${cls}"><span>${escapeHtml(file.name)}</span><small>${formatBytes(file.size)} · ${escapeHtml(file.message)}</small></li>`;
}
