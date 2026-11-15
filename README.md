# NZCPG study app

A phone-first web app for studying the EAS clinical practice guidelines: the guidelines, a status
and notes for each, two quizzes, and a tracker shared with a mentor through a Google Sheet.
Published at <https://dklapaukh.github.io/CPGstudy/>. Study aid only, not for clinical use.

Working rules, decisions and open items are in `NZCPG_study_app_improvement_plan.md`.

## Structure

| Path                                                                 | Purpose                                                                                |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `index.html`, `styles/app.css`                                       | Page shell and all styles.                                                             |
| `src/main.js`, `src/navigation.js`, `src/events.js`                  | Start-up, screen changes, all clicks and typing.                                       |
| `src/constants.js`                                                   | Named constants: status codes, storage keys, backend address, timings, messages.       |
| `src/state.js`                                                       | The one state object and saving it on the phone.                                       |
| `src/api.js`, `src/sync.js`                                          | Talking to the backend; queued edits and merging.                                      |
| `src/guidelines.js`, `src/logic.js`, `src/comments.js`               | The guideline list; pure logic (merge, filters, search, comment lines).                |
| `src/markedState.js`, `src/settingsState.js`                         | Marked dates; dark mode and "mark for review after N days".                            |
| `src/queue.js`, `src/queueState.js`, `src/related.js`                | Guidelines to learn (the queue) and the related list.                                  |
| `src/quizCards.js`, `src/quizDoses.js`, `src/quizSchedule.js`        | Medicines quiz, pure logic: cards, adult doses, spaced repetition.                     |
| `src/quizState.js`                                                   | Medicines quiz: session and saved schedules.                                           |
| `src/guidelineQuizRounds.js`, `…Numbers.js`, `…Play.js`              | Guideline quiz, pure logic: ordering rounds, number questions, building a play.        |
| `src/guidelineQuizState.js`                                          | Guideline quiz: the play in memory and saved scores.                                   |
| `src/report.js`                                                      | "Report a mistake or request" email.                                                   |
| `src/updates.js`, `src/updateState.js`, `version.json`               | Update prompt: pure logic, checking and downloading, the published date and file list. |
| `src/views/`                                                         | One file per screen or screen part.                                                    |
| `content/guidelines.js`                                              | Guideline text as data, one guideline per line (about 1.3 MB). Built from the PDF.     |
| `content/related.js`, `content/related-overrides.js`                 | Related-guideline links (built) and the hand-edited overrides.                         |
| `content/pdf-status.json`, `content/pdf-rebuild.json`                | Last PDF scan; fingerprint of each rebuilt guideline. Written by scripts.              |
| `scripts/pdfScan.js`, `scripts/check-pdf.js`                         | Reads the PDF's export date and each guideline's newest version entry.                 |
| `scripts/pdfPages.js`, `pdfContent.js`, `pdfRows.js`, `pdfTables.js` | Converter from the PDF to content blocks.                                              |
| `scripts/contentCheck.js`                                            | Refuses content with unexpected markup.                                                |
| `scripts/contentUpdate.js`, `scripts/build-guidelines.js`            | Merges a rebuilt PDF into `content/guidelines.js` and writes the report.               |
| `scripts/build-related.js`                                           | Rebuilds `content/related.js`.                                                         |
| `backend/Code.gs`                                                    | The Google Apps Script service.                                                        |
| `.github/workflows/`                                                 | `checks.yml` (every push) and `pdf-check.yml` (daily).                                 |
| `tests/`                                                             | `npm test`. Includes a simulated-browser run of the whole app.                         |

## Run, check and publish

- Run locally: `npx serve .` (ES modules do not load from a file opened directly).
- Check: `npm install` once, then `npm run check` (formatting, lint, tests). GitHub runs it on
  every push.
- Publish: GitHub Pages serves the root of `main`. Claude pushes every update straight to `main`
  after `npm run check` passes, with a `CHANGELOG.md` entry (see `CLAUDE.md`).
- App code changes show no banner. Phones pick them up on a reload once GitHub Pages' cache
  (about 10 minutes) has expired.

## How data is saved

Each tracker's data is a set of entries `{ s: status, n: note, t: time of last edit }`, kept on
the phone and in the Sheet's Data tab, one row per entry. The newest `t` wins when two phones
differ. Everything beyond a guideline's status and notes is stored as an extra entry on the same
path, so new features need no backend change. Do not edit these rows by hand.

| Entry id                    | Holds (in its note)                                   | Rows per tracker |
| --------------------------- | ----------------------------------------------------- | ---------------- |
| `<guideline id>`            | Status and the notes text                             | up to 180        |
| `marked-<guideline id>`     | When the guideline was last marked Review or Complete | up to 180        |
| `review-queue`              | The Guidelines to learn list, as JSON                 | 1                |
| `app-settings`              | "Mark for review after N days", as JSON               | 1                |
| `quiz-<medicine id>`        | That medicine's card schedules, as JSON               | up to 45         |
| `quiz-settings`             | New medicines and review cards per day, as JSON       | 1                |
| `quiz-order-<guideline id>` | Guideline quiz best and most recent score, as JSON    | up to 85         |

The backend cuts a note at 5000 characters. A whole entry is replaced on save, so two phones
changing the same entry before syncing keep only the newer one.

## List, marking and settings

- Header: tabs Home, Quiz (Medicines quiz or Guideline quiz) and To learn; a cog opens Settings;
  a round button opens a random guideline (weights in `SUGGESTION_WEIGHT`; from the one open
  section if exactly one is open).
- A guideline page has Review and Complete (no Incomplete), plus Quiz when it has a guideline
  quiz. Pressing Review or Complete, even when already selected, sets the marked date shown on
  its list row. Opening a guideline or editing its notes does not.
- Settings: dark mode (this phone only), "Mark guidelines for review N days after they're marked
  Complete" (0 = off, up to 180; shared with the tracker), and Switch tracker.
- Search uses the plain words of each guideline and redraws the list 150 ms after typing stops.
- The 💬 button on a point adds a comment line to the notes and highlights the point. The line
  starts with the first 70 characters of the point, or more when another point of the guideline
  starts the same way (`src/comments.js`).

## Related guidelines and Guidelines to learn

- `content/related.js` is built, not edited. To change a link, add a pair to `add` or `remove`
  in `content/related-overrides.js` and run `node scripts/build-related.js`. Rebuild after any
  change to `content/guidelines.js`. Scores and weights are constants at the top of the script.
- Ranking: a guideline named in this guideline's differential diagnosis section (a top-level
  bullet under a "differential diagnosis" heading, matched to a title, its bracketed
  abbreviation, or the title without "Exacerbation of" / "Acute") comes first. Then chosen
  pairs, title mentions, shared medicines, numbering and section. At most 5 are shown.
- "Add to queue" and "Add all to queue" fill the Guidelines to learn list (at most 5, shown on
  the To learn screen). Marking a queued guideline Complete or Review ticks it off; the last
  tick empties the list.

## Medicines quiz

- Cards are built from the guidelines each time the app starts (`src/quizCards.js`), so a
  content update changes them with no extra step. Each medicine (section "Medicines", any
  guideline with an Indications heading) gets one card for each of Indications,
  Contraindications, Cautions, Common adverse effects, Usual onset of effect, Usual duration of
  effect and Mechanism of action, plus adult dosage cards written "Medicine – Indication –
  Dose": one per labelled dose in its own Dosage section (unlabelled steps stay together) and
  one per row of the CPG 9.3 adult RSI table that names it.
- A medicine whose Dosage section is missing or says "See the individual guideline"
  (Adrenaline, Midazolam, Morphine) gets one card per guideline that gives it an adult dose
  (`src/quizDoses.js`); guidelines with identical instructions share a card. A labelled pointer
  to a named guideline ("IV for sedation post intubation: see the ‘post intubation’ guideline")
  gets that guideline's doses. A dose belongs to the nearest medicine named in its line.
- Paediatric doses are never tested. The Paediatrics section, Croup and Bronchiolitis
  (`CHILD_ONLY_GUIDELINE_TITLES`) are not searched, and lines or sentences that name a child and
  not an adult are removed with the lines indented under them.
- Ratings: Again (back in a few cards), Hard, Good, Easy; intervals follow SM-2 (constants at
  the top of `src/quizSchedule.js`). New medicines per day: 1 to 10, default 2; each brings all
  of its cards. Review cards per day: 10 to 200, default 30; a card rated Again today always
  comes back.
- "Practise one medicine" goes through every card of a chosen medicine. Nothing is saved and the
  schedule does not change.
- A card keeps its schedule while its key stays the same (topic name, dose label, first
  guideline number of an indication card, or RSI row). A dose label reworded in a PDF update
  starts that card again as new.
- If medicine names in the guidelines change, check `TABLE_NAME_OVERRIDES` in
  `src/quizCards.js`.

## Guideline quiz

- Opened from the Quiz tab (pick a guideline or Random guideline) or from a guideline's Quiz
  pill. From the pill, "Back to the guideline" returns to the same scroll position and unfolded
  headings. Everything is built from `content/guidelines.js` when a play starts, with no AI.
- Which guidelines: those outside Medicines with a Backup, Referral and transport or Red flags
  heading, or "action list" / "checklist" in the title (85 today).
- Ordering rounds: the top-level bullets from the start of the guideline to the first Backup,
  Referral and transport, Additional information, Red flags, Orange flags or Worsening advice
  heading. Any other heading, or a short unindented "If …" / "When …" line, starts a new
  situation; each situation with 2 or more actions is a round. Two distractors are added:
  actions of other guidelines naming a medicine the round names, then actions of related
  guidelines, never worded the same as this guideline. Cards are moved by dragging the grip
  (`src/views/dragCards.js`) or with the arrows, and to "Not in this guideline" and back.
  Marking: one mark per card in the longest run in the right order, one per distractor put
  aside. Child-only sentences are removed from card text.
- Number questions (up to 3 a play): a value with a unit in an action line is blanked. Wrong
  choices are same-unit values of the same shape from anywhere in the guidelines, nearest first
  (within ten times), otherwise ten times and one tenth; half the time one choice is the right
  number with a wrong unit (`WRONG_UNITS`). Never a value from the same line. Not asked for
  Paediatrics, Croup, Bronchiolitis, child-only lines, lines for ages under 15 or the 0.9% of
  "0.9% sodium chloride". Constants are at the top of `src/guidelineQuizNumbers.js`.
- Course-changing questions (up to 2 of each): which situation an action belongs to; which of
  four is a red flag of this guideline (the wrong ones are red flags of other guidelines sharing
  less than 60% of their words with this guideline's flags, so some may also be true here);
  and "If …, which guideline do you move to?". Conditions inside a sentence are not asked.
- Finishing a play saves its score as the most recent, and as the best if it is. Ending early
  saves nothing. Starting a play shows both; the list row shows the most recent.

## Report a mistake or request

- A button under every screen, and in the comment panel for one point (`src/report.js`), opens
  the student's email app with the subject and body filled in from what is on screen, including
  a quiz question with its choices and the app's answer.
- The repository and site are public, so the address is stored as two parts in
  `FEEDBACK_ADDRESS_PARTS` and joined only when the button is tapped (a test checks the page
  holds no whole address). The app sends nothing itself. `[]` hides the button. Filter email on
  the subject "NZCPG study app:".

## Publishing new guidelines

- The app reads `version.json` on open and on return to the foreground (at most once a minute).
  If `guidelinesExportedOn` is later than the export date in `content/guidelines.js` it shows
  "A new version of the guidelines is available. Update now."
- "Update now" downloads every file in the `files` list again, then reloads. If any download
  fails it shows a message and does not reload. Nothing reloads by itself. Unsent edits are kept.
- After the update each phone compares the old and new text and tags changed guidelines
  "Updated" until they are opened on that phone.
- Commit `content/guidelines.js`, the rebuilt `content/related.js` and `version.json` with the
  new date **together**. `npm run check` fails if the dates differ or a file in `src/`,
  `src/views/` or `content/` is missing from `files`.

## Daily check for a new guidelines PDF

- Every morning a GitHub Action downloads `https://cpg.stjohn.org.nz/assets/pdf/EAS.pdf` and
  runs `node scripts/check-pdf.js`: a plain script, no AI, so the same PDF always gives the same
  result. It reads the export date and each guideline's newest version-history entry.
- If either changed, it rebuilds the content (below), rebuilds `content/related.js`, sets the
  date in `version.json`, runs `npm run check` and opens a pull request "New EAS guidelines PDF
  (date)" with the report. Nothing in the app changes until the pull request is merged.
- If nothing changed, it runs `--check`, which fails (a red run) if the converter no longer
  gives the rebuild recorded in `content/pdf-rebuild.json`.
- One-off setup: Settings, Actions, General, Workflow permissions, tick "Allow GitHub Actions to
  create and approve pull requests". Run by hand: Actions tab, "pdf-check", "Run workflow".
- It skips a PDF only while a pull request for it is open. A leftover branch with no open pull
  request is deleted and built again, so closing a pull request without merging brings a new
  one the next morning. The pull request is assigned to the repository owner.
- Test run: Actions tab, "pdf-check", "Run workflow", tick "Test run" (or push a branch named `test-pdf-check`). It treats today's PDF as new and opens a pull request named
  "TEST" from the branch `pdf-update-test`. Its "Files changed" should be empty. Close it and
  delete the branch.
- GitHub pauses scheduled workflows after 60 days without a commit: press "Enable workflow" on
  the Actions tab.
- Pull requests made by the Action do not start the normal checks; push any commit to the
  branch to start them.
- On your computer: install poppler (`pdftotext`), then
  `node scripts/check-pdf.js path/to/EAS.pdf report.md`.

## Rebuilding the content from the PDF

- `scripts/pdfPages.js` reads every page with MuPDF (`mupdf`, a development dependency only;
  AGPL-licensed, never shipped with the app). `scripts/pdfContent.js` turns text and shapes into
  blocks: coloured bands become headings, taller coloured or outlined boxes become boxes,
  chevrons become bullets, coloured squares with a letter become keys, grey ruled grids become
  tables.
- Acceptance test: `node scripts/build-guidelines.js path/to/EAS.pdf --check`. For the
  24.09.2026 PDF, 170 of 180 guidelines rebuild exactly; the other 10 (1.3, 1.26, 2.5, 3.14,
  3.15, 4.2, 5.4, 6.2, 9.7, 12.6) differ in small layout details.
- A guideline whose rebuild is the same as last time keeps its published text, so those 10 stay
  as they are until the PDF changes them. A changed guideline takes the converter's version and
  keeps its id, so progress is kept; it is listed under "Check formatting" if it is new or one
  of the 10. New guidelines go into the section of the guideline before them in the PDF.
  Removed ones are dropped: their progress stays in the Sheet but is not shown, and a renumbered
  guideline counts as one removed and one new.
- After changing the converter, re-record the baseline from the PDF the content came from:
  `node scripts/build-guidelines.js path/to/EAS.pdf --baseline`. Otherwise every guideline looks
  changed on the next update.
- Guideline text is put on the page as markup without escaping. That is safe because the
  converter writes only escaped text, `<b>` and `<br>`, and `scripts/contentCheck.js` stops the
  rebuild and fails `npm run check` on any other tag, entity, colour format or block shape.

## Backend

A small Apps Script program attached to the Google Sheet. The app sends it the passcode and any
edits; it checks the passcode against the `Mentors` and `Trackers` tabs, reads or writes the
`Data` tab, and sends back this tracker's entries.

- Update it: Sheet, Extensions, Apps Script, paste `backend/Code.gs`, then Deploy, Manage
  deployments, edit, New version. The address stays the same. Needs the V8 runtime.
- Passcodes are plain text in the Sheet, so keep its sharing limited. Replace the placeholder
  mentor passcode created by `setup()`; the backend refuses it.
- The passcode is also kept in the phone's browser and the backend address is in the page.
  Anyone with a tracker passcode can read and change that tracker, so keep passcodes long.
- Every request reads the whole `Data` tab. Revisit that (for example one tab per tracker) at
  about 20,000 rows, roughly 40 full trackers, or when a sync takes more than 3 seconds.

## Behaviour checklist

The same result is expected before and after any tidy-up. Automated in `tests/app.test.js`
unless marked "by hand".

- Sign in with a tracker passcode and a mentor passcode; a wrong passcode shows the message.
- Mentor creates a tracker and sees the new passcode; opens an existing tracker; signs out.
- List shows 14 sections and 180 guidelines with correct counts; sections stay as left (by hand).
- Filters (All, Incomplete, Needs review, Complete) and search.
- Opening a guideline shows all content; headings fold and unfold; previous and next (by hand).
- Changing status and notes saves, showing "Saving…" then "Saved".
- Review or Complete sets the marked date on the list row; opening or editing notes does not.
- The made-with-AI, study-only notice shows on the passcode, list and guideline screens.
- The report button is under every screen and the page holds no whole email address.
- Two phones on one passcode show the same data after a sync (by hand).
- Offline: changes are kept and sent when signal returns (by hand).
- Related guidelines (at most 5) show under a guideline; Add to queue, Add all to queue, ticking
  off and emptying work; the header has a "To learn (n)" tab.
- Settings: dark mode; the review-after-days wheel saves `app-settings` and is applied when a
  screen is drawn or new data arrives; Switch tracker.
- Comment button adds to the notes and highlights the point.
- A later date in `version.json` shows the banner; "Update now" downloads every file and
  reloads (a failed download shows a message and does not reload); a changed guideline is
  tagged "Updated" until opened; the list footer shows the export date, last check and notice.
- Medicines quiz: Start shows a card; Show answer reveals it; a rating saves the quiz entry; the
  new-medicines setting changes the count. Layout on a phone (by hand).
- Guideline quiz: cards move with the arrows and to and from "Not in this guideline"; dragging
  by the grip on a phone (by hand); a perfect play scores 100% and saves `quiz-order-<id>`; the
  picker shows the best score, a new play shows best and most recent, the list row the most
  recent; the Quiz pill opens the quiz and "Back to the guideline" returns to the same place;
  guidelines with no quiz have no pill. Layout on a phone (by hand).
