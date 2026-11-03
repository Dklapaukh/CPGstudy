# 04 — Confirmed decisions, proposals and open questions

## Confirmed
- Product: personalised co-developed School of Paramedicine, live observation, debrief, external reflection through exports, and longitudinal progress.
- Editable nested sections, subsections, notes and ordering; version history for jobs.
- One live observer per job, either mentor or mentee. Learning to mentor/observe is part of the purpose.
- Different devices will be used; secure cross-device accounts and sync from first functional release.
- One mentor, fewer than five mentees; mentor can view all assigned mentees, mentee can view all own records and no other mentee's records.
- NZCPG catalogue mirrors official website broad categories/title ordering, with medicines separate, title and direct official link only.
- Per-mentee NZCPG statuses Not reviewed / Completed / Requires review, with reason for review and history; record guidelines discussed.
- Export job logs through device sharing/email when possible; dashboards show completion and benchmark trends. Benchmarks may be defined before or after jobs, calculated from existing timestamped events.
- Non-technical owner requires precise plain-English, step-by-step Supabase setup instructions.
- Code readability, maintainability, rationale comments, tests, architecture documentation and professional handover are non-negotiable.

- Live observations are a simple completion checklist with **one completion timestamp per item per job**, optional per-row note button, and auditable corrections; no scores, ratings or grading rubric.
- No reflection editor or draft reflections; export job logs/debrief notes for writing reflections elsewhere.
- Offline support is optional if reasonably simple; online-only is acceptable for pilot.
- NZCPG Completed is a manually selected learning-tracker status, not competence sign-off.
- Mentees will be consented and risks explained; no formal governance-review workflow is requested. Baseline security/privacy safeguards remain.

## Recommended, not yet finally selected
- Supabase Auth + Postgres + RLS; TypeScript responsive PWA hosted on GitHub Pages.
- Separate immutable observations from retrospective debrief notes; auditable corrections.
- Preserve framework snapshots, stable CPG IDs and benchmark definitions for meaningful historical analysis.
- Start with a small number of explicit, non-competitive trend measures.

## Open questions requiring decisions before relevant implementation
1. **Edit permissions:** can mentees change School items, CPG statuses and debriefs independently? Can they edit/delete finalised observations? Who can correct mistakes?
2. **Benchmark event definitions:** exact time zero and end criteria are chosen by mentor/mentee when configuring each benchmark; definitions may be prospective or retrospective. Case-mix interpretation remains a reporting consideration.
3. **Data handling:** decide retention, deletion, backup and user offboarding; consent does not replace basic privacy safeguards.
4. **CPG import:** authoritative NZCPG website edition and update frequency; handling retired/renamed guidelines; how to verify links.
5. **Mentor role:** whether only one assigned mentor exists per mentee during pilot and what happens when reassigned.

## Explicit non-decisions
No automatic clinical competence certification, patient-record system, full NZCPG conversion, AI grading, simultaneous live multi-editor, or organisation-wide rollout has been approved.
