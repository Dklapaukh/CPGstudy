# 10 — GitHub-first build workflow and compact prompts (mandatory once building starts)

## Confirmed owner workflow
The owner will upload all planning documents and subsequent build files to a GitHub repository. Repository URL is **not yet provided**; request it before using it. Never confuse this repository with Pocket Resus. The repository is the canonical versioned record for code, documentation, migrations and current build progress. No AI tool may assume it has GitHub access.

## One-time repository setup
1. Explain to the owner, in plain English, how to create a **private** repository and upload the planning files, preserving folder paths.
2. Include `START-HERE.md` at the repository root and maintain `docs/CONTINUE-HERE.md` as the short, authoritative live handover. Keep numbered planning documents in a documented location; update paths in START-HERE if moved.
3. Confirm the URL, default branch, latest commit and that required files are present. Do not say uploaded until verified.
4. Explain how to upload replacements and commit changes through the GitHub website if the coding tool cannot push. Never put Supabase service-role keys, secrets, personal data or patient information in GitHub. Provide `.env.example` with placeholders and `.gitignore` for secrets.

## Every coding session
1. Confirm repository and branch; clone/fetch latest code if supported. If not, request current ZIP/files.
2. Read `START-HERE.md` and `docs/CONTINUE-HERE.md` first; read other numbered documents and code only as relevant. Verify handover claims against actual code/tests and recent commits.
3. Work only on the task under `State > Next`, unless the owner specifies otherwise; preserve confirmed requirements.
4. Implement focused changes, test, and update `docs/CONTINUE-HERE.md` including commit/branch (if known), verified state, files changed, tests, blockers, upload status and one next task.
5. If direct GitHub push is unavailable, provide a complete upload package and exact file paths and upload instructions. Ask the owner to confirm upload and any device test result. Do not treat unuploaded code as canonical.
6. Explain in 1–2 sentences whether a fresh chat is more efficient. If yes, give a fully filled copyable next-chat prompt; if no, explain why staying retains useful context.

## Recommended handover shape
Use headings `State`, `Completed`, `Verified tests`, `Pending upload/device check`, `Known issues`, `Next`, `Relevant files`, and `Owner actions`. Under `State > Next`, identify one specific task with acceptance criteria. Distinguish code produced, code committed, deployed code, and device-verified code. Do not claim a phone test passed without the owner's report.

## Compact continuation prompt template
```text
Continue the Paramedic Mentoring App. Repository: [VERIFIED GITHUB URL].
Clone/fetch [BRANCH] and check the latest commit. Read `START-HERE.md` and `docs/CONTINUE-HERE.md` first; read other numbered documents and source files only when needed.
Do the task under `State > Next`. Follow the end-of-task routine in `10-GITHUB-WORKFLOW.md` and the code quality and token efficiency standards.
Verified status: [ACTUAL UPLOAD / DEPLOYMENT / DEVICE TEST RESULT].
Next task: [ONE TASK].
I am non-technical; give exact plain-English steps for any manual actions.
At the end, update handover, report tests, provide upload instructions if needed, and say whether to continue this chat or start a new one, with reasons and a copyable prompt if new.
```

## Limits and safety
GitHub is a source of truth only for committed content. A local change not yet uploaded is a separate working copy. Verify version consistency before modifying database migrations or deployment files. GitHub Pages is public hosting even when source access is restricted; never expose secrets in browser code. Prefer concise diffs and focused test results to full-file dumps, but never skip security, tests or maintainable documentation to save tokens.

## Continuous integration and verified checkpoints
Once application source exists, implement the minimal GitHub Actions checks defined in `11-AI-DEVELOPMENT-AND-VERIFICATION.md`. Record a last-known-good commit SHA, GitHub upload status, deployment status, automated-test status and owner device-check status independently in `docs/CONTINUE-HERE.md`. Provide safe, plain-English rollback steps and avoid force pushes.
