import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  inspectMagicBytes,
  isValidEmail,
  isValidPhone,
  looksLikeBot,
  sanitizeText,
  validateFileMeta,
} from "../src/security";
import { buildMailto, emptyState, submitRfq } from "../src/rfq";

function buf(s: string): ArrayBuffer {
  return new TextEncoder().encode(s).buffer;
}

describe("RFQ upload protection", () => {
  it("accepts STEP / PDF / ZIP metadata", () => {
    expect(validateFileMeta({ name: "part.STEP", size: 1200 }).ok).toBe(true);
    expect(validateFileMeta({ name: "draw.PDF", size: 800 }).ok).toBe(true);
    expect(validateFileMeta({ name: "pack.zip", size: 4096 }).ok).toBe(true);
  });

  it("rejects executables, scripts and double extensions", () => {
    expect(validateFileMeta({ name: "payload.exe", size: 12 }).ok).toBe(false);
    expect(validateFileMeta({ name: "run.bat", size: 12 }).ok).toBe(false);
    expect(validateFileMeta({ name: "part.pdf.exe", size: 12 }).ok).toBe(false);
    expect(validateFileMeta({ name: "../secret.step", size: 12 }).ok).toBe(false);
    expect(validateFileMeta({ name: "drop.hta", size: 12 }).ok).toBe(false);
    expect(validateFileMeta({ name: "payload.aspx", size: 12 }).ok).toBe(false);
    expect(validateFileMeta({ name: "part.step\u202Eexe", size: 12 }).ok).toBe(false);
  });

  it("enforces the 50 MB ceiling", () => {
    expect(validateFileMeta({ name: "huge.step", size: 51 * 1024 * 1024 }).error).toBe("too-large");
  });

  it("rejects a disguised DXF that is only a zero byte string", () => {
    expect(inspectMagicBytes(new TextEncoder().encode("0000").buffer, "x.dxf").ok).toBe(false);
  });

  it("magic-byte checks catch disguised executables", () => {
    const mz = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]).buffer;
    expect(inspectMagicBytes(mz, "drawing.pdf").ok).toBe(false);
    expect(inspectMagicBytes(buf("%PDF-1.7\n"), "drawing.pdf").ok).toBe(true);
    expect(inspectMagicBytes(buf("ISO-10303-21;"), "part.step").ok).toBe(true);
    expect(inspectMagicBytes(buf("MZ"), "part.step").ok).toBe(false);
    expect(inspectMagicBytes(buf("0"), "part.dxf").ok).toBe(false);
    expect(inspectMagicBytes(buf("  0\nSECTION\n"), "part.dxf").ok).toBe(true);
    expect(inspectMagicBytes(buf("Shello world this is not CAD"), "part.igs").ok).toBe(false);
    const iges = " ".repeat(72) + "S      1";
    expect(inspectMagicBytes(buf(iges.padEnd(120, " ")), "part.igs").ok).toBe(true);
  });
});

describe("form integrity", () => {
  it("validates email and phone", () => {
    expect(isValidEmail("rfq@metalprodservice.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("x<script>@x.com")).toBe(false);
    expect(isValidEmail("javascript:alert(1)@x.com")).toBe(false);
    expect(isValidEmail("user@x.com\nBcc:evil@x.com")).toBe(false);
    expect(isValidPhone("+40 744 123 456")).toBe(true);
    expect(isValidPhone("abc")).toBe(false);
  });

  it("escapes HTML to prevent XSS in file chips", () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      "&lt;img src=x onerror=alert(1)&gt;",
    );
  });

  it("flags honeypot and instant submits as bots", () => {
    expect(looksLikeBot("http://spam", Date.now() - 5000)).toBe(true);
    expect(looksLikeBot("", Date.now())).toBe(true);
    expect(looksLikeBot("", Date.now() - 2000)).toBe(false);
  });

  it("strips control characters and RTL overrides from text", () => {
    expect(sanitizeText("ACME\u0000Ltd\u202E")).toBe("ACME Ltd");
  });

  it("encodes mailto so header injection cannot land as raw CRLF", () => {
    const state = emptyState();
    state.company = "ACME\r\nBcc: attacker@evil.com";
    state.engineer = "Pat Engineer";
    state.email = "pat@client.com";
    state.phone = "40744123456";
    state.date = "2026-09-10";
    state.gdpr = true;
    state.startedAt = Date.now() - 5000;
    const href = buildMailto(state);
    expect(href.startsWith("mailto:trif_marius1@yahoo.com?")).toBe(true);
    expect(href).toContain("cc=rfq%40metalprodservice.com");
    expect(href).not.toMatch(/\r|\n/);
    expect(href).not.toContain("Bcc:");
    expect(href).toContain("Bcc%3A");
  });

  it("submitRfq reports HTTP success from FormSubmit JSON", async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ success: "true" }), { status: 200, headers: { "Content-Type": "application/json" } });
    try {
      const state = emptyState();
      state.company = "Acme Hydraulics";
      state.engineer = "Ioan Pop";
      state.email = "ioan@acme.example";
      state.phone = "40744123456";
      state.date = "2026-10-15";
      const result = await submitRfq(state);
      expect(result.ok).toBe(true);
      expect(result.via).toBe("http");
    } finally {
      globalThis.fetch = orig;
    }
  });
});
