# 07 — Mandatory code quality and human handover standard

## Goal
An independent programmer must be able to audit, understand, safely change and deploy the app without the original AI developer or this chat.

## Recommended standard
- TypeScript in `strict` mode; descriptive names and explicit types at module boundaries. Avoid `any` without written justification.
- ESLint + Prettier; predictable naming and imports; short, single-purpose functions and components.
- Feature folders: `auth`, `schools`, `observations`, `debriefs`, `guidelines`, `dashboard`, with UI, domain logic, data access and tests separated.
- Validate input and server responses; never rely on front-end checks for permissions.
- Comments explain **why** unusual logic, clinical terminology, security choices, timestamp behaviour or tradeoffs exist; avoid redundant line-by-line commentary.
- Architecture Decision Records (`docs/decisions/`) for important decisions: context, alternatives, choice, consequences.
- Database schema/migrations, RLS policy explanations, data dictionary, API contracts and change history in version control.
- Automated unit tests for timestamp/benchmark metrics, integration tests for persistence, and negative access tests for RLS; documented commands to run them.
- No dead code, duplicated competing implementations, hidden global state or undocumented generated logic.
- Keep dependencies minimal and pinned/locked; document upgrades and security implications.

## Required handover package
- `README.md`: purpose, prerequisites, quick start, commands, test and deployment process.
- `docs/ARCHITECTURE.md`: modules and data flows in plain English, including diagrams where useful.
- `docs/DATA-MODEL.md`: tables, relationships, access rules and historical versioning.
- `docs/DECISIONS/`: short rationale records.
- `docs/OPERATIONS.md`: accounts, backups, restore, incidents, configuration and updates.
- `docs/TESTING.md`: test strategy, how to reproduce known issues, what passed and what remains untested.
- `docs/CONTINUE-HERE.md`: current state, next tasks, blockers and safe handoff to next developer.
- Versioned migrations, lockfile, environment variable example with no secrets, and deployment instructions.

## Review gates
Before calling a feature finished: code passes formatting/type checks/tests; security policies are tested; critical assumptions are documented; another developer could locate and change the relevant logic; no existing functionality regresses. Prefer understandable, modest architecture over clever abstraction.

## Human-readable event logic
Document why one completion timestamp per item per job is enforced, how timestamp corrections retain their history, and how retrospective benchmarks recompute results from original events. Test these invariants.

## AI coding session standard
Follow `09-AI-TOKEN-EFFICIENCY-AND-SESSION-HANDOVER.md` for selective reading, concise updates, durable handovers, and a reasoned continue/new-chat decision after milestones.

## Automated verification and handover discipline
Apply `11-AI-DEVELOPMENT-AND-VERIFICATION.md` in every coding session. Use small, comprehensible commits, automated checks, regression coverage and a known-good rollback point. Keep agent entry files `AGENTS.md` and `CLAUDE.md` short and pointing to canonical documentation; never duplicate or diverge from the technical specification. Include simple owner acceptance instructions and document what was not tested.
