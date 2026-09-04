"""Three delivery PDFs: build/tech, tests/fixes, final review."""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
NAVY = colors.HexColor("#0F172A")
BLUE = colors.HexColor("#0284C7")
AMBER = colors.HexColor("#F59E0B")
SLATE = colors.HexColor("#334155")
MUTED = colors.HexColor("#64748B")
ROW = colors.HexColor("#F1F5F9")
GREEN = colors.HexColor("#065F46")
PASS_BG = colors.HexColor("#D1FAE5")
FIX_BG = colors.HexColor("#FEF3C7")
WHITE = colors.white


def styles():
    base = getSampleStyleSheet()
    return {
        "kicker": ParagraphStyle(
            "kicker", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=9, textColor=AMBER, spaceAfter=6,
        ),
        "title": ParagraphStyle(
            "title", parent=base["Title"], fontName="Helvetica-Bold",
            fontSize=20, leading=24, textColor=NAVY, alignment=TA_LEFT, spaceAfter=8,
        ),
        "h1": ParagraphStyle(
            "h1", parent=base["Heading1"], fontName="Helvetica-Bold",
            fontSize=13.5, leading=17, textColor=NAVY, spaceBefore=12, spaceAfter=6,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], fontName="Helvetica-Bold",
            fontSize=11, leading=14, textColor=BLUE, spaceBefore=9, spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "body", parent=base["BodyText"], fontName="Helvetica",
            fontSize=9.4, leading=13, textColor=NAVY, alignment=TA_JUSTIFY, spaceAfter=6,
        ),
        "small": ParagraphStyle(
            "small", parent=base["BodyText"], fontName="Helvetica",
            fontSize=8, leading=11, textColor=SLATE, spaceAfter=4,
        ),
        "cell": ParagraphStyle(
            "cell", parent=base["BodyText"], fontName="Helvetica",
            fontSize=8, leading=10.5, textColor=NAVY,
        ),
        "cellb": ParagraphStyle(
            "cellb", parent=base["BodyText"], fontName="Helvetica-Bold",
            fontSize=8, leading=10.5, textColor=NAVY,
        ),
        "cellh": ParagraphStyle(
            "cellh", parent=base["BodyText"], fontName="Helvetica-Bold",
            fontSize=8, leading=10.5, textColor=WHITE,
        ),
        "pass": ParagraphStyle(
            "pass", parent=base["BodyText"], fontName="Helvetica-Bold",
            fontSize=8, leading=10.5, textColor=GREEN,
        ),
        "footer": ParagraphStyle(
            "footer", parent=base["Normal"], fontName="Helvetica",
            fontSize=8, textColor=MUTED,
        ),
    }


def P(text, st):
    return Paragraph(str(text).replace("\n", "<br/>"), st)


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, A4[1] - 16 * mm, A4[0], 16 * mm, fill=1, stroke=0)
    canvas.setFillColor(AMBER)
    canvas.rect(0, A4[1] - 16.8 * mm, A4[0], 2, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(18 * mm, A4[1] - 10 * mm, "METAL PROD SERVICE  ·  SATU MARE")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(A4[0] - 18 * mm, A4[1] - 10 * mm, "Project documentation  ·  4 Sep 2026")
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, A4[0], 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(18 * mm, 5 * mm, "Confidential — internal delivery pack")
    canvas.drawRightString(A4[0] - 18 * mm, 5 * mm, f"Page {doc.page}")
    canvas.restoreState()


def table(rows, cols, s, header=True):
    data = []
    for i, row in enumerate(rows):
        sty = s["cellh"] if header and i == 0 else s["cell"]
        data.append([P(c, sty) for c in row])
    t = Table(data, colWidths=cols, repeatRows=1 if header else 0)
    cmds = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E2E8F0")),
        ("BACKGROUND", (0, 1), (-1, -1), ROW),
    ]
    if header:
        cmds.append(("BACKGROUND", (0, 0), (-1, 0), NAVY))
    t.setStyle(TableStyle(cmds))
    return t


def bullets(items, s):
    return ListFlowable(
        [ListItem(P(i, s["body"]), leftIndent=8, bulletColor=BLUE) for i in items],
        bulletType="bullet",
        start="•",
        leftIndent=14,
        bulletFontName="Helvetica",
        bulletFontSize=9,
    )


def build_doc(path, title, kicker, story_fn):
    s = styles()
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=18 * mm,
        title=title,
        author="Metal Prod Service",
    )
    story = [P(kicker, s["kicker"]), P(title, s["title"])]
    story.extend(story_fn(s))
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)


def tech(s):
    w = 174 * mm
    out = []
    out += [
        P("How the Metal Prod Service website was built, which technologies were chosen, and why.", s["body"]),
        P("1. Purpose", s["h1"]),
        P(
            "The site is the public face of Metal Prod Service S.R.L. (Parc Industrial Sud 2/B, Satu Mare, CUI RO18205726). "
            "It must present CNC milling, turning, prototyping, series work, technical plastics and in-house heat treatment, "
            "in seven languages, and collect a technical request-for-quote (RFQ) that engineering can act on within 24 hours.",
            s["body"],
        ),
        P("2. Architecture", s["h1"]),
        P(
            "A static single-page application (SPA). There is no application server and no database. Vite compiles TypeScript "
            "and CSS into hashed assets under <b>dist/</b>. Preview and production are just a static file host (Vite preview locally; "
            "any HTTPS host in production) plus security headers.",
            s["body"],
        ),
        table(
            [
                ["Layer", "Choice", "Role"],
                ["Language", "TypeScript (strict)", "UI, RFQ, i18n, security helpers"],
                ["Bundler", "Vite 6", "Dev server, production build, header injection"],
                ["3D", "Three.js 0.170", "Hero CNC spur gear (lazy-loaded chunk)"],
                ["Markup", "index.html", "Semantic sections, RFQ form, JSON-LD"],
                ["Style", "Custom CSS tokens", "Industrial palette from the specification, no Tailwind"],
                ["i18n", "data-i18n dictionaries", "EN, RO, HU, DE, FR, ES, IT"],
                ["Tests", "Vitest + Playwright", "Unit, e2e, foldable viewports"],
                ["Load", "Node fetch probe", "80 concurrent users × 4 rounds"],
                ["RFQ delivery", "FormSubmit HTTPS + mailto fallback", "Owner inbox trif_marius1@yahoo.com"],
            ],
            [32 * mm, 52 * mm, 90 * mm],
            s,
        ),
        Spacer(1, 8),
        P("3. Information architecture", s["h1"]),
        bullets(
            [
                "Header: logo, primary nav (desktop), language, theme, RFQ, burger (≤980 px).",
                "Hero: factory photo, ISO chips, headline, two CTAs, 3D gear.",
                "Trust strip, About (factory exterior + interior photos), industries, six services, process, catalogue, equipment table, RFQ, FAQ, contact + OSM map, footer, mobile bottom nav.",
            ],
            s,
        ),
        P("4. RFQ engine", s["h1"]),
        P(
            "Three steps: (1) production mode, material, heat treatment; (2) CAD/drawing upload with magic-byte checks; "
            "(3) company, engineer, email, phone, date, notes, GDPR. Submit posts JSON to FormSubmit (owner Yahoo inbox) "
            "and falls back to a pre-filled mailto if the HTTP path is not yet activated. Files are vetted in the browser "
            "(extension allow-list, blocked executables, 50 MB cap, 8 files, PDF/ZIP/STEP/IGES/DXF/DWG signatures). "
            "A honeypot plus a 1.4 s minimum fill time reject obvious bots. Control characters and mailto header injection are stripped.",
            s["body"],
        ),
        P("5. Security posture (static site)", s["h1"]),
        bullets(
            [
                "CSP: script-src 'self' (no unsafe-eval / unsafe-inline), object-src none, worker-src none, upgrade-insecure-requests, connect-src self + formsubmit.co.",
                "COOP / CORP same-origin, X-Content-Type-Options nosniff, X-Frame-Options SAMEORIGIN, HSTS, tight Permissions-Policy.",
                "No PII in sessionStorage. File names HTML-escaped. OSM iframe sandboxed.",
            ],
            s,
        ),
        P("6. Responsive and foldable design", s["h1"]),
        P(
            "Breakpoints treat cover screens as phones, unfolded book-style inners (~600–840 px, near-square) as small tablets "
            "(two-column hero and services), Flip covers and flex/tent panes as short one-column views, and landscape phones as "
            "two-column heroes without a bottom nav. CSS Viewport Segments pad dual-screen hinges when the browser exposes them.",
            s["body"],
        ),
        P("7. Source layout", s["h1"]),
        table(
            [
                ["Path", "Contents"],
                ["src/main.ts", "Boot, i18n apply, header, RFQ wiring, 3D lazy import"],
                ["src/rfq.ts", "State, validation, mailto, FormSubmit payload"],
                ["src/security.ts", "Magic bytes, sanitise, email/phone/name rules"],
                ["src/logo3d.ts", "CNC spur gear scene"],
                ["src/i18n*.ts", "Seven locale dictionaries"],
                ["src/styles.css", "Tokens, layout, foldable media queries"],
                ["tests/", "Vitest, Playwright e2e, load probe, visual scripts"],
                ["public/", "_headers, robots, sitemap, factory and product images"],
            ],
            [40 * mm, 134 * mm],
            s,
        ),
        Spacer(1, 8),
        P("8. What is intentionally not in this build", s["h1"]),
        P(
            "No CMS, no customer login, no server-side CAD virus scan or ZIP unpack, no native iOS/Android apps. "
            "Those belong in a later backend. The current site is the marketing and RFQ front door.",
            s["body"],
        ),
    ]
    return out


def tests(s):
    out = []
    out += [
        P("Catalogue of tests run from scratch, defects found, fixes, and retest results (4 Sep 2026).", s["body"]),
        P("1. Final scores (this pass)", s["h1"]),
        table(
            [
                ["Suite", "Result", "Notes"],
                ["Vitest unit (security + i18n)", "16 / 16 PASS", "Magic bytes, XSS escape, mailto injection, FormSubmit mock, 7 locales"],
                ["Playwright e2e (Chromium + mobile)", "82 / 82 PASS", "Buttons, RFQ tabs, happy-path submit, languages, UK flag, photos, foldables"],
                ["Load / stress", "320 req, 0 failed", "80 users × 4 rounds; avg 214 ms; p99 455 ms"],
                ["Live RFQ HTTP", "Activation mailed", "FormSubmit posted from the site origin to trif_marius1@yahoo.com"],
            ],
            [55 * mm, 40 * mm, 79 * mm],
            s,
        ),
        Spacer(1, 8),
        P("2. What “from scratch” covered", s["h1"]),
        P("2.1 Functional / UI / buttons", s["h2"]),
        bullets(
            [
                "Logo home, desktop nav, mega-menu (6 services), burger drawer, mobile bottom nav, header RFQ, hero CTAs.",
                "Language menu (7 locales), UK Union Jack vs French tricolour, theme toggle, cookie accept/reject.",
                "Catalogue filters, RFQ step tabs + Continue/Back/Submit, privacy/terms modal, map link.",
            ],
            s,
        ),
        P("2.2 Usability / UI-UX", s["h2"]),
        bullets(
            [
                "16 px inputs (no iOS zoom), 44 px tap targets, skip-link, focus-visible, opaque sticky header, scroll-margin for hashes.",
                "RFQ: sending state, success copy, clipboard copy, default delivery date +14 days, files optional, GDPR required.",
            ],
            s,
        ),
        P("2.3 Devices and OS (layout emulation)", s["h2"]),
        P(
            "Native Safari/Firefox/Edge binaries were not installed in this Windows workspace. Layout was verified in Chromium "
            "with device viewports that match 2026 phones, tablets and foldables (iOS and Android CSS pixel sizes are independent "
            "of the engine for wrapping and overflow). Foldables: Z Fold 6/7/8 cover+inner+landscape, Pixel 9/10 Pro Fold, "
            "Honor Magic V6, OnePlus Open, Z Flip 6/8 open+cover, Razr cover, Flip flex pane.",
            s["body"],
        ),
        P("2.4 Security", s["h2"]),
        bullets(
            [
                "Headers: nosniff, SAMEORIGIN, CSP object-src none, worker-src none, no unsafe-eval.",
                "Upload: exe/hta/aspx blocked, RTL filenames blocked, IGES no longer accepts any file starting with S, DXF requires SECTION/ENTITIES.",
                "Form: honeypot, min fill time, HTML escape of file chips, CRLF stripped from mailto.",
            ],
            s,
        ),
        P("2.5 Performance / load / stress", s["h2"]),
        P(
            "Local static preview, 80 concurrent clients × 4 rounds = 320 requests across HTML, favicon and factory JPEGs. "
            "Failed 0. Average 214 ms, p99 455 ms (well under the 1.5 s gate).",
            s["body"],
        ),
        P("3. Defects found and fixed (project history)", s["h1"]),
        table(
            [
                ["ID", "Symptom", "Fix"],
                ["D01", "English flag looked French", "Union Jack SVG"],
                ["D02", "RFQ tabs did not switch (CSS [hidden])", "display:none !important; progress-tab buttons"],
                ["D03", "Hero 3D was an unreadable mill", "CNC spur gear, later scaled 0.7"],
                ["D04", "Phone header overlapped UK flag", "Compact wordmark; hide tagline ≤980 px"],
                ["D05", "Landscape phone nav crushed hero", "Hide bottom nav; 2-col hero ≥600 px landscape"],
                ["D06", "2-col cards on 390 px phones", "1-col services/catalogue below 600 px"],
                ["D07", "DE bottom nav overflow", "Short mobile.* labels"],
                ["D08", "Sticky header ghosted titles", "More opaque header; scroll-margin"],
                ["D09", "Fold inner used phone 1-col", "2-col hero/services from 600 px; hide nav if height ≤680"],
                ["D10", "Flip cover clipped title/CTA", "Short-pane 1-col, hide 3D and secondary CTA"],
                ["D11", "DXF magic accepted any “0”", "Require SECTION/ENTITIES/AutoCAD"],
                ["D12", "IGES magic too weak", "IGES token or column-73 S record"],
                ["D13", "RFQ only opened mailto", "FormSubmit HTTPS + mailto fallback + copy"],
                ["D14", "Draft stored email/phone", "sessionStorage keeps process fields only"],
                ["D15", "Inline styles blocked dropping CSP unsafe-inline", "Moved to CSS classes"],
            ],
            [16 * mm, 62 * mm, 96 * mm],
            s,
        ),
        Spacer(1, 8),
        P("4. RFQ send — live check (4 Sep 2026)", s["h1"]),
        P(
            "A sample RFQ (Acme Hydraulics SRL, engineer Ioan Pop, prototype 16MnCr5 shaft, h6, qty 1) was posted from "
            "http://127.0.0.1:4173 to FormSubmit for <b>trif_marius1@yahoo.com</b> (git user.email / owner inbox). "
            "HTTP 200. FormSubmit replied that the form needs one-time activation and that it had emailed an "
            "<b>Activate Form</b> link to that Yahoo address. Until that link is clicked, further HTTP posts stay pending; "
            "the site still opens a pre-filled mail message as fallback and can copy the RFQ text. "
            "After activation, the same submit path delivers a normal table email to Yahoo.",
            s["body"],
        ),
        P("5. Residual limitations", s["h1"]),
        bullets(
            [
                "Playwright “mobile” is Chromium with an iPhone viewport, not WebKit.",
                "ZIP payloads are not unpacked on a server.",
                "Bunny fonts and OpenStreetMap remain third-party.",
                "rfq@metalprodservice.com still needs a real mailbox/DNS; owner Yahoo is the live inbox now.",
            ],
            s,
        ),
    ]
    return out


def review(s):
    out = []
    out += [
        P("Independent wrap-up after construction, hardening, foldable work, RFQ delivery, and the 4 Sep 2026 retest.", s["body"]),
        P("Verdict", s["h1"]),
        P(
            "<b>PASS for release as a static marketing + RFQ site</b>, with one owner action: click the FormSubmit "
            "activation mail in Yahoo so HTTP delivery is live. Until then, RFQ still works via the visitor’s mail app.",
            s["body"],
        ),
        P("Fit for purpose", s["h1"]),
        table(
            [
                ["Question", "Answer"],
                ["Looks industrial and on-spec?", "Yes — navy/amber tokens, factory photos, ISO chips, machine table."],
                ["Usable on a phone?", "Yes — 320–430 px, bottom nav, RFQ stacked, 16 px fields."],
                ["Usable on 2026 foldables?", "Yes — cover / inner / inner-landscape / Flip cover / flex pane tested."],
                ["Seven languages?", "Yes — dictionaries complete; UK flag for English."],
                ["Can a buyer request an offer?", "Yes — 3 steps, validation, GDPR, file vetting, HTTP + mailto."],
                ["Did we send a real example?", "Yes — FormSubmit accepted the POST and mailed Yahoo an activation (and will mail RFQs after the click)."],
                ["Security reasonable for static?", "Yes — strict CSP, upload gates, no eval, no PII cache."],
                ["Load?", "320/320 OK locally; CDN still advised for global photos."],
            ],
            [48 * mm, 126 * mm],
            s,
        ),
        Spacer(1, 8),
        P("Request-offer experience (pleasant path)", s["h1"]),
        bullets(
            [
                "Entry: header RFQ, hero “Request a Free Technical Quote”, catalogue “Quote a similar part”, contact CTA, mobile Quote tab.",
                "Step 1 is two selects and three production modes — no empty required fields besides choosing a mode (defaulted).",
                "Step 2 files are optional; bad files show a red chip instead of blocking the whole form.",
                "Step 3 pre-fills a delivery date two weeks out; invalid email/phone/name explain themselves; GDPR is explicit.",
                "Submit shows “Sending…”, then a success card with copy-text. No silent failure.",
            ],
            s,
        ),
        P("Owner checklist after this pack", s["h1"]),
        bullets(
            [
                "Open Yahoo for trif_marius1@yahoo.com → FormSubmit “Activate Form” → click once.",
                "Send a second RFQ from the site; it should land as a table email (not only activation).",
                "Point metalprodservice.com DNS at the dist/ host; confirm HTTPS so HSTS is meaningful.",
                "Create the rfq@metalprodservice.com mailbox and, when ready, switch RFQ_OWNER_MAIL / RFQ_MAILBOX in src/rfq.ts.",
                "Replace placeholder phone copy when the public number is confirmed.",
            ],
            s,
        ),
        P("Out of scope / next backend", s["h1"]),
        P(
            "Server-side antivirus of CAD, authenticated customer portal, CRM hook, and rate limiting cannot be finished "
            "in a static SPA. The front door is ready; those are a second project.",
            s["body"],
        ),
        P("Sign-off", s["h1"]),
        P(
            "Built with Vite 6 + TypeScript + Three.js. Retested unit, e2e, load, foldable viewports, RFQ happy path, and a live HTTP post to the owner inbox. "
            "Documents in this pack: Build and Technology; Test Report; this Final Review.",
            s["body"],
        ),
        P("Metal Prod Service S.R.L.  ·  Satu Mare  ·  4 September 2026", s["small"]),
    ]
    return out


def main():
    build_doc(
        ROOT / "Metal_Prod_Service_Build_and_Technology.pdf",
        "Build and technology",
        "DOCUMENT 1 OF 3",
        tech,
    )
    build_doc(
        ROOT / "Metal_Prod_Service_Test_Report.pdf",
        "What was tested and fixed",
        "DOCUMENT 2 OF 3",
        tests,
    )
    build_doc(
        ROOT / "Metal_Prod_Service_Final_Review.pdf",
        "Final review",
        "DOCUMENT 3 OF 3",
        review,
    )
    print("wrote 3 PDFs")


if __name__ == "__main__":
    main()
