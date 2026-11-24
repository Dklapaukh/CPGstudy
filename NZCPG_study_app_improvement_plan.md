# NZCPG study app – working rules, open items and next steps

What the app does and how to run it is in `README.md`; how each feature works, and the decisions
behind it, is in its file in `docs/` (a "Decisions" list at the end); what changed and when is in
`CHANGELOG.md`. This file holds only rules, open questions, open tasks and next steps. Older
content is in the git history of this file.

Section numbers are kept because `CLAUDE.md` and code comments refer to them: 0 rules,
8 features and open items, 10 style guide, 13 where things stand.

---

## 0. How we work (rules for every session)

Publishing (push to `main`) and the `content/guidelines.js` rule are in `CLAUDE.md`.

### Token efficiency

1. **Edit with targeted replacements.** Do not re-print whole files or paste large blocks of code
   into the chat. Summarise in a few sentences.
2. **Write each fact once.** How a feature works and its decisions go in its `docs/` file; what
   changed goes in `CHANGELOG.md` (at most two lines); this file holds only rules, open
   questions and next steps. Replace stale text rather than adding to it.
3. **Verify by running checks**, not by reading code back: `npm run check` and the behaviour
   checklist in `docs/behaviour-checklist.md`.
4. **One feature per chat.** When a chat has grown long, a feature finishes or the topic changes,
   Claude says so and gives a ready-to-paste prompt for a new chat.
5. **Before ending a chat** update section 8 (open items) and 13 (where things stand), and the
   feature doc's Decisions list if a decision was made.

### Questions

6. Open questions live in 8.3. Claude asks all the ones relevant to the next step in one
   message, with the **full text of every option**, and records each answer as a decision in
   the feature doc, removing the question here.

### Code

7. All new and changed code follows the style guide (section 10). `npm run audit` measures it;
   run it before and after a tidy-up.
8. A tidy-up never changes behaviour; behaviour changes are made separately.

---

## 8. Features and open items

### 8.1 Features

| #    | Feature                                                       | State                                    |
| ---- | ------------------------------------------------------------- | ---------------------------------------- |
| 1, 2 | Last-reviewed date and overdue flag, as first planned         | Scrapped 11 Nov; replaced (list-and-settings) |
| 3    | Completion rings, overall and per section                     | Built                                    |
| 4    | Random guideline button                                       | Built                                    |
| 5    | Related guidelines and the "Guidelines to learn" queue        | Built                                    |
| 6    | Daily check of the EAS PDF and rebuild of the content from it | Built                                    |
| 7    | "Update now" prompt for new guidelines                        | Built                                    |
| 8    | Medicines quiz (flashcards, spaced repetition)                | Built                                    |
| 9    | Guideline quiz (ordering, number and course-changing questions) | Built                                    |
| 10   | Medicines quiz: practice level (ATP) filter, by medicine        | Built 16 Nov 2026 (Z17)                  |
| 11   | Medicines quiz: ATP filter by route and indication              | Built 16 Nov 2026 (Z18 to Z22)           |
| 12   | Manager view (`manager.html`): team and person statistics       | Built and live 16 Nov 2026               |
| 13   | Editor page (`editor.html`): editors change quiz questions      | Built 17 Nov 2026; live 18 Nov 2026      |
| 14   | Study streak (rat in the top bar) and Settings > Data stats     | Built 17 Nov 2026 (ST-A to ST-C)         |
| 15   | Demo on first visit and self sign-up (Make an account)          | Built and live 18 Nov 2026               |
| 16   | Gamification: "X of Y mastered" on the Medicines quiz           | Built 18 Nov 2026 (GM-A)                 |
| 17   | "Pick the guideline" quiz (sort pieces of 2 or 3 related guidelines) | Built 18 Nov 2026 (PG-A to PG-H)    |
| 18   | Medicine test (a whole medicine as multiple choice)             | Built 18 Nov 2026 (MT-A to MT-F)         |
| 19   | Scenarios: 40, filters, Finish and debrief, editor page         | Built 19 Nov 2026 (SC-A to SC-D)         |
| 20   | Reviewing scenarios on the editor page; levels each suits       | Built 24 Nov 2026 (SC-H, SC-I)           |
| 21   | Scenario generator (no AI), `docs/scenario-generator.md`        | Designed; approach A chosen (SC-K); waits for the review |
| 22   | Level benchmark scenarios and per-level "move on" sets (SC-L)  | Noted 24 Nov 2026; waits for the scenario review |

### 8.2 Decisions

Each feature's decisions are listed at the end of its doc, under the codes used in code
comments: list and queue (L to S, R4, R8) in `list-and-settings.md`; PDF and updates (D, I, T to
V, Y, R13) in `content-updates.md`; medicines quiz (E, Z1 to Z22, GM-A) in `medicines-quiz.md`;
guideline quiz (Z12 to Z16, PG-) in `guideline-quiz.md`; MT- in `medicine-test.md`; MV-, SC-G in
`manager.md`; ED-, SC-D in `editor.md`; ST- in `streak-and-stats.md`; SC- in `scenarios.md`;
SC-K in `scenario-generator.md`; C2, C4, C5 in `backend.md`.

Decisions across the whole app:

- G: separate readable files, no build step (ES modules). I: formatting, lint and tests on every
  push. J: modern JavaScript; the Apps Script project needs the V8 runtime.
- R11: secondary text #565c58, green #1a7d53, orange #b35900, base text 15 px; St John colours
  inside the guidelines unchanged. R12: no "do not enter patient details" notice (none is
  entered).
- AU-A: the manager and editor pages share `src/staffPage.js`; dark mode is in `src/theme.js`.
  Both are in `version.json` (an exception to MV-H).
- AU-C: `attachEventListeners` and `chartSvg` stay over 40 lines; splitting them would make them
  harder to follow.

### 8.3 Open decisions (owner)

1. **Decision D again: how a new PDF is published** (asked 16 Nov 2026, unanswered). The owner
   wants the app to update by itself when the guidelines change. Today a pull request opens and
   nothing reaches phones until the owner merges it; then each phone shows a banner and updates
   when "Update now" is tapped (Decision U).
2. **Feature 11: Midazolam for eclampsia at Paramedic level.** CPG 1.1 limits Paramedics to
   "seizures, acute behavioural disturbance and care during last days of life", so the card
   "Midazolam – Eclampsia – Dose" (CPG 8.4) is left out for Paramedics, because the word
   "seizures" is not in its title.
   Option A: an eclamptic seizure is a seizure: show the card to Paramedics (one entry in
   `content/practice-level-overrides.js`).
   Option B: leave it as built: Paramedics do not get the Eclampsia card.

3. **Replacing the Google Sheet backend** (asked 18 Nov 2026). The app reaches the backend only
   through `src/api.js` (one address; ten actions plus the editor ones in `backend/Code.gs`), so a move means a new
   backend, a new `BACKEND_URL` and copying the Sheet's rows; the screens stay as they are. The
   people lists (Managers, Assignments, Editors) are now edited by hand in the Sheet and would
   need another way to edit them.
   Option A: harden what exists first: store passcodes hashed in the Sheet, and limit who the
   Sheet is shared with. Smallest change; the Sheet's speed and size limits stay.
   Option B: Cloudflare Workers with a D1 database: the same nine actions rewritten as a Worker,
   passcodes hashed. Closest to today's design; the free plan does not pause when idle.
   Option C: Supabase (Postgres with sign-in and row-level security): real per-person accounts.
   Most secure, biggest rewrite; free projects pause after a week without use.

### 8.4 Open tasks (owner, by hand)

0. **Scenario editing is paused until the scenario review is finished** (owner, 25 Nov 2026,
   SC-M in `docs/editor.md`). One flag, `SCENARIO_EDITING_ENABLED = false` in
   `src/constants.js`, hides every way to change a scenario on the editor page (tap-to-edit,
   leave out, undo, delete, keep or drop, + New scenario, approving a submitted job) and the
   page refuses any save of a `scenario|<id>` edit; the levels ticked in a review are kept in the
   review only. Reviews, comments, rejecting jobs and the learners' app are unchanged. The
   backend still accepts scenario edits; the block is in the page.
   **To re-enable:** set the flag to `true` in `src/constants.js`, add a `CHANGELOG.md` line,
   run `npm run check` (the editing tests run again, the "paused" ones skip) and push to `main`.
   Levels ticked in reviews meanwhile are in `content/scenario-reviews.yaml` to apply by hand.
1. **Switch on Add a scenario and scenario trends:** redeploy the backend
   (`docs/backend.md`, "Redeploying the backend"; allow the Drive permission at `setup`). Until
   then the form and the daily copy fail ("Is it redeployed?") and the manager page shows no
   scenario trends.
2. **Email filter** on the subject "NZCPG study app:" for the report address.
3. **Delete eleven merged branches on GitHub** (checked 16 Nov 2026): `feature-6-converter`,
   `feature-6-pdf-check`, `feature-quiz`, `guideline-quiz`, `layout-and-switch-back`,
   `ordering-and-report`, `quiz-by-medicine`, `quiz-practise-medicine`, `review-items`,
   `pdf-update-test`, `test-pdf-check`. Claude's workspace cannot delete branches; use the bin
   icon on <https://github.com/Dklapaukh/CPGstudy/branches/all> (never `main`). The old
   `Mentors` tab of the Sheet can also be deleted.
4. **Morphine 14.32:** the owner is telling the guideline coordinator the PDF page is cut short.
5. **When the first real PDF update arrives:** read the "Check formatting" list in the pull
   request and run `node scripts/practice-level-review.js` on its branch before merging.
6. **If commits stop for 60 days**, GitHub pauses the daily PDF check: press "Enable workflow"
   on the Actions tab, "pdf-check".

## 10. Style guide: how all code is written

Goal: a programmer who does not know the project can read any function once and explain it.

**Names and layout**

1. Full descriptive names (`guidelineStatus`, not `st`); one-letter names only for loop counters.
2. One statement per line; lines of at most 100 characters (Prettier enforces it).
3. Descriptive CSS class names (`guideline-row`, `status-button--complete`). No styles written in
   JavaScript.
4. Named constants, not magic values: status codes, storage keys, timings, column numbers, colours.

**Structure**

5. Small functions that do one thing, normally under 30 lines.
6. Logic apart from the screen: pure functions take input and return a result, and are tested
   without a browser.
7. One state object, one way to draw. No patching the page afterwards, no polling timers for
   display changes.
8. Content is data: guideline text lives in `content/` and is never typed into code.
9. Modern JavaScript (`const`, `let`, arrow functions, modules). Never `var`.

**Comments and documentation**

10. Every file starts with a short header: its purpose and what it depends on.
11. Every function has a one-to-three line comment: what it is for, what it takes and returns.
12. Comments explain why, not what; a rule that came from a real need says so.
13. The README and `docs/` describe the app as it is now; a feature change updates its own doc. The change log gets a dated entry of at most two lines per change.

**Safety and quality**

14. No silent errors: an empty `catch` says why it is safe, or the error is shown or logged.
15. All text from outside is untrusted: escaped before it reaches the page; downloaded content is
    validated before it is published.
16. Accessibility: contrast of at least 4.5:1, tap targets of at least 44 px, a label on every
    button, status never shown by colour alone.
17. Every pure function has tests. Fixing a bug starts with a test that shows it.
18. One purpose per change.

**Apps Script (`backend/Code.gs`)**

19. One column map, one definition of the status values, a comment on every function, no waiting
    or sleeping while holding the lock, generic error messages to the app.

---

## 13. Where things stand

**Now (24 Nov 2026).** Features 1 to 20 are built and on `main`, checked by the owner on
several phones. Scenarios use complexity and scene load (SC-E) with the PEARLS debrief and score
(SC-F); editors review and comment on scenarios. Editing, adding, deleting scenarios and
approving jobs are paused until the review is finished (8.4 task 0). The
backend redeploy for Add a scenario and scenario trends is still to do (8.4 task 1).
`content/scenario-reviews.yaml` held 0 reviews on 24 Nov.

**Next.**

1. Editors review the 40 scenarios (aim 3 each, SC-J); then switch scenario editing back on
   (8.4 task 0).
2. Claude rewrites those marked Small changes or Needs rewriting and drafts the level profiles
   from the review notes.
3. Scenario generator, step 1 of `docs/scenario-generator.md` (SC-K).
4. Benchmark and per-level "move on" sets (SC-L, feature 22).

No learner-facing changes until the review is complete. Open owner questions: 8.3 items 1 to 3.

**Known gaps and possible follow-ups.** The `demo` tracker is shared by every visitor, so marks
mix (it could be read-only). No Straightforward scenario yet has Delegation or Several patients;
a score only compares well when the same mentor rates consistently. Possible: a best score for
Pick the guideline; changing its second or third guideline; scenario recommendations; adding or
removing patients of a scenario on the editor page; cropping photos in the submit form;
tap-editing an approved scenario's treatment and later vitals.
