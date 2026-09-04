/** Client-side RFQ upload & input safeguards. Magic-byte checks run on ArrayBuffer. */

export const ALLOWED_EXTENSIONS = [
  "step",
  "stp",
  "iges",
  "igs",
  "dwg",
  "dxf",
  "pdf",
  "zip",
] as const;

export const BLOCKED_EXTENSIONS = [
  "exe",
  "bat",
  "cmd",
  "sh",
  "ps1",
  "msi",
  "dll",
  "js",
  "jar",
  "com",
  "scr",
  "vbs",
  "wsf",
  "php",
  "html",
  "htm",
  "svg",
  "svgz",
  "hta",
  "pif",
  "cpl",
  "jse",
  "vbe",
  "wsh",
  "msc",
  "apk",
  "dmg",
  "pkg",
  "iso",
  "img",
  "bin",
  "wasm",
  "py",
  "rb",
  "pl",
  "cgi",
  "aspx",
  "jsp",
  "shtml",
  "xhtml",
] as const;

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_FILES = 8;

const MAGIC: Array<{ name: string; bytes: number[]; offset?: number }> = [
  { name: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { name: "zip", bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK
  { name: "zip-empty", bytes: [0x50, 0x4b, 0x05, 0x06] },
  { name: "exe", bytes: [0x4d, 0x5a] }, // MZ
  { name: "elf", bytes: [0x7f, 0x45, 0x4c, 0x46] },
];

export function getExtension(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const parts = base.toLowerCase().split(".");
  if (parts.length < 2) return "";
  return parts.pop() ?? "";
}

export function hasDoubleExtension(filename: string): boolean {
  const base = (filename.split(/[/\\]/).pop() ?? filename).toLowerCase();
  const parts = base.split(".");
  if (parts.length <= 2) return false;
  const inner = parts.slice(0, -1).pop() ?? "";
  return (BLOCKED_EXTENSIONS as readonly string[]).includes(inner);
}

export function isAllowedExtension(filename: string): boolean {
  const ext = getExtension(filename);
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

export function isBlockedExtension(filename: string): boolean {
  const ext = getExtension(filename);
  return (BLOCKED_EXTENSIONS as readonly string[]).includes(ext);
}

function startsWith(buf: Uint8Array, sig: number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false;
  return sig.every((b, i) => buf[offset + i] === b);
}

function asciiHead(buf: Uint8Array, n = 256): string {
  const len = Math.min(n, buf.length);
  let out = "";
  for (let i = 0; i < len; i++) {
    const c = buf[i];
    if (c === 0) break;
    if (c >= 32 && c < 127) out += String.fromCharCode(c);
    else out += " ";
  }
  return out;
}

export type MagicVerdict =
  | { ok: true; kind: string }
  | { ok: false; reason: string };

export function inspectMagicBytes(buffer: ArrayBuffer, filename: string): MagicVerdict {
  const buf = new Uint8Array(buffer);
  const ext = getExtension(filename);

  if (startsWith(buf, [0x4d, 0x5a])) {
    return { ok: false, reason: "executable-mz" };
  }
  if (startsWith(buf, [0x7f, 0x45, 0x4c, 0x46])) {
    return { ok: false, reason: "executable-elf" };
  }
  if (startsWith(buf, [0x23, 0x21])) {
    return { ok: false, reason: "shell-script" };
  }
  if (startsWith(buf, [0xca, 0xfe, 0xba, 0xbe]) || startsWith(buf, [0xfe, 0xed, 0xfa, 0xce])) {
    return { ok: false, reason: "mach-o" };
  }

  const head = asciiHead(buf, 80).trimStart();

  if (ext === "pdf") {
    return startsWith(buf, [0x25, 0x50, 0x44, 0x46])
      ? { ok: true, kind: "pdf" }
      : { ok: false, reason: "pdf-magic-mismatch" };
  }

  if (ext === "zip") {
    const zip = MAGIC.filter((m) => m.name.startsWith("zip")).some((m) =>
      startsWith(buf, m.bytes),
    );
    return zip ? { ok: true, kind: "zip" } : { ok: false, reason: "zip-magic-mismatch" };
  }

  if (ext === "step" || ext === "stp") {
    const ok =
      head.includes("ISO-10303") ||
      head.startsWith("STEP") ||
      asciiHead(buf, 400).includes("ISO-10303-21");
    return ok ? { ok: true, kind: "step" } : { ok: false, reason: "step-header-mismatch" };
  }

  if (ext === "iges" || ext === "igs") {
    const sample = asciiHead(buf, 256);
    const startRecord = asciiHead(buf, 80);
    const ok =
      /IGES/i.test(sample) ||
      (buf.length >= 80 && startRecord.length >= 73 && startRecord[72] === "S");
    return ok ? { ok: true, kind: "iges" } : { ok: false, reason: "iges-header-mismatch" };
  }

  if (ext === "dxf") {
    const sample = asciiHead(buf, 240);
    const ok = sample.includes("SECTION") || sample.includes("ENTITIES") || sample.includes("AutoCAD");
    return ok ? { ok: true, kind: "dxf" } : { ok: false, reason: "dxf-header-mismatch" };
  }

  if (ext === "dwg") {
    const ok = asciiHead(buf, 6).startsWith("AC10") || asciiHead(buf, 6).startsWith("AC");
    return ok ? { ok: true, kind: "dwg" } : { ok: false, reason: "dwg-header-mismatch" };
  }

  return { ok: false, reason: "unknown-type" };
}

export function validateFileMeta(file: { name: string; size: number; type?: string }): {
  ok: boolean;
  error?: string;
} {
  if (!file.name || file.name.length > 180) {
    return { ok: false, error: "filename" };
  }
  if (file.name.includes("\0") || file.name.includes("..")) {
    return { ok: false, error: "path-traversal" };
  }
  if (/[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/.test(file.name)) {
    return { ok: false, error: "filename" };
  }
  if (isBlockedExtension(file.name) || hasDoubleExtension(file.name)) {
    return { ok: false, error: "blocked-extension" };
  }
  if (!isAllowedExtension(file.name)) {
    return { ok: false, error: "extension" };
  }
  if (file.size <= 0) {
    return { ok: false, error: "empty" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "too-large" };
  }
  return { ok: true };
}

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PHONE_RE = /^[+0-9()\s.-]{7,24}$/;
const NAME_RE = /^[\p{L}\p{M}0-9 .,'&\-/]{2,80}$/u;

export function sanitizeText(input: string, max = 400): string {
  return input
    .replace(/[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function sanitizeMultiline(input: string, max = 1200): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, max);
}

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (/javascript:|data:|[\r\n<>]/i.test(v)) return false;
  return EMAIL_RE.test(v);
}

export function isValidPhone(value: string): boolean {
  const v = value.trim();
  if (!PHONE_RE.test(v)) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function isValidName(value: string): boolean {
  return NAME_RE.test(value.trim());
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function looksLikeBot(honeypot: string, startedAt: number, now = Date.now()): boolean {
  if (honeypot.trim().length > 0) return true;
  if (now - startedAt < 1400) return true;
  return false;
}
