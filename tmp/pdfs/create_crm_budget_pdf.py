from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


OUTPUT = "output/pdf/arg-leads-tracker-crm-tool-only-cost-estimate.pdf"
PAGE_SIZE = landscape(A4)


def p(text, style):
    return Paragraph(str(text), style)


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="TitleMain",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=24,
    leading=29,
    textColor=colors.HexColor("#17324d"),
    alignment=TA_CENTER,
    spaceAfter=5 * mm,
))
styles.add(ParagraphStyle(
    name="Subtitle",
    parent=styles["BodyText"],
    fontSize=10.5,
    leading=14,
    textColor=colors.HexColor("#52616f"),
    alignment=TA_CENTER,
    spaceAfter=8 * mm,
))
styles.add(ParagraphStyle(
    name="Section",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=14,
    leading=18,
    textColor=colors.HexColor("#17324d"),
    spaceBefore=4 * mm,
    spaceAfter=3 * mm,
))
styles.add(ParagraphStyle(
    name="Body",
    parent=styles["BodyText"],
    fontSize=9,
    leading=12,
    textColor=colors.HexColor("#24313d"),
))
styles.add(ParagraphStyle(
    name="Small",
    parent=styles["BodyText"],
    fontSize=7.4,
    leading=9.5,
    textColor=colors.HexColor("#334155"),
))
styles.add(ParagraphStyle(
    name="TableHead",
    parent=styles["BodyText"],
    fontName="Helvetica-Bold",
    fontSize=7.4,
    leading=9,
    textColor=colors.white,
    alignment=TA_LEFT,
))
styles.add(ParagraphStyle(
    name="TableCell",
    parent=styles["BodyText"],
    fontSize=7.2,
    leading=8.7,
    textColor=colors.HexColor("#1f2937"),
))
styles.add(ParagraphStyle(
    name="TableCellBold",
    parent=styles["TableCell"],
    fontName="Helvetica-Bold",
))


def header_footer(canvas, doc):
    canvas.saveState()
    w, h = PAGE_SIZE
    canvas.setFillColor(colors.HexColor("#17324d"))
    canvas.rect(0, h - 12 * mm, w, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 8.5)
    canvas.drawString(14 * mm, h - 7.5 * mm, "Al Ras Steel - ARG Leads Tracker CRM Tool-Only Budget Estimate")
    canvas.setFont("Helvetica", 7.5)
    canvas.drawRightString(w - 14 * mm, h - 7.5 * mm, "Prepared July 20, 2026")
    canvas.setFillColor(colors.HexColor("#6b7280"))
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(14 * mm, 8 * mm, "Figures are planning estimates in USD; AED conversion uses approx. 3.67 AED/USD.")
    canvas.drawRightString(w - 14 * mm, 8 * mm, f"Page {doc.page}")
    canvas.restoreState()


doc = BaseDocTemplate(
    OUTPUT,
    pagesize=PAGE_SIZE,
    leftMargin=14 * mm,
    rightMargin=14 * mm,
    topMargin=18 * mm,
    bottomMargin=15 * mm,
)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
doc.addPageTemplates([PageTemplate(id="estimate", frames=[frame], onPage=header_footer)])

story = []
story.append(Paragraph("ARG Leads Tracker CRM", styles["TitleMain"]))
story.append(Paragraph("Tool-only development and maintenance budget estimate with attributable source of cost", styles["Subtitle"]))

summary_data = [
    [p("Budget Area", styles["TableHead"]), p("Recommended Planning Amount", styles["TableHead"]), p("Basis", styles["TableHead"])],
    [p("Developer labor", styles["TableCellBold"]), p("USD 0<br/>AED 0", styles["TableCell"]), p("Assumes you are the developer and will not charge a developer fee.", styles["TableCell"])],
    [p("One-time tool/vendor setup reserve", styles["TableCellBold"]), p("USD 0-1,200<br/>AED 0-4,400", styles["TableCell"]), p("Covers possible paid setup, domain, WhatsApp/Whistle onboarding, ERP API activation, test credits, and compliance registration. Excludes your labor.", styles["TableCell"])],
    [p("Monthly tool cost, excluding paid Zawya/LSEG feed", styles["TableCellBold"]), p("USD 650-2,000/mo<br/>AED 2,400-7,350/mo", styles["TableCell"]), p("Hosting, database, AI APIs, NewsAPI, WhatsApp/messaging provider, ERP API access, and monitoring. No developer retainer included.", styles["TableCell"])],
    [p("Monthly tool cost, with paid Zawya/LSEG feed", styles["TableCellBold"]), p("USD 1,150-4,000+/mo<br/>AED 4,250-14,700+/mo", styles["TableCell"]), p("Adds estimated market intelligence subscription where public fixed pricing is not available.", styles["TableCell"])],
    [p("Annual tool-only operating reserve", styles["TableCellBold"]), p("USD 8,000-24,000/year<br/>AED 29,500-88,100/year", styles["TableCell"]), p("Recommended first-year reserve excluding Zawya/LSEG; use USD 14,000-48,000+ if paid Zawya/LSEG is required.", styles["TableCell"])],
]
summary_table = Table(summary_data, colWidths=[78 * mm, 62 * mm, 120 * mm], repeatRows=1)
summary_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17324d")),
    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f8fafc")]),
    ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story.append(KeepTogether([Paragraph("Executive Budget Summary", styles["Section"]), summary_table]))
story.append(Spacer(1, 5 * mm))

monthly_rows = [
    ["Cost Item", "CRM Feature / Usage", "Estimated Monthly Cost", "Source of Cost"],
    ["Vercel hosting", "Production web app and Node API routes. CRM users do not need Vercel seats.", "$20-40", "Vercel Pro Plan pricing: platform fee and usage-based resources."],
    ["Supabase Pro", "Auth for 2 admin users and up to 8 salesman users, Postgres database, storage, backups.", "$25", "Supabase pricing: Pro plan includes 100,000 MAU, 8 GB database, 100 GB file storage."],
    ["Supabase add-ons", "Optional point-in-time recovery, custom domain, log drains, extended controls.", "$0-160+", "Supabase pricing: add-ons including custom domain, PITR, and log drains."],
    ["Google Maps / Places", "Company search, public business enrichment, Google Maps URL, coordinates, nearby map links.", "$0-75", "Google Maps Platform pricing: Places API Text Search and Place Details request tiers."],
    ["OpenAI API", "Voice note translation/transcription, PMR analysis, lead summaries using configured OpenAI models.", "$20-100", "OpenAI API pricing: audio translation/transcription and GPT text-token pricing."],
    ["Anthropic Claude API", "AI lead actions, database assistant, business enrichment, market/relationship intelligence summaries.", "$25-150", "Anthropic Claude pricing: model input/output token pricing."],
    ["Hunter.io", "Optional domain/email enrichment for customer contacts.", "$34-104", "Hunter pricing: Starter/Growth plans and API credit model."],
    ["NewsAPI", "Production market news card for steel, UAE construction, oil and gas, marine, metals.", "$449", "NewsAPI pricing: Business plan for production/commercial use."],
    ["Zawya / LSEG market intelligence", "Optional project and market intelligence feed matched to companies.", "Quote, budget $500-2,000+", "Zawya/LSEG commercial data feed; public fixed price not available, quote required."],
    ["Whistle / WhatsApp messaging", "Planned messaging integration, customer follow-ups, templates, activity logging.", "$50-300+", "Whistle vendor subscription or WhatsApp Business API provider plus Meta/message fees."],
    ["ERP API / inventory integration", "Live stock status, price lookup, quotation validation and quotation preparation.", "$0-500+", "ERP vendor license/API access; depends on your ERP contract and connector availability."],
    ["Monitoring and backups", "Uptime checks, error logging, audit retention, operational alerts.", "$20-100", "Third-party monitoring/logging tools or built-in platform add-ons."],
]
monthly_data = [[p(cell, styles["TableHead"] if i == 0 else styles["TableCell"]) for cell in row] for i, row in enumerate(monthly_rows)]
monthly_table = Table(monthly_data, colWidths=[42 * mm, 92 * mm, 34 * mm, 92 * mm], repeatRows=1)
monthly_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17324d")),
    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
]))
story.append(Paragraph("Recurring Monthly Cost by Source", styles["Section"]))
story.append(monthly_table)

story.append(PageBreak())

dev_rows = [
    ["Tool / Setup Item", "Scope", "Estimated One-Time Tool Cost", "Cost Driver / Source"],
    ["Developer labor", "Your own full-stack development time for CRM features, ERP integration, quotation workflow, QA, and deployment.", "$0", "Excluded because you are the developer and will not charge a development fee."],
    ["Domain name", "Optional branded domain if you do not keep the Vercel subdomain.", "$0-30/year", "Domain registrar pricing; Vercel subdomain remains free."],
    ["Google Cloud billing setup", "Billing account and Places API key setup.", "$0", "Google Maps Platform setup is free; usage is pay-as-you-go."],
    ["OpenAI / Anthropic starting balance", "Optional prepaid credits or initial usage buffer for testing AI and voice features.", "$50-300", "OpenAI and Anthropic API usage billing."],
    ["WhatsApp / Whistle onboarding", "Business verification, sender setup, template setup, possible platform onboarding.", "$0-300+", "Whistle/provider setup fees vary; WhatsApp template/message fees are recurring."],
    ["ERP API activation / connector", "API user, token, connector, sandbox, or vendor activation if not included in current ERP license.", "$0-500+", "ERP vendor contract; quote may be required."],
    ["Monitoring / incident tools setup", "Optional uptime checks, log drain setup, alerting workspace.", "$0-100", "Monitoring provider or platform add-on setup."],
    ["Data import tools", "CSV cleanup helpers, test import files, optional spreadsheet tooling.", "$0-100", "Mostly free if done manually; budget for small utility subscriptions if needed."],
]
dev_data = [[p(cell, styles["TableHead"] if i == 0 else styles["TableCell"]) for cell in row] for i, row in enumerate(dev_rows)]
dev_table = Table(dev_data, colWidths=[48 * mm, 98 * mm, 42 * mm, 72 * mm], repeatRows=1)
dev_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17324d")),
    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
]))
story.append(Paragraph("One-Time Tool and Vendor Setup Estimate", styles["Section"]))
story.append(dev_table)
story.append(Spacer(1, 5 * mm))

assumptions = [
    "The reviewed CRM currently supports Supabase-backed authentication/database/storage with local JSON fallback for development.",
    "The team size assumed here is 2 admin users and up to 8 salesman accounts, with about 2,000 existing active customer records.",
    "Developer labor is excluded because the owner will develop the CRM and will not charge a developer fee.",
    "The ERP inventory and quotation integration is not fully implemented yet; the current service is a read-only stub pending ERP API details.",
    "Whistle/WhatsApp is treated as a planned integration because no active Whistle integration code was found in the reviewed CRM.",
    "All platform prices are planning estimates and should be revalidated before purchasing because SaaS/API prices can change.",
]
story.append(Paragraph("Key Assumptions", styles["Section"]))
story.append(ListFlowable(
    [ListItem(Paragraph(item, styles["Body"]), bulletColor=colors.HexColor("#17324d")) for item in assumptions],
    bulletType="bullet",
    start="circle",
    leftIndent=7 * mm,
))
story.append(Spacer(1, 4 * mm))

source_rows = [
    ["Source Name", "Used For"],
    ["Supabase pricing", "Database, Auth users, file storage, backups, add-ons."],
    ["Vercel Pro Plan / Vercel pricing", "Hosting, deployment platform, usage-based infrastructure."],
    ["Google Maps Platform pricing", "Places API Text Search, Place Details, map-related usage."],
    ["OpenAI API pricing", "Voice transcription/translation and text model processing."],
    ["Anthropic Claude pricing", "Claude AI enrichment, AI actions, database assistant."],
    ["Hunter.io pricing and Hunter API docs", "Email/domain enrichment credits and subscription tier."],
    ["NewsAPI pricing and terms", "Commercial production market news feed cost."],
    ["Twilio WhatsApp pricing / WhatsApp Business API provider pricing", "Reference proxy for WhatsApp message and template fees if Whistle pricing is custom."],
    ["Vendor quote required: Zawya/LSEG and ERP provider", "Market intelligence feed and live ERP connector/API access."],
]
source_data = [[p(cell, styles["TableHead"] if i == 0 else styles["TableCell"]) for cell in row] for i, row in enumerate(source_rows)]
source_table = Table(source_data, colWidths=[80 * mm, 180 * mm], repeatRows=1)
source_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17324d")),
    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
]))
story.append(Paragraph("Cost Source Names", styles["Section"]))
story.append(source_table)
story.append(Spacer(1, 3 * mm))
story.append(Paragraph(
    "Recommended tool-only planning number: prepare USD 1,200 one-time setup reserve plus USD 2,000/month for the first 6 months, excluding any paid Zawya/LSEG market intelligence feed. If Zawya/LSEG is required, prepare up to USD 4,000/month until the vendor quote is confirmed.",
    styles["Body"],
))

doc.build(story)
print(OUTPUT)
