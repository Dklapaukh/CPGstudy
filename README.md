# NZCPG study app (EAS CPG Mentoring Tracker)

A phone-first web app: guidelines list, per-guideline status and notes, shared with a mentor
through a Google Sheet.

## Structure

| Path                                                          | Purpose                                                                                   |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `index.html`                                                  | Page shell. Loads the styles and `src/main.js`.                                           |
| `styles/app.css`                                              | All styles. Class names say what the element is.                                          |
| `content/guidelines.js`                                       | Guideline text as data, one guideline per line. Not edited by hand.                       |
| `src/constants.js`                                            | Named constants: status codes, storage key, backend address, timings, messages.           |
| `src/logic.js`, `src/comments.js`                             | Pure logic (merge, filters, comment lines). Tested.                                       |
| `src/queue.js`, `src/related.js`                              | Pure logic for the review queue and the related list. Tested.                             |
| `src/queueState.js`                                           | Reading and saving the review queue in the state.                                         |
| `src/quizCards.js`, `src/quizDoses.js`, `src/quizSchedule.js` | Medicines quiz, pure logic: cards and adult doses from the content, spaced repetition.    |
| `src/quizState.js`, `src/views/quizView.js`                   | Medicines quiz: saving schedules as entries, the `#quiz` screen.                          |
| `src/guidelineQuizRounds.js`, `src/guidelineQuizNumbers.js`   | Guideline quiz, pure logic: ordering rounds, distractors, marking; number questions.      |
| `src/guidelineQuizPlay.js`                                    | Guideline quiz, pure logic: course-changing questions and building one play.              |
| `src/guidelineQuizState.js`, `src/views/guidelineQuizView.js` | Guideline quiz: the play in memory, best scores as entries, the `#guideline-quiz` screen. |
| `content/related.js`, `content/related-overrides.js`          | Related-guideline links (built by script) and the hand-edited overrides.                  |
| `scripts/build-related.js`                                    | `node scripts/build-related.js` rebuilds `content/related.js`.                            |
| `src/state.js`                                                | The one state object and saving it on the phone.                                          |
| `src/updates.js`, `src/updateState.js`                        | Update prompt: pure logic (tested), and checking, downloading and tags.                   |
| `version.json`                                                | Published export date and the list of app files (read by the update prompt).              |
| `scripts/pdfScan.js`, `scripts/check-pdf.js`                  | Reads the EAS PDF: export date and newest version per guideline. Tested.                  |
| `content/pdf-status.json`                                     | Last PDF scan (fingerprint, export date, versions). Written by the script.                |
| `scripts/pdfPages.js`, `scripts/pdfContent.js`                | Converter: reads the PDF's text and shapes, and turns them into content. Tested.          |
| `scripts/pdfRows.js`, `scripts/pdfTables.js`                  | Converter parts: rows of text, and tables.                                                |
| `scripts/contentCheck.js`                                     | Refuses content with unexpected markup; lists every block shape. Tested.                  |
| `scripts/contentUpdate.js`, `scripts/build-guidelines.js`     | Merges a rebuilt PDF into `content/guidelines.js` and writes the report.                  |
| `content/pdf-rebuild.json`                                    | Fingerprint of each rebuilt guideline, and which ones are not rebuilt exactly.            |
| `.github/workflows/pdf-check.yml`                             | Daily PDF check; opens a pull request with the rebuilt content.                           |
| `src/api.js`, `src/sync.js`                                   | Talking to the backend; queued edits and merging.                                         |
| `src/views/`                                                  | One file per screen: login, mentor, list, guideline.                                      |
| `src/navigation.js`, `src/events.js`, `src/main.js`           | Screen changes, all clicks and typing, start-up.                                          |
| `backend/Code.gs`                                             | The Google Apps Script service (see "Backend").                                           |
| `tests/`                                                      | `npm test`. Includes a simulated-browser run of the whole app.                            |

## Run, check and publish

- Needs a web server: ES modules do not load from a file opened directly. Locally: `npx serve .`.
- Publishing: GitHub Pages serving the `main` branch root. The address stays the same.
- Claude commits and pushes every update straight to `main` (no branches or pull requests),
  after `npm run check` passes and with a `CHANGELOG.md` entry. See `CLAUDE.md`.
- `npm install` once, then `npm run check` (formatting, error checking, tests). GitHub runs it on
  every push.

## Related guidelines and the review queue

- `content/related.js` is built, not edited. To change a link, add a pair to `add` or `remove`
  in `content/related-overrides.js` and run `node scripts/build-related.js`. Scores and weights
  are named constants at the top of `scripts/build-related.js`. Rebuild after any change to
  `content/guidelines.js`.
- The review queue is saved as one extra entry with the id `review-queue` in the tracker's
  data (its note holds the queue as JSON). It uses the normal save and sync path, so the backend
  needs no change. It appears as a row in the Data sheet; do not edit that row by hand.

## Medicines quiz

- The list screen's "Medicines quiz" button opens `#quiz`. Cards are built from the guidelines
  every time the app starts (`src/quizCards.js`), so a content update changes them with no extra
  step. Each medicine (section "Medicines", any guideline with an Indications heading) gets one
  card for each of Indications, Contraindications, Cautions, Common adverse effects, Usual onset
  of effect, Usual duration of effect and Mechanism of action, plus adult dosage cards, asked as
  "Medicine – Indication – Dose": one per labelled dose in its own Dosage section (unlabelled
  steps stay together) and one per row of the CPG 9.3 adult RSI table that names it.
- A medicine whose Dosage section says "See the individual guideline" or is missing (Adrenaline,
  Midazolam, Morphine) gets one card per guideline that gives it an adult dose
  (`src/quizDoses.js`); guidelines with exactly the same instructions share one card. A labelled
  pointer to a named guideline ("IV for sedation post intubation: see the ‘post intubation’
  guideline") gets that guideline's doses. A dose belongs to the nearest medicine named in its
  line. The Paediatrics section, Croup and Bronchiolitis (`CHILD_ONLY_GUIDELINE_TITLES`) are
  not searched.
- Paediatric doses are never tested: lines and sentences only about a child (naming a child and
  not an adult) are removed, with the lines indented under them.
- Ratings: Again (back in a few cards), Hard, Good, Easy. Intervals follow SM-2 (named constants
  at the top of `src/quizSchedule.js`). New medicines per day: 1 to 10, default 2; each brings
  all of its cards, and a medicine started today keeps its remaining cards. Review cards per
  day: 10 to 200, default 30 (cards already studied that are due again; a card rated Again
  today always comes back).
- "Practise one medicine" (quiz screen) goes through every card of a chosen medicine, any time.
  Again brings a card back a few cards on; Got it removes it. Practice answers are not saved and
  do not change the schedule.
- Progress is saved as one extra entry per medicine, id `quiz-<guideline id>` (its note holds
  the schedules as JSON), and the two settings as `quiz-settings`. Same save and sync path as the
  guidelines, so no backend change; they follow the tracker to other phones and add up to 46
  rows per tracker to the Data sheet. Two phones rating the same medicine at once: the newest
  save wins for that medicine. Do not edit these rows by hand.
- A card keeps its schedule while its key stays the same (topic name, dose label, first
  guideline number of an indication card, or RSI row). If a dose label is reworded in a PDF update, that card starts again as new.
- If medicine names in the guidelines change, check `TABLE_NAME_OVERRIDES` in `src/quizCards.js`.

## Guideline quiz (feature 9)

- The list screen's "Guideline quiz" button opens `#guideline-quiz`. Pick a guideline (or
  Random guideline) and Start. Everything is built from `content/guidelines.js` when a play
  starts, with no AI, so a content update changes the quiz with no extra step.
- Which guidelines: those outside Medicines that have a Backup, Referral and transport or Red
  flags heading, or "action list"/"checklist" in the title (85 today). Information-only
  guidelines such as Documentation are left out.
- Ordering rounds: the top-level bullets from the start of the guideline to the first Backup,
  Referral and transport, Additional information, Red flags, Orange flags or Worsening advice
  heading. Any other heading, or a short unindented "If …"/"When …" line, starts a new situation;
  each situation with 2 or more actions is a round. Two distractors are added: actions of other
  guidelines naming a medicine the round names, then actions of related guidelines
  (`content/related.js`), never worded the same as this guideline. All cards start in "Your
  order", shuffled. A card is moved by dragging its grip (left, `src/views/dragCards.js`, pointer
  events so touch and mouse both work; only the grip drags, so the page still scrolls) or with
  its up and down arrows (right), and to "Not in this guideline" and back by dragging or with its
  button. Marking: one mark per card in the longest run
  in the right order, one per distractor put aside. After Check the guideline's order is shown
  with the lines under each action. Child-only sentences are removed from card text.
- Number questions (up to 3 a play): a value with a unit in an action line is blanked. Wrong
  choices are same-unit values (same shape: a range for a range) found anywhere in the guidelines,
  nearest first (within ten times), otherwise ten times and one tenth; half the time one choice is
  the right number with a wrong unit (`WRONG_UNITS`). Never a value in the same line. Not asked for
  Paediatrics, Croup, Bronchiolitis, child-only lines, lines for ages under 15 or the 0.9% of
  "0.9% sodium chloride". **These rules are to be reviewed** (constants at the top of
  `src/guidelineQuizNumbers.js`).
- Course-changing questions: which situation an action belongs to (up to 2), which of four is a
  red flag of this guideline (up to 2; the wrong ones are red flags of other guidelines that
  share less than 60% of their words with this guideline's flags, so check for ones that are also
  true here), and "If …, which guideline do you move to?" (up to 2). Conditions inside a sentence
  ("… if the patient is not improving") are not asked: separating them needs language
  understanding.
- Only the best score (percent and date) per guideline is saved, as one extra entry
  `quiz-order-<guideline id>`: same save and sync path, no backend change, up to 85 more rows per
  tracker in the Data sheet. Ending a play early saves nothing.

## Report a mistake or request

- A "Report a mistake or request" button is under every screen (`index.html`, `src/report.js`).
  It opens the student's email app with the subject and body filled in from what is on screen:
  the guideline; the medicines quiz card and its source; or the guideline quiz step with its
  cards or its question, choices and the app's answer (so generated questions can be checked).
- Protection, as the repository and site are public: the address is stored as two parts in
  `FEEDBACK_ADDRESS_PARTS` and joined with "@" only when the button is tapped, so it appears
  neither in the source nor in the page for address-harvesting robots (a test checks this).
  The app sends nothing itself (no form, no server), so there is nothing to flood; an email
  filter on the subject "NZCPG study app:" deals with anything else. `[]` hides the button.

## Publishing an update (feature 7)

- The app reads `version.json` on open and whenever it comes back to the foreground (at most
  once a minute). If `guidelinesExportedOn` is later than the export date in
  `content/guidelines.js` it shows "A new version of the guidelines is available. Update now."
- Tapping "Update now" downloads every file in the `files` list again, then reloads. Nothing
  reloads by itself, so a note being typed is never interrupted. Unsent edits are kept.
- After the update, each phone compares the old and new text and tags changed guidelines
  "Updated" in the list until they are opened on that phone.
- When you publish new guidelines: commit `content/guidelines.js`, the rebuilt
  `content/related.js` and `version.json` with the new date **together**. `npm run check` fails
  if the dates differ or if a file in `src/`, `src/views/`, `content/` is missing from `files`.
- App code changes alone do not show the banner (Decision T). Phones pick them up on a normal
  reload once GitHub Pages' cache (about 10 minutes) has expired.

## Checking for a new guidelines PDF (feature 6)

- Every morning a GitHub Action downloads `https://cpg.stjohn.org.nz/assets/pdf/EAS.pdf` and
  runs `node scripts/check-pdf.js`. It is a plain script with no AI: the same PDF always gives
  the same result. It reads the export date and each guideline's newest version-history entry.
- If nothing changed it does nothing. If the export date or any version entry changed, it
  rebuilds the content from the PDF (see below), rebuilds `content/related.js`, sets the date in
  `version.json`, runs `npm run check` and opens a pull request named "New EAS guidelines PDF
  (date)" with the report. Nothing in the app changes until you merge.
- One-off setup on GitHub: Settings, Actions, General, Workflow permissions, tick "Allow GitHub
  Actions to create and approve pull requests". Run it by hand from the Actions tab
  ("pdf-check", "Run workflow"). Pull requests made by the Action do not start the normal
  checks by themselves; push any commit to the branch to start them.
- To run it on your computer: install poppler (`pdftotext`), then
  `node scripts/check-pdf.js path/to/EAS.pdf report.md`.

## Rebuilding the content from the PDF

- `scripts/pdfPages.js` reads every page with MuPDF (the `mupdf` npm package, a development
  dependency only; it is AGPL-licensed and never shipped with the app). `scripts/pdfContent.js`
  turns text and shapes into blocks: coloured bands become headings, taller coloured or outlined
  boxes become boxes, chevrons become bullets, coloured squares with a letter become keys, grey
  ruled grids become tables. No AI: the same PDF always gives the same content.
- Acceptance test: `node scripts/build-guidelines.js path/to/EAS.pdf --check`. For the
  24.09.2026 PDF, 170 of 180 guidelines rebuild exactly; the other 10 (1.3, 1.26, 2.5, 3.14,
  3.15, 4.2, 5.4, 6.2, 9.7, 12.6) differ in small layout details (subscripts, numbered lists, one
  table the old content kept as text).
- Decision Y (Option 2): a guideline whose rebuilt version is the same as last time keeps its
  published text, so those 10 stay as they are until the PDF changes them. A changed guideline
  takes the converter's version and keeps its id (progress is kept). It is listed under "Check
  formatting" if it was one of the 10, or new. New guidelines go into the section of the
  guideline before them in the PDF; removed ones are dropped (their saved progress stays in the
  Sheet but is not shown). All of this is listed in the pull request.
- If you change the converter, re-record the baseline from the PDF the content came from:
  `node scripts/build-guidelines.js path/to/EAS.pdf --baseline` (otherwise every guideline
  looks changed on the next update).
- The converter only writes plain text (with `<` and `&` escaped), `<b>` and `<br>`, so content
  from the PDF cannot add markup or scripts to the app. `scripts/contentCheck.js` enforces this:
  the rebuild stops, and `npm run check` fails, if the content holds any other tag, entity,
  colour format or block shape.
- On days with no new PDF the daily run also runs `--check`, which fails (a red run) if the
  converter no longer gives the rebuild recorded in `content/pdf-rebuild.json` for that PDF.

## Content

Guideline text is put on the page as markup without escaping. That is safe because
`scripts/contentCheck.js` allows only `<b>`, `<br>`, `&lt;`, `&amp;`, hex colours and the six
known block shapes, and it runs on every rebuild from the PDF and in `npm run check`.
Search uses the plain words of each guideline (markup removed) and redraws the list 150 ms
after typing stops. A comment line in the notes starts with the first 70 characters of its
point, or more when another point of the guideline starts the same way (`src/comments.js`).
The export date and source line shown on each guideline come from `content/guidelines.js`.

## Backend (what the Apps Script does)

A small program attached to the Google Sheet. The app sends it the passcode and any edits; it
checks the passcode against the `Mentors` and `Trackers` tabs, reads or writes the `Data` tab,
and sends back this tracker's entries. To update it: Sheet, Extensions, Apps Script, paste
`backend/Code.gs`, then Deploy, Manage deployments, edit, New version. The address stays the same.
Passcodes are stored as plain text in the Sheet, so keep its sharing limited and replace the
placeholder mentor passcode created by `setup()`: the backend refuses that passcode, and the
app says to change it in the Mentors tab. The passcode is also kept in the phone's
browser and the backend address is in the page; anyone with a tracker passcode can read and
change that tracker, so keep passcodes long and unguessable.
Every request reads the whole `Data` tab, for all trackers. That is fine at the current size;
revisit it (for example one tab per tracker) at about 20,000 `Data` rows, roughly 110 full
trackers, or when a sync takes more than 3 seconds.

## Behaviour checklist (same result before and after any tidy-up)

Automated in `tests/app.test.js` unless marked "by hand".

- Sign in with a tracker passcode and a mentor passcode; a wrong passcode shows the message.
- Mentor creates a tracker and sees the new passcode; opens an existing tracker.
- List shows 14 sections and 180 guidelines with correct counts; sections stay as left (by hand).
- Filters (All, Incomplete, Needs review, Complete) and search.
- Opening a guideline shows all content; headings fold and unfold; previous and next (by hand).
- Changing status and notes saves, showing "Saving…" then "Saved".
- A guideline page has only Review and Complete (no Incomplete). Pressing either, even when
  already selected, sets the date shown on the guideline's row in the list (saved as the extra
  entry `marked-<id>`); opening the guideline or editing its notes does not change that date.
- The made-with-AI, study-only notice shows on the passcode, list and guideline screens. "Report
  a mistake or request" email links show when `FEEDBACK_EMAIL` in `src/constants.js` is set.
- Two devices on one passcode show the same data after a sync (by hand).
- Offline: changes are kept and sent when signal returns (by hand).
- Related guidelines (at most 5) show under a guideline; "Add to queue" and "Add all to queue" fill the Guidelines to learn list (at most 5); marking a queued guideline Complete or Review ticks it off; the last tick empties the list; the list screen header has a "To learn (n)" tab.
- Settings (`#settings`, a tab in the list screen header): dark mode for this phone, and "Mark guidelines for review N days after they're marked Complete" (wheel, 0 = off, up to 180), saved with the tracker as the `app-settings` entry and applied whenever a screen is drawn or new data arrives.
- Comment button adds to the notes and highlights the point.
- A later date in `version.json` shows the update banner; "Update now" downloads every file and reloads (a failed download shows a message and does not reload); a changed guideline is tagged "Updated" until opened; the list footer shows the export date, last check and study-aid notice.
- Medicines quiz: Start shows a card; Show answer reveals it; a rating saves the quiz entry; the
  new-cards-per-day setting changes the count. Layout on a phone (by hand).
- The report button is under every screen and the page holds no whole email address.
- Guideline quiz: cards move with the arrows and to and from "Not in this guideline", dragging
  by the grip works on a phone (by hand); a perfect play scores 100% and
  saves `quiz-order-<id>`; the picker shows the best score. Layout on a phone (by hand).
- Switch tracker and sign out.
