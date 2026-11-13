# Change log

- 2026-11-13: New dark list screen header (Spotify-like): tabs for Home, Quiz and To learn; the
  Quiz tab opens a choice of Medicines quiz or Guideline quiz; the Random guideline button is a
  round button in line with the completion ring; filters and search sit at the bottom of the
  header, just above the guidelines, which are unchanged. The review queue is now called
  "Guidelines to learn" and its buttons say "Add to queue" and "Add all to queue". 122 tests.

- 2026-11-13: Guideline quiz cards are moved with up and down arrows on the right or by dragging
  their grip (new `src/views/dragCards.js`); all cards start in "Your order". "Report a mistake or
  request" is now one button under every screen (new `src/report.js`), filled in with what is on
  screen, including the quiz step. The address is kept in two parts and only joined when tapped.
  121 tests.

- 2026-11-13: Guideline quiz (`#guideline-quiz`, button on the list screen). Pick a guideline (or
  Random guideline) and put the actions at the top of it in order, one round per situation
  (for example Severe asthma), with 2 cards from other guidelines with the same medicines or
  related guidelines to put in "Not in this guideline". Then up to 3 number questions (the number
  blanked, wrong choices from the same unit elsewhere in the guidelines or ten times, sometimes a
  wrong unit), and questions on what changes treatment: which situation an action is for, red
  flags, and which guideline to move to. All built from the content, no AI. The best score per
  guideline is saved as `quiz-order-<id>`. New `src/guidelineQuiz*.js`,
  `src/views/guidelineQuizView.js`, `tests/guidelineQuiz.test.js`. 118 tests.

- 2026-11-12: Marked dates, made-with-AI notice and feedback email. Each guideline row in the
  list shows, on the right in its status colour, the date it was last marked Review or Complete.
  The guideline page loses the Incomplete button; pressing Review or Complete (even when already
  selected) updates the date, and the line under the buttons says when it was marked. Opening a
  guideline or editing its notes does not change the date. Stored as one extra entry per
  guideline (`marked-<id>`, new `src/markedState.js`), so no backend change; guidelines marked
  before this show the time of their last edit until marked again. A small notice on the passcode,
  list and guideline screens says the app was made with AI, is for study only and that the
  official NZCPG app should be used for clinical work. "Report a mistake or request" email links
  (guideline page, pre-filled with the guideline, and list footer) appear once `FEEDBACK_EMAIL`
  in `src/constants.js` is set. 101 tests.

- 2026-11-12: Medicines quiz: "Practise one medicine" on the quiz screen. Pick any medicine and
  go through all of its cards (Show answer, then Again or Got it). Practice is separate from the
  daily study: answers are not saved and do not change when any card is due.

- 2026-11-12: Guideline page: the status buttons and notes now come after the guideline text,
  above the review queue and related guidelines. Switch tracker shows the passcode screen with
  a "‹ Back to <tracker>" link; the open tracker stays saved until another passcode is accepted
  (a wrong passcode keeps the back link). Checked: Adrenaline has 15 adult dose cards.

- 2026-11-11: Medicines quiz by medicine. New medicines per day (1 to 10, default 2) replaces
  new cards per day, and each brings all of its cards; new review limit (10 to 200, default 30).
  Paediatric doses are no longer tested (CPG 7.2 and the paediatric RSI table dropped, child-only
  lines removed). Adrenaline, Midazolam and Morphine get one adult-dose card per indication from
  the other guidelines, shared where the instructions are the same. Dose cards read
  "Medicine – Indication – Dose". New `src/quizDoses.js`. 415 cards.

- 2026-11-11: Medicines quiz (`#quiz`): 522 flashcards built from the 45 medicine guidelines
  (indications, contraindications, each dose including CPG 7.2 paediatric weight bands and CPG
  9.3 RSI rows, cautions, adverse effects, onset, duration, mechanism), rated Again / Hard /
  Good / Easy with SM-2 spaced repetition, 5 to 30 new cards a day (default 10). Progress saved
  through the backend as one entry per medicine. New files `src/quizCards.js`,
  `src/quizSchedule.js`, `src/quizState.js`, `src/views/quizView.js`, `tests/quiz.test.js`.

- 2026-11-11: Open review items. R4: a comment's snippet grows past 70 characters when another
  point of the guideline starts the same way, so each point has its own highlight (older
  comments still highlight). R8: search uses the plain words of a guideline, waits 150 ms after
  typing stops, and no longer drops a typed space or capital from the search box. R11:
  secondary text #565c58, green #1a7d53, orange #b35900 (all at least 4.5:1), base text 15 px.
  R13: `scripts/contentCheck.js` refuses unexpected markup on every rebuild and in
  `npm run check`. C4: the backend refuses the placeholder mentor passcode (redeploy
  `backend/Code.gs`). C5: size at which to revisit noted in the README. R12 (patient-information
  notice): not wanted. Converter tidy-up with no change in output: `scripts/pdfRows.js` and
  `scripts/pdfTables.js` split from `scripts/pdfContent.js`, `mergeRebuilt` split into small
  functions, named constants; `--check` and the daily run now confirm the converter still gives
  the recorded rebuild. 78 tests.
- 2026-11-11: Feature 6, stage B (Decision Y2). Converter from the EAS PDF to
  `content/guidelines.js`, no AI (`scripts/pdfPages.js`, `scripts/pdfContent.js`,
  `scripts/contentUpdate.js`, `scripts/build-guidelines.js`, 10 tests). The 24.09.2026 PDF
  rebuilds 170 of 180 guidelines exactly; unchanged guidelines keep their published text
  (`content/pdf-rebuild.json`). The daily pull request now includes the rebuilt content,
  `content/related.js` and `version.json`. Workflows moved to Node 24 actions (v5) and a fixed
  Ubuntu 24.04 image. New development dependency `mupdf`.
- 2026-11-11: Feature 6, stage A (Decision D2). Daily GitHub Action downloads the EAS PDF and
  opens a pull request when the export date or any guideline's version entry changes. New
  `scripts/pdfScan.js` (pure, 6 tests), `scripts/check-pdf.js`, `content/pdf-status.json`
  (baseline from the 24.09.2026 PDF: 180 guidelines, 156 version entries, all matching the
  content). Added `.prettierrc`, `.prettierignore` and `.gitignore`. No app change.
- 2026-11-11: Feature 7, update prompt. New `version.json` (export date and file list) is
  checked on open and on return to the app. A later export date shows a banner, "A new version
  of the guidelines is available. Update now."; tapping it re-downloads every file past the
  browser cache and reloads (not if any download fails). Changed guidelines are tagged
  "Updated" until opened, worked out on each phone from text fingerprints (own storage key
  `eas-cpg-update-v1`; saved tracker format unchanged). The list screen has a footer with the
  export date, last check and a study-aid notice. No backend change.

- 2026-11-11: Feature 5, related guidelines and review queue. Each guideline shows up to 5
  related guidelines with a reason, ranked by link score (then Incomplete, Needs review,
  Complete). "Add to review queue" and "Add all" fill a queue of at most 5, shown with
  "n of m done" on every guideline and on a Review queue screen (button on the list screen).
  Marking a queued guideline Complete or Review ticks it off; the last tick empties the queue.
  A guideline can be removed from the queue. The queue is shared by everyone with the passcode
  and needs no backend change (stored as the entry `review-queue`). Links are built offline by
  `scripts/build-related.js` into `content/related.js`; hand edits go in
  `content/related-overrides.js`. README says `npm install` (there is no lock file).
- 2026-11-11: Formatting only: re-wrapped one test line in `tests/logic.test.js` so the Prettier
  check passes. No behaviour change.
- 2026-11-11: Feature 4, "Random guideline" button on the list screen. Opens one guideline
  at once, no reason shown. Favours Incomplete (weight 6), then Needs review (3), then Complete
  (1). Draws from the one open section if exactly one is open, otherwise from all guidelines.
  No memory of earlier suggestions, so a repeat is possible.
- 2026-11-11: Section list: the `done/total` counts now line up in one right-aligned column
  (the count and ring were both pushed apart by one CSS rule; the name now takes the free space).
- 2026-11-11: Feature 3, completion rings. One overall ring and one per section: green for
  Complete, orange for Needs review, empty for Incomplete. A ring plays a short closing
  animation (tick draws, ring pops) when it newly reaches 100%; not on first load and not
  when motion is reduced. Replaces the progress bar. Backend address updated to the new
  deployment.
- 2026-11-11: Refactor steps 1 to 8, no change in what the app does. Split into `index.html`,
  `styles/`, `content/` and `src/`; descriptive names; one state object; comment highlights and
  folding headings drawn with the page (no timer or observer); backend column map, wrong-passcode
  delay moved outside the lock, edit times limited to 5 minutes ahead, generic error replies;
  automatic checks and tests.
