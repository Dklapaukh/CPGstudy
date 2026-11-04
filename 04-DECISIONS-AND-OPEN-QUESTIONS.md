# 04 — Decisions and remaining implementation choices

## Confirmed
- Official product name **Your School of Paramedicine**; each mentee's editable nested framework can be named for them.
- Professional, intuitive, clean 2018–2021-era design; no detailed aesthetic specification.
- Pilot one mentor, fewer than five mentees; architecture supports multiple independent mentor groups on one Supabase project. Mentor access limited to assigned mentees; mentees see all their own records. One active mentor per mentee initially.
- One observer per job, either mentor or mentee. Completion checklist only: one timestamp per item per job, optional note button, auditable correction; no quality grades or scores.
- Job history, collaborative debrief and export of logs/notes for reflections elsewhere; no in-app reflection writing.
- NZCPG catalogue follows official broad categories and titles with medicines separate; titles and direct links only. Track discussions, Completed/Requires review (reason required)/Not reviewed per mentee; completion is not competency certification.
- Benchmarks are chosen by mentor/mentee before or after jobs, derived from retained event timestamps; missing event pairs excluded and sample size shown.
- Phone/tablet/desktop accounts and cloud persistence required. Offline is optional; online-only acceptable with visible save status and no silent data loss.
- GitHub repository: https://github.com/Dklapaukh/Mentoring ; source/docs there, real account and mentoring data in Supabase. Extract planning ZIP before uploading its contents, preserving paths. Do not publish app until ready; repository visibility and website deployment are different things.
- Plain-English beginner Supabase instructions; readable TypeScript, tests, documented rationale, GitHub Actions, verified commits, safe rollback and AI session handovers mandatory. Avoid unnecessary complexity and paid services for pilot.
- Mentee consent planned; no formal governance workflow in app, but retain essential security/privacy controls.

## Decisions needed when implementing the affected feature
1. Define exceptional record deletion, data retention/offboarding and formal correction procedures before real pilot; ordinary finalised job observations remain immutable with auditable corrections.
2. Detail exceptional mentor reassignment and account recovery/revocation behaviour; the invitation-only acceptance flow and initial roles are decided.
3. Retention, deletion, backup, export and offboarding arrangements before real data is stored.
4. Exact NZCPG catalogue source/version, link verification and update/retirement process.
5. Which start/end events define each benchmark; users choose them rather than a fixed clinical rule.

## Out of scope unless approved
Competence scoring, patient-identifiable clinical records, full NZCPG content conversion, built-in reflection editor, simultaneous observers, organisation hierarchy, global mentor dashboard, payments and complex offline conflict resolution.

## Confirmed operational decisions (November 2026)
- Initial owner: administrator and mentor. Administrator may invite mentors, but cannot automatically read unrelated mentoring records. Mentors invite mentees; invitations require verified identity and acceptance. No open privileged signup.
- Both mentor and mentee may edit the shared School and add debrief notes. Finalised observations preserve original timestamps with auditable corrections; no routine deletion control.
- UTC event times and separate save times; local-time display; server-confirmed save feedback; online-only pilot permitted.
- Documented, tested backup/restore outside public GitHub; check Supabase Free inactivity, limits and email quotas before launch.
- Full two-mentor/two-mentee isolation and end-to-end cross-device pilot tests are required.
