from __future__ import annotations

from pathlib import Path
from datetime import date

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(r"C:\Users\Glory\Documents\argleadstracker")
OUT = ROOT / "artifacts" / "ARG_Leads_Tracker_Management_Status_and_GoLive_Readiness_2026-08-04.pdf"
FRONTEND_IMAGE = Path(r"C:\Users\Glory\AppData\Local\Temp\codex-clipboard-1156bfdf-7cfd-4b3e-be1c-dd1b058990b3.png")
RLS_IMAGE = Path(r"C:\Users\Glory\AppData\Local\Temp\codex-clipboard-11ea2f61-5d87-4e80-ba02-6d5630361689.png")
BACKUP_IMAGE = Path(r"C:\Users\Glory\Documents\local-release-files\supabase-backup-20260803-132551\storage-inventory-evidence.png")

NAVY = colors.HexColor("#06283D")
BLUE = colors.HexColor("#1F6AA5")
LIGHT_BLUE = colors.HexColor("#DCEAF6")
RED = colors.HexColor("#D94A48")
LIGHT_RED = colors.HexColor("#FAE4E2")
YELLOW = colors.HexColor("#E6A933")
LIGHT_YELLOW = colors.HexColor("#F8EDCE")
GREEN = colors.HexColor("#6D9F3D")
LIGHT_GREEN = colors.HexColor("#E6F0D8")
VIOLET = colors.HexColor("#7657C8")
OFF_WHITE = colors.HexColor("#F7F5EF")
MUTED = colors.HexColor("#EEF1F4")
BORDER = colors.HexColor("#17324D")
TEXT = colors.HexColor("#151515")
TEXT_MUTED = colors.HexColor("#586575")

PAGE_W, PAGE_H = A4
MARGIN_X = 16 * mm
MARGIN_TOP = 20 * mm
MARGIN_BOTTOM = 15 * mm

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=25, leading=29, textColor=colors.white, alignment=TA_LEFT,
    spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="CoverSub", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=11.5, leading=16, textColor=colors.white,
))
styles.add(ParagraphStyle(
    name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold",
    fontSize=18, leading=22, textColor=NAVY, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=12.5, leading=15, textColor=NAVY, spaceBefore=6, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="Bodyx", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9.4, leading=13.2, textColor=TEXT, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="Smallx", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=7.8, leading=10.4, textColor=TEXT_MUTED,
))
styles.add(ParagraphStyle(
    name="Bulletx", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9.1, leading=12.7, textColor=TEXT, leftIndent=10,
    firstLineIndent=-6, bulletIndent=3, spaceAfter=3,
))
styles.add(ParagraphStyle(
    name="WhiteSmall", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=8, leading=10, textColor=colors.white,
))
styles.add(ParagraphStyle(
    name="Cell", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=7.8, leading=10.2, textColor=TEXT,
))
styles.add(ParagraphStyle(
    name="CellBold", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=7.8, leading=10.2, textColor=TEXT,
))
styles.add(ParagraphStyle(
    name="MetricValue", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=25, leading=27, textColor=colors.white, alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    name="MetricLabel", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=7.8, leading=9.5, textColor=colors.white, alignment=TA_CENTER,
))


def p(text: str, style: str = "Bodyx") -> Paragraph:
    return Paragraph(text, styles[style])


def bullet(text: str) -> Paragraph:
    return Paragraph(text, styles["Bulletx"], bulletText="•")


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 10 * mm, PAGE_W, 10 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(MARGIN_X, PAGE_H - 6.4 * mm, "AL RAS STEEL INTELLIGENCE | CRM MANAGEMENT STATUS")
    canvas.setFillColor(TEXT_MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(MARGIN_X, 7 * mm, "Internal management report | 4 Aug 2026")
    canvas.drawRightString(PAGE_W - MARGIN_X, 7 * mm, f"Page {doc.page}")
    canvas.restoreState()


def section_band(title: str, subtitle: str = "", color=NAVY):
    content = [p(title, "WhiteSmall")]
    if subtitle:
        content.append(Spacer(1, 1.2 * mm))
        content.append(Paragraph(subtitle, ParagraphStyle(
            name=f"band-{title}", parent=styles["Smallx"], textColor=colors.white,
            fontSize=7.5, leading=9.5,
        )))
    table = Table([[content]], colWidths=[PAGE_W - 2 * MARGIN_X])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color),
        ("BOX", (0, 0), (-1, -1), 1.1, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def status_card(label: str, value: str, detail: str, color):
    table = Table([[
        p(label.upper(), "MetricLabel"),
        p(value, "MetricValue"),
        Paragraph(detail, ParagraphStyle(
            name=f"metric-{label}", parent=styles["Smallx"], textColor=colors.white,
            fontSize=7.2, leading=9, alignment=TA_CENTER,
        )),
    ]], colWidths=[45 * mm], rowHeights=[None])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color),
        ("BOX", (0, 0), (-1, -1), 1, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def info_box(title: str, items: list[str], accent=BLUE, bg=colors.white):
    content = [p(title, "H2x")] + [bullet(item) for item in items]
    table = Table([[content]], colWidths=[PAGE_W - 2 * MARGIN_X])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5DF")),
        ("LINEBEFORE", (0, 0), (0, -1), 4, accent),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def checklist_table(rows: list[tuple[str, str, str, str]]):
    data = [[p("Gate", "CellBold"), p("Required action", "CellBold"), p("Owner", "CellBold"), p("Exit evidence", "CellBold")]]
    for gate, action, owner, evidence in rows:
        data.append([p(gate, "CellBold"), p(action, "Cell"), p(owner, "Cell"), p(evidence, "Cell")])
    table = Table(data, colWidths=[18 * mm, 70 * mm, 30 * mm, 60 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#CBD5DF")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, MUTED]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def scaled_image(path: Path, max_w: float, max_h: float):
    if not path.exists():
        return info_box("Evidence image unavailable", [str(path)], accent=YELLOW, bg=LIGHT_YELLOW)
    img = Image(str(path))
    ratio = min(max_w / img.imageWidth, max_h / img.imageHeight)
    img.drawWidth = img.imageWidth * ratio
    img.drawHeight = img.imageHeight * ratio
    return img


def build_story():
    story = []

    # Cover
    cover = Table([[
        [
            Spacer(1, 9 * mm),
            p("ARG Leads Tracker CRM", "CoverTitle"),
            p("Management Status & Go-Live Readiness Report", "CoverSub"),
            Spacer(1, 8 * mm),
            Paragraph("REPORT DATE", ParagraphStyle(name="cover-label", parent=styles["Smallx"], textColor=LIGHT_BLUE, fontName="Helvetica-Bold")),
            p("4 August 2026", "CoverSub"),
            Spacer(1, 5 * mm),
            Paragraph("RECOMMENDATION", ParagraphStyle(name="cover-label-2", parent=styles["Smallx"], textColor=LIGHT_BLUE, fontName="Helvetica-Bold")),
            p("CONDITIONAL GO for a controlled pilot", "CoverSub"),
            Spacer(1, 4 * mm),
            Paragraph("Unrestricted company-wide release remains gated by restore testing, formal role UAT, production secret review, and launch monitoring ownership.", styles["CoverSub"]),
            Spacer(1, 10 * mm),
        ]
    ]], colWidths=[PAGE_W - 2 * MARGIN_X])
    cover.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("BOX", (0, 0), (-1, -1), 2, YELLOW),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
    ]))
    story += [Spacer(1, 18 * mm), cover, Spacer(1, 10 * mm)]

    metrics = Table([[
        status_card("Overall readiness", "88%", "Production foundation ready; final operational gates remain.", BLUE),
        status_card("Security checks", "8/8", "Authorization-boundary checks passed.", GREEN),
        status_card("Schema checks", "8/8", "Post-install migration checks returned true.", VIOLET),
        status_card("Release decision", "PILOT", "Controlled pilot recommended before broad rollout.", YELLOW),
    ]], colWidths=[45 * mm] * 4, hAlign="LEFT")
    metrics.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2.5),
    ]))
    story += [metrics, Spacer(1, 8 * mm)]
    story += [info_box("Management takeaway", [
        "The CRM is materially complete and deployable for a controlled production pilot.",
        "The front end, Admin/Salesman role experience, production Supabase schema, RLS, rate limiting, and release tests have all advanced substantially.",
        "The remaining work is operational assurance rather than a large development backlog: prove restore, sign off role workflows, confirm secrets, and staff the release watch.",
    ], accent=YELLOW, bg=LIGHT_YELLOW)]
    story.append(PageBreak())

    # Progress
    story += [p("1. Progress Delivered", "H1x"), section_band("PRODUCT AND USER EXPERIENCE", "Unified Admin and Salesman CRM on one flat Bauhaus visual system", BLUE), Spacer(1, 4 * mm)]
    story += [info_box("Front-end modernization", [
        "Unified flat Bauhaus design tokens and shared UI patterns across Admin and Salesman views.",
        "Improved readability, responsive density, mobile navigation, laptop viewport fit, consistent headers, badges, tables, forms, modals, alerts, and accessible focus states.",
        "Removed remaining frosted-glass, blur, translucent-card, glossy-gradient, and low-contrast treatments from the CRM presentation layer.",
    ], accent=BLUE)]
    story += [Spacer(1, 4 * mm), info_box("Operational workflows now represented", [
        "Dashboards with drill-down summaries for KPI cards, pipeline stages, overdue work, coverage gaps, and next-up actions.",
        "Full-width Pipeline live-lead list with column filters, sorting, pagination, report date range, Excel/PDF export, and preserved role visibility.",
        "Admin Salesmen directory, Activity management, task/report review, quotes, accounts, search places, lead details, AI summary, voice notes, and AI Sales Assistant.",
        "Weekly Sales Report validation, required-field completion signaling, draft/submission lifecycle, blockers, immutable report trail, and Admin review surfaces.",
    ], accent=GREEN)]
    story += [Spacer(1, 4 * mm), info_box("Release engineering", [
        "Production-linked Supabase migrations reconciled missing schema, legacy notifications, and row-level security policies.",
        "Git history and origin/main were synchronized for the production notification reconciliation commit.",
        "Automated checks cover authorization boundaries, security headers, durable rate limiting, public asset allowlisting, cron authentication, UI workflows, and build integrity.",
    ], accent=VIOLET)]
    story.append(PageBreak())

    # Data assurance
    story += [p("2. Production Data & Security Assurance", "H1x"), section_band("SUPABASE PRODUCTION FOUNDATION", "Backup evidence, migration reconciliation, RLS and authorization controls", GREEN), Spacer(1, 4 * mm)]
    assurance_rows = [
        ("Managed backup", "Supabase scheduled backups are visible in the production project.", "Verified"),
        ("Logical backup", "roles.sql, schema.sql, and data.sql exported independently.", "Verified"),
        ("Integrity", "SHA256SUMS.txt and backup manifest generated.", "Verified"),
        ("Storage", "lead-files and pmr-voice-notes inventory checked; both were empty at backup time.", "Verified / zero objects"),
        ("Schema", "Missing production schema and legacy notifications reconciliation applied.", "Verified"),
        ("RLS", "Core tables exist with RLS enabled/forced and policies present.", "Verified"),
        ("Post-install", "Eight migration checks returned true.", "8 of 8"),
    ]
    data = [[p("Control", "CellBold"), p("Evidence", "CellBold"), p("Status", "CellBold")]]
    for a, b, c in assurance_rows:
        data.append([p(a, "CellBold"), p(b, "Cell"), p(c, "CellBold")])
    t = Table(data, colWidths=[38 * mm, 104 * mm, 36 * mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#CBD5DF")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, MUTED]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story += [t, Spacer(1, 5 * mm)]
    story += [info_box("Independent backup location", [
        r"C:\Users\Glory\Documents\local-release-files\supabase-backup-20260803-132551",
        "This folder is intentionally outside the Git repository and contains the SQL exports, checksums, manifest, and storage inventory evidence.",
    ], accent=GREEN, bg=LIGHT_GREEN)]
    story += [Spacer(1, 4 * mm), info_box("What the backup does and does not prove", [
        "It provides recoverable database roles, schema, and table data at the captured point in time.",
        "It does not yet prove the restore procedure end-to-end. A disposable-project restore drill remains the strongest outstanding production-readiness gate.",
        "Supabase database backups do not include Storage object bodies. The current buckets had zero objects, so no object download was required; establish a repeatable object backup process before those buckets contain production media.",
    ], accent=YELLOW, bg=LIGHT_YELLOW)]
    story.append(PageBreak())

    # Verification
    story += [p("3. Verification Evidence", "H1x"), section_band("AUTOMATED QUALITY AND SECURITY", "Current evidence from the release hardening cycle", VIOLET), Spacer(1, 4 * mm)]
    checks = [
        ("npm run check", "Passed", "Static/project validation"),
        ("npm test", "Passed", "UI, workflow, authorization, security header, rate-limit and cron tests"),
        ("Authorization boundary", "8/8 passed", "JWT use, service-role restrictions, Storage JWT, production notification reconciliation"),
        ("npm run build", "Passed", "No asset compilation required for this static application"),
        ("Post-install SQL checks", "8/8 true", "RLS helpers, lead/storage policies, weekly-report lifecycle and rate-limit objects"),
        ("Migration list", "Synchronized", "Local and remote migration history aligned after reconciliation"),
        ("Git", "Synchronized", "Commit 0d844a3 on main, pushed; local ahead/behind origin/main was 0/0"),
    ]
    data = [[p("Verification", "CellBold"), p("Result", "CellBold"), p("Coverage", "CellBold")]]
    for a, b, c in checks:
        data.append([p(a, "CellBold"), p(b, "CellBold"), p(c, "Cell")])
    t = Table(data, colWidths=[46 * mm, 31 * mm, 101 * mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#CBD5DF")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, MUTED]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story += [t, Spacer(1, 6 * mm)]
    story += [info_box("Current risk interpretation", [
        "No known blocker in the checked code/build path prevents a controlled pilot.",
        "Automated tests reduce regression and authorization risk, but they do not replace human workflow sign-off, restore proof, or post-release monitoring.",
        "Production readiness is therefore rated 88%, not 100%.",
    ], accent=RED, bg=LIGHT_RED)]
    story.append(PageBreak())

    # Gates
    story += [p("4. Mandatory Go-Live Gates", "H1x"), p("Complete these gates before unrestricted rollout. A controlled pilot may proceed only with named owners and an approved rollback window.", "Bodyx"), Spacer(1, 2 * mm)]
    gates = [
        ("P0-1", "Restore the logical backup into a disposable Supabase project; verify table counts, Auth-linked access, RLS, weekly reports, uploads and application login.", "Technical owner", "Signed restore-drill record with timings and issues"),
        ("P0-2", "Run formal Admin and Salesman production UAT using a written checklist: login, role navigation, dashboard values, pipeline, lead detail, activity, reports, quotes, accounts, AI assistant, exports and mobile.", "Business + QA", "Signed UAT acceptance and defect log"),
        ("P0-3", "Audit Vercel production environment variables. Confirm Supabase URL/key scope, service-role isolation, cron secret, AI/transcription keys, rate-limit hash secret and absence of secrets in client assets.", "Release owner", "Environment checklist with values redacted"),
        ("P0-4", "Approve rollback plan and assign a release commander. Define which Vercel deployment to restore and which database backup/recovery action is permitted.", "Management + technical", "Named owner, rollback link and decision threshold"),
        ("P1-1", "Create a repeatable Storage-object backup procedure for lead-files and pmr-voice-notes before production uploads become non-zero.", "Technical owner", "Documented command/process and test object restore"),
        ("P1-2", "Configure 24–48 hour post-release monitoring: Vercel errors, Supabase Auth/API failures, RLS denials, cron failures, rate-limit anomalies, uploads and business-critical workflow errors.", "Operations", "Monitoring dashboard/log review cadence"),
        ("P1-3", "Execute fresh production smoke tests immediately after deployment and again after the first business day.", "QA / release owner", "Timestamped smoke-test results"),
    ]
    story += [checklist_table(gates), Spacer(1, 5 * mm)]
    story += [info_box("Go / no-go rule", [
        "GO for controlled pilot: P0 owners named, backup retained, rollback deployment identified, and production smoke checklist ready.",
        "GO for unrestricted rollout: all P0 gates passed with evidence and no unresolved severity-1 or severity-2 defects.",
        "NO-GO: restore cannot be demonstrated, role visibility is incorrect, required secrets are missing/exposed, or core CRM workflows fail.",
    ], accent=RED, bg=LIGHT_RED)]
    story.append(PageBreak())

    # Launch plan
    story += [p("5. Recommended Launch Sequence", "H1x"), section_band("CONTROLLED RELEASE PLAN", "Minimize operational risk while preserving rollback options", YELLOW), Spacer(1, 4 * mm)]
    launch_steps = [
        ("1", "Freeze", "Freeze schema and production UI changes. Record current Git commit, Vercel deployment ID, Supabase project reference and backup path."),
        ("2", "Restore drill", "Restore to a disposable project and complete data, Auth, RLS and application smoke verification."),
        ("3", "Environment audit", "Compare Vercel Production variables against the approved redacted checklist; rotate any credential exposed during troubleshooting."),
        ("4", "Role UAT", "Complete Admin and Salesman checklists on desktop, tablet and mobile with real role accounts."),
        ("5", "Pilot deploy", "Deploy during a staffed window. Limit initial users and announce the support/escalation channel."),
        ("6", "Immediate smoke", "Verify page, health endpoint, login, role access, CRUD workflows, exports, uploads, AI assistant and cron authentication."),
        ("7", "Monitor", "Review errors and business workflow health for 24–48 hours. Document incidents and corrective actions."),
        ("8", "Expand", "Move to general availability only after pilot acceptance and no unresolved high-severity issues."),
    ]
    data = [[p("Step", "CellBold"), p("Stage", "CellBold"), p("Action", "CellBold")]]
    for a, b, c in launch_steps:
        data.append([p(a, "CellBold"), p(b, "CellBold"), p(c, "Cell")])
    t = Table(data, colWidths=[15 * mm, 35 * mm, 128 * mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#CBD5DF")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, MUTED]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story += [t, Spacer(1, 5 * mm)]
    story += [info_box("Suggested management decision", [
        "Approve completion of the P0 gates as the next work package.",
        "Authorize a controlled pilot release window after restore and UAT evidence are signed.",
        "Do not yet describe the CRM as fully production-assured until the restore drill and monitored pilot are complete.",
    ], accent=GREEN, bg=LIGHT_GREEN)]
    story.append(PageBreak())

    # Evidence appendix
    story += [p("6. Visual Evidence Appendix", "H1x"), p("Screenshots below document the current front-end direction and production security posture used in this readiness assessment.", "Bodyx")]
    story += [section_band("CURRENT ADMIN ACTIVITY EXPERIENCE", "Representative flat Bauhaus dashboard implementation", BLUE), Spacer(1, 3 * mm)]
    story += [scaled_image(FRONTEND_IMAGE, PAGE_W - 2 * MARGIN_X, 87 * mm), Spacer(1, 5 * mm)]
    story += [section_band("PRODUCTION RLS AND POLICY AUDIT", "Required tables show existence, RLS enforcement and policy coverage", GREEN), Spacer(1, 3 * mm)]
    story += [scaled_image(RLS_IMAGE, PAGE_W - 2 * MARGIN_X, 82 * mm), Spacer(1, 3 * mm)]
    story += [p("Evidence note: screenshots are point-in-time records. Final release approval should attach fresh UAT, restore-drill, environment-audit and production smoke-test evidence.", "Smallx")]

    return story


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    frame = Frame(MARGIN_X, MARGIN_BOTTOM, PAGE_W - 2 * MARGIN_X, PAGE_H - MARGIN_TOP - MARGIN_BOTTOM, id="normal")
    template = PageTemplate(id="main", frames=[frame], onPage=header_footer)
    doc = BaseDocTemplate(
        str(OUT), pagesize=A4, leftMargin=MARGIN_X, rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP, bottomMargin=MARGIN_BOTTOM,
        title="ARG Leads Tracker CRM Management Status and Go-Live Readiness - 4 August 2026",
        author="OpenAI Codex for Al Ras Steel Intelligence",
        subject="CRM progress, production assurance, and go-live readiness",
    )
    doc.addPageTemplates([template])
    doc.build(build_story())


if __name__ == "__main__":
    main()
