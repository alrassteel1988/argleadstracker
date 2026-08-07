from __future__ import annotations

from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
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
from PIL import Image as PILImage


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "artifacts" / "ARG_Leads_Tracker_Management_Status_and_GoLive_Readiness_2026-08-04.pdf"

NAVY = colors.HexColor("#06283D")
DEEP_NAVY = colors.HexColor("#041F31")
BLUE = colors.HexColor("#1F6AA5")
LIGHT_BLUE = colors.HexColor("#DCEAF6")
GREEN = colors.HexColor("#6D9F3D")
LIGHT_GREEN = colors.HexColor("#E6F0D8")
RED = colors.HexColor("#D94A48")
LIGHT_RED = colors.HexColor("#FAE4E2")
YELLOW = colors.HexColor("#E6A933")
LIGHT_YELLOW = colors.HexColor("#F8EDCE")
VIOLET = colors.HexColor("#7657C8")
SURFACE = colors.white
BACKGROUND = colors.HexColor("#F7F5EF")
MUTED = colors.HexColor("#EEF1F4")
BORDER = colors.HexColor("#CBD5DF")
TEXT = colors.HexColor("#151515")
TEXT_MUTED = colors.HexColor("#586575")


class ManagementDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str):
        super().__init__(
            filename,
            pagesize=A4,
            rightMargin=14 * mm,
            leftMargin=14 * mm,
            topMargin=16 * mm,
            bottomMargin=15 * mm,
            title="ARG Leads Tracker CRM - Management Status and Go-Live Readiness",
            author="ARG Leads Tracker CRM Development",
            subject="Management progress, release readiness, backup assurance, and go-live actions",
        )
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            id="normal",
        )
        self.addPageTemplates(PageTemplate(id="management", frames=[frame], onPage=self._page))

    @staticmethod
    def _page(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(NAVY)
        canvas.rect(0, A4[1] - 8 * mm, A4[0], 8 * mm, fill=1, stroke=0)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(TEXT_MUTED)
        canvas.drawString(14 * mm, 8 * mm, "ARG Leads Tracker CRM | Management Readiness Report | 04 Aug 2026")
        page_text = f"Page {doc.page}"
        canvas.drawRightString(A4[0] - 14 * mm, 8 * mm, page_text)
        canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="CoverTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=30,
        textColor=colors.white,
        alignment=TA_LEFT,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#DCEAF6"),
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="H1Bauhaus",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=NAVY,
        spaceBefore=4,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="H2Bauhaus",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=NAVY,
        spaceBefore=7,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyBauhaus",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.2,
        leading=13.2,
        textColor=TEXT,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="Small",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=7.8,
        leading=10.5,
        textColor=TEXT_MUTED,
    )
)
styles.add(
    ParagraphStyle(
        name="TableHead",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9,
        textColor=colors.white,
        alignment=TA_LEFT,
    )
)
styles.add(
    ParagraphStyle(
        name="TableBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=7.4,
        leading=9.7,
        textColor=TEXT,
    )
)
styles.add(
    ParagraphStyle(
        name="MetricValue",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=21,
        leading=23,
        textColor=colors.white,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        name="MetricLabel",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=TA_CENTER,
    )
)


def P(text: str, style: str = "BodyBauhaus") -> Paragraph:
    return Paragraph(text, styles[style])


def section_title(title: str, subtitle: str | None = None, color=NAVY):
    items = [P(title, "H1Bauhaus")]
    if subtitle:
        items.append(P(subtitle, "BodyBauhaus"))
    return items


def bullet(text: str, color=BLUE):
    return Table(
        [["", P(text)]],
        colWidths=[3.5 * mm, None],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), color),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (0, 0), 0),
                ("RIGHTPADDING", (0, 0), (0, 0), 0),
                ("TOPPADDING", (0, 0), (0, 0), 4),
                ("BOTTOMPADDING", (0, 0), (0, 0), 4),
                ("LEFTPADDING", (1, 0), (1, 0), 6),
                ("RIGHTPADDING", (1, 0), (1, 0), 0),
                ("TOPPADDING", (1, 0), (1, 0), 1),
                ("BOTTOMPADDING", (1, 0), (1, 0), 3),
            ]
        ),
    )


def info_box(title: str, body: str, border_color=BLUE, fill=colors.white):
    table = Table(
        [[P(title, "H2Bauhaus")], [P(body)]],
        colWidths=[177 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), fill),
                ("BOX", (0, 0), (-1, -1), 1.2, border_color),
                ("LINEBEFORE", (0, 0), (0, -1), 4, border_color),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def metric_card(value: str, label: str, color):
    table = Table(
        [[P(value, "MetricValue")], [P(label, "MetricLabel")]],
        colWidths=[42.5 * mm],
        rowHeights=[13 * mm, 9 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), color),
                ("BOX", (0, 0), (-1, -1), 1, color),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return table


def data_table(headers, rows, widths, header_color=NAVY, font_size=7.2):
    hstyle = ParagraphStyle(
        "DynamicTableHead",
        parent=styles["TableHead"],
        fontSize=font_size,
        leading=font_size + 1.8,
    )
    bstyle = ParagraphStyle(
        "DynamicTableBody",
        parent=styles["TableBody"],
        fontSize=max(6.6, font_size - 0.2),
        leading=max(8.6, font_size + 2),
    )
    data = [[Paragraph(str(x), hstyle) for x in headers]]
    data += [[Paragraph(str(x), bstyle) for x in row] for row in rows]
    table = Table(data, colWidths=widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), header_color),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, MUTED]),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def scaled_image(path: Path, max_width=177 * mm, max_height=82 * mm):
    if not path.exists():
        return info_box("Evidence image unavailable", f"Expected image was not found at {path}", RED, LIGHT_RED)
    with PILImage.open(path) as img:
        w, h = img.size
    scale = min(max_width / w, max_height / h)
    return Image(str(path), width=w * scale, height=h * scale)


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = ManagementDocTemplate(str(OUTPUT))
    story = []

    # Cover
    cover = Table(
        [
            [P("ARG LEADS TRACKER CRM", "CoverSubtitle")],
            [P("Management Status &<br/>Go-Live Readiness", "CoverTitle")],
            [P("Progress through 04 August 2026", "CoverSubtitle")],
            [Spacer(1, 10 * mm)],
            [P("Prepared for Management", "CoverSubtitle")],
        ],
        colWidths=[177 * mm],
        rowHeights=[11 * mm, 34 * mm, 10 * mm, 13 * mm, 12 * mm],
    )
    cover.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), NAVY),
                ("BOX", (0, 0), (-1, -1), 2, DEEP_NAVY),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.extend([Spacer(1, 18 * mm), cover, Spacer(1, 12 * mm)])
    story.append(
        Table(
            [[metric_card("88%", "OVERALL READINESS", BLUE), metric_card("95%", "PRODUCT & UX", GREEN), metric_card("93%", "SECURITY & DATA", VIOLET), metric_card("72%", "UAT READINESS", YELLOW)]],
            colWidths=[44.25 * mm] * 4,
            style=TableStyle(
                [
                    ("LEFTPADDING", (0, 0), (-1, -1), 1),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 1),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            ),
        )
    )
    story.extend(
        [
            Spacer(1, 9 * mm),
            info_box(
                "Management decision",
                "<b>Conditional GO for a controlled pilot.</b> The application has passed the available code, security, migration, and production-schema checks. A full unrestricted go-live should wait for the restore drill, formal Admin and Salesman UAT sign-off, and an approved rollback and monitoring plan.",
                YELLOW,
                LIGHT_YELLOW,
            ),
            Spacer(1, 6 * mm),
            P("Production application: <link href='https://argleadstracker.vercel.app/' color='#1F6AA5'>https://argleadstracker.vercel.app/</link>", "Small"),
            P("Readiness is an evidence-based estimate, not a guarantee against all production incidents.", "Small"),
        ]
    )

    story.append(PageBreak())
    story.extend(section_title("1. Executive status", "What management can rely on today"))
    story.append(
        info_box(
            "Current position",
            "The CRM is functionally mature, visually unified, and substantially hardened. Admin and Salesman experiences use the same flat Bauhaus design system, the production Supabase schema has been reconciled, RLS and policy checks are passing, and the release branch is synchronized. The remaining risk is concentrated in operational proof: recovery, final user acceptance, and release ownership.",
            BLUE,
            LIGHT_BLUE,
        )
    )
    story.extend([Spacer(1, 5 * mm), P("Readiness by workstream", "H2Bauhaus")])
    workstream_rows = [
        ("Product functionality", "95%", "Core CRM workflows and role-specific views implemented; production smoke still required after final release."),
        ("User experience", "95%", "Unified Bauhaus UI, laptop/mobile responsiveness, readable tables, modals, and detail views."),
        ("Security and data controls", "93%", "Authentication boundaries, RLS, policies, headers, durable rate limiting, and cron controls validated."),
        ("Backup and recovery", "80%", "Managed backups and an independent logical export exist; disposable restore drill remains pending."),
        ("Deployment operations", "82%", "Git and production deployment paths are established; final secrets audit and monitoring ownership remain."),
        ("UAT and change readiness", "72%", "Walkthroughs and visual QA completed; formal role-based acceptance signatures are still needed."),
    ]
    story.append(data_table(["Workstream", "Score", "Management interpretation"], workstream_rows, [43 * mm, 18 * mm, 116 * mm], BLUE, 7.7))
    story.extend([Spacer(1, 6 * mm), P("Go-live recommendation", "H2Bauhaus")])
    story.append(bullet("Approve a <b>controlled pilot</b> with named users after P0 release gates are closed.", GREEN))
    story.append(bullet("Do not declare full production acceptance until a restore test proves the backup can be recovered.", RED))
    story.append(bullet("Use a short freeze window for the final release and monitor authentication, API errors, rate limits, and database health for 24-48 hours.", YELLOW))

    story.append(PageBreak())
    story.extend(section_title("2. Progress completed", "Functional, design, security, and release work delivered"))
    completed_rows = [
        ("Unified CRM interface", "Complete", "Admin and Salesman use one flat Bauhaus design system with consistent headers, panels, forms, tables, badges, alerts, and modals."),
        ("Admin workspace", "Complete", "Dashboard, Pipeline, Salesmen Directory, Activity, Tasks review, Quotes, Accounts, Search Places, and detail workflows."),
        ("Salesman workspace", "Complete", "Dashboard, KPI and action-breakdown modals, Pipeline list, Lead Details, Tasks and Weekly Sales Report, Quotes, Accounts, and AI Assistant entry points."),
        ("Lead workflows", "Complete", "Search, filters, exports, lead detail tabs, activity logging, reminders, notes, AI summaries, contact actions, and status presentation."),
        ("Activity workflows", "Complete", "Add and edit activity, attachments, voice-note handling, deletion requests, management review, and independent panel scrolling."),
        ("Responsive UX", "Complete", "Laptop and mobile layouts, internal scrolling, readable controls, accessible contrast, and no-glassmorphism migration."),
        ("Production schema reconciliation", "Complete", "Missing production schema objects and legacy notification differences reconciled through timestamped Supabase migrations."),
        ("Authorization hardening", "Complete", "RLS enabled and forced on audited CRM tables; lead, storage, weekly-report, and notification policy checks return true."),
        ("Release validation", "Complete", "Check, test, build, migration synchronization, and Git synchronization evidence reviewed."),
    ]
    story.append(data_table(["Area", "Status", "Delivered result"], completed_rows, [42 * mm, 24 * mm, 111 * mm], GREEN, 7.4))
    story.extend([Spacer(1, 7 * mm), P("Representative front-end result", "H2Bauhaus")])
    frontend = Path(r"C:\Users\Glory\AppData\Local\Temp\codex-clipboard-1156bfdf-7cfd-4b3e-be1c-dd1b058990b3.png")
    story.append(scaled_image(frontend, max_height=77 * mm))
    story.append(P("Admin Activity after the density, readability, responsive, and Bauhaus presentation work. The same component language is used across both roles.", "Small"))

    story.append(PageBreak())
    story.extend(section_title("3. Security and data assurance", "Controls validated before release"))
    security_rows = [
        ("Authentication boundary", "Passed", "Normal CRM requests require the signed-in user's JWT; unauthenticated calls are rejected."),
        ("Service-role boundary", "Passed", "Service-role access is limited to explicitly allowlisted server and cron operations."),
        ("Row Level Security", "Passed", "Audited CRM tables exist with RLS enabled and forced; current policies are present."),
        ("Storage authorization", "Passed", "Uploads and signing use the user's JWT rather than exposing service-role credentials."),
        ("Rate limiting", "Passed", "Durable database-backed rate-limit functions and tables are installed and tested."),
        ("Security headers", "Passed", "Automated security-header tests passed."),
        ("Scheduled jobs", "Passed", "Cron authentication and idempotency tests passed; missing or malformed credentials are rejected."),
        ("Notification policy migration", "Passed", "Legacy notification schema was reconciled before recipient-scoped policies were applied."),
    ]
    story.append(data_table(["Control", "Result", "Evidence meaning"], security_rows, [43 * mm, 23 * mm, 111 * mm], VIOLET, 7.5))
    story.extend([Spacer(1, 6 * mm), P("Production database audit evidence", "H2Bauhaus")])
    security_img = Path(r"C:\Users\Glory\AppData\Local\Temp\codex-clipboard-11ea2f61-5d87-4e80-ba02-6d5630361689.png")
    story.append(scaled_image(security_img, max_height=87 * mm))
    story.append(P("The production audit shows required tables present, RLS enabled and forced, and active policies. Storage objects use Supabase-managed policy behavior and were included in the audit set.", "Small"))
    story.extend(
        [
            Spacer(1, 4 * mm),
            info_box(
                "Important limitation",
                "Passing tests and RLS audits materially reduce risk but do not replace a final production role test. Management should require one Admin and one Salesman to verify that each role sees only the expected records and actions immediately before release approval.",
                RED,
                LIGHT_RED,
            ),
        ]
    )

    story.append(PageBreak())
    story.extend(section_title("4. Backup and recovery assurance", "What is protected, what has been verified, and what remains unproven"))
    story.append(
        info_box(
            "Backup position",
            "Two complementary safeguards exist: Supabase-managed scheduled database backups and an independent logical SQL export stored outside the Git repository. The independent package includes roles, schema, data, checksums, a manifest, and Storage inventory evidence.",
            GREEN,
            LIGHT_GREEN,
        )
    )
    story.extend([Spacer(1, 5 * mm), P("Independent backup evidence", "H2Bauhaus")])
    backup_rows = [
        ("Backup folder", r"C:\Users\Glory\Documents\local-release-files\supabase-backup-20260803-132551"),
        ("Database files", "roles.sql, schema.sql, data.sql"),
        ("Integrity files", "SHA256SUMS.txt, BACKUP-MANIFEST.txt"),
        ("Storage evidence", "STORAGE-INVENTORY.txt, storage-inventory-evidence.png"),
        ("Storage state at backup", "lead-files: 0 objects; pmr-voice-notes: 0 objects"),
        ("Managed backup", "Daily Supabase scheduled backups visible in the production project"),
    ]
    story.append(data_table(["Evidence", "Recorded result"], backup_rows, [48 * mm, 129 * mm], GREEN, 7.5))
    story.extend([Spacer(1, 6 * mm), P("Backup confidence levels", "H2Bauhaus")])
    assurance_rows = [
        ("Backup exists", "Verified", "Files, manifest, checksums, and managed backup entries are present."),
        ("Backup integrity", "Partially verified", "SHA-256 hashes provide corruption evidence for the independent export."),
        ("Database recoverability", "Pending", "The export has not yet been restored into a disposable Supabase project and functionally tested."),
        ("Storage recoverability", "Not applicable today", "Both production buckets contained zero objects at inventory time. A future object-copy procedure is still required."),
    ]
    story.append(data_table(["Assurance question", "Status", "Interpretation"], assurance_rows, [43 * mm, 33 * mm, 101 * mm], YELLOW, 7.5))
    story.extend(
        [
            Spacer(1, 6 * mm),
            info_box(
                "Management conclusion on backups",
                "The database is <b>backed up</b>, but disaster recovery is not yet fully assured. Recovery becomes proven only after a restore drill confirms that users, roles, core tables, RLS policies, and representative workflows operate correctly in a disposable environment.",
                RED,
                LIGHT_RED,
            ),
        ]
    )

    story.append(PageBreak())
    story.extend(section_title("5. Pending release gates", "Actions required before unrestricted go-live"))
    p0_rows = [
        ("P0", "Restore drill", "Technical Owner", "Restore roles, schema, and data to a disposable Supabase project; run record-count and role-access checks; document restore time and exceptions.", "Not started"),
        ("P0", "Admin and Salesman UAT", "Business Owner + QA", "Execute the final role-based script for login, visibility, dashboards, Pipeline, Lead Details, Activity, Tasks, reports, uploads, and logout. Capture signed acceptance.", "Pending sign-off"),
        ("P0", "Vercel secrets audit", "Technical Owner", "Review Production environment variables, remove obsolete keys, confirm server-only secrets are not exposed to the client, and record rotation owners and dates.", "Pending"),
        ("P0", "Rollback and monitoring plan", "Release Manager", "Name the release owner; define rollback triggers; retain the previous Vercel deployment; monitor errors, auth, API latency, rate limits, and database health for 24-48 hours.", "Pending"),
        ("P1", "Storage backup SOP", "Technical Owner", "Document object export and restore steps for lead-files and pmr-voice-notes once either bucket contains files.", "Pending"),
        ("P1", "Training and handover", "Business Owner", "Distribute walkthroughs, role guides, support contacts, escalation path, and first-week operating instructions.", "In progress"),
    ]
    story.append(data_table(["Priority", "Gate", "Owner", "Required evidence", "Status"], p0_rows, [13 * mm, 32 * mm, 30 * mm, 77 * mm, 25 * mm], RED, 6.7))
    story.extend([Spacer(1, 7 * mm), P("Release decision rule", "H2Bauhaus")])
    story.append(bullet("<b>Full GO:</b> all P0 gates complete, no unresolved critical defects, and named release and rollback owners available.", GREEN))
    story.append(bullet("<b>Conditional GO:</b> controlled pilot only, limited named users, immediate support coverage, and the database backup retained.", YELLOW))
    story.append(bullet("<b>NO-GO:</b> failed restore, role-data leakage, authentication failure, migration mismatch, or missing production secrets.", RED))

    story.append(PageBreak())
    story.extend(section_title("6. Final go-live runbook", "Recommended sequence for a controlled, reversible release"))
    runbook_rows = [
        ("1", "Freeze", "Stop non-release changes; record approved Git commit, Vercel deployment, Supabase project, and decision owners."),
        ("2", "Protect", "Create a fresh Supabase logical backup; verify checksums; record scheduled backup timestamp and Storage inventory."),
        ("3", "Dry-run", "Run migration list and database push dry-run; confirm no unexpected migrations; audit Vercel Production variables."),
        ("4", "Restore proof", "Restore the backup into a disposable target; verify key counts, authentication helpers, RLS, and representative read/write workflows."),
        ("5", "Deploy", "Deploy the approved commit to Vercel Production and retain the prior deployment for rollback."),
        ("6", "Smoke test", "Admin and Salesman login; verify dashboard totals, Pipeline filters, Lead Detail, Activity, Weekly Report, file/voice handling, AI Assistant entry, and logout."),
        ("7", "Observe", "Monitor auth failures, 4xx/5xx errors, API latency, rate-limit rejections, Supabase logs, and user-reported issues for 24-48 hours."),
        ("8", "Close", "Management and business owner sign the release record; archive the backup, UAT evidence, deployment URL, and rollback result."),
    ]
    story.append(data_table(["Step", "Stage", "Action and evidence"], runbook_rows, [13 * mm, 30 * mm, 134 * mm], NAVY, 7.4))
    story.extend([Spacer(1, 7 * mm), P("Rollback triggers", "H2Bauhaus")])
    story.append(bullet("Any cross-role data exposure or unexpected access to another salesperson's records.", RED))
    story.append(bullet("Repeated authentication failure, material API error rate, or inability to save core CRM changes.", RED))
    story.append(bullet("Migration-induced schema errors, broken RLS policies, or corrupted dashboard calculations.", RED))
    story.append(bullet("Business-critical workflow blocked with no safe workaround during the pilot window.", RED))

    story.append(PageBreak())
    story.extend(section_title("7. Management sign-off", "Decision record for controlled release"))
    signoff_rows = [
        ("Restore drill completed", "", "Date / evidence link:"),
        ("Admin UAT approved", "", "Approver / date:"),
        ("Salesman UAT approved", "", "Approver / date:"),
        ("Vercel secrets reviewed", "", "Reviewer / date:"),
        ("Rollback owner assigned", "", "Name / contact:"),
        ("Monitoring owner assigned", "", "Name / contact:"),
        ("Final release decision", "GO / CONDITIONAL GO / NO-GO", "Management approver / date:"),
    ]
    story.append(data_table(["Release evidence", "Decision", "Owner / reference"], signoff_rows, [62 * mm, 50 * mm, 65 * mm], NAVY, 7.7))
    story.extend(
        [
            Spacer(1, 9 * mm),
            info_box(
                "Overall conclusion",
                "ARG Leads Tracker CRM is ready for a <b>controlled pilot</b> and is close to full production readiness. The product and security work are substantially complete. The remaining work is operational: prove restoration, obtain role-based acceptance, review production secrets, and assign rollback and monitoring ownership. Closing these gates turns the current 88% readiness into a defensible full go-live decision.",
                BLUE,
                LIGHT_BLUE,
            ),
            Spacer(1, 7 * mm),
            P("Prepared 04 August 2026 | Evidence sources: repository validation, production Supabase migration and RLS checks, backup package, deployment records, and visual QA artifacts.", "Small"),
        ]
    )

    doc.build(story)
    print(str(OUTPUT))


if __name__ == "__main__":
    build()
