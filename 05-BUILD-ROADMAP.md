# 05 — Build roadmap and acceptance criteria

## Phase 0 — Planning and fictional prototype
Resolve essential edit rights; individual benchmark event definitions can be configured by mentor/mentee during use. Offline may be deferred; consent and basic privacy safeguards apply, without a formal governance-review phase. Sketch School editor, Live Job, Debrief, NZCPG tracker and Dashboard. Use fictional cases only.

## Phase 1 — Secure foundation (required, not optional)
Create TypeScript project with documented modules, lint/format/tests, responsive shell, Supabase project, versioned database migrations, authentication, mentor assignments and server-enforced RLS. Create plain-English setup manual. Test one mentor and two isolated mentee accounts across phone/tablet/desktop. Use fictional/de-identified data in development; obtain mentee consent and maintain basic privacy protections before using real mentoring records.

## Phase 2 — School and live observation
Editable nested School with versioning, single-observer job creation, timestamps, optional per-row notes, one-tap Complete checklist actions, autosave and audit-friendly corrections. Test that changing School does not rewrite older jobs; viewing items does not record actions.

## Phase 3 — Debrief and export for external reflection
Timeline and section views, retrospective comments, learning actions and device share/email/download fallbacks for writing reflections outside the app. Test de-identified exports and attribution of authorship.

## Phase 4 — NZCPG catalogue and learning tracker
Verify official site hierarchy, order, titles and direct links. Import broad guideline categories and separate medicines, no full content. Track per-mentee status, required reason for review, discussion events and follow-up history. Test catalogue updates preserve learning history.

## Phase 5 — Dashboard and pilot hardening
Job history, prospectively or retrospectively defined benchmark time trends with denominators/missing data, outstanding guideline reviews, backups/restore, permissions regression, network-error behaviour, documentation and independent developer handover. Pilot with fewer than five mentees.

## Mandatory acceptance tests
- Mentor sees assigned mentee A and B; A cannot see B, and B cannot see A, including via direct API requests.
- Mentee can access all their own records from different authorised devices; mentor can access assigned records.
- Only the designated observer creates live job entries; role can reverse on another job.
- Item view does not log an action; event and entry timestamps remain distinct; correction history survives reload.
- School version in an old job stays stable after framework edits.
- Every CPG and medicine item has a verified title and official direct link; hierarchy matches official site at chosen edition.
- Requires review cannot be saved without a reason; follow-up history survives later completion and catalogue updates.
- A job logged on phone appears on tablet/desktop without manual file transfer; failures are visible, not silent.
- Trend calculations exclude inapplicable/missing events correctly and reveal benchmark definitions. A benchmark created after jobs exist must calculate from qualifying historical event timestamps without modifying them.
- Export includes no patient identifiers in test fixtures and does not claim an email was sent.
- README, architecture, data dictionary, migrations, tests, decision records, deployment and recovery instructions are complete.

## Future coding assistant instruction
Review the canonical planning pack on initial build, then use targeted reads per `09-AI-TOKEN-EFFICIENCY-AND-SESSION-HANDOVER.md`; treat confirmed requirements as binding and open questions as unresolved. Build incrementally, test security early, explain steps to a non-technical owner, and never substitute unverified clinical source metadata. Provide upload/deployment package and a clear handover to a human programmer.

## Explicit non-features
Do not build a grading rubric, quality score, reflection-writing interface, or mandatory offline-first architecture. Test timestamp completion, note button, reliable save feedback, export and cross-device retrieval.

## Confirmed single-completion rule
Each checklist item has one active completion timestamp per job. Corrections are possible but preserve prior values and who/when/why metadata. Test repeated taps, late entry, corrections and reloads.

## Session efficiency acceptance criteria
- Every completed milestone updates `docs/CONTINUE-HERE.md` with changes, tests, blockers and next task.
- The coding assistant explicitly recommends continuing or starting a fresh chat, explains why, and provides a filled copyable prompt whenever a fresh chat is recommended.
- Token savings never override tests, access security, data integrity or maintainability.

## GitHub build workflow
At the start of implementation, verify the canonical GitHub repository and follow `10-GITHUB-WORKFLOW.md` for every milestone, including verified commit state and concise continuation prompts.

## Cross-cutting acceptance gate for every milestone
Follow `11-AI-DEVELOPMENT-AND-VERIFICATION.md`: define acceptance criteria, run focused regression tests plus available type/lint/build checks, report unverified work, provide a simple phone/tablet acceptance test, checkpoint a last-known-good commit and update `docs/CONTINUE-HERE.md`. Add a minimal GitHub Actions CI workflow as soon as executable source exists. Do not mark a milestone complete solely because files were generated or uploaded.

## Multi-mentor acceptance criteria for foundation milestone
- App is named **Your School of Paramedicine** and follows the intentionally broad 2018–2021 professional design brief.
- Database supports multiple mentors without creating separate websites or Supabase projects.
- A test Mentor A can access only Mentee A, and Mentor B can access only Mentee B. Neither mentor can access the other's mentee records, including via direct API requests or exports. Mentees can access only their own records.
- Invitation/assignment cannot be forged by an unauthorised user. No account can self-promote to a privileged cross-tenant role.
- No additional organisation administration, billing, or complicated shared-mentor functionality is introduced.

## Milestone 1 additions and pilot gate
- Bootstrap the owner as Administrator + Mentor securely; implement the minimal invitation-only Manage Mentors and mentor-to-mentee acceptance flow without public privilege escalation. Build database RLS before displaying real records.
- Test administrator can invite a second mentor but cannot read that mentor’s unrelated records. Test invitation expiry/replay, rejected or revoked assignments, direct API reads/writes and exports.
- Confirm same authorised mentor/mentee can retrieve saved data across phone/tablet/desktop. Include disconnected save failure and visible save-status tests.
- Before real pilot: document and successfully test backup/restore, confirm Supabase Free limits/inactivity behaviour, consent/retention rules and a complete fictional job → debrief → NZCPG review → benchmark → export journey.
- Do not add a broad admin dashboard, organisation hierarchy, grading, complex offline sync or extra paid infrastructure.
