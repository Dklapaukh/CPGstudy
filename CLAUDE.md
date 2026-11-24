# Instructions for Claude

- **Push every update straight to `main` yourself.** Do not make branches or pull requests and
  do not ask first (the owner's standing instruction, 14 Nov 2026). GitHub Pages serves `main`,
  so a push goes live. Only the daily PDF check opens a pull request, for the owner's review.
- Before each push: `npm run check` must pass (formatting, lint, tests), and add an entry of at
  most two lines at the top of `CHANGELOG.md`.
- Read only the top of `CHANGELOG.md` (the newest entries); older history is in git.
- Working rules, open questions and next steps live in `NZCPG_study_app_improvement_plan.md`
  (section 0 rules, section 8 open items, section 13 where things stand). Code follows its
  section 10.
- Feature detail is in `docs/`, one file per feature, with its decisions at the end: read only
  the one the task needs.
- Never read `content/guidelines.js` whole: it is about 1.3 MB of guideline data.
- When giving the owner options, show the full text of every option.
- Before writing or changing scenarios, read `content/scenario-reviews.yaml` (editors' grades).
