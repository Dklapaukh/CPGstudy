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
At the start of implementation, establish the private canonical GitHub repository and follow `10-GITHUB-WORKFLOW.md` for every milestone, including verified commit state and concise continuation prompts.

## Cross-cutting acceptance gate for every milestone
Follow `11-AI-DEVELOPMENT-AND-VERIFICATION.md`: define acceptance criteria, run focused regression tests plus available type/lint/build checks, report unverified work, provide a simple phone/tablet acceptance test, checkpoint a last-known-good commit and update `docs/CONTINUE-HERE.md`. Add a minimal GitHub Actions CI workflow as soon as executable source exists. Do not mark a milestone complete solely because files were generated or uploaded.
