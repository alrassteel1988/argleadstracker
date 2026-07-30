# ARG Leads Tracker

## Salesman CRM Walkthrough and Demo Guide

**Application:** [https://argleadstracker.vercel.app](https://argleadstracker.vercel.app)
**Audience:** Salesmen, team leaders, trainers, and management
**Guide version:** 30 July 2026
**Recommended demo duration:** 20-30 minutes

---

## 1. Purpose of the CRM

ARG Leads Tracker gives each salesman one working place to:

- See assigned leads and overdue follow-ups.
- Decide which customer to contact next.
- Track every lead through the sales pipeline.
- Open a complete customer record before calling or visiting.
- Record calls, emails, visits, meetings, and quotation follow-ups.
- Add supporting files and voice-transcribed notes.
- Submit a structured weekly sales report.
- Use the AI Sales Assistant to prepare actions without saving anything until the salesman confirms.

The salesman account only shows records and actions allowed for that user. Organization-wide administration, other salesmen's records, and management review tools remain restricted.

---

## 2. Before the Demo

### Presenter checklist

1. Open the production application in Chrome or Edge.
2. Confirm that the internet connection is stable.
3. Sign in with a salesman account, not an administrator account.
4. Allow microphone access if voice notes or the AI Assistant will be demonstrated.
5. Use a lead with:
   - A contact name and phone number.
   - A next action and due date.
   - At least one existing activity.
   - A visible pipeline stage.
6. Do not use a real customer's confidential information in a public presentation.
7. Confirm that the sync indicator finishes before starting the demo.

### Recommended demo data

Use a lead that is safe to show and has enough information to demonstrate:

- Overview
- Activities
- Reminders
- Notes
- Pipeline stage
- Contact actions

---

## 3. Sign In and Screen Orientation

1. Go to `https://argleadstracker.vercel.app`.
2. Enter the assigned salesman email and password.
3. Select **Sign In**.
4. Wait for the Dashboard and assigned records to load.

### Main navigation

The salesman workspace normally includes:

| Area | Purpose |
| --- | --- |
| **Dashboard** | Daily priorities, assigned leads, overdue calls, due-today work, and pipeline totals |
| **Pipeline** | Search, filter, sort, and open the salesman's lead records |
| **Tasks** | Complete and submit the Weekly Sales Report |
| **Quotes** | Open the quote-related workspace available to the account |
| **Accounts** | Open the account/customer workspace available to the account |
| **Add lead** | Create a new lead when permitted |
| **AI Assistant** | Speak or type a CRM command and review the proposed action |

On mobile, the bottom navigation can provide quick access to **Home**, **Leads**, **Log**, **Map**, and **Alerts**, depending on the enabled features and permissions.

### Presenter message

> "The CRM opens on a salesman-specific dashboard. The user sees their own work queue, not the full company's records."

---

## 4. Dashboard: Start the Working Day

The Dashboard answers three questions:

1. What needs attention now?
2. Which lead should I contact next?
3. What does my pipeline currently look like?

### 4.1 Overdue follow-up alert

The alert near the top shows the number of overdue follow-ups and identifies the oldest item.

**Demo steps**

1. Point out the overdue total.
2. Select **View All** to open the related worklist.
3. Close the list and return to the Dashboard.

### 4.2 Summary cards

The three top cards are interactive:

- **My Leads**
- **Overdue Calls**
- **Due Today**

**Demo steps**

1. Select **My Leads**.
2. Explain that the popup lists the records used to calculate the displayed number.
3. Use search, filters, sorting, or pagination if records are available.
4. Select a row to open the corresponding lead.
5. Close the popup.
6. Repeat briefly with **Overdue Calls** and **Due Today**.

**Key point**

The value on each card and the records in its popup use the same CRM data. The popup is the immediate breakdown behind the number.

### 4.3 My Pipeline

The pipeline strip groups the salesman's leads by stage:

- **New**
- **Contacted**
- **Negotiation**
- **Won**

Each stage is also interactive.

**Demo steps**

1. Select **New**.
2. Show the companies contributing to the stage total.
3. Close the popup.
4. Select **Contacted** or **Negotiation** to demonstrate another stage.

### 4.4 Top 3 actions today

This panel prioritizes the next-best work:

- Overdue follow-ups
- Coverage gaps or quiet relationships
- The next upcoming action

Use the action link in each item to move directly into the relevant queue or workflow.

### 4.5 Call these next

This list is ordered by due date and urgency.

**Recommended workflow**

1. Start with the oldest overdue item.
2. Open the lead before calling.
3. Review the contact, last activity, next action, and notes.
4. Complete the call.
5. Log the result immediately.

### 4.6 Live Leads List

The Dashboard's Live Leads List provides a working table of assigned leads. Depending on available data, it can show:

- Company and contact
- Contact person
- Phone and email
- Next action
- Days overdue
- Due date
- Pipeline stage

Select a row to open the complete lead record.

### Presenter message

> "The dashboard is not just reporting. Every number and queue is a shortcut to the exact records that need action."

---

## 5. Pipeline: Find and Work a Lead

Open **Pipeline** from the sidebar.

The salesman sees the permitted Live Leads List. Admin-only organization-wide data and exports are not shown to a standard salesman account.

### 5.1 KPI cards

The Pipeline page can show:

- Open Pipeline
- Active Customers
- At Risk
- Tasks Due

Use these figures as a quick health check. The underlying calculations and visibility remain role-controlled.

### 5.2 Column filters

Filters are available directly in or above the table. Common filters include:

- Company or contact
- Next action
- Days overdue
- Due date
- Stage
- Priority
- Territory

The salesman filter is reserved for users who are allowed to view multiple salesmen.

### 5.3 Search and combined filtering

**Demo example**

1. Enter part of a company name in **Company / Contact**.
2. Select **To Call** under **Next Action**.
3. Select an overdue range if available.
4. Select a pipeline stage.
5. Explain that filters can be combined.
6. Use **Clear all filters** to return to the full permitted list.

### 5.4 Sorting and pagination

- Select a sortable column heading to change order.
- Use the page controls to move through results.
- Active filters and sorting remain applied while paging.

### 5.5 Open a lead

Select **Open** or select the row, depending on the displayed control.

### Presenter message

> "Pipeline is the salesman's searchable worklist. It replaces manual spreadsheets and keeps the next action attached to the customer record."

---

## 6. Lead Details: Prepare Before Contacting the Customer

The Lead Details screen has two main areas:

1. **AI Leads Overall Summary** on the left.
2. **Lead workspace and tabs** on the right.

### 6.1 AI Leads Overall Summary

Review:

- Current lead status
- Market intelligence
- Salesman engagement history
- Risks or attention needed
- Recommended next action
- Data gaps

Use **Refresh AI Summary** when a refreshed summary is needed. Read the generated content as assistance, not as a substitute for verified customer information.

### 6.2 Lead header

Confirm:

- Company name
- Assigned salesman
- Stage
- Territory
- Priority
- Estimated value, when available

### 6.3 Lead tabs

| Tab | Purpose |
| --- | --- |
| **Overview** | Snapshot, contacts, commercial details, location, and company information |
| **Activities** | Calls, emails, visits, meetings, and recorded follow-up history |
| **PMR** | Progress/meeting reporting linked to the lead |
| **Reminders** | Scheduled next actions and follow-up dates |
| **Intel** | Available market or enrichment information |
| **Notes** | Sales notes and supporting context |

### 6.4 Overview actions

The Overview includes:

- **Call**
- **Email**
- **Log Activity**
- **Edit Lead**

Use **Call** or **Email** when valid contact details are available. Use **Edit Lead** to correct or complete permitted lead information.

### 6.5 Contact Essentials

Before contacting a customer, confirm:

- Primary contact
- Phone number
- Email
- Website
- Assigned salesman
- Location or map link

If a value says **Not added** or uses a dash, update the lead when the correct information is known.

### 6.6 Commercial and company details

Review:

- Industry
- Product interest
- Activity purpose
- Quotation reference
- Estimated value
- Territory
- Legal or enrichment details
- Secondary contacts and notes

### Presenter message

> "Before making contact, the salesman has the full relationship history, risks, contact details, and recommended next move on one screen."

---

## 7. Add a New Lead

Use **Add lead** from the top navigation when the account has permission.

### Recommended data-entry sequence

1. Enter the company name.
2. Check for any duplicate warning.
3. Add territory and location.
4. Add the primary contact, phone, and email.
5. Select product interests using the available steel-product checkboxes.
6. Select stage and priority.
7. Set the next action and due date.
8. Add useful notes.
9. Save the lead.

### Duplicate warning

If the CRM identifies a possible duplicate:

1. Read the existing owner information.
2. Cancel if it is the same opportunity.
3. Only create a separate lead when it is genuinely a different opportunity and company policy permits it.

### Data-quality rule

Do not create a lead with only a company name. At minimum, record the known contact route, product interest, next action, and due date.

---

## 8. Log an Activity

Activities can be opened from **Log Activity**, the lead's Activities tab, or the mobile **Log** action.

### 8.1 Required activity fields

Complete:

- **Company / Lead**, when the activity was opened without a selected lead
- **Next Action Plan**
  - To Call
  - To Send Email
  - To Visit
- **Next Action Date**
- **Type / Purpose of Activity**
  - Company Introductory
  - New Requirements
  - Quotation Submission
  - Quotation Follow Up
  - Meeting

Add notes that explain the outcome and the next commitment.

### 8.2 Voice note

1. Select **Record Voice Note**.
2. Allow microphone access if prompted.
3. Speak clearly and include:
   - Customer response
   - Requirement or issue
   - Agreed next action
   - Date or timing
4. Pause, stop, or cancel as needed.
5. Review the English transcript added to Notes.
6. Correct any transcription error before saving.

Text entry remains available if voice recording is unsupported or permission is denied.

### 8.3 Attachments

Supported activity attachments:

- PNG
- PDF
- Word
- Excel

Maximum file size is **8 MB per file**.

Use **Browse files** or drag and drop files into the attachment area. Wait until the attachment status confirms completion before saving.

### 8.4 Save

Select **Save Activity**. Confirm the success message and verify that the activity appears in the lead history.

### Good activity-note example

> "Spoke with Ms. Ahmed. Customer requires 50 pieces of 100x50 RHS for August delivery. Catalogue sent by email. Follow up on 2 August to confirm quantity and request RFQ."

### Weak activity-note example

> "Called customer."

---

## 9. PMR, Reminders, Intel, and Notes

### PMR

Use PMR for structured progress or meeting reporting. Link it to an existing activity when appropriate, complete the required fields, and save. Voice notes can be recorded where enabled.

### Reminders

Use Reminders to verify upcoming and overdue follow-ups. A reminder should always have a clear next action and date.

### Intel

Review enrichment and market information cautiously. Configuration warnings or missing-source messages mean the intelligence is unavailable and should not be treated as customer-confirmed information.

### Notes

Use Notes for durable customer context that does not belong in a single activity. Keep notes professional, specific, and relevant to the sales process.

---

## 10. Weekly Sales Report

Open **Tasks**.

The salesman view is the **Weekly Sales Report** workspace.

### 10.1 Week overview

Write a specific summary covering:

- What moved forward
- What did not move
- Important calls, visits, quotations, or meetings
- Customer or market signals
- The plan for next week

Avoid filler such as "followed up with customers" without names, outcomes, or next steps.

### 10.2 Secured orders

Confirm secured orders shown by the system. If there were no secured orders, explicitly confirm that none are being reported for the week.

### 10.3 Expected orders

For every expected-order account, complete:

- Likelihood
- Timing
- What could stop the order

Required fields use a warning treatment while incomplete and a completed treatment when properly filled.

### 10.4 Problematic accounts

For flagged accounts:

1. Review the system-identified problem.
2. Record the current decision or disposition.
3. Add specific supporting detail.
4. Do not dismiss an item without a valid reason.

### 10.5 Submission status and blockers

The right side shows:

- Current report status
- Week range
- Completed checkpoints
- Completion percentage
- **Blockers to clear**
- Immutable report trail

The blocker list and field-level warning states use the same completeness rules.

### 10.6 Save draft

Select **Save draft** regularly. A draft remains editable.

### 10.7 Submit report

Before selecting **Submit report**:

1. Resolve every blocker.
2. Review the summary.
3. Verify expected-order details.
4. Verify problematic-account decisions.
5. Confirm the honesty and completeness attestation.
6. Submit the report.

Submitted or locked reports may no longer be editable until management requests a revision.

### Presenter message

> "The weekly report reuses CRM activity and account context, then requires the salesman to explain exceptions and commitments. It is not a separate spreadsheet."

---

## 11. AI Sales Assistant

The **AI Assistant** launcher is available to authenticated users, usually near the lower-right corner.

### 11.1 Open the assistant

1. Select **AI Assistant**.
2. Review the greeting and status.
3. Type a command or select **Tap to speak**.

### 11.2 Example commands

- "Show my overdue calls."
- "Show activities due today."
- "Schedule a call with Tecon tomorrow at 10 AM."
- "Prepare a quotation follow-up email for Container Solutions."

Quick-action buttons can prefill these command patterns.

### 11.3 Voice command

1. Select **Tap to speak**.
2. Allow microphone access.
3. Speak the complete command, including company, action, date, and time.
4. Stop recording.
5. Review and edit the transcript.
6. Select **Understand command**.

### 11.4 Review before saving

The assistant prepares a proposed action and displays **Review interpreted action**.

1. Confirm the correct company.
2. Check the action type.
3. Check date and time.
4. Review the notes or email draft.
5. Select **Confirm and save** only when every field is correct.
6. Select **Cancel** if the interpretation is wrong.

### 11.5 Email drafts

AI-generated email drafts are for manual review. Verify:

- Customer name
- Product or quotation reference
- Dates
- Commitments
- Tone
- Attachments mentioned

Do not send an AI draft without reviewing it.

### AI safety rule

The assistant prepares actions but does not replace the salesman's responsibility to verify customer data. Never confirm an action for the wrong company, date, or contact.

---

## 12. Quotes and Accounts

Use the **Quotes** and **Accounts** shortcuts to open the related workspace available to the account.

Typical uses include:

- Reviewing quote-related leads
- Opening the relevant lead or account
- Checking customer status
- Recording the next follow-up

Exact controls depend on the account's permissions and the enabled deployment features.

---

## 13. Mobile Walkthrough

The CRM supports mobile use with stacked content and quick navigation.

### Recommended mobile flow

1. Open **Home**.
2. Review overdue and due-today cards.
3. Select a card to open its breakdown.
4. Open **Leads** to search the pipeline.
5. Open a lead.
6. Use **Call** or **Email**.
7. Select **Log** immediately after the interaction.
8. Record a short voice note.
9. Save and confirm sync.
10. Use **Alerts** to return to urgent work.

### Mobile tips

- Rotate to landscape only when a wide table is necessary.
- Use the table's own horizontal scroll; do not zoom the whole page unnecessarily.
- Keep the browser open until uploads and sync complete.
- If microphone access is denied, enable it in the browser's site permissions or type the note.
- Use Wi-Fi for large attachments where possible.

---

## 14. Recommended Daily Salesman Routine

### Start of day

1. Sign in.
2. Review **Overdue Calls**.
3. Review **Due Today**.
4. Check **Top 3 actions today**.
5. Check the **New** pipeline stage for unqualified leads.

### After every customer interaction

1. Open the lead.
2. Log the activity.
3. Record the outcome.
4. Set the next action.
5. Set a realistic due date.
6. Update stage or priority when the situation changed.

### Midday

1. Recheck **Call these next**.
2. Clear completed actions.
3. Follow up on overdue quotation or email tasks.

### End of day

1. Confirm all calls, emails, visits, and meetings are logged.
2. Check for overdue items created by missed dates.
3. Review upcoming actions.
4. Confirm sync is complete.
5. Save the Weekly Sales Report draft when appropriate.

---

## 15. Pipeline and Priority Guidance

### Pipeline stages

| Stage | Use when |
| --- | --- |
| **New** | The lead was added but meaningful contact or qualification is not complete |
| **Contacted** | Direct contact or a meaningful response has occurred |
| **Negotiation** | Commercial discussion, quotation review, or active deal negotiation is underway |
| **Won** | The opportunity has been successfully converted |
| **Lost** | The opportunity is closed without a sale and the required loss reason is recorded |

### Priority

Use priority to represent real urgency or opportunity value. Do not mark every lead high priority; this weakens the queue.

### Due dates

A due date is a commitment. If the customer changes the timing, update the date and explain the change in an activity note.

---

## 16. Data Quality Standards

Every active lead should have:

- Correct company name
- Territory and location
- Primary contact or known contact route
- Product interest
- Pipeline stage
- Priority
- Next action
- Due date
- Recent activity note

Every activity note should answer:

1. What happened?
2. What did the customer say or request?
3. What happens next?
4. Who owns the next step?
5. When is it due?

---

## 17. Troubleshooting

### The screen shows old information

1. Wait for syncing to finish.
2. Select the available refresh control.
3. Reload the page if necessary.
4. Confirm the internet connection.

### A record does not appear

- Clear active filters.
- Check the pipeline stage.
- Confirm the lead is assigned to the signed-in salesman.
- Ask an administrator to verify ownership or permissions.

### Voice recording does not start

- Allow microphone access in browser settings.
- Check that another application is not using the microphone.
- Use Chrome or Edge.
- Type the note if voice remains unavailable.

### Voice transcript is wrong

Edit the transcript before saving. Never save customer names, quantities, or dates without checking them.

### Attachment does not upload

- Confirm the file type is PNG, PDF, Word, or Excel.
- Confirm the file is no larger than 8 MB.
- Check the connection.
- Retry with one file at a time.

### Weekly report will not submit

Read **Blockers to clear** and resolve every missing checkpoint. Confirm the attestation before submitting.

### AI Assistant cannot identify a company

Use the full company name and include the action, date, and time. If multiple matches appear, choose the correct authorized record.

### Offline or pending sync

Some activity and PMR work can remain pending for later synchronization. Keep the browser open after reconnecting and confirm the pending state clears before entering the same activity again.

---

## 18. 20-Minute Management Demo Script

| Time | Screen | Presenter action | Key message |
| --- | --- | --- | --- |
| 0:00-1:30 | Sign in / Dashboard | Sign in as a salesman | Role-based access shows only authorized work |
| 1:30-4:00 | Dashboard | Open My Leads and Overdue Calls breakdowns | Every KPI is traceable to actual records |
| 4:00-5:30 | My Pipeline | Open New and Negotiation summaries | Stage totals are interactive work queues |
| 5:30-7:30 | Pipeline | Combine company, next-action, and overdue filters | The worklist replaces manual spreadsheet filtering |
| 7:30-10:30 | Lead Details | Review AI summary, snapshot, contact essentials, and tabs | The salesman prepares with full context before contact |
| 10:30-13:00 | Add Activity | Log a follow-up, demonstrate voice transcription, add a file | Interaction outcomes are captured at the source |
| 13:00-15:30 | Weekly Report | Show required fields, blockers, progress, Save draft, and Submit | Weekly reporting is structured and tied to CRM context |
| 15:30-18:30 | AI Assistant | Type or speak a schedule-call command, review preview, cancel or confirm | AI assists but requires human confirmation |
| 18:30-20:00 | Mobile / close | Show mobile quick actions and recap | The same workflow works in the field |

### Suggested closing statement

> "ARG Leads Tracker connects daily priorities, customer history, follow-up discipline, weekly reporting, and AI-assisted actions in one role-controlled CRM. The salesman can move from a dashboard number to the exact customer record, complete the action, and document the outcome without leaving the system."

---

## 19. Trainer Assessment Checklist

A salesman is ready to use the CRM when they can:

- [ ] Sign in and explain the Dashboard.
- [ ] Open the record breakdown behind a KPI card.
- [ ] Filter and sort the Pipeline.
- [ ] Open a lead and find contact information.
- [ ] Explain the pipeline stage and next action.
- [ ] Log an activity with a useful outcome note.
- [ ] Record and review a voice transcript.
- [ ] Attach a supported file.
- [ ] Update permitted lead information.
- [ ] Complete expected-order fields.
- [ ] Save a Weekly Sales Report draft.
- [ ] Resolve report blockers and submit.
- [ ] Use the AI Assistant and review before confirming.
- [ ] Work safely on mobile.
- [ ] Confirm synchronization before closing the app.

---

## 20. One-Minute Quick Reference

1. **Dashboard:** Start with overdue and due-today work.
2. **Open the lead:** Check the customer history before contacting.
3. **Act:** Call, email, visit, or complete the planned follow-up.
4. **Log immediately:** Record outcome, next action, and date.
5. **Update the pipeline:** Keep stage and priority accurate.
6. **Check sync:** Make sure the record is saved.
7. **Weekly report:** Save drafts during the week and submit only when blockers are clear.
8. **AI Assistant:** Speak or type, review the proposed action, then confirm or cancel.
