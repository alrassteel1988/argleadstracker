const assert = require("node:assert/strict");
const { OUTCOMES, validateActivityTransaction, activityTransactionStatus, updateActivityTransaction, overdueActivityRows } = require("../src/services/activityTransactionStatus");

assert.equal(activityTransactionStatus({}), "pending");
assert.equal(activityTransactionStatus({ transaction_status: "closed" }), "closed");
assert.deepEqual(validateActivityTransaction({ status: "Pending", outcome: OUTCOMES.pending[0], remarks: "  Call again  ", next_attempt: "2026-11-01" }), {
  status: "pending", outcome: OUTCOMES.pending[0], remarks: "Call again", next_attempt: "2026-11-01"
});
assert.equal(validateActivityTransaction({ status: "closed", outcome: OUTCOMES.closed[0], remarks: "Spoke to customer" }).status, "closed");
for (const input of [
  { status: "pending", outcome: OUTCOMES.pending[0], remarks: "", next_attempt: "2026-11-01" },
  { status: "pending", outcome: OUTCOMES.closed[0], remarks: "Remark", next_attempt: "2026-11-01" },
  { status: "pending", outcome: OUTCOMES.pending[0], remarks: "Remark", next_attempt: "2026-02-30" },
  { status: "pending", outcome: OUTCOMES.pending[0], remarks: "Remark" },
  { status: "closed", outcome: OUTCOMES.closed[0], remarks: "Remark", next_attempt: "2026-11-01" },
  { status: "unknown", outcome: "", remarks: "Remark" }
]) assert.throws(() => validateActivityTransaction(input));
const rows = overdueActivityRows([{id:"lead-a", activities:[
  {id:"a", next_action_date:"2026-10-20"},
  {id:"b", next_action_date:"2026-10-21", transaction_status:"closed"},
  {id:"c", reminder:true, due_date:"2026-10-22"},
  {id:"d", next_action_date:"2026-10-28"},
  {id:"e", next_action_date:"2026-10-01", archived:true},
  {id:"g", next_action_date:"2026-10-01", deletion_status:"pending"},
  {id:"f", at:"2026-09-01"},
  {next_action_date:"2026-10-19"}
]}], "2026-10-27");
assert.deepEqual(rows.map(row => [row.activity_id, row.status]), [["", "pending"], ["a", "pending"], ["b", "closed"], ["c", "pending"]]);
assert.throws(() => overdueActivityRows([], "2026-02-30"));
const original = {id:"act-1", version:2, type:"Phone Call", text:"Original", audit_history:[{action:"created"}]};
const updated = updateActivityTransaction(original, {status:"pending",outcome:OUTCOMES.pending[0],remarks:"Call tomorrow",next_attempt:"2026-11-01"}, {id:"sales-1",name:"Alex"}, 2, "2026-10-27T10:00:00Z");
assert.equal(updated.version, 3);
assert.equal(updated.text, "Original");
assert.equal(updated.audit_history[0].actor_id, "sales-1");
assert.equal(updated.audit_history[1].action, "created");
assert.equal(original.transaction_status, undefined);
assert.throws(() => updateActivityTransaction(original, {}, {id:"sales-1"}, 1), error => error.status === 409);
assert.throws(() => updateActivityTransaction({version:1}, {}, {id:"sales-1"}, 1));
console.log("PASS activity transaction status and validation rules");
