import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const dataPath = "C:/Users/Glory/Documents/argleadstracker/outputs/sales_report_work/sales_data.json";
const enrichmentPath = "C:/Users/Glory/Documents/argleadstracker/outputs/sales_report_work/company_enrichment.json";
const outputDir = "C:/Users/Glory/Documents/argleadstracker/outputs/sales_report_summary";
const outputPath = `${outputDir}/Sales_Report_Summary.xlsx`;
const data = JSON.parse(await fs.readFile(dataPath, "utf8"));
let enrichmentByCode = new Map();
try {
  const enrichment = JSON.parse(await fs.readFile(enrichmentPath, "utf8"));
  enrichmentByCode = new Map(enrichment.map((row) => [row.party_code, row]));
} catch {
  enrichmentByCode = new Map();
}

const workbook = Workbook.create();
const dashboard = workbook.worksheets.add("Dashboard");
const customerSheet = workbook.worksheets.add("Customer Summary");
const yearlySheet = workbook.worksheets.add("Sales by Year");
const mapSheet = workbook.worksheets.add("Map Data");
const rawSheet = workbook.worksheets.add("Raw Data");

const palette = {
  navy: "#17324D",
  teal: "#0E766D",
  amber: "#D9932F",
  blue: "#3269A8",
  paleBlue: "#EAF2F8",
  paleAmber: "#FFF3DD",
  gray: "#E5E7EB",
  darkGray: "#374151",
  white: "#FFFFFF",
};

function asDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function writeTable(sheet, startCell, headers, rows, tableName) {
  const range = sheet.getRangeByIndexes(
    startCell.row,
    startCell.col,
    rows.length + 1,
    headers.length,
  );
  range.values = [headers, ...rows];
  range.format.borders = { preset: "inside", style: "thin", color: "#D8DEE6" };
  range.getRow(0).format = {
    fill: palette.navy,
    font: { bold: true, color: palette.white },
  };
  const address = range.address.split("!").pop();
  sheet.tables.add(address, true, tableName);
  return range;
}

const rawHeaders = ["SR Date", "Party Code", "Party Name", "Total Tons", "Sales A/c", "LCy Net Amount", "Year"];
const rawRows = data.raw.map((row) => [
  row.sr_date ? asDate(row.sr_date) : null,
  row.party_code,
  row.party_name,
  row.total_tons,
  row.sales_account,
  row.lcy_net_amount,
  row.year,
]);
const rawRange = writeTable(rawSheet, { row: 0, col: 0 }, rawHeaders, rawRows, "RawTransactions");
rawSheet.getRange(`A2:A${rawRows.length + 1}`).format.numberFormat = "yyyy-mm-dd";
rawSheet.getRange(`D2:D${rawRows.length + 1}`).format.numberFormat = "#,##0.000";
rawSheet.getRange(`F2:F${rawRows.length + 1}`).format.numberFormat = "#,##0.00";
rawSheet.freezePanes.freezeRows(1);
rawSheet.showGridLines = false;

const rawLastRow = rawRows.length + 1;
const customerHeaders = [
  "Party Code",
  "Party Name",
  "Total Sales",
  "Last Transaction Date",
  "Total Tons",
  "Transactions",
  "Business Location",
  "Country",
  "Latitude",
  "Longitude",
  "Website",
  "Contact Number",
  "Location Source URL",
  "Match Confidence",
  "Matched Name",
  "Match Score",
];
const customerRows = data.customer.map((row) => [
  row.party_code,
  row.party_name,
  null,
  null,
  null,
  null,
  enrichmentByCode.get(row.party_code)?.business_location || row.business_location,
  enrichmentByCode.get(row.party_code)?.country || row.country,
  enrichmentByCode.get(row.party_code)?.latitude || row.latitude,
  enrichmentByCode.get(row.party_code)?.longitude || row.longitude,
  enrichmentByCode.get(row.party_code)?.website || "",
  enrichmentByCode.get(row.party_code)?.contact_number || "",
  enrichmentByCode.get(row.party_code)?.location_source_url || row.location_source_url,
  enrichmentByCode.get(row.party_code)?.match_confidence || row.match_confidence,
  enrichmentByCode.get(row.party_code)?.matched_name || "",
  enrichmentByCode.get(row.party_code)?.match_score || "",
]);
const customerRange = writeTable(customerSheet, { row: 0, col: 0 }, customerHeaders, customerRows, "CustomerSalesSummary");
for (let i = 0; i < data.customer.length; i++) {
  const row = i + 2;
  customerSheet.getRange(`C${row}:F${row}`).formulas = [[
    `=SUMIFS('Raw Data'!$F$2:$F$${rawLastRow},'Raw Data'!$B$2:$B$${rawLastRow},A${row},'Raw Data'!$C$2:$C$${rawLastRow},B${row})`,
    `=MAXIFS('Raw Data'!$A$2:$A$${rawLastRow},'Raw Data'!$B$2:$B$${rawLastRow},A${row},'Raw Data'!$C$2:$C$${rawLastRow},B${row})`,
    `=SUMIFS('Raw Data'!$D$2:$D$${rawLastRow},'Raw Data'!$B$2:$B$${rawLastRow},A${row},'Raw Data'!$C$2:$C$${rawLastRow},B${row})`,
    `=COUNTIFS('Raw Data'!$B$2:$B$${rawLastRow},A${row},'Raw Data'!$C$2:$C$${rawLastRow},B${row})`,
  ]];
}
customerSheet.getRange(`C2:C${data.customer.length + 1}`).format.numberFormat = "#,##0.00";
customerSheet.getRange(`D2:D${data.customer.length + 1}`).format.numberFormat = "yyyy-mm-dd";
customerSheet.getRange(`E2:E${data.customer.length + 1}`).format.numberFormat = "#,##0.000";
customerSheet.getRange(`F2:F${data.customer.length + 1}`).format.numberFormat = "#,##0";
customerSheet.freezePanes.freezeRows(1);
customerSheet.freezePanes.freezeColumns(2);
customerSheet.showGridLines = false;

const yearlyHeaders = ["Year", "Total Sales", "Total Tons", "Transactions"];
const yearlyRows = data.yearly.map((row) => [row.year, null, null, null]);
writeTable(yearlySheet, { row: 0, col: 0 }, yearlyHeaders, yearlyRows, "YearlySales");
for (let i = 0; i < data.yearly.length; i++) {
  const row = i + 2;
  yearlySheet.getRange(`B${row}:D${row}`).formulas = [[
    `=SUMIFS('Raw Data'!$F$2:$F$${rawLastRow},'Raw Data'!$G$2:$G$${rawLastRow},A${row})`,
    `=SUMIFS('Raw Data'!$D$2:$D$${rawLastRow},'Raw Data'!$G$2:$G$${rawLastRow},A${row})`,
    `=COUNTIFS('Raw Data'!$G$2:$G$${rawLastRow},A${row})`,
  ]];
}
yearlySheet.getRange(`B2:B${data.yearly.length + 1}`).format.numberFormat = "#,##0.00";
yearlySheet.getRange(`C2:C${data.yearly.length + 1}`).format.numberFormat = "#,##0.000";
yearlySheet.getRange(`D2:D${data.yearly.length + 1}`).format.numberFormat = "#,##0";
const yearChart = yearlySheet.charts.add("bar", yearlySheet.getRange(`A1:B${data.yearly.length + 1}`));
yearChart.title = "Sales by Year";
yearChart.hasLegend = false;
yearChart.yAxis = { numberFormatCode: "#,##0" };
yearChart.setPosition("F2", "N18");
yearlySheet.showGridLines = false;

const mapHeaders = [
  "Party Code",
  "Party Name",
  "Business Location",
  "Country",
  "Latitude",
  "Longitude",
  "Website",
  "Contact Number",
  "Location Source URL",
  "Match Confidence",
  "Map Pin Status",
];
const mapRows = data.customer.map((row) => [
  row.party_code,
  row.party_name,
  enrichmentByCode.get(row.party_code)?.business_location || row.business_location,
  enrichmentByCode.get(row.party_code)?.country || row.country,
  enrichmentByCode.get(row.party_code)?.latitude || row.latitude,
  enrichmentByCode.get(row.party_code)?.longitude || row.longitude,
  enrichmentByCode.get(row.party_code)?.website || "",
  enrichmentByCode.get(row.party_code)?.contact_number || "",
  enrichmentByCode.get(row.party_code)?.location_source_url || row.location_source_url,
  enrichmentByCode.get(row.party_code)?.match_confidence || row.match_confidence,
  enrichmentByCode.get(row.party_code)?.latitude ? "Pinned from Google Places result" : "No verified pin",
]);
writeTable(mapSheet, { row: 0, col: 0 }, mapHeaders, mapRows, "MapPinData");
mapSheet.freezePanes.freezeRows(1);
mapSheet.freezePanes.freezeColumns(2);
mapSheet.showGridLines = false;

dashboard.showGridLines = false;
dashboard.getRange("A1:H1").merge();
dashboard.getRange("A1").values = [["Sales Report Summary"]];
dashboard.getRange("A1").format = {
  fill: palette.navy,
  font: { bold: true, color: palette.white, size: 18 },
};
dashboard.getRange("A3:B7").values = [
  ["Source rows", data.row_count],
  ["Customers", data.customer_count],
  ["Date range", `${data.date_min} to ${data.date_max}`],
  ["Total sales", null],
  ["Location status", enrichmentByCode.size ? `${enrichmentByCode.size} Google Places lookups merged` : "Awaiting approved web lookup"],
];
dashboard.getRange("B6").formulas = [[`=SUM('Raw Data'!$F$2:$F$${rawLastRow})`]];
dashboard.getRange("A3:B7").format.borders = { preset: "inside", style: "thin", color: "#D8DEE6" };
dashboard.getRange("A3:A7").format = { fill: palette.paleBlue, font: { bold: true, color: palette.darkGray } };
dashboard.getRange("B6").format.numberFormat = "#,##0.00";

dashboard.getRange("A10:D10").values = [["Year", "Total Sales", "Total Tons", "Transactions"]];
dashboard.getRange(`A11:D${10 + data.yearly.length}`).formulas = data.yearly.map((_, idx) => {
  const src = idx + 2;
  return [`='Sales by Year'!A${src}`, `='Sales by Year'!B${src}`, `='Sales by Year'!C${src}`, `='Sales by Year'!D${src}`];
});
dashboard.getRange(`A10:D${10 + data.yearly.length}`).format.borders = { preset: "inside", style: "thin", color: "#D8DEE6" };
dashboard.getRange("A10:D10").format = {
  fill: palette.teal,
  font: { bold: true, color: palette.white },
};
dashboard.getRange(`B11:B${10 + data.yearly.length}`).format.numberFormat = "#,##0.00";
dashboard.getRange(`C11:C${10 + data.yearly.length}`).format.numberFormat = "#,##0.000";
dashboard.getRange(`D11:D${10 + data.yearly.length}`).format.numberFormat = "#,##0";

const dashChart = dashboard.charts.add("bar", dashboard.getRange(`A10:B${10 + data.yearly.length}`));
dashChart.title = "Sales by Year";
dashChart.hasLegend = false;
dashChart.yAxis = { numberFormatCode: "#,##0" };
dashChart.setPosition("F3", "N21");

for (const sheet of [dashboard, customerSheet, yearlySheet, mapSheet, rawSheet]) {
  const used = sheet.getUsedRange();
  used.format.autofitColumns();
  used.format.autofitRows();
}
customerSheet.getRange("B:B").format.columnWidth = 48;
customerSheet.getRange("G:G").format.columnWidth = 32;
customerSheet.getRange("K:L").format.columnWidth = 26;
customerSheet.getRange("M:M").format.columnWidth = 36;
mapSheet.getRange("B:B").format.columnWidth = 48;
mapSheet.getRange("C:C").format.columnWidth = 32;
mapSheet.getRange("G:H").format.columnWidth = 26;
mapSheet.getRange("I:I").format.columnWidth = 36;
rawSheet.getRange("C:C").format.columnWidth = 48;
dashboard.getRange("A:A").format.columnWidth = 20;
dashboard.getRange("B:B").format.columnWidth = 28;

await fs.mkdir(outputDir, { recursive: true });

const checks = [
  await workbook.inspect({ kind: "table", sheetId: "Dashboard", range: "A1:N21", maxChars: 5000, tableMaxRows: 25, tableMaxCols: 14 }),
  await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan" }),
];
for (const [index, check] of checks.entries()) {
  console.log(`CHECK_${index + 1}`);
  console.log(check.ndjson);
}

for (const sheetName of ["Dashboard", "Sales by Year"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(`${outputDir}/${sheetName.replaceAll(" ", "_")}.png`, new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`OUTPUT=${outputPath}`);
