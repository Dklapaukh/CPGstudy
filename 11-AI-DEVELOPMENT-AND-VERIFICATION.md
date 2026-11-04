# 11 — AI development and verification protocol (mandatory)

Applies to any coding assistant and every build milestone. Prefer simple, independently verifiable work over maximum code output. See `09-AI-TOKEN-EFFICIENCY-AND-SESSION-HANDOVER.md` for context management and chat transitions.

## Definition of ready
Before editing, identify the single task in `docs/CONTINUE-HERE.md`, its dependencies, relevant files, and 2–6 observable acceptance criteria. Confirm the baseline build and existing tests where tools permit. For nontrivial changes, provide a brief implementation plan; for straightforward changes, implement directly. Ask the owner only about decisions that genuinely block safe progress. Do not substitute unapproved functionality.

## Definition of done
A feature is complete only when: (1) acceptance criteria are checked; (2) relevant unit/integration/security regression tests pass; (3) TypeScript checks, lint, and build pass where configured; (4) existing features are not knowingly broken; (5) docs and handover are updated; and (6) the owner receives simple device-based acceptance steps. Clearly label unrun checks and reasons. Do not equate code generation with verification.

## Essential regression coverage
- One observer per job; one active completion timestamp per checklist item, optional note, and auditable correction history.
- Historical observations remain unchanged when framework sections move or a benchmark is created retrospectively.
- Missing benchmark events do not produce zero-duration measurements.
- Mentor access limited to assigned mentees; each mentee can access all their own records but no other mentee's records. Verify database policies with actual separate test identities; UI hiding is insufficient.
- NZCPG tracker separates medicines, preserves verified source links and tracks Completed / Requires review with reasons.
- Cross-device persistence and clear connection/save failures. If offline support is deferred, do not silently lose edits.
Use fictional test cases only; no patient identifiers in test fixtures.

## Automated checks in GitHub Actions
When application source exists, add a small GitHub Actions workflow on pull requests and pushes to the default branch. It should install dependencies from the lockfile, run available formatting/lint, TypeScript checks, unit tests and a production build. Add integration/database policy tests when a safe isolated test environment is available; never place production service credentials in CI. Fail visibly if required checks fail. Document how to interpret a red check and how to rerun it. Avoid excessive workflows, paid services and elaborate pipelines.

## Versioning, checkpoints and rollback
- Make small, coherent commits with descriptive messages; use a feature branch and pull request for risky changes when feasible, otherwise preserve a clearly identified last-known-good commit.
- Record the verified commit SHA, deployment status, automated-test status, and owner phone/tablet test status separately. Do not call a version verified solely because it was uploaded.
- Provide beginner-friendly instructions for comparing changes and reverting to a known-good commit. Never advise force-pushing or deleting data without explaining risks and obtaining approval.
- Database schema changes require migrations, backup/rollback considerations and explicit verification; reverting code does not automatically revert database changes.

## Human acceptance test at each milestone
Provide 2–6 steps in plain English: which device/browser to use, exactly what to tap, expected result, and a short reply format such as `Phone check: PASS` or `FAIL — [what happened]`. Record the owner's result in `docs/CONTINUE-HERE.md` once received. Distinguish *not tested* from *failed*.

## Efficiency and scope control
- Prefer one scoped task at a time and selective file reads. Plan separately for architectural changes or complex permissions; do not add a separate planning phase for trivial UI edits.
- Do not deploy parallel agents by default. Only consider them if tasks are independent, verification is clear, and the coordination overhead is justified.
- Do not introduce additional frameworks, bespoke agent infrastructure or complex deployment pipelines for the small pilot without a demonstrated need.
- After a repeated failure, add a concise durable regression test or rule to the relevant canonical document, rather than lengthening every future chat prompt.

## End-of-task report (brief, mandatory)
1. What changed and which files.
2. Tests: passed / failed / not run, with reason.
3. Repository commit, upload, deployment and owner device verification statuses **separately**.
4. Exact owner action required, if any.
5. Next task from the handover.
6. CONTINUE CURRENT CHAT or START NEW CHAT, why, and a fully filled copyable prompt if starting fresh.

## Operational acceptance tests
- Add automated tests for invitation acceptance/expiry/replay, privileged role bootstrap, administrator without blanket record access, finalised-event audit corrections, UTC event versus save times, and server-confirmed save status.
- Human pilot acceptance: two mentors and two mentees; create and edit School; observe and finalise job; debrief; mark NZCPG progress; calculate historical benchmark; export; sign in on another device; simulate network loss; verify no cross-group access.
- Confirm backup restoration and free-tier operational constraints before real use; report untested conditions explicitly.
