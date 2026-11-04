# 09 — AI coding efficiency and session handover (mandatory)

## Goal and scope
Use as few tokens, repeated reads and unnecessary tool calls as practical **without compromising correctness, security, tests, clinical fidelity or human maintainability**. These rules are tool-neutral: apply to ChatGPT, Claude, coding agents and other AI coding tools. Do not assume any tool has persistent memory, repository access or a particular context-window size.

## Start of each work session
1. Read `START-HERE.md` and `docs/CONTINUE-HERE.md` first (if the latter exists), then the exact files relevant to the requested task. Consult other planning documents only as needed. For first implementation or a major architectural change, review the full specification once.
2. Inspect the repository structure, working tree and relevant tests before editing. Do not repeat a full repository inventory if the handover remains accurate.
3. State in 3–6 lines: objective, affected files, risks, checks and whether to continue this chat or start a new one. If the environment is unavailable, ask for the required repository/files rather than inventing their contents.
4. Work on one coherent milestone at a time. Prefer minimal changes to existing code over rewrites; avoid unsolicited refactors, features and dependency additions.

## Efficient implementation
- Search for symbols and relevant files rather than repeatedly pasting entire source files into chat. Prefer targeted reads, diffs and test output excerpts.
- Reuse existing components, utilities and tests; do not duplicate clinical rules, security policies or data models.
- Plan briefly, implement, run focused tests, then broader checks when needed. Report concise results and failures; don't dump huge logs unless necessary for diagnosis.
- Batch closely related edits and tests when safe. Avoid excessive incremental status narration and repeated explanations.
- Preserve a single canonical specification and handover; update only documents affected by the work. Do not create multiple competing 'final' versions.
- Never economise by skipping permission checks, migration review, data integrity, timestamp tests, backup considerations or important documentation.

## Chat continuation decision — mandatory at each milestone or when context is becoming inefficient
Explicitly choose **CONTINUE CURRENT CHAT** or **START NEW CHAT** and give a one- or two-sentence reason. Consider: current chat length/noise, whether the task has changed, available context budget (if visible), repeated file reads, unresolved errors, and whether an accurate on-disk handover exists.

Prefer **START NEW CHAT** when the conversation has accumulated substantial irrelevant history, a milestone is complete, the next task is separable, or context compaction/loss is causing repeated work. Prefer **CONTINUE CURRENT CHAT** when a small follow-up depends on recent debugging context, a partially executed change is in progress, or creating a handover would cost more than finishing the task. Never assert a numerical token saving without measurement. If the tool cannot estimate token use, explain the decision qualitatively.

When recommending a new chat, **provide a complete copyable prompt** using the template below, filled with actual paths, current state, next objective and checks. Do not make the user reconstruct context. If continuing, explicitly say why a new chat is not more efficient now. Do not start a new conversation automatically or imply that chat history will transfer.

## Required durable handover after each milestone
Maintain `docs/CONTINUE-HERE.md` in the repository, concise and current:
- Project and branch/commit (if known); date; current milestone/status.
- Completed changes and exact important file paths.
- Tests run, outcomes, and any untested areas.
- Open bugs, blockers, security/data concerns and decisions pending owner approval.
- Next single recommended task and acceptance criteria.
- Commands to run locally, deployment state, and where the canonical specifications live.
- Never include passwords, API secrets, patient identifiers or unnecessary personal information.

## Copyable new-chat prompt template
```text
Continue development of the Your School of Paramedicine from the attached repository or accessible project folder.
First read START-HERE.md, docs/CONTINUE-HERE.md, and 09-AI-TOKEN-EFFICIENCY-AND-SESSION-HANDOVER.md. Read other specification and source files selectively as needed. Do not assume access to prior chat history.

Current milestone: [FILL FROM HANDOVER]
Current branch/commit: [FILL IF KNOWN]
What is complete: [FILL]
Next task: [ONE SPECIFIC TASK]
Acceptance criteria: [FILL]
Known blockers/risks: [FILL]
Tests and commands: [FILL]

Preserve existing functionality, access control, historical timestamps and human-readable code. Make minimal, well-tested changes. Update docs/CONTINUE-HERE.md at the end. Give a concise summary and explicitly recommend CONTINUE CURRENT CHAT or START NEW CHAT for the following task, with a reason. If recommending a new chat, supply the fully filled-in copyable prompt.
```

## Portability
If the coding tool cannot inspect files or execute tests, clearly distinguish proposed changes from verified results and provide exact steps for a human/tool that can. Do not depend on proprietary chat memory, tool-specific commands or hidden state for the project to remain maintainable.

## Owner-facing response format
At completion, report: what changed; files affected; tests passed/failed/not run; any user action needed in plain English; and the continuation decision with reason and (when applicable) a filled new-chat prompt. Be concise, but never hide unresolved problems.

## GitHub-first continuation (once repository exists)
At the start of each session, verify the exact GitHub repository URL, branch and latest commit. Clone or fetch when supported; otherwise ask the owner for a current export. Compare `docs/CONTINUE-HERE.md` with actual files and recent commits; repository state overrides unverified claims from prior chats. Prefer the small, task-specific prompt described in `10-GITHUB-WORKFLOW.md`. At end, update handover in the same deliverable/commit as the code, or provide explicit upload instructions and wait for the owner to confirm upload. Do not silently proceed on a stale snapshot.

## Verification takes precedence over superficial token savings
Follow `11-AI-DEVELOPMENT-AND-VERIFICATION.md` for task acceptance criteria, CI, rollback and human device checks. Prefer concise test output and targeted reads, but do not omit tests or secure access checks to save tokens. Maintain `AGENTS.md` and `CLAUDE.md` as small pointers, not copies of the whole specification.
