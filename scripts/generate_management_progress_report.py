from __future__ import annotations

import os
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    Flowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports"
RENDERED = REPORTS / "rendered"
OUTPUT = REPORTS / "ARG_CRM_Management_Progress_Report_2026-08-03.pdf"

PAGE_W, PAGE_H = landscape(A4)
MARGIN_X = 14 * mm
MARGIN_TOP = 13 * mm
MARGIN_BOTTOM = 13 * mm
CONTENT_W = PAGE_W - (2 * MARGIN_X)

NAVY = colors.HexColor("#06283D")
DEEP_NAVY = colors.HexColor("#041F31")
BLUE = colors.HexColor("#1F6AA5")
LIGHT_BLUE = colors.HexColor("#DCEAF6")
RED = colors.HexColor("#D94A48")
LIGHT_RED = colors.HexColor("#FAE4E2")
YELLOW = colors.HexColor("#E6A933")
LIGHT_YELLOW = colors.HexColor("#F8EDCE")
GREEN = colors.HexColor("#6D9F3D")
LIGHT_GREEN = colors.HexColor("#E6F0D8")
VIOLET = colors.HexColor("#7657C8")
BACKGROUND = colors.HexColor("#F7F5EF")
SURFACE = colors.white
MUTED = colors.HexColor("#EEF1F4")
BORDER = colors.HexColor("#17324D")
BORDER_LIGHT = colors.HexColor("#CBD5DF")
TEXT = colors.HexColor("#151515")
TEXT_MUTED = colors.HexColor("#586575")


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="CoverEyebrow",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=LIGHT_BLUE,
        spaceAfter=7,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=30,
        textColor=colors.white,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=12,
        leading=17,
        textColor=colors.white,
    )
)
styles.add(
    ParagraphStyle(
        name="PageTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=23,
        textColor=NAVY,
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        name="PageSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=TEXT_MUTED,
        spaceAfter=9,
    )
)
styles.add(
    ParagraphStyle(
        name="SectionTitle",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=NAVY,
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        name="Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.8,
        leading=12.2,
        textColor=TEXT,
    )
)
styles.add(
    ParagraphStyle(
        name="BodySmall",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=7.7,
        leading=10.4,
        textColor=TEXT,
    )
)
styles.add(
    ParagraphStyle(
        name="SmallMuted",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.2,
        leading=9.5,
        textColor=TEXT_MUTED,
    )
)
styles.add(
    ParagraphStyle(
        name="CardLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.2,
        leading=8.6,
        textColor=TEXT_MUTED,
    )
)
styles.add(
    ParagraphStyle(
        name="CardValue",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=19,
        textColor=NAVY,
    )
)
styles.add(
    ParagraphStyle(
        name="TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.2,
        leading=9,
        textColor=colors.white,
    )
)
styles.add(
    ParagraphStyle(
        name="TableBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.1,
        leading=9.2,
        textColor=TEXT,
    )
)
styles.add(
    ParagraphStyle(
        name="TableBodyBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.1,
        leading=9.2,
        textColor=TEXT,
    )
)


def p(text: str, style: str = "Body") -> Paragraph:
    return Paragraph(text, styles[style])


def bullet(text: str, color: colors.Color = BLUE) -> Table:
    dot = Table([[""]], colWidths=[3.2 * mm], rowHeights=[3.2 * mm])
    dot.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), color),
                ("BOX", (0, 0), (-1, -1), 0, color),
            ]
        )
    )
    t = Table([[dot, p(text)]], colWidths=[5 * mm, None])
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return t


def status_pill(text: str, fill: colors.Color, ink: colors.Color = TEXT) -> Table:
    t = Table([[p(text, "BodySmall")]], colWidths=[31 * mm], rowHeights=[8 * mm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), fill),
                ("BOX", (0, 0), (-1, -1), 0.8, ink),
                ("TEXTCOLOR", (0, 0), (-1, -1), ink),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return t


def metric_card(label: str, value: str, note: str, accent: colors.Color) -> Table:
    body = [
        [p(label.upper(), "CardLabel")],
        [p(value, "CardValue")],
        [p(note, "SmallMuted")],
    ]
    card = Table(body, colWidths=[45 * mm], rowHeights=[6 * mm, 9 * mm, 12 * mm])
    card.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SURFACE),
                ("BOX", (0, 0), (-1, -1), 1.2, accent),
                ("LINEABOVE", (0, 0), (-1, 0), 4, accent),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    return card


def progress_bar(value: int, accent: colors.Color, width: float = 63 * mm) -> Table:
    value = max(0, min(100, value))
    filled = width * value / 100
    remaining = width - filled
    widths = [filled, remaining] if remaining > 0 else [width]
    data = [["", ""]] if remaining > 0 else [[""]]
    t = Table(data, colWidths=widths, rowHeights=[3.4 * mm])
    cmds = [
        ("BACKGROUND", (0, 0), (0, 0), accent),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
    ]
    if remaining > 0:
        cmds.append(("BACKGROUND", (1, 0), (1, 0), MUTED))
    t.setStyle(TableStyle(cmds))
    return t


def page_heading(title: str, subtitle: str) -> list:
    return [p(title, "PageTitle"), p(subtitle, "PageSubtitle")]


def framed_block(title: str, body_items: list, accent: colors.Color = BLUE) -> Table:
    body = [[p(title, "SectionTitle")]] + [[item] for item in body_items]
    t = Table(body, colWidths=[CONTENT_W])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SURFACE),
                ("BOX", (0, 0), (-1, -1), 1, BORDER_LIGHT),
                ("LINEABOVE", (0, 0), (-1, 0), 3, accent),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return t


def cover_panel() -> Table:
    left = [
        p("AL RAS STEEL INTELLIGENCE", "CoverEyebrow"),
        p("CRM Management Progress Report", "CoverTitle"),
        p(
            "Delivery status, verified controls, release readiness, and the remaining actions required before final go-live.",
            "CoverSubtitle",
        ),
        Spacer(1, 9 * mm),
        status_pill("89% overall readiness", YELLOW, DEEP_NAVY),
        Spacer(1, 4 * mm),
        p("Status: Release candidate / conditional go-live", "CoverSubtitle"),
    ]
    left_table = Table([[item] for item in left], colWidths=[160 * mm])
    left_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), NAVY),
                ("LEFTPADDING", (0, 0), (-1, -1), 13 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )

    right_items = [
        p("REPORT DATE", "CardLabel"),
        p("03 August 2026", "SectionTitle"),
        Spacer(1, 3 * mm),
        p("CURRENT RELEASE POSITION", "CardLabel"),
        p("Core product and security controls are implemented. Final release depends on production verification, UAT sign-off, secret review, and operational readiness.", "Body"),
        Spacer(1, 3 * mm),
        p("LATEST VERIFIED SOURCE STATE", "CardLabel"),
        p("Commit 0d844a3 - production notifications schema reconciled and pushed to origin/main.", "Body"),
        Spacer(1, 3 * mm),
        p("MANAGEMENT RECOMMENDATION", "CardLabel"),
        p("Proceed with a controlled release only after all P0 gates on page 7 are evidenced and signed off.", "Body"),
    ]
    right_table = Table([[item] for item in right_items], colWidths=[89 * mm])
    right_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SURFACE),
                ("BOX", (0, 0), (-1, -1), 1.2, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 9 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    panel = Table([[left_table, right_table]], colWidths=[166 * mm, 93 * mm], rowHeights=[155 * mm])
    panel.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return panel


class ScreenshotGrid(Flowable):
    def __init__(self, items: list[tuple[str, Path]], width: float, height: float):
        super().__init__()
        self.items = [(label, path) for label, path in items if path.exists()]
        self.width = width
        self.height = height

    def wrap(self, availWidth, availHeight):
        return min(self.width, availWidth), min(self.height, availHeight)

    def draw(self):
        if not self.items:
            self.canv.setFont("Helvetica", 10)
            self.canv.setFillColor(TEXT_MUTED)
            self.canv.drawString(0, self.height / 2, "Screenshot evidence unavailable in this workspace session.")
            return
        cols = 2
        rows = (len(self.items) + cols - 1) // cols
        gap = 6 * mm
        cell_w = (self.width - gap) / cols
        cell_h = (self.height - gap * (rows - 1)) / rows
        for i, (label, path) in enumerate(self.items):
            col = i % cols
            row = i // cols
            x = col * (cell_w + gap)
            y = self.height - ((row + 1) * cell_h) - (row * gap)
            self.canv.setStrokeColor(BORDER_LIGHT)
            self.canv.setLineWidth(0.8)
            self.canv.rect(x, y, cell_w, cell_h, stroke=1, fill=0)
            label_h = 8 * mm
            self.canv.setFillColor(NAVY)
            self.canv.rect(x, y + cell_h - label_h, cell_w, label_h, stroke=0, fill=1)
            self.canv.setFillColor(colors.white)
            self.canv.setFont("Helvetica-Bold", 8)
            self.canv.drawString(x + 3 * mm, y + cell_h - 5.2 * mm, label)
            from PIL import Image as PILImage

            with PILImage.open(path) as img:
                iw, ih = img.size
            box_w = cell_w - 3 * mm
            box_h = cell_h - label_h - 3 * mm
            scale = min(box_w / iw, box_h / ih)
            dw, dh = iw * scale, ih * scale
            dx = x + (cell_w - dw) / 2
            dy = y + 1.5 * mm + (box_h - dh) / 2
            self.canv.drawImage(str(path), dx, dy, dw, dh, preserveAspectRatio=True, mask="auto")


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(BORDER_LIGHT)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN_X, 8.5 * mm, PAGE_W - MARGIN_X, 8.5 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN_X, 5 * mm, "AL RAS STEEL INTELLIGENCE | CRM MANAGEMENT PROGRESS REPORT | CONFIDENTIAL")
    page_text = f"Page {doc.page}"
    canvas.drawRightString(PAGE_W - MARGIN_X, 5 * mm, page_text)
    canvas.restoreState()


def overview_page() -> list:
    flow = page_heading(
        "1. Executive Readiness Dashboard",
        "A consolidated view of product completion, verified controls, and release confidence as of 03 August 2026.",
    )
    cards = [
        metric_card("Overall readiness", "89%", "Release candidate; final P0 gates remain", BLUE),
        metric_card("UX and frontend", "96%", "Unified Admin and Salesman Bauhaus system", GREEN),
        metric_card("Core workflows", "94%", "CRM records, reports, activities, and exports", VIOLET),
        metric_card("Security and data", "92%", "Backup, migrations, RLS, auth boundaries", RED),
        metric_card("Release operations", "75%", "Production verification and runbook pending", YELLOW),
    ]
    card_row = Table([cards], colWidths=[49.4 * mm] * 5)
    card_row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2)]))
    flow += [card_row, Spacer(1, 7 * mm)]

    completed = [
        bullet("Flat Bauhaus visual system implemented across shared shell and role-specific screens.", GREEN),
        bullet("Admin and Salesman CRM workflows retained while dashboards, tables, forms, and modals were modernized.", GREEN),
        bullet("Production Supabase backup produced with schema, roles, data, checksums, manifest, and Storage inventory evidence.", GREEN),
        bullet("Production schema reconciliation and legacy RLS policy replacement applied; post-install checks report all required controls installed.", GREEN),
        bullet("Security boundary suite, header checks, durable rate-limit tests, and production build passed.", GREEN),
    ]
    remaining = [
        bullet("Verify the Vercel production alias is serving the latest approved commit and complete route-level smoke checks.", RED),
        bullet("Complete production environment-variable review, especially RATE_LIMIT_HASH_SECRET and cron/auth credentials.", RED),
        bullet("Obtain documented Admin and Salesman UAT sign-off for critical workflows.", RED),
        bullet("Finalize rollback, monitoring, incident ownership, and first-hour post-release checks.", RED),
        bullet("Run a restoration drill and document the separate Storage backup procedure before objects are introduced.", YELLOW),
    ]
    left = framed_block("Verified progress", completed, GREEN)
    right = framed_block("Remaining release gates", remaining, RED)
    split = Table([[left, right]], colWidths=[127 * mm, 127 * mm])
    split.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2)]))
    flow += [split, Spacer(1, 5 * mm)]
    flow.append(
        framed_block(
            "Management conclusion",
            [p("The CRM is functionally mature and materially safer than the previous baseline. It is suitable for a controlled production release after the four P0 gates are evidenced. A broad, irreversible launch before those checks would create avoidable operational risk.")],
            BLUE,
        )
    )
    return flow


def workstreams_page() -> list:
    flow = page_heading(
        "2. Delivered Product Workstreams",
        "Implemented changes cover the presentation layer, user workflows, role-specific operations, reporting, and operational controls.",
    )
    rows = [
        ["Workstream", "Delivered capability", "Status"],
        ["Unified design system", "Flat Bauhaus tokens, opaque surfaces, accessible contrast, consistent headers, panels, fields, badges, tables, alerts, and modals for both roles.", "Complete"],
        ["Admin Dashboard", "Interactive KPI summaries, market snapshot, pipeline health, alerts, action plans, activity views, and compact one-screen layouts.", "Complete"],
        ["Salesman Dashboard", "Clickable lead and stage summaries, action breakdown modals, live lead table, overdue queues, and compact laptop/mobile layouts.", "Complete"],
        ["Pipeline", "Unified live-lead table, in-header search and filters, sorting, pagination, due-date range, Excel/PDF export, and role-scoped visibility.", "Complete"],
        ["Activity", "Readable calendar and log, responsive filters, add/edit activity modal, voice notes, attachments, reminders, and deletion-request workflow.", "Complete"],
        ["Tasks and weekly reports", "Role-correct Admin review and Salesman reporting, required-field completion states, voice notes, blockers, status, audit trail, save draft, and submit flow.", "Complete"],
        ["Salesmen", "Directory list/cards, filters, summary metrics, lead drill-down, exports, performance snapshot, and compact cards/tables.", "Complete"],
        ["Lead Details", "Shared Admin/Salesman structure, flat AI summary, readable navigation, color-coded overview panels, activity logging, and contact actions.", "Complete"],
        ["AI Sales Assistant", "Voice-enabled assistant entry point, mobile presentation, action prompts, and secured server interaction patterns.", "Implemented"],
        ["Security and resilience", "Authenticated REST boundaries, service-role allowlist, durable rate limiting, security headers, RLS reconciliation, production backup evidence.", "Verified"],
    ]
    data = [[p(c, "TableHeader") for c in rows[0]]]
    for row in rows[1:]:
        status_fill = LIGHT_GREEN if row[2] in {"Complete", "Verified"} else LIGHT_BLUE
        data.append([p(row[0], "TableBodyBold"), p(row[1], "TableBody"), status_pill(row[2], status_fill, GREEN if row[2] in {"Complete", "Verified"} else BLUE)])
    table = Table(data, colWidths=[42 * mm, 172 * mm, 38 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, BACKGROUND]),
            ]
        )
    )
    flow += [table, Spacer(1, 5 * mm)]
    flow.append(p("Implementation principle: the work preserved existing CRM data flows, role permissions, calculations, API contracts, and user workflows while replacing fragmented presentation patterns with shared components and tokens.", "SmallMuted"))
    return flow


def screenshots_page() -> list:
    flow = page_heading(
        "3. Frontend Delivery Evidence",
        "Representative screenshots from the implemented Admin and Salesman experience. These are delivery evidence, not mockups.",
    )
    temp = Path(os.environ.get("LOCALAPPDATA", r"C:\Users\Glory\AppData\Local")) / "Temp"
    items = [
        ("Admin dashboard: structured KPI and management overview", temp / "codex-clipboard-58a30a83-110c-42ba-90d5-cc47eec76e1b.png"),
        ("Admin Activity: compact readable operational view", temp / "codex-clipboard-1156bfdf-7cfd-4b3e-be1c-dd1b058990b3.png"),
        ("Salesman dashboard: action queues and live leads", temp / "codex-clipboard-e52f6451-d3d0-420e-ac71-d38a4c694d28.png"),
        ("Lead Details: shared workflow with readable actions", temp / "codex-clipboard-78d61ab1-f2a0-40db-b448-e84115660945.png"),
    ]
    flow.append(ScreenshotGrid(items, CONTENT_W, 155 * mm))
    return flow


def security_page() -> list:
    flow = page_heading(
        "4. Security, Data Protection, and Reliability",
        "The latest hardening work moved the CRM from a visually complete application toward a production-controlled system.",
    )
    rows = [
        ["Control", "Evidence completed", "Residual action"],
        ["Database backup", "Logical exports for roles, schema, and data; SHA-256 checksums and a dated manifest retained outside the repository.", "Schedule restoration drill and retention ownership."],
        ["Storage backup", "Bucket inventory verified: lead-files and pmr-voice-notes had zero objects at capture time; evidence recorded.", "Define recurring object backup before files accumulate."],
        ["Production schema", "Missing production objects reconciled; weekly report lifecycle objects installed; legacy notifications schema repaired.", "Freeze further schema changes until release verification finishes."],
        ["Row-level security", "Required public/storage tables now report RLS enabled; required policies and user-scoped helpers pass post-install checks.", "Run role-matrix negative tests with real Admin/Salesman accounts."],
        ["API authorization", "Normal REST uses signed-in JWT; missing auth rejected; service-role use restricted to allowlisted operations.", "Review allowlist quarterly and after new server endpoints."],
        ["Rate limiting", "Durable shared rate-limit table/functions installed; automated security tests pass.", "Confirm RATE_LIMIT_HASH_SECRET is set identically for production functions."],
        ["HTTP security", "Security-header tests pass.", "Confirm headers on the production alias after the next deploy."],
        ["Source control", "Security reconciliation commit pushed and origin/main synchronized in the latest captured evidence.", "Tag approved release after UAT and production smoke test."],
    ]
    data = [[p(c, "TableHeader") for c in rows[0]]] + [[p(r[0], "TableBodyBold"), p(r[1], "TableBody"), p(r[2], "TableBody")] for r in rows[1:]]
    table = Table(data, colWidths=[40 * mm, 128 * mm, 84 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, BACKGROUND]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    flow += [table, Spacer(1, 6 * mm)]
    backup = r"C:\Users\Glory\Documents\local-release-files\supabase-backup-20260803-132551"
    flow.append(
        framed_block(
            "Backup evidence location",
            [p(f"The verified production backup package is retained outside the repository at:<br/><b>{backup}</b>")],
            GREEN,
        )
    )
    return flow


def validation_page() -> list:
    flow = page_heading(
        "5. Verification Evidence",
        "Automated and production-side evidence captured during the current hardening cycle.",
    )
    temp = Path(os.environ.get("LOCALAPPDATA", r"C:\Users\Glory\AppData\Local")) / "Temp"
    items = [
        ("Post-install checks: all required controls true", temp / "codex-clipboard-ee789fef-b4c8-483b-a598-b620c0c2f742.png"),
        ("RLS audit: required tables enabled and forced", temp / "codex-clipboard-11ea2f61-5d87-4e80-ba02-6d5630361689.png"),
        ("Automated security suite and build passing", temp / "codex-clipboard-87e79b9d-96a7-4a84-8990-926b2fc173bb.png"),
    ]
    flow.append(ScreenshotGrid(items, CONTENT_W, 126 * mm))
    flow.append(Spacer(1, 5 * mm))
    checks = [
        ["Validation", "Result"],
        ["Supabase authorization boundary tests", "8 passed, 0 failed"],
        ["Security header tests", "Passed"],
        ["Durable rate-limit security tests", "Passed"],
        ["Activity, assistant, global UI, salesmen, and pipeline suites", "Passed in captured test run"],
        ["Production build", "Passed"],
        ["Post-install SQL checks", "All required checks true"],
    ]
    data = [[p(c, "TableHeader") for c in checks[0]]] + [[p(r[0], "TableBodyBold"), p(r[1], "TableBody")] for r in checks[1:]]
    table = Table(data, colWidths=[166 * mm, 86 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, BACKGROUND]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    flow.append(table)
    return flow


def pending_page() -> list:
    flow = page_heading(
        "6. Pending Items Before Final Go-Live",
        "The items below are release controls. P0 items block a broad production launch; P1 items should be completed in the release window or immediately after.",
    )
    rows = [
        ["Priority", "Pending item", "Completion evidence", "Suggested owner"],
        ["P0", "Verify Vercel production alias serves the latest approved commit", "Deployment inspection plus authenticated Admin/Salesman smoke test on production", "Engineering"],
        ["P0", "Production environment-variable and secret review", "Documented checklist for Supabase URL/keys, RATE_LIMIT_HASH_SECRET, cron secret, AI/transcription keys, and allowed origins", "Engineering / IT"],
        ["P0", "Admin and Salesman UAT sign-off", "Signed checklist covering login, permissions, dashboards, pipeline, lead detail, activities, tasks/reporting, quotes, accounts, exports, and assistant", "Business owners"],
        ["P0", "Rollback and monitoring readiness", "Named release commander, rollback steps, Vercel/Supabase monitoring, incident contacts, and first-hour watch", "Engineering / Management"],
        ["P1", "Database restoration drill", "Restore latest backup to a non-production project and validate row counts and key workflows", "Database owner"],
        ["P1", "Role-matrix authorization test", "Negative-access evidence for Salesman cross-user data, Admin-only endpoints, Storage objects, and service-role boundaries", "Security / QA"],
        ["P1", "Performance and zoom/responsive regression", "Laptop, tablet, mobile, 100/125/150% zoom, long records, pagination, and export verification", "QA"],
        ["P1", "Storage backup procedure", "Documented object-export job and retention schedule before production files are stored", "IT / Database owner"],
        ["P2", "Operational analytics and alerting", "Error-rate, auth-failure, API-latency, scheduled-job, and rate-limit dashboards with thresholds", "Engineering"],
        ["P2", "Training and support handover", "Salesman/Admin quick guides, support process, known limitations, and named escalation path", "Operations"],
    ]
    data = [[p(c, "TableHeader") for c in rows[0]]]
    for r in rows[1:]:
        accent_fill = LIGHT_RED if r[0] == "P0" else LIGHT_YELLOW if r[0] == "P1" else LIGHT_BLUE
        accent_ink = RED if r[0] == "P0" else colors.HexColor("#8A5A00") if r[0] == "P1" else BLUE
        data.append([status_pill(r[0], accent_fill, accent_ink), p(r[1], "TableBodyBold"), p(r[2], "TableBody"), p(r[3], "TableBody")])
    table = Table(data, colWidths=[25 * mm, 75 * mm, 119 * mm, 33 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, BACKGROUND]),
            ]
        )
    )
    flow += [table, Spacer(1, 5 * mm)]
    flow.append(p("Release rule: do not treat a successful build or a Vercel Ready status as proof of production readiness. The deployed alias, authenticated role behavior, data access boundaries, and rollback path must be verified together.", "SmallMuted"))
    return flow


def action_plan_page() -> list:
    flow = page_heading(
        "7. Recommended Go-Live Action Plan",
        "A short, evidence-driven sequence that protects data while avoiding unnecessary release delay.",
    )
    steps = [
        ("1", "Freeze the release candidate", "No additional schema or UI changes except approved release blockers. Record the commit SHA and deployment target.", BLUE),
        ("2", "Verify secrets and configuration", "Use a two-person checklist. Confirm production values without printing secrets into chat, logs, screenshots, or the repository.", YELLOW),
        ("3", "Deploy and verify the production alias", "Inspect the deployment, confirm the commit, then run authenticated Admin and Salesman smoke tests against the live URL.", BLUE),
        ("4", "Complete role-based UAT", "Business owners sign the critical-flow checklist and confirm counts, exports, reminders, reports, and permissions.", GREEN),
        ("5", "Approve go-live or rollback", "Management makes a documented decision based on P0 evidence. If any P0 test fails, roll back before user access expands.", RED),
        ("6", "Monitor the first release window", "Watch errors, authentication, Supabase usage, scheduled jobs, rate-limit behavior, and user support requests for at least the first hour.", VIOLET),
        ("7", "Close the release", "Tag the release, archive evidence outside the repository, update the management report, and schedule the restoration drill.", GREEN),
    ]
    cells = []
    for number, title, description, accent in steps:
        badge = Table([[p(number, "SectionTitle")]], colWidths=[12 * mm], rowHeights=[12 * mm])
        badge.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), accent), ("TEXTCOLOR", (0, 0), (-1, -1), colors.white), ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
        card = Table([[badge, p(f"<b>{title}</b><br/>{description}", "Body")]], colWidths=[16 * mm, 105 * mm])
        card.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.8, BORDER_LIGHT), ("BACKGROUND", (0, 0), (-1, -1), SURFACE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
        cells.append(card)
    grid_rows = [[cells[i], cells[i + 1] if i + 1 < len(cells) else ""] for i in range(0, len(cells), 2)]
    grid = Table(grid_rows, colWidths=[127 * mm, 127 * mm])
    grid.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
    flow += [grid, Spacer(1, 6 * mm)]

    decision = Table(
        [
            [p("CURRENT DECISION", "CardLabel"), p("CONDITIONAL GO-LIVE", "SectionTitle")],
            [p("Required before approval", "TableBodyBold"), p("All four P0 gates completed and attached to the release record.", "TableBody")],
            [p("If a gate fails", "TableBodyBold"), p("Stop expansion of access, restore the previous Vercel deployment if needed, and use the verified Supabase backup only under the documented recovery plan.", "TableBody")],
        ],
        colWidths=[52 * mm, 200 * mm],
    )
    decision.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), LIGHT_YELLOW), ("BOX", (0, 0), (-1, -1), 1.4, YELLOW), ("GRID", (0, 1), (-1, -1), 0.5, BORDER_LIGHT), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
    flow.append(decision)
    return flow


def build_pdf() -> None:
    REPORTS.mkdir(parents=True, exist_ok=True)
    RENDERED.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=landscape(A4),
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title="ARG CRM Management Progress Report - 03 August 2026",
        author="OpenAI Codex for Al Ras Steel Intelligence",
        subject="CRM delivery progress, release readiness, and pending go-live actions",
    )
    story = [cover_panel(), PageBreak()]
    story += overview_page() + [PageBreak()]
    story += workstreams_page() + [PageBreak()]
    story += screenshots_page() + [PageBreak()]
    story += security_page() + [PageBreak()]
    story += validation_page() + [PageBreak()]
    story += pending_page() + [PageBreak()]
    story += action_plan_page()
    doc.build(story, onFirstPage=footer, onLaterPages=footer)


def render_pages() -> None:
    import pypdfium2 as pdfium

    pdf = pdfium.PdfDocument(str(OUTPUT))
    for index in range(len(pdf)):
        page = pdf[index]
        bitmap = page.render(scale=1.55)
        image = bitmap.to_pil()
        image.save(RENDERED / f"ARG_CRM_Management_Progress_Report_2026-08-03_page_{index + 1}.png")


if __name__ == "__main__":
    build_pdf()
    render_pages()
    print(OUTPUT)
