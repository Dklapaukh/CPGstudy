# NZCPG study app

A phone-first web app for studying the EAS clinical practice guidelines: the guidelines, a status
and notes for each, four quizzes (Medicines quiz, Guideline quiz, Medicine test, Pick the
guideline), mentor-run scenarios, a study streak, and a tracker saved in a Google Sheet. People make their own account (a passcode)
in the app; first visits open a shared demo.
Published at <https://dklapaukh.github.io/CPGstudy/>. Study aid only, not for clinical use.

A second page, the manager view, shows managers the progress of the people assigned
to them: <https://dklapaukh.github.io/CPGstudy/manager.html> (see [docs/manager.md](docs/manager.md)). A third, the
editor page, lets editors change the quiz questions:
<https://dklapaukh.github.io/CPGstudy/editor.html> (see [docs/editor.md](docs/editor.md)).

Working rules, open items and next steps are in `NZCPG_study_app_improvement_plan.md`;
each feature's decisions are at the end of its doc.

## Feature docs

How each part works, one file each in `docs/`:

- [List, marking and settings](docs/list-and-settings.md) : related guidelines, Guidelines to learn, reporting a mistake
- [Medicines quiz](docs/medicines-quiz.md)
- [Guideline quiz](docs/guideline-quiz.md): includes Pick the guideline
- [Medicine test](docs/medicine-test.md)
- [Scenarios](docs/scenarios.md): includes the debrief, reviewing scenarios and the Add a scenario form
- [Scenario generator](docs/scenario-generator.md): a design, not built
- [Streak and Data tab](docs/streak-and-stats.md)
- [Content updates](docs/content-updates.md): publishing new guidelines, the daily PDF check, rebuilding from the PDF
- [Manager view](docs/manager.md)
- [Editor page](docs/editor.md)
- [Backend, demo and sign-up](docs/backend.md): the Google Sheet backend and redeploying it
- [Behaviour checklist](docs/behaviour-checklist.md)

## Structure

| Path                                                                           | Purpose                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `index.html`, `styles/app.css`                                                 | Page shell and all styles.                                                                        |
| `src/main.js`, `src/navigation.js`, `src/events.js`                            | Start-up, screen changes, all clicks and typing.                                                  |
| `src/constants.js`                                                             | Named constants: status codes, storage keys, backend address, timings, messages.                  |
| `src/state.js`                                                                 | The one state object and saving it on the phone.                                                  |
| `src/api.js`, `src/sync.js`                                                    | Talking to the backend; queued edits and merging.                                                 |
| `src/guidelines.js`, `src/logic.js`, `src/comments.js`                         | The guideline list and lookup by id; pure logic (merge, filters, search, shared helpers).         |
| `src/markedState.js`, `src/settingsState.js`, `src/theme.js`                   | Marked dates; "mark for review after N days"; dark mode.                                          |
| `src/queue.js`, `src/queueState.js`, `src/related.js`                          | Guidelines to learn (the queue) and the related list.                                             |
| `src/quizCards.js`, `src/quizDoses.js`, `src/quizSchedule.js`                  | Medicines quiz, pure logic: cards, adult doses, spaced repetition.                                |
| `src/quizState.js`                                                             | Medicines quiz: session and saved schedules.                                                      |
| `src/guidelineQuizRounds.js`, `…Numbers.js`, `…Play.js`                        | Guideline quiz, pure logic: ordering rounds, number questions, building a play.                   |
| `src/guidelineQuizState.js`                                                    | Guideline quiz: the play in memory and saved scores.                                              |
| `src/sortQuiz.js`, `src/sortQuizState.js`                                      | Pick the guideline: pieces of 2 or 3 related guidelines, pure logic; the round in memory.         |
| `src/medicineTest.js`, `src/medicineTestState.js`                              | Medicine test: one medicine's cards as tick-all and one-of-four questions; best scores.           |
| `src/practiceLevels.js`, `content/practice-level-overrides.js`                 | Medicines quiz ATP filter: reads the 1.1 table (pure); hand-set rows for unmatched medicines.     |
| `src/streakState.js`                                                           | Study streak: the days with a finished Quiz-tab activity, saved as one extra entry.               |
| `src/report.js`                                                                | "Report a mistake or request" email.                                                              |
| `src/updates.js`, `src/updateState.js`, `version.json`                         | Update prompt: pure logic, checking and downloading, the published date and file list.            |
| `src/views/`                                                                   | One file per screen or screen part.                                                               |
| `manager.html`, `styles/manager.css`, `src/manager/`                           | The manager view: `main.js` (sign in, drawing), `stats.js` (pure sums), `view.js`, `chart.js`.    |
| `editor.html`, `styles/editor.css`, `src/editor/`                              | The editor page: `main.js` (sign in, saving), `questions.js` (every question), `view.js`.         |
| `src/staffPage.js`                                                             | What the manager and editor pages share: tab passcode, backend requests, warnings.                |
| `submit.html`, `styles/submit.css`, `src/submit/`, `src/scenarioSubmission.js` | Add a scenario form: `main.js` (photos, sending), `view.js`; checks and tidying (pure).           |
| `src/questionEdits.js`                                                         | Editors' changes to quiz questions, pure logic: applying them, finding ones to review.            |
| `content/card-edits.yaml`, `content/card-edits.js`                             | Published edits: readable record and what the app loads. Written by `sync-edits.js`.              |
| `scripts/sync-edits.js`                                                        | Copies the Sheet's Edits tab into the two files above (daily, `edits-sync.yml`).                  |
| `content/scenarios.js`, `content/scenario-edits.js` (and `.yaml`)              | Hand-written scenarios; editors' changes to them, written by `sync-edits.js`.                     |
| `src/scenarioEdits.js`, `src/scenarioLogic.js`, `src/scenarioRunState.js`      | Scenarios: applying edits; themes, filters and runs (pure); saving a run and debrief.             |
| `src/scenarioReviews.js`, `src/editor/reviewView.js`                           | Editors' reviews of scenarios: grades and report (pure); the Review card on the editor page.      |
| `src/views/scenarioView.js`, `src/views/scenarioMarkup.js`                     | Scenario screens; markup shared with the editor page (`src/editor/scenarioView.js`).              |
| `content/guidelines.js`                                                        | Guideline text as data, one guideline per line (about 1.3 MB). Built from the PDF.                |
| `content/related.js`, `content/related-overrides.js`                           | Related-guideline links (built) and the hand-edited overrides.                                    |
| `content/pdf-status.json`, `content/pdf-rebuild.json`                          | Last PDF scan; fingerprint of each rebuilt guideline. Written by scripts.                         |
| `scripts/pdfScan.js`, `scripts/check-pdf.js`                                   | Reads the PDF's export date and each guideline's newest version entry.                            |
| `scripts/pdfPages.js`, `pdfContent.js`, `pdfRows.js`, `pdfTables.js`           | Converter from the PDF to content blocks.                                                         |
| `scripts/contentCheck.js`                                                      | Refuses content with unexpected markup.                                                           |
| `scripts/contentUpdate.js`, `scripts/build-guidelines.js`                      | Merges a rebuilt PDF into `content/guidelines.js` and writes the report.                          |
| `scripts/build-related.js`                                                     | Rebuilds `content/related.js`.                                                                    |
| `scripts/audit.js`                                                             | `npm run audit`: style-guide report (headers, comments, length, copies, dead code).               |
| `scripts/practice-level-review.js`                                             | Prints what each practice level is shown in the Medicines quiz, for checking.                     |
| `scripts/guideline.js`, `scenario.js`, `lookupText.js`                         | `npm run guideline` / `npm run scenario`: print one guideline or scenario (with reviews) as text. |
| `docs/`                                                                        | How each feature works, one file each (list above).                                               |
| `backend/Code.gs`                                                              | The Google Apps Script service; linted and formatted with the app (a plain script, not a module). |
| `.github/workflows/`                                                           | `checks.yml` (every push), `pdf-check.yml` and `edits-sync.yml` (daily).                          |
| `tests/`                                                                       | `npm test`. Includes a simulated-browser run of the whole app.                                    |

## Run, check and publish

- Run locally: `npx serve .` (ES modules do not load from a file opened directly).
- Check: `npm install` once, then `npm run check` (formatting, lint, tests). GitHub runs it on
  every push. `npm run audit` reports style-guide gaps (plan section 10); errors fail it.
- Publish: GitHub Pages serves the root of `main` (publishing rules in `CLAUDE.md`).
- App code changes show no banner. Phones pick them up on a reload once GitHub Pages' cache
  (about 10 minutes) has expired.

## How data is saved

Each tracker's data is a set of entries `{ s: status, n: note, t: time of last edit }`, kept on
the phone and in the Sheet's Data tab, one row per entry. The newest `t` wins when two phones
differ. Everything beyond a guideline's status and notes is stored as an extra entry on the same
path, so new features need no backend change. Do not edit these rows by hand.

| Entry id                      | Holds (in its note)                                   | Rows per tracker |
| ----------------------------- | ----------------------------------------------------- | ---------------- |
| `<guideline id>`              | Status and the notes text                             | up to 180        |
| `marked-<guideline id>`       | When the guideline was last marked Review or Complete | up to 180        |
| `review-queue`                | The Guidelines to learn list, as JSON                 | 1                |
| `app-settings`                | "Mark for review after N days", as JSON               | 1                |
| `quiz-<medicine id>`          | That medicine's card schedules, as JSON               | up to 45         |
| `quiz-settings`               | Daily limits and practice level (ATP), as JSON        | 1                |
| `quiz-order-<guideline id>`   | Guideline quiz best and most recent score, as JSON    | up to 85         |
| `medicine-test-<medicine id>` | Medicine test best score per practice level, as JSON  | up to 45         |
| `scenario-run-<scenario id>`  | Run count and the last 3 runs with debriefs, as JSON  | one per scenario |
| `study-streak`                | The study days (last 750), as JSON                    | 1                |

The backend cuts a note at 5000 characters. A whole entry is replaced on save, so two phones
changing the same entry before syncing keep only the newer one.
