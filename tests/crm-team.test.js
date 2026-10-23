const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const css = read("crm-team.css");
const client = read("client.js");
const html = read("index.html");
assert.match(css, /\.salesmen-metric-card\s*\{[^}]*background:\s*var\(--crm-surface\)/s);
assert.match(css, /#performancePanel::after\s*\{\s*content:\s*none\s*!important/s);
assert.match(css, /\.salesmen-directory-card\s*\{[^}]*--salesman-card-accent:\s*var\(--crm-teal\)/s);
assert.match(css, /\.salesmen-card-identity-copy :is\(h3, a, span, small\)\s*\{[^}]*white-space:\s*normal/s);
assert.match(css, /\.salesmen-directory-table td\s*\{[^}]*14px\/1\.5/s);
assert.match(css, /\.salesmen-directory-content\s*\{[^}]*overflow:\s*auto/s);
assert.match(css, /\.salesmen-directory-footer\s*\{[^}]*168px/s);
assert.match(css, /@media \(max-width: 720px\)[\s\S]*min-height:\s*44px[^}]*font-size:\s*16px/s);
assert.doesNotMatch(css, /gradient\(|rgba\(|blur\(|opacity:\s*0\./);
assert.ok(html.indexOf('/crm-team.css?v=') > html.indexOf('/crm-activity.css?v='));
assert.ok(read("server.js").includes('["/crm-team.css", "crm-team.css"]'));
assert.ok(read("sw.js").includes('"/crm-team.css"'));
const config = JSON.parse(read("vercel.json"));
assert.ok(config.builds.some(item => item.src === "crm-team.css" && item.use === "@vercel/static"));
assert.ok(config.routes.some(item => item.src === "/crm-team.css" && item.dest === "/crm-team.css"));

const extract = name => {
  const source = client.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert.ok(source, `${name} must remain available`);
  return source[0];
};
const palette = { navy: "#083D77", surface: "#FEFCFD", divider: "#D7E3E8", text: "#172B4D", "text-secondary": "#475569", "health-green": "#3F7426", "health-red": "#B9363F", "health-amber": "#8A5200" };
const label = { textContent: "" };
const legend = { innerHTML: "" };
let chart;
const context = vm.createContext({
  document: { documentElement: {} },
  getComputedStyle: () => ({ getPropertyValue: name => palette[name.replace(/^--crm-/, "")] || "" }),
  els: { salesmenSummaryChart: { setAttribute() {} }, salesmenSummaryLegend: legend, salesmenConversionRate: label },
  Chart: function(canvas, configuration) { chart = configuration; this.destroy = () => {}; },
  salesmenSummaryChartInstance: null,
  percentOf: (value, total) => total ? Math.round(value / total * 100) : 0,
  escapeHtml: String
});
vm.runInContext(`${extract("crmChartColors")}\n${extract("renderSalesmenSummaryChart")}`, context);
context.rows = [
  { totalAssigned: 12, activeCustomers: 2, openLeads: 6, overdueFollowups: 7, tasksDue: 6 },
  { totalAssigned: 6, activeCustomers: 1, openLeads: 3, overdueFollowups: 2, tasksDue: 3 }
];
vm.runInContext("renderSalesmenSummaryChart(rows)", context);
assert.deepEqual(Array.from(chart.data.datasets[0].data), [3, 9, 9, 9]);
assert.deepEqual(Array.from(chart.data.datasets[0].backgroundColor), [palette["health-green"], palette.navy, palette["health-red"], palette["health-amber"]]);
assert.equal(label.textContent, "17%");
assert.match(legend.innerHTML, /Converted leads/);

const footer = { innerHTML: "", querySelectorAll: () => [], querySelector: () => null };
const pagination = vm.createContext({ els: { salesmenDirectoryPagination: footer }, state: { salesmenDirectory: { page: 1, pageSize: 5 } } });
vm.runInContext(extract("renderSalesmenPagination"), pagination);
for (const [page, expected] of [[1, "Showing 1 to 5 of 12"], [2, "Showing 6 to 10 of 12"], [3, "Showing 11 to 12 of 12"]]) {
  pagination.state.salesmenDirectory.page = page;
  vm.runInContext("renderSalesmenPagination(12)", pagination);
  assert.ok(footer.innerHTML.includes(expected));
}
console.log("PASS team presentation, shared chart palette, unchanged chart totals and pagination contracts");
