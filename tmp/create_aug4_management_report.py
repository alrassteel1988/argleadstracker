from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image, KeepTogether, PageBreak, PageTemplate,
    Paragraph, Spacer, Table, TableStyle,
)

ROOT = Path(r"C:\Users\Glory\Documents\argleadstracker")
OUT = ROOT / "artifacts" / "ARG_Leads_Tracker_Management_Status_and_GoLive_Readiness_2026-08-04.pdf"
FRONTEND = Path(r"C:\Users\Glory\AppData\Local\Temp\codex-clipboard-1156bfdf-7cfd-4b3e-be1c-dd1b058990b3.png")
SECURITY = Path(r"C:\Users\Glory\AppData\Local\Temp\codex-clipboard-11ea2f61-5d87-4e80-ba02-6d5630361689.png")
BACKUP = Path(r"C:\Users\Glory\Documents\local-release-files\supabase-backup-20260803-132551\storage-inventory-evidence.png")

NAVY = colors.HexColor("#06283D")
BLUE = colors.HexColor("#1F6AA5")
RED = colors.HexColor("#D94A48")
AMBER = colors.HexColor("#E6A933")
GREEN = colors.HexColor("#6D9F3D")
INK = colors.HexColor("#151515")
MUTED = colors.HexColor("#586575")
PAPER = colors.HexColor("#F7F5EF")
PALE_BLUE = colors.HexColor("#DCEAF6")
PALE_GREEN = colors.HexColor("#E6F0D8")
PALE_AMBER = colors.HexColor("#F8EDCE")
PALE_RED = colors.HexColor("#FAE4E2")
LINE = colors.HexColor("#CBD5DF")

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=22, leading=26, textColor=NAVY, spaceAfter=8)
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=NAVY, spaceBefore=4, spaceAfter=8)
H3 = ParagraphStyle("H3", parent=styles["Heading3"], fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=INK, spaceBefore=3, spaceAfter=4)
BODY = ParagraphStyle("Body", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.3, leading=13, textColor=INK, spaceAfter=5)
SMALL = ParagraphStyle("Small", parent=BODY, fontSize=8, leading=10, textColor=MUTED)
WHITE = ParagraphStyle("White", parent=BODY, textColor=colors.white)
WHITE_BIG = ParagraphStyle("WhiteBig", parent=WHITE, fontName="Helvetica-Bold", fontSize=25, leading=29)
WHITE_SUB = ParagraphStyle("WhiteSub", parent=WHITE, fontSize=10.5, leading=14)
LABEL = ParagraphStyle("Label", parent=SMALL, fontName="Helvetica-Bold", fontSize=7.5, leading=9, textColor=BLUE)
CELL = ParagraphStyle("Cell", parent=BODY, fontSize=8.3, leading=11, spaceAfter=0)
CELL_BOLD = ParagraphStyle("CellBold", parent=CELL, fontName="Helvetica-Bold")

def p(text, style=BODY):
    return Paragraph(escape(str(text)).replace("\n", "<br/>"), style)

def rich(text, style=BODY):
    return Paragraph(text, style)

def header_footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, w, 12*mm, fill=1, stroke=0)
    canvas.setStrokeColor(LINE)
    canvas.line(18*mm, 14*mm, w-18*mm, 14*mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(18*mm, 8*mm, "ARG Leads Tracker CRM | Management Status and Go-Live Readiness | 04 Aug 2026")
    canvas.drawRightString(w-18*mm, 8*mm, f"Page {doc.page}")
    canvas.restoreState()

def section(title, accent=BLUE):
    t = Table([[p(title, ParagraphStyle("sec", parent=H2, textColor=colors.white, spaceAfter=0))]], colWidths=[174*mm])
    t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), accent), ("BOX", (0,0), (-1,-1), 1, NAVY), ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8), ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6)]))
    return t

def status_card(label, value, detail, fill):
    data = [[p(label.upper(), ParagraphStyle("cl", parent=LABEL, textColor=colors.white))], [p(value, ParagraphStyle("cv", parent=WHITE_BIG, fontSize=20, leading=22))], [p(detail, ParagraphStyle("cd", parent=WHITE_SUB, fontSize=8.2, leading=10))]]
    t = Table(data, colWidths=[41*mm], rowHeights=[6*mm, 9*mm, 9*mm])
    t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), fill), ("BOX", (0,0), (-1,-1), 1, NAVY), ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6), ("TOPPADDING", (0,0), (-1,-1), 3), ("BOTTOMPADDING", (0,0), (-1,-1), 3)]))
    return t

def bullet(text, color=BLUE):
    row = Table([["", p(text)]], colWidths=[3*mm, 168*mm])
    row.setStyle(TableStyle([("BACKGROUND", (0,0), (0,0), color), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 0), ("RIGHTPADDING", (0,0), (0,0), 0), ("RIGHTPADDING", (1,0), (1,0), 0), ("TOPPADDING", (0,0), (-1,-1), 2), ("BOTTOMPADDING", (0,0), (-1,-1), 3)]))
    return row

def evidence_table(rows):
    data = [[p("Evidence", CELL_BOLD), p("Status", CELL_BOLD), p("Management interpretation", CELL_BOLD)]]
    for a,b,c in rows:
        data.append([p(a, CELL), p(b, CELL_BOLD), p(c, CELL)])
    t = Table(data, colWidths=[52*mm, 25*mm, 97*mm], repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), NAVY), ("TEXTCOLOR", (0,0), (-1,0), colors.white), ("GRID", (0,0), (-1,-1), .45, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 5), ("RIGHTPADDING", (0,0), (-1,-1), 5), ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5)]))
    for i, (_,status,_) in enumerate(rows, 1):
        t.setStyle(TableStyle([("BACKGROUND", (1,i), (1,i), PALE_GREEN if status in {"Complete", "Passed", "Verified", "Synced"} else PALE_AMBER)]))
    return t

def milestone_table(rows):
    data = [[p("Priority", CELL_BOLD), p("Release gate", CELL_BOLD), p("Owner", CELL_BOLD), p("Completion evidence", CELL_BOLD)]]
    for row in rows:
        data.append([p(x, CELL) for x in row])
    t = Table(data, colWidths=[17*mm, 69*mm, 30*mm, 58*mm], repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), NAVY), ("TEXTCOLOR", (0,0), (-1,0), colors.white), ("GRID", (0,0), (-1,-1), .45, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 5), ("RIGHTPADDING", (0,0), (-1,-1), 5), ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5)]))
    for i, row in enumerate(rows, 1):
        color = PALE_RED if row[0] == "P0" else PALE_AMBER if row[0] == "P1" else PALE_BLUE
        t.setStyle(TableStyle([("BACKGROUND", (0,i), (0,i), color)]))
    return t

def add_image(story, path, max_w=174*mm, max_h=104*mm, caption=""):
    if not path.exists():
        story.append(p(f"Screenshot unavailable at report-generation time: {path}", SMALL))
        return
    img = Image(str(path))
    scale = min(max_w/img.imageWidth, max_h/img.imageHeight)
    img.drawWidth = img.imageWidth * scale
    img.drawHeight = img.imageHeight * scale
    story.extend([img, Spacer(1, 2*mm)])
    if caption:
        story.append(p(caption, SMALL))

OUT.parent.mkdir(parents=True, exist_ok=True)
doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=16*mm, bottomMargin=18*mm, title="ARG Leads Tracker CRM Management Status and Go-Live Readiness", author="OpenAI Codex")
doc.addPageTemplates([PageTemplate(id="main", frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body")], onPage=header_footer)])
story = []

# Cover and executive summary
cover = Table([[p("MANAGEMENT RELEASE REPORT", LABEL)], [p("ARG Leads Tracker CRM", WHITE_BIG)], [p("Status Progress and Go-Live Readiness", ParagraphStyle("coverSub", parent=WHITE_BIG, fontSize=18, leading=22))], [p("Reporting date: 04 August 2026 | Production: https://argleadstracker.vercel.app/", WHITE_SUB)]], colWidths=[174*mm])
cover.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), NAVY), ("BOX", (0,0), (-1,-1), 2, BLUE), ("LEFTPADDING", (0,0), (-1,-1), 12), ("RIGHTPADDING", (0,0), (-1,-1), 12), ("TOPPADDING", (0,0), (-1,-1), 8), ("BOTTOMPADDING", (0,0), (-1,-1), 8)]))
story.extend([cover, Spacer(1, 7*mm), section("Executive release decision", BLUE), Spacer(1, 4*mm)])
cards = Table([[status_card("Readiness", "88%", "Security and data foundations validated", BLUE), status_card("Decision", "Conditional GO", "Controlled pilot only", GREEN), status_card("Critical gates", "4", "Must close before unrestricted launch", RED), status_card("Backup layers", "2", "Managed plus logical export", AMBER)]], colWidths=[43.5*mm]*4)
cards.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 1.5), ("RIGHTPADDING", (0,0), (-1,-1), 1.5)]))
story.extend([cards, Spacer(1, 6*mm)])
decision = Table([[p("Recommendation", CELL_BOLD), p("Proceed with a controlled production pilot after the P0 release gates below are evidenced. Do not yet authorize an unrestricted company-wide rollout.", CELL)], [p("Why", CELL_BOLD), p("Core UI, role controls, production migrations, RLS policies, backup artifacts, tests, and deployment are in place. Restore testing, formal role UAT, secrets review, and rollback ownership still require sign-off.", CELL)]], colWidths=[30*mm, 144*mm])
decision.setStyle(TableStyle([("BACKGROUND", (0,0), (0,-1), PALE_BLUE), ("BACKGROUND", (1,0), (1,-1), colors.white), ("BOX", (0,0), (-1,-1), 1, BLUE), ("INNERGRID", (0,0), (-1,-1), .4, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6), ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6)]))
story.extend([decision, Spacer(1, 6*mm), p("Readiness scope", H2)])
for text in ["Product presentation: unified flat Bauhaus interface for Admin and Salesman roles, with responsive dashboards, pipeline, activity, tasks, quotes, accounts, lead details, modals, reports, and AI assistant entry points.", "Security and authorization: production Supabase schema reconciliation completed, legacy notifications mismatch repaired, RLS policies applied, and boundary tests pass.", "Operations: production deployment is active; independent backup artifacts exist; final assurance now depends on a restore drill and formal release ownership."]:
    story.append(bullet(text))

story.append(PageBreak())
story.extend([section("1. Progress delivered", BLUE), Spacer(1, 4*mm)])
progress = [
    ("Unified CRM visual system", "Complete", "One flat Bauhaus presentation system is used across Admin and Salesman views; glassmorphism and washed-out surfaces were removed."),
    ("Role dashboards and summaries", "Complete", "Interactive KPI breakdowns, pipeline summaries, overdue/coverage/next-up details, live leads tables, and role-scoped navigation are implemented."),
    ("Pipeline and reporting", "Complete", "Full-width live-lead table, filters, sorting, pagination, date range, Excel/PDF export, and row navigation are available."),
    ("Activity workflow", "Complete", "Dense laptop layout, add/edit activity modal, voice note support, reminders, deletion requests, filters, and accessible controls are in place."),
    ("Weekly sales report", "Complete", "Required-field signals, save draft, submission lifecycle, blockers, immutable trail, and Admin review workflow are implemented."),
    ("Lead intelligence", "Complete", "Readable lead detail workspace, AI summary, contact/commercial panels, activity actions, and consistent Admin/Salesman structure are implemented."),
    ("Production schema and RLS", "Verified", "Three production reconciliation migrations applied; post-install checks returned true and required table audit showed RLS enabled and policies present."),
]
story.extend([evidence_table(progress), Spacer(1, 6*mm), p("Management impact", H2)])
for text in ["Sales users can see the source records behind dashboard totals instead of relying on unexplained counts.", "Managers have denser laptop views, searchable/exportable tables, explicit overdue/risk states, and report review controls.", "Admin and Salesman accounts now look and behave as one product while retaining role-specific permissions and data visibility."]:
    story.append(bullet(text, GREEN))

story.append(PageBreak())
story.extend([section("2. Data protection and backup assurance", GREEN), Spacer(1, 4*mm)])
story.append(p("Backup status", H2))
backup_rows = [
    ("Supabase scheduled backups", "Verified", "Managed physical backups are available in the Supabase project dashboard."),
    ("Independent logical backup", "Verified", r"Stored outside the repository at C:\Users\Glory\Documents\local-release-files\supabase-backup-20260803-132551."),
    ("Roles, schema, and data", "Verified", "roles.sql, schema.sql, and data.sql were generated; SHA256 checksums and a manifest were created."),
    ("Storage inventory", "Verified", "lead-files and pmr-voice-notes both had zero objects at backup time, so no object download was required."),
    ("Restore test", "Pending", "The logical backup has not yet been restored into a disposable project and exercised end to end."),
]
story.extend([evidence_table(backup_rows), Spacer(1, 5*mm)])
warning = Table([[p("Important assurance boundary", CELL_BOLD), p("A successful export and checksum prove capture integrity, not recoverability. Management should treat the backup as fully assured only after a restore drill validates schema creation, row counts, authentication-linked access, Storage policies, and representative application flows.", CELL)]], colWidths=[39*mm, 135*mm])
warning.setStyle(TableStyle([("BACKGROUND", (0,0), (0,0), AMBER), ("BACKGROUND", (1,0), (1,0), PALE_AMBER), ("BOX", (0,0), (-1,-1), 1, AMBER), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6), ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6)]))
story.extend([warning, Spacer(1, 6*mm), p("Recommended restore-drill acceptance criteria", H2)])
for text in ["Restore into a disposable Supabase project or isolated Postgres instance, never directly over production.", "Compare critical table row counts and confirm required extensions, functions, triggers, indexes, RLS flags, and policies.", "Run one Admin and one Salesman scenario against the restored environment, including lead visibility, activity creation, weekly report save/submit, and Storage signed URL behavior.", "Record duration, responsible owner, screenshots/logs, and the tested rollback procedure in the release evidence folder."]:
    story.append(bullet(text, GREEN))

story.append(PageBreak())
story.extend([section("3. Release evidence and controls", BLUE), Spacer(1, 4*mm)])
tests = [
    ("npm run check", "Passed", "Static checks completed without reported failures."),
    ("npm test", "Passed", "Application tests passed, including eight Supabase authorization boundary checks, security header tests, and durable rate-limit tests."),
    ("npm run build", "Passed", "Production build completed; this repository does not require a separate asset compilation step."),
    ("Production migrations", "Synced", "Local and remote migration histories match after notification schema reconciliation."),
    ("Post-install database checks", "Passed", "All eight checks returned true, including RLS helpers, policies, weekly report lifecycle, and durable rate limiting."),
    ("Git release state", "Synced", "Commit 0d844a3 was pushed to origin/main; local and remote ahead/behind counts were 0/0 at evidence capture."),
]
story.extend([evidence_table(tests), Spacer(1, 6*mm), p("Production safety controls now in place", H2)])
for text in ["Authenticated user JWTs are used for normal Supabase REST and Storage operations; service-role use is limited to explicitly allowlisted server operations.", "Core CRM tables have RLS enabled and forced, with role-scoped policies for Admin and Salesman data visibility.", "Durable database-backed rate limiting, server request throttling, security headers, and cron authentication/idempotency checks are covered by tests.", "The production notification schema was reconciled before recipient-scoped policies were installed, closing the deployment error encountered during the first migration push."]:
    story.append(bullet(text))

story.append(PageBreak())
story.extend([section("4. Pending go-live gates", RED), Spacer(1, 4*mm)])
gates = [
    ("P0", "Perform and evidence a full restore drill", "Database owner", "Disposable restore succeeds; row counts, RLS, functions, and representative app flows pass."),
    ("P0", "Formal Admin and Salesman production UAT", "Business owner + users", "Signed checklist covers login, role visibility, dashboards, pipeline, lead details, activity, tasks, reports, uploads, exports, and AI assistant entry points."),
    ("P0", "Audit Vercel production variables and secret rotation", "Technical owner", "All required variables exist only in intended environments; stale or exposed credentials are rotated; no secret is committed to Git or reports."),
    ("P0", "Approve rollback ownership and release monitoring", "Release manager", "Named decision-maker, rollback command/runbook, incident contacts, and 24-48 hour monitoring window are documented."),
    ("P1", "Run fresh production smoke after deployment", "QA owner", "TLS page, health endpoint, authentication, Admin/Salesman role flows, and one read/write workflow succeed."),
    ("P1", "Document Storage object backup once usage is nonzero", "Database owner", "Bucket inventory and downloadable object copy procedure are tested and scheduled."),
    ("P1", "Archive release evidence", "Release manager", "Backups, checksums, migration output, test logs, UAT sign-off, deployment ID, and smoke results are stored outside the repository."),
]
story.extend([milestone_table(gates), Spacer(1, 6*mm)])
story.append(p("Readiness interpretation", H2))
interpret = Table([[p("88%", ParagraphStyle("score", parent=WHITE_BIG, fontSize=28, alignment=TA_CENTER)), p("The product is technically advanced and suitable for a controlled pilot. The remaining 12% is concentrated in operational proof and governance, not core feature implementation. Because these items determine recoverability and production accountability, they cannot be waived for unrestricted launch.", CELL)]], colWidths=[30*mm, 144*mm])
interpret.setStyle(TableStyle([("BACKGROUND", (0,0), (0,0), BLUE), ("BACKGROUND", (1,0), (1,0), PALE_BLUE), ("BOX", (0,0), (-1,-1), 1, BLUE), ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7), ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7)]))
story.append(interpret)

story.append(PageBreak())
story.extend([section("5. Recommended release sequence", AMBER), Spacer(1, 4*mm)])
steps = [
    ("1", "Freeze", "Pause nonessential production changes and record the release candidate commit and Vercel deployment."),
    ("2", "Restore", "Complete the disposable restore drill and attach evidence. Stop the release if restore or RLS validation fails."),
    ("3", "Audit", "Confirm Vercel variables, Supabase project linkage, scheduled jobs, service-role boundaries, and credential rotation status."),
    ("4", "UAT", "Run the signed Admin and Salesman checklist using representative production accounts and realistic records."),
    ("5", "Deploy", "Promote the approved commit only after P0 sign-off. Record deployment ID, time, owner, and rollback target."),
    ("6", "Smoke", "Validate TLS, login, role navigation, dashboard counts, pipeline list, lead details, activity creation, weekly report, exports, uploads, and AI assistant launcher."),
    ("7", "Monitor", "Monitor errors, auth failures, rate limits, scheduled jobs, and user-reported issues for 24-48 hours; keep rollback authority available."),
    ("8", "Close", "Archive release evidence and obtain management acceptance before expanding access beyond the pilot group."),
]
data = [[p("Step", CELL_BOLD), p("Gate", CELL_BOLD), p("Action", CELL_BOLD)]] + [[p(a, CELL_BOLD), p(b, CELL_BOLD), p(c, CELL)] for a,b,c in steps]
runbook = Table(data, colWidths=[14*mm, 28*mm, 132*mm], repeatRows=1)
runbook.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), NAVY), ("TEXTCOLOR", (0,0), (-1,0), colors.white), ("GRID", (0,0), (-1,-1), .45, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 5), ("RIGHTPADDING", (0,0), (-1,-1), 5), ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5)]))
story.extend([runbook, Spacer(1, 6*mm), p("Rollback trigger examples", H2)])
for text in ["Admin or Salesman sees data outside the authorized role scope.", "Production writes fail, migrations leave schema objects inconsistent, or weekly report lifecycle actions regress.", "Authentication, Storage signing/upload, scheduled jobs, or rate limiting fail materially.", "Dashboard counts or pipeline records diverge from the source data after deployment."]:
    story.append(bullet(text, RED))

story.append(PageBreak())
story.extend([section("6. Visual and technical evidence", BLUE), Spacer(1, 4*mm), p("Current Admin Activity workspace", H2)])
add_image(story, FRONTEND, max_h=94*mm, caption="Current Bauhaus Activity view showing unified navigation, KPI cards, weekly calendar, activity table, reminders, and role-consistent layout.")
story.extend([Spacer(1, 4*mm), p("Production RLS audit evidence", H2)])
add_image(story, SECURITY, max_h=94*mm, caption="Production audit output showing required CRM tables present with RLS enabled/forced and active policies.")

story.append(PageBreak())
story.extend([section("7. Management decision checklist", NAVY), Spacer(1, 4*mm)])
check_rows = [
    ("Restore drill completed and evidence attached", "Pending", "Database owner"),
    ("Admin UAT approved", "Pending", "Admin business owner"),
    ("Salesman UAT approved", "Pending", "Sales manager / pilot users"),
    ("Production secrets and environment audit approved", "Pending", "Technical owner"),
    ("Rollback owner and monitoring window confirmed", "Pending", "Release manager"),
    ("Fresh production smoke completed", "After deploy", "QA owner"),
    ("Management authorizes pilot", "Decision", "Management sponsor"),
]
data = [[p("Approval", CELL_BOLD), p("Status", CELL_BOLD), p("Accountable owner", CELL_BOLD)]] + [[p(a,CELL),p(b,CELL_BOLD),p(c,CELL)] for a,b,c in check_rows]
check = Table(data, colWidths=[93*mm, 29*mm, 52*mm], repeatRows=1)
check.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), NAVY), ("TEXTCOLOR", (0,0), (-1,0), colors.white), ("GRID", (0,0), (-1,-1), .45, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6), ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7)]))
for i in range(1, len(data)):
    check.setStyle(TableStyle([("BACKGROUND", (1,i), (1,i), PALE_AMBER)]))
story.extend([check, Spacer(1, 8*mm)])
signoff = Table([[p("Prepared for", CELL_BOLD), p("Management release review", CELL)], [p("Report date", CELL_BOLD), p("04 August 2026", CELL)], [p("Overall status", CELL_BOLD), p("Conditional GO for controlled pilot; unrestricted go-live pending P0 gates", CELL)], [p("Production URL", CELL_BOLD), p("https://argleadstracker.vercel.app/", CELL)]], colWidths=[38*mm,136*mm])
signoff.setStyle(TableStyle([("BACKGROUND", (0,0), (0,-1), PALE_BLUE), ("GRID", (0,0), (-1,-1), .5, LINE), ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6), ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7)]))
story.append(signoff)

doc.build(story)
print(str(OUT))
