# START HERE — Paramedic Mentoring App

Status: planning only. Updated 4 November 2026. This document pack supersedes earlier append-only versions.

## Purpose
A mentor and mentee jointly develop a personalised clinical assessment and reasoning framework ("X's School of Paramedicine"), use it for single-observer job logging, debrief, exportable notes for external reflections, and longitudinal learning, and track discussion and review of NZCPGs and medicines.

## Confirmed pilot
- One mentor and fewer than five mentees.
- Each person has their own account. Mentor can view all assigned mentees' records; mentee can view all their own records and no other mentee's records.
- Data available on authorised phones, tablets and desktops; cloud sync and secure access are required from first functional release.
- Exactly one observer records a given live job; either mentor or mentee may be observer on different jobs. Observing and giving feedback is itself a learning skill.
- The observer's job log is later available for collaborative debrief.
- NZCPG tracker mirrors current official website's broad categories, guideline titles and order; medicines are separate. Only titles and verified direct official links are needed, not full guideline text.
- Per-mentee catalogue status: Not reviewed / Completed / Requires review, with a reason when review is required; preserve review history and record discussions.
- Code must be readable, documented, tested, and transferable to a human programmer; beginner-friendly, step-by-step Supabase setup instructions are mandatory.

## Reading order
1. `01-PRODUCT-REQUIREMENTS.md` — features and boundaries.
2. `02-WORKFLOWS-AND-DATA.md` — workflows, entities, metrics.
3. `03-TECHNICAL-APPROACH.md` — implementation and privacy.
4. `04-DECISIONS-AND-OPEN-QUESTIONS.md` — decisions and genuinely unresolved questions.
5. `05-BUILD-ROADMAP.md` — phased implementation and acceptance tests.
6. `06-SUPABASE-SETUP-AND-ACCOUNT-TESTS.md` — required beginner setup guide specification.
7. `07-CODE-QUALITY-AND-HANDOVER-STANDARD.md` — mandatory code and handover conventions.
8. `08-CONSISTENCY-REVIEW.md` — decisions audit.
9. `09-AI-TOKEN-EFFICIENCY-AND-SESSION-HANDOVER.md` — tool-neutral efficient coding and new-chat decision rules.

## Instructions to future coding assistant
For a first build or architectural change, review the full specification once; for subsequent tasks, follow the targeted-reading and handover protocol in `09-AI-TOKEN-EFFICIENCY-AND-SESSION-HANDOVER.md`. Confirm remaining edit permissions and benchmark event definitions. Do not interpret proposals as approved features. Do not build simultaneous live collaboration, full guideline text conversion, patient records, AI grading, or a custom authentication server. Preserve historical data, test access policies, and deliver a repeatable human-readable deployment package. Use fictional or de-identified cases during development. Mentee consent is planned; do not impose a formal governance-review feature or phase. Maintain baseline privacy and security safeguards.

## Latest confirmed simplifications
- Live job: one observer checks an item complete, recording timestamp, with a small optional add-note button per row. No grading scale or rubric.
- No in-app reflection writing, drafts or reflection status; export job logs and debrief notes for reflection elsewhere.
- Online-only is acceptable for pilot if robust offline capture would add significant complexity; show clear save/connection status and prevent silent loss.
- Benchmark means a chosen elapsed time between explicit timestamped events, such as patient contact to primary survey complete. Mentor and mentee can define benchmarks before or after jobs; historical qualifying jobs must be included without altering original events. Exact start/end events are chosen for each benchmark.
- Consent will be obtained from mentees; no separate formal governance workflow is required in the app.

## Latest confirmed decisions
- Exactly one active completion timestamp per checklist item per job, with auditable corrections and optional notes.
- Benchmarks may be defined prospectively or retrospectively; never alter historical event records to calculate trends.

## GitHub repository as canonical build source (confirmed)
Once development starts, the owner will upload planning documents and source code to a GitHub repository. The exact repository URL must be supplied and verified; do not assume it is the Pocket Resus repository. Treat the verified GitHub repository and its latest committed files as authoritative for build state, while respecting approved requirements and documented decisions. Read `docs/CONTINUE-HERE.md` first for active work after checking this START-HERE file. If repository access is unavailable, request a ZIP or relevant files and label the source as a snapshot. Never claim to have cloned, checked or committed to GitHub without doing so. See `10-GITHUB-WORKFLOW.md`.

## Mandatory AI build and verification protocol (confirmed)
Every coding tool must follow `AGENTS.md` (and `CLAUDE.md` where applicable) and `11-AI-DEVELOPMENT-AND-VERIFICATION.md`. Use `docs/CONTINUE-HERE.md` as the live, concise task handover after development begins. Require acceptance criteria before changes, automated regression checks, a GitHub Actions check when source exists, identifiable verified commits and rollback guidance, and explicit owner phone/tablet acceptance tests. Distinguish implementation, upload, deployment, automated checks and device checks. Keep tool-neutral rules canonical; avoid default multi-agent orchestration and unnecessary complexity.
