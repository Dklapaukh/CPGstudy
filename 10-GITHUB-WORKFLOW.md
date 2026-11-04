# 10 — GitHub-first development and session workflow

**Canonical repository:** https://github.com/Dklapaukh/Mentoring. The owner created it; its current files, branch and commit must still be checked, not assumed. The website is not yet published. GitHub is for code, documents, tests, migrations and progress—not for mentoring records or secrets. Supabase holds actual user data. Keep `.env.example` with placeholders and `.gitignore` for local secrets.

## First upload
Download and **extract** the latest planning ZIP. Upload the contents, not the ZIP alone, to the repository root preserving paths such as `docs/CONTINUE-HERE.md`; avoid creating an extra enclosing folder. Replace outdated files deliberately, commit, and verify their paths. If the repository already contains implementation work, inspect before overwriting. GitHub Pages deployment is a separate later step. A private source repository does not make a deployed GitHub Pages website private.

## Every coding session
1. Verify actual repository access, branch and latest commit; clone/fetch when supported, otherwise request the latest files. Do not mistake a local ZIP for a verified commit.
2. Read `START-HERE.md` and `docs/CONTINUE-HERE.md`; open other documents and source only as needed.
3. Complete one task under `State > Next` with clear acceptance criteria, focused changes and appropriate tests.
4. Update `docs/CONTINUE-HERE.md`: actual state, tests, blockers, changed files, upload/deployment/device-test status, one next task, and last known good commit SHA if verified.
5. If direct push is unavailable, provide a complete upload package, exact destination paths, plain-English upload steps and a request for owner confirmation. Do not mark files committed before verification.
6. Explain briefly whether a new chat is more token-efficient and why; if yes, provide a fully populated copyable prompt. Never sacrifice code quality, safety or testing for token savings.

## Compact continuation prompt
```text
Continue Your School of Paramedicine. Repository: https://github.com/Dklapaukh/Mentoring.
Verify branch and latest commit. Read START-HERE.md and docs/CONTINUE-HERE.md first; read other documents only as needed.
Implement State > Next, follow 10-GITHUB-WORKFLOW.md and 11-AI-DEVELOPMENT-AND-VERIFICATION.md, and run appropriate tests.
Verified upload/deployment/device status: [FILL WITH ACTUAL RESULTS].
I am non-technical: explain required manual steps in plain English.
Update handover; distinguish implemented, committed, deployed and user-tested work. Recommend continuing or starting a new chat with a reason and ready-to-copy prompt if new.
```

## Verification and rollback
Run TypeScript, lint, build and relevant tests, including separate-account Supabase RLS tests before real use. Introduce minimal GitHub Actions checks when executable code exists. Preserve identifiable last-known-good commits and provide safe rollback instructions; do not force-push. Never claim an owner device test passed without their report.
