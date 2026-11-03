# 08 — Conversation-to-specification consistency review

Reviewed: 4 November 2026. This document records a planning consistency check, not a code or live NZCPG-site audit.

## Confirmed and covered
- Collaboratively editable, reorderable School of Paramedicine with nested clinical assessment/reasoning/communication/recap items and notes.
- One observer per job, either mentor or mentee; observing and providing feedback are themselves learning activities.
- One completion timestamp per checklist item per job; compact optional note button; corrections retain provenance; no grades.
- Job timeline, debrief notes, saved logs, device sharing/email export for reflection outside the app; no reflection editor.
- Dashboard with completion trends and time benchmarks, including benchmarks defined after jobs were recorded.
- NZCPG broad categories and titles in website order, medicines separate, official links only, per-mentee completion/review statuses, reasons, discussion history.
- Mentor sees all assigned mentees; each mentee sees all own records; accounts and cloud sync across phone/tablet/desktop. Initial pilot one mentor and fewer than five mentees.
- Supabase is recommended, with novice-friendly click-by-click setup and security tests. Offline support is optional; online-only permitted with honest save-state handling.
- Maintainable, clearly annotated TypeScript, tests, architecture/decision records and independent-programmer handover.
- Mentee consent planned; no dedicated governance workflow requested; baseline privacy/security and patient de-identification remain.

## Still open; do not invent decisions
1. Specific edit/delete rights for mentee and mentor, including finalised observations and debriefs. Visibility is confirmed, editing is not.
2. Data retention, offboarding, backup/restore policy and organisational restrictions before using real staff records.
3. Precise benchmark start/end events are chosen by the pair when defining each measure, not centrally imposed now.
4. Exact NZCPG catalogue titles, category structure, medicine grouping and live URLs require verification against the official website at implementation.
5. How mentor reassignment would work if ever needed.

## Implementation caution
Do not conflate one observer per job with only one person being allowed to access the saved record. Do not conflate NZCPG completion with demonstrated clinical competence. Do not conflate consent with exemption from applicable privacy obligations.
