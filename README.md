# NZCPG study app

A phone-first web app for studying the EAS clinical practice guidelines: the guidelines, a status
and notes for each, two quizzes, and a tracker saved in a Google Sheet. People make their own account (a passcode)
in the app; first visits open a shared demo.
Published at <https://dklapaukh.github.io/CPGstudy/>. Study aid only, not for clinical use.

A second page, the manager view, shows managers the progress of the people assigned
to them: <https://dklapaukh.github.io/CPGstudy/manager.html> (see "Manager view"). A third, the
editor page, lets editors change the quiz questions:
<https://dklapaukh.github.io/CPGstudy/editor.html> (see "Editor page").

Working rules, decisions and open items are in `NZCPG_study_app_improvement_plan.md`.

## Structure

| Path                                                                           | Purpose                                                                                        |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `index.html`, `styles/app.css`                                                 | Page shell and all styles.                                                                     |
| `src/main.js`, `src/navigation.js`, `src/events.js`                            | Start-up, screen changes, all clicks and typing.                                               |
| `src/constants.js`                                                             | Named constants: status codes, storage keys, backend address, timings, messages.               |
| `src/state.js`                                                                 | The one state object and saving it on the phone.                                               |
| `src/api.js`, `src/sync.js`                                                    | Talking to the backend; queued edits and merging.                                              |
| `src/guidelines.js`, `src/logic.js`, `src/comments.js`                         | The guideline list and lookup by id; pure logic (merge, filters, search, shared helpers).      |
| `src/markedState.js`, `src/settingsState.js`, `src/theme.js`                   | Marked dates; "mark for review after N days"; dark mode.                                       |
| `src/queue.js`, `src/queueState.js`, `src/related.js`                          | Guidelines to learn (the queue) and the related list.                                          |
| `src/quizCards.js`, `src/quizDoses.js`, `src/quizSchedule.js`                  | Medicines quiz, pure logic: cards, adult doses, spaced repetition.                             |
| `src/quizState.js`                                                             | Medicines quiz: session and saved schedules.                                                   |
| `src/guidelineQuizRounds.js`, `…Numbers.js`, `…Play.js`                        | Guideline quiz, pure logic: ordering rounds, number questions, building a play.                |
| `src/guidelineQuizState.js`                                                    | Guideline quiz: the play in memory and saved scores.                                           |
| `src/sortQuiz.js`, `src/sortQuizState.js`                                      | Pick the guideline: pieces of 2 or 3 related guidelines, pure logic; the round in memory.      |
| `src/medicineTest.js`, `src/medicineTestState.js`                              | Medicine test: one medicine's cards as tick-all and one-of-four questions; best scores.        |
| `src/report.js`                                                                | "Report a mistake or request" email.                                                           |
| `src/updates.js`, `src/updateState.js`, `version.json`                         | Update prompt: pure logic, checking and downloading, the published date and file list.         |
| `src/views/`                                                                   | One file per screen or screen part.                                                            |
| `manager.html`, `styles/manager.css`, `src/manager/`                           | The manager view: `main.js` (sign in, drawing), `stats.js` (pure sums), `view.js`, `chart.js`. |
| `editor.html`, `styles/editor.css`, `src/editor/`                              | The editor page: `main.js` (sign in, saving), `questions.js` (every question), `view.js`.      |
| `src/staffPage.js`                                                             | What the manager and editor pages share: tab passcode, backend requests, warnings.             |
| `submit.html`, `styles/submit.css`, `src/submit/`, `src/scenarioSubmission.js` | Add a scenario form: `main.js` (photos, sending), `view.js`; checks and tidying (pure).        |
| `src/questionEdits.js`                                                         | Editors' changes to quiz questions, pure logic: applying them, finding ones to review.         |
| `content/card-edits.yaml`, `content/card-edits.js`                             | Published edits: readable record and what the app loads. Written by `sync-edits.js`.           |
| `scripts/sync-edits.js`                                                        | Copies the Sheet's Edits tab into the two files above (daily, `edits-sync.yml`).               |
| `content/scenarios.js`, `content/scenario-edits.js` (and `.yaml`)              | Hand-written scenarios; editors' changes to them, written by `sync-edits.js`.                  |
| `src/scenarioEdits.js`, `src/scenarioLogic.js`, `src/scenarioRunState.js`      | Scenarios: applying edits; themes, filters and runs (pure); saving a run and debrief.          |
| `src/views/scenarioView.js`, `src/views/scenarioMarkup.js`                     | Scenario screens; markup shared with the editor page (`src/editor/scenarioView.js`).           |
| `content/guidelines.js`                                                        | Guideline text as data, one guideline per line (about 1.3 MB). Built from the PDF.             |
| `content/related.js`, `content/related-overrides.js`                           | Related-guideline links (built) and the hand-edited overrides.                                 |
| `content/pdf-status.json`, `content/pdf-rebuild.json`                          | Last PDF scan; fingerprint of each rebuilt guideline. Written by scripts.                      |
| `scripts/pdfScan.js`, `scripts/check-pdf.js`                                   | Reads the PDF's export date and each guideline's newest version entry.                         |
| `scripts/pdfPages.js`, `pdfContent.js`, `pdfRows.js`, `pdfTables.js`           | Converter from the PDF to content blocks.                                                      |
| `scripts/contentCheck.js`                                                      | Refuses content with unexpected markup.                                                        |
| `scripts/contentUpdate.js`, `scripts/build-guidelines.js`                      | Merges a rebuilt PDF into `content/guidelines.js` and writes the report.                       |
| `scripts/build-related.js`                                                     | Rebuilds `content/related.js`.                                                                 |
| `scripts/practice-level-review.js`                                             | Prints what each practice level is shown in the Medicines quiz, for checking.                  |
| `backend/Code.gs`                                                              | The Google Apps Script service.                                                                |
| `.github/workflows/`                                                           | `checks.yml` (every push), `pdf-check.yml` and `edits-sync.yml` (daily).                       |
| `tests/`                                                                       | `npm test`. Includes a simulated-browser run of the whole app.                                 |

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

The backend cuts a note at 5000 characters. A whole entry is replaced on save, so two phones
changing the same entry before syncing keep only the newer one.

## List, marking and settings

- Header: one top bar with the Quiz and To learn tabs on the left and the streak rat and
  Settings cog on the right; the tracker name sits just below it. Quiz opens four choices,
  each with a small icon (Medicines quiz, Guideline quiz, Medicine test, Pick the guideline);
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
- The overview shows "X of Y mastered": cards whose interval is 21 days or more
  (`QUIZ_MASTERED_INTERVAL_DAYS`), out of the cards of the chosen practice level.
- "Practise one medicine" goes through every card of a chosen medicine. Nothing is saved and the
  schedule does not change.
- Practice level (ATP): All levels (default), EMT, Paramedic, ICP or CCP. A level limits daily
  study, the card totals and the practice list to the medicines that ATP may give by any route,
  read from the table in CPG 1.1 (`src/practiceLevels.js`). A row of that table belongs to a
  medicine when every word of its name (the words before the first route or bracket, e.g.
  "Magnesium IV") is in the medicine's title. Exceptions are in
  `content/practice-level-overrides.js` (Glucose Gel, the two GTN guidelines); a test fails if a
  medicine matches no row and has no override. Schedules of hidden medicines are kept.
- With a level chosen, dose cards are also filtered by route and indication (plan 8.2, Z18 to
  Z22). Each 1.1 row gives its level a set of routes ("IN, IM, nebulised and topical"; "(all routes)") and,
  from an "(… only)" bracket, a limit on indications ("cardiac arrest only"). An answer line's
  routes are the route words in it (IM, IV, IN, IO, SC, PO, SL, MDI in capitals; nebulised,
  topical, inhaled; an infusion is IV); a line with none takes those of the line it sits under,
  otherwise of the lines under it, otherwise of the line before. A card's indication is the
  middle of its prompt. A line a higher level may give is greyed under a label naming the levels
  ("ICP and CCP"); a card with no line for the level is dropped, as are the CPG 9.3 RSI rows
  below CCP. Topic cards stay whole. A line with two routes counts for a level that has either,
  and a route 1.1 never names for the medicine hides nothing.
- `node scripts/practice-level-review.js` prints, per level, every card dropped and every line
  greyed. Run it after each PDF update; fix a wrong line in `practiceLevelLineOverrides`
  (`content/practice-level-overrides.js`: card id, start of the line, levels), not in code.
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

## Pick the guideline

- Quiz tab, "Pick the guideline" (`#pick-guideline`, `src/sortQuiz.js`). The start screen offers
  Two guidelines or Three guidelines. The first guideline is picked at random from those that
  can be played (about 110 for two, 106 for three; never a medicine); the others are picked at
  random from its related guidelines, the five listed at the bottom of its page, leaving out
  medicines.
- Tapping the first guideline's name (a native picker over it) starts a round with another
  first guideline. After Check: Another round, or the same first guideline again with new
  partners.
- Pieces: the text under each heading (headings never shown). Left out: lines any other
  guideline of the round also has, lines naming any of their titles, version history entries,
  lines under 20 characters, tables, keys and boxes. A section of at most 3 lines and 220
  characters is shown whole; a longer one gives one top-level paragraph of at most 220
  characters.
- Up to 4 pieces from each of two guidelines, or 3 from each of three (at least 3 each, or other
  partners are tried), shuffled, shown one at a time. Drag the piece onto a guideline (its
  name, button or box; `src/views/sortDrag.js`) or tap its button. Two guidelines sit side by
  side (green, blue); three are rows (green, blue, purple). Tap a placed piece to take it back.
  Check marks each piece, names the right guideline of a wrong one and counts the streak day.
  Nothing else is saved, and the editor page does not show these questions.

## Medicine test

- Quiz tab, "Medicine test" (`#medicine-test`, `src/medicineTest.js`): one medicine's cards
  (at the practice level chosen on its screen, the same setting as the Medicines quiz's) as
  questions, in card order, one per card that can
  be asked (about 390 of 415 cards; Adrenaline 22).
- Indications, Contraindications, Cautions and Common adverse effects: "tick all that apply",
  5 points, 1 to 3 of them the medicine's own top-level points (random), the rest other
  medicines' points for the same topic that are unlike any of its own (60% word rule, as red
  flags) and name no medicine. Right only if exactly the right points are ticked.
- Each dose card, Usual onset and Usual duration: one of its lines (not one greyed for another
  level) with its first dose (else first number) blanked; one right and three wrong values,
  made as the guideline quiz's number questions (Decision Z14).
- Mechanism of action: its first sentence against three other medicines' first sentences, each
  medicine's own names put as "It".
- Options over 140 characters are not used. Finishing counts the streak day and saves the
  score as the best for that medicine and practice level if it beats or equals the saved one
  (`medicine-test-<medicine id>`); the medicine picker shows "best n%" at the chosen level and
  the end shows the best with its date ("new best" when it is). The editor page does not show
  these questions.

## Scenarios

Quiz > Scenarios (`#scenarios`) lists 40 hand-written openings for a mentor to run
(`content/scenarios.js`), each in the Wellington region, grouped by level: 1 Assessment
structure, 2 Common presentations, 3 Added complexity, 4 Delegation, 5 Several patients. Two
rows of chips filter the list by level and by theme. The themes are Paediatrics, Obstetrics,
Mental health, Respiratory, Cardiac, Trauma, Toxicology, Elderly and Rural. A theme comes from
the sections of a scenario's guidelines (`SCENARIO_THEMES` in `src/constants.js`); Rural comes
from the scenario's `rural` field.

A scenario (`#scenario-<id>`) shows level, title, suburb and story, vitals in one row, the
patient background, the intention (folded) and its guidelines. A guideline opened from it has
"Back to scenario". **Finish scenario** opens the debrief on the learner's phone: tick the
guidelines they struggled with (they go to Guidelines to learn, which holds 5) and write an
optional note (up to 1000 characters). The run is saved in the learner's tracker as one extra
entry (`scenario-run-<id>`) holding the run count and the last 3 runs, so the backend doesn't
change. The list shows "✓ Run <date>", and the scenario shows the last debrief, folded.

### Add a scenario (staff jobs)

The end of the Scenarios list links to `submit.html`, a form anyone can fill in **without
signing in** to send an anonymised job they went to. In order: short title, suburb (optional,
as it can be changed or made up), History, complexity and scene load (Single patient or
Delegation; Several patients when more than one patient is added); each patient's background,
any number of vitals sets (each with a note such as "On arrival" or "After GTN") and Treatment
and response; the guidelines; up to 4 photos (ECGs, rhythm strips, the monitor); then What
could it teach and the debrief points, which become the scenario's intended outcomes.

- **Guidelines** can only be added from the app's list (number, title or the dropdown), so
  every one links to a real guideline.
- **Anonymity:** the sender ticks that the job is anonymised, and the form warns once about
  anything that looks like an NHI, a date, a phone number, an email, a street address or a
  titled name (`src/scenarioSubmission.js`). Photos are made smaller on the phone (longest
  side 1600 px) and re-saved as JPEG, which drops their location data.
- **Bots:** a hidden box, a form open at least 20 seconds and at most 30 jobs an hour.

The backend (`scenario-submit`) saves the photos in a private Drive folder, "CPG scenario
submissions", adds a **Pending** row to the `Submissions` tab and emails the owner. Editors see
pending jobs at the top of the editor page ("Submitted jobs to check"). One job (`#j-<id>`) is
shown as the scenario it would make, with the photos and any identifier warnings, and three
buttons:

- **Edit and approve** (`#approve-<id>`) opens the new scenario form filled in from the job:
  every box can be changed, later vitals added or removed and photos taken out or recaptioned.
  "Save and approve" saves it as a new scenario (`scenario|<id>` with `added`) and marks the job
  Approved.
- **Approve as it is** does the same without the form (or says which box needs fixing).
- **Reject** asks once more, then marks it Rejected and deletes its photos.

A new scenario may hold what a job adds: per patient a note on the first vitals, later vitals
with notes and the treatment and response, and photos (`src/scenarioEdits.js`). The new
scenario form has these boxes too, all optional. The daily copy (`scripts/sync-edits.js`)
publishes new scenarios as before and fetches approved jobs' photos (`approved-scenarios`),
writing to `content/scenario-photos/` only the photos a new scenario shows, so a photo taken out
before approving is never published. In the app, later vitals and treatment are in a folded
"What happened next (for the mentor)" and photos in a folded "ECGs and photos".

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

## Manager view

A separate page for managers: <https://dklapaukh.github.io/CPGstudy/manager.html>.
It uses the same guideline data and backend as the study app and is published the same way.

**What it shows**

- Sign in with a manager passcode (Managers tab). The passcode is kept until the browser tab is
  closed.
- **Team table**, one line per person: guidelines incomplete, for review and complete; guideline
  quizzes done; scenarios run and their average latest score; last active (the last time
  anything was saved on the tracker).
- **Person page** (tap a name): guidelines overall and by section; each guideline quiz played
  with its most recent and highest score and their dates; Medicines on their own (statuses,
  flashcards learnt and due today); Scenarios; general numbers; charts.
- **Scenarios** (team and person pages): scenarios run, runs recorded, the average first and
  latest scores and how many scenarios went up or down since their first run; the same by
  complexity and scene load; the guidelines most often ticked as struggled. A person page also
  lists each scenario run with its runs, first, latest and change in score, last run date and
  the guidelines struggled with in the latest run. Debrief notes are never sent.
- **Over time**: a From and To date and three charts by week, guidelines marked complete, the
  average guideline quiz score and the average scenario score. On the team page they cover everyone; on a person page, that
  person. "Show these numbers as a table" is under the charts.
- Guideline counts leave out the Medicines section, because it has its own part of the page.
- A manager sees only the trackers assigned to them in the `Assignments` tab. Self sign-ups
  are not assigned to anyone until you add a line there.

**Scenario runs need the 19 Nov 2026 backend.** Until `backend/Code.gs` is pasted in and
redeployed (step 4 below), the Scenarios sections stay empty. From then on every run is logged in
History with its score; runs saved earlier are taken from the tracker, which keeps the last 3
per scenario.

**What a manager can never see.** The page is sent numbers only: statuses, scores, counts and
dates. Notes, comments and tracker passcodes never leave the Sheet through the manager view.

**Quiz plays are counted from launch only.** Before the manager view, the app kept just the
best and the most recent score of each guideline quiz, so "Plays counted" starts from the day
step 4 below was done. Older dates in the charts come from the saved marked dates and those two
scores.

**Switching it on (once), step by step.** No programming needed; allow 10 minutes.

1. **Open the script.** Open the Google Sheet. In the menu choose Extensions, then Apps Script.
   A new browser tab opens showing a file called `Code.gs`.
2. **Paste the new code.** In another tab open
   <https://github.com/Dklapaukh/CPGstudy/blob/main/backend/Code.gs> and press the "Copy raw
   file" button (two overlapping squares, top right of the code). Go back to the Apps Script
   tab, click in the code, select all of it (Ctrl+A, or Cmd+A on a Mac), and paste (Ctrl+V or
   Cmd+V) so the new code replaces the old. Press the Save button (the disk picture).
3. **Run `setup`.** In the bar above the code is a small drop-down list of names; choose
   `setup`, then press Run. If Google asks for permission, press Review permissions, choose your
   account and press Allow. Wait for "Execution completed" at the bottom. The Sheet now has
   three new tabs, `Managers`, `Assignments` and `History`, and `History` has been filled from
   the dates already saved. Nothing in the old tabs is changed, and running `setup` again does
   no harm.
4. **Redeploy at the same address.** Top right, press Deploy, then **Manage deployments** (not
   "New deployment": that would make a new address and the app would stop working). Press the
   pencil (Edit). Under Version choose **New version**. Press Deploy, then Done. The address
   stays the same, so nothing in the app needs changing.
   **Check it worked:** open
   <https://script.google.com/macros/s/AKfycbxbWfT-QHIqOAYU2DykLE_rVss4ewVKoWLpKW6j-I_U9heUYyvJ-l71j4oVwduKS4zVVA/exec>
   in a browser. It must say "CPG tracker service is running, version with the manager view
   (16 Nov 2026)". If it says only "CPG tracker service is running", the app's address still
   runs the old code: in Manage deployments make sure you edit the deployment whose Web app URL
   is the address above, and choose New version. If the manager page says "still running an
   older version of the backend", the same applies.
5. **Fill the `Managers` tab.** One line per manager: their name in column A, a passcode you
   make up in column B. Make it long (four or more words), different from every other
   passcode, and send it to that manager privately.
6. **Fill the `Assignments` tab.** One line for each person a manager should see:
   column A is the manager's name exactly as written in the `Managers` tab,
   column B is the tracker's label exactly as written in column A of the `Trackers` tab (for
   example `Sam - 2026`). Capital letters do not matter; spelling does. A viewer who should
   see five people has five lines. To stop someone seeing a tracker, delete the line. If two
   trackers have the same label, the viewer sees both.
7. **Open the manager page**, <https://dklapaukh.github.io/CPGstudy/manager.html>, and sign in
   with a manager passcode. Changes to the two tabs show after pressing Refresh.

Leave the `History` tab alone: the backend adds a line each time a guideline's status changes
or a guideline quiz is finished (tracker passcode, entry, value, time; "back-fill" marks the
lines made in step 3). It never holds notes.

## Editor page

A page for editors to change the quiz questions:
<https://dklapaukh.github.io/CPGstudy/editor.html>. Questions are still built from the
guidelines by the same code as the app; an edit replaces only what an editor changed. Each
question is shown as learners see it once they answer it right, drawn by the quiz screens' own
markup (`src/views/quizMarkup.js`): a card turned over, a round marked, or the choices with the
right one ticked. Random wrong answers are one example, the same each time the page is opened.

**What an editor can do.** Sign in with an editor passcode (Editors tab) and find a guideline:
its questions are stacked as learners see them. Tap any text (a question, an answer, a choice,
an ordering card, a situation) to change just that text in a box drawn in its place; emptying a
step or wrong answer takes it out, and changing a random wrong answer keeps the others shown.
"Edit all" opens the whole form. For each question (Medicines quiz cards and every guideline
quiz question) an editor can:

- change the question and the right answer (a card's answer: "- " starts a bullet, two spaces
  before it indent it);
- choose the wrong answers (empty means chosen at random each time, as before);
- change an ordering round's steps;
- leave a question out of the quiz;
- undo an edit.

**Scenarios.** The first screen has a Scenarios section. A scenario (`#s-<id>`) is drawn by
the app's own markup (`src/views/scenarioMarkup.js`) with its edits. Tap any value (title,
suburb, story, level, a patient's label or background, a vital, the intention, the guidelines
as CPG numbers) to change it in place. "Leave this scenario out of the app" hides it, and "Undo
all edits" removes the edit. A scenario edit is saved in the same `Edits` tab under
`scenario|<id>` and keeps what each value said when it was edited. When `content/scenarios.js`
later changes that value, the scenario is listed under "Needs review".

**New and deleted scenarios.** "+ New scenario" at the top of the Scenarios section opens one
form (`#new-scenario`): title, suburb, story, intention, complexity, scene load, intended
outcomes (one per line), guidelines (CPG numbers) and one or more patients (up to 4), each with
a label, background and all eight vitals. Every box is needed; several patients need the
"several" scene load and a label each. Saving checks the whole scenario, gives it an id from its
title (`fall-at-the-marae`, with `-2` when taken) and saves it as `scenario|<id>` with the whole
scenario under `added`. It is then changed in place like any other (there is no file version to
review). "Delete this scenario" asks once more, then deletes it for good: a new scenario's edit
is removed; a scenario of `content/scenarios.js` gets `{ "kind": "scenario", "deleted": true }`,
which hides it from the app and the editor page with no undo (to hide one for now, leave it out
instead). The daily copy keeps a new scenario only when it is whole (the same rules as
`tests/scenarios.test.js`, which also checks the published ones). To remove a deleted scenario's
text from the repo too, delete it from `content/scenarios.js` by hand; its edit then does
nothing.

**When edits go live.** Saving writes the edit to the Sheet's `Edits` tab at once (one row per
question; the page marks it "Not in the app yet"). Every morning `edits-sync.yml` runs
`scripts/sync-edits.js`, which copies the tab into `content/card-edits.yaml` (the readable
record) and `content/card-edits.js` (what the app loads), and the scenario edits into
`content/scenario-edits.yaml` and `content/scenario-edits.js`, runs `npm run check` and pushes to
`main`. Phones get them on their next reload. To publish sooner, run "edits-sync" from the
Actions tab. The bot's commits have no `CHANGELOG.md` entry; the git history records them.

**After a guidelines update.** Questions with no edit simply follow the new guidelines. Each
edit keeps a copy of what its question said when it was edited; when an update changes that
(a different dose, step or wording) or removes the question, the edit is listed under "Needs
review" and shown three ways: when edited, what learners see now, and what the guideline now
gives. Until an editor chooses, learners keep the edit. "Keep the edit" accepts the new
guideline under it; "Use the guideline's version" removes it. Question ids leave out numbers, so
a changed dose keeps its edit for review instead of losing it. The daily copy also prints how
many edits need review.

**Switching it on (once).**

1. Paste `backend/Code.gs` into Apps Script, run `setup` (it adds the `Editors` and `Edits`
   tabs) and redeploy with Manage deployments, New version: steps 1 to 4 under "Manager view".
   The backend address must then say "version with the editor page (17 Nov 2026)".
2. **Fill the `Editors` tab:** a name in column A and a long passcode you make up in column B,
   one line per editor. Send each passcode privately.
3. Open the editor page and sign in. Leave the `Edits` tab alone: the page writes it.

## Demo and sign-up

- **First visit:** a phone that has never opened a real tracker starts
  on the tracker labelled `demo` (any case) in the `Trackers` tab, fetched with the backend's
  "demo" action. The passcode screen says "Enter code demo to take a look", so the `demo`
  row's passcode must be `demo` too. Its list has a banner with **Make an account** and **I already have a
  passcode**. With no signal, or no `demo` tracker, the passcode screen shows instead. Once a
  real tracker opens, the phone remembers it (`eas-cpg-signed-in-v1`) and never starts on the
  demo again. The demo is shared: anything anyone marks in it is seen by everyone.
- **Make an account** (on the demo banner and the passcode screen) asks for a name and the
  backend's "signup" action adds a `Trackers` row: label = the name, a new passcode, Created by
  "Signed up in the app". The passcode is shown with Copy and Start studying.
- **Email:** the backend emails the Google account that deployed it, subject "CPG study app:
  new account for …", for every sign-up. The email is sent first: if it fails, no account is
  made. To remove an account, delete its `Trackers` row.
- **Bot checks:** a box hidden off screen that people never see (filled in → refused), the form
  must have been open at least 3 seconds, and at most 20 sign-ups per hour across everyone
  (`SIGNUP_MAX_PER_HOUR` in `backend/Code.gs`). A name needs a letter and cannot be "demo".
  If bots get past these, the next step is a Cloudflare Turnstile check (free, needs a key).
- **Switching it on:** paste `backend/Code.gs` into Apps Script, press Run on `setup` once so
  Google asks for the new permission ("Send email as you"), allow it, then Deploy, Manage
  deployments, the pencil, Version: New version, Deploy. Opening the backend address should
  say "version without mentors (18 Nov 2026)" (or a later version, such as "version with
  scenario runs (19 Nov 2026)"). Check there is a `Trackers` row
  labelled `demo`.

## Backend

A small Apps Script program attached to the Google Sheet. The app sends it the passcode and any
edits; it checks the passcode against the `Trackers` tab, reads or writes the
`Data` tab, and sends back this tracker's entries. For the manager view it also keeps the
`History` tab and answers "stats" requests from the `Managers` and `Assignments` tabs. For the
editor page it reads and writes the `Edits` tab for passcodes in the `Editors` tab, and gives
the edits to the daily copy ("edits", no passcode: they are published anyway).

- Update it: Sheet, Extensions, Apps Script, paste `backend/Code.gs`, run `setup` if the
  version adds tabs, then Deploy, Manage deployments, edit, New version. The address stays the
  same. Needs the V8 runtime. Every step is spelt out under "Manager view".
- A "stats" request reads the `Data` and `History` tabs whole and sends all of the viewer's
  History lines; the page does the sums. `History` grows by one line per status change or quiz
  play.
- Passcodes are plain text in the Sheet, so keep its sharing limited. Mentors were removed on
  18 Nov 2026: an old `Mentors` tab is no longer read and can be deleted.
- The passcode is also kept in the phone's browser and the backend address is in the page.
  Anyone with a tracker passcode can read and change that tracker, so keep passcodes long.
- Every request reads the whole `Data` tab. Revisit that (for example one tab per tracker) at
  about 20,000 rows, roughly 40 full trackers, or when a sync takes more than 3 seconds.

## Behaviour checklist

The same result is expected before and after any tidy-up. Automated in `tests/app.test.js`
unless marked "by hand".

- Sign in with a tracker passcode; a wrong (or old mentor) passcode shows the message.
- A first visit opens the demo with Make an account; signing up shows the passcode and opens
  the new tracker (`tests/signup.test.js`).
- List shows 14 sections and 180 guidelines with correct counts; sections stay as left (by hand).
- Filters (All, Incomplete, Needs review, Complete) and search.
- Opening a guideline shows all content; headings fold and unfold; previous and next (by hand).
- Changing status and notes saves, showing "Saving…" then "Saved".
- Review or Complete sets the marked date on the list row; opening or editing notes does not.
- The made-with-AI, study-only notice shows on the passcode, list and guideline screens.
- The report button is under every screen and the page holds no whole email address.
- Manager page (`tests/manager.test.js`, `tests/backend.test.js`): a wrong passcode shows the
  message; a manager sees only assigned trackers; the reply holds
  no notes or passcodes; a person page shows every part; the date range redraws the charts;
  sign out clears the numbers. With the real Sheet: by hand.
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
  new-medicines setting changes the count; Practice level EMT hides Adenosine and Fentanyl from
  the practice list and shows Adrenaline's asthma dose with its IV lines greyed under "ICP and
  CCP". The overview shows "X of Y mastered". Layout on a phone (by hand).
- Guideline quiz: cards move with the arrows and to and from "Not in this guideline"; dragging
  by the grip on a phone (by hand); a perfect play scores 100% and saves `quiz-order-<id>`; the
  picker shows the best score, a new play shows best and most recent, the list row the most
  recent; the Quiz pill opens the quiz and "Back to the guideline" returns to the same place;
  guidelines with no quiz have no pill. Layout on a phone (by hand).
- Pick the guideline: Two or Three guidelines; all are named at the top (rows for three); a
  piece can be placed, dragged onto a guideline and taken back; the first name's picker starts
  a round with the one picked; Check marks every piece and gives "n of N right".
- Medicine test: the practice level can be changed on its screen; tick questions toggle and
  Check; choice questions mark at once; the end shows the score and the best, and the picker
  shows "best n%". The passcode screen says "Enter code demo to take a look".
