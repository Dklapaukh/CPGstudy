# Change log

Newest first. One short entry per change; the detail is in the README and the git history.

- 2026-11-19: **Add a scenario** form (`submit.html`, linked at the end of the Scenarios list),
  with no sign-in. Fields follow the scenario format: title, optional suburb, History,
  complexity and scene load, then per patient the background, several vitals sets with a note
  each and Treatment and response; guidelines picked only from the app's list; up to 4 photos;
  What could it teach and debrief points (the intended outcomes) last. Identifying details are
  flagged before sending; photos are shrunk and re-saved (no location data). Jobs wait as
  Pending in a new `Submissions` tab (photos in a private Drive folder). On the editor page,
  **Edit and approve** opens the new scenario form filled in from the job, **Approve as it is**
  saves it unchanged, and **Reject** deletes its photos; an approved job becomes a new scenario
  (`scenario|<id>`, `added`). New scenarios may now hold a vitals note, later vitals,
  treatment and photos. The daily copy publishes only the photos a new scenario shows, into
  `content/scenario-photos/`. Backend: `scenario-submit`, `submission-photo`,
  `submission-decide`, `approved-scenarios`. **Needs the backend redeployed** (plan 8.4).
- 2026-11-19: Editor page: **create and delete scenarios.** "+ New scenario" opens a form
  (title, suburb, story, intention, complexity, scene load, outcomes, guidelines, and one to four
  patients with background and vitals); it is checked whole, saved as `scenario|<id>` with
  `added`, and changed in place afterwards. "Delete this scenario" asks once more, then deletes
  for good (a new one's edit goes; a written one is marked `deleted`). The daily copy publishes
  both, keeping a new scenario only when it is whole; the app, manager page and scenario checks
  include new scenarios and leave deleted ones out. No backend change.

- 2026-11-19: Manager view: scenario trends. The team table adds scenarios run and the average
  latest scenario score; team and person pages gain a **Scenarios** section (runs, average first
  and latest scores, how many went up or down, the same by complexity and scene load, and the
  guidelines most often struggled with); a person page lists each scenario with first, latest
  and change in score; Over time gains an average scenario score chart. The backend sends run
  times, ratings and struggled guideline ids (never debrief notes) and logs every run in History
  with its score. **Needs the backend redeployed** (README, Manager view, step 4).

- 2026-11-19: Scenarios: the five levels are replaced by two filters, **complexity**
  (Straightforward, Common presentation, Complex or atypical) and **scene load** (Single
  patient, Delegation, Several patients); all 40 scenarios are re-tagged (`complexity`, `load`)
  and each has three **intended outcomes**, shown in the folded intention. **Finish scenario**
  now has a PEARLS debrief guide, a rating of each outcome by how much help the learner needed
  (Not done, Talked through, Prompted, Independent), the struggled guidelines, and three notes
  (Went well, To work on, Learner's take-away). Each run gets a score (ratings as a percentage);
  the list shows the latest score and a "Your progress" fold by complexity and scene load, and
  the scenario's Debriefs fold shows the scores of the last runs. The editor page edits the
  complexity, scene load and outcomes. Runs saved before keep their note.

- 2026-11-19: Scenarios list: the six level chips (All, Level 1 to 5) now share one row, each
  naming its level in a tooltip, and the theme chips are replaced by a Theme dropdown.

- 2026-11-19: Scenarios, part two. 30 new scenarios (40 in all): paediatrics, obstetrics,
  mental health, respiratory, toxicology, rural and long transport, and more at levels 4 and 5.
  The list has level chips and theme chips; themes come from each scenario's guideline
  sections, and Rural from a new `rural` field. "Add all to queue" is replaced by **Finish
  scenario**: tick the guidelines the learner struggled with (added to Guidelines to learn),
  write a debrief note, and the run is saved in the tracker (`scenario-run-<id>`, no backend
  change). The list shows when each scenario was last run, and the scenario shows the last
  debrief. The editor page now edits scenarios too: each one is drawn as learners see it, and
  tapping any value changes it in place. Scenario edits are saved in the Edits tab under
  `scenario|<id>`, reviewed when the file changes, and copied daily into
  `content/scenario-edits.js`. The editor page is renamed "Editor".

- 2026-11-18: Scenarios, a fifth button in the Quiz choice (#scenarios). 10 hand-written
  openings in `content/scenarios.js`, grouped by level 1 to 5. A scenario (#scenario-<id>) shows
  level, title, suburb and story, then vitals in one row (GCS, RR, SpO₂, HR, BP, Temp, BGL,
  Pain), patient background, the intention (folded) and its guidelines, one row each. A
  guideline opened from a scenario has "Back to scenario"; "Add all to queue" fills Guidelines
  to learn. Nothing is saved. `tests/scenarios.test.js` checks the content.

- 2026-11-18: Plan 8.3 item 3: options for replacing the Google Sheet backend.

- 2026-11-18: Plan: the editor page, sign-up and the demo are switched on and confirmed
  working by the owner (8.4 tasks 9 and 10 done).

- 2026-11-18: Tidy-up, no behaviour change. Helpers that were written two or three times now
  live once: `escapeForPattern`, `plural` and `noteObject` (reading a settings note) in
  `logic.js`, `isTextBlock` in `quizDoses.js`, `guidelineById` in `guidelines.js`. Two unused
  CSS rules removed; script functions used only in their own file are no longer exported. Plan:
  stale mentor entries and links to the removed sections 8.5 and 8.6 fixed; section 13 cut to
  the current status (the history is here and in git).

- 2026-11-18: The Quiz tab always has the green outline (open or closed), matching the overall
  progress card.

- 2026-11-18: Light mode restyled to the "Glacier" design: a pale green-grey page with white
  cards and pills that have a soft shadow and no border, each guideline section its own rounded
  card, the Plus Jakarta Sans font and a larger 26px title. The chosen tab and filter and the
  overall progress card have a green outline; the streak count is darker orange for contrast.
  Dark mode keeps its colours but takes the new shapes (rounded section cards, pill search,
  outlined progress card, font).

- 2026-11-18: Home header: the Home tab is gone; Quiz and To learn now share the top bar with
  the streak and Settings, and the tracker name sits just below. The four Quiz choices have
  simple icons (capsule, book, clipboard, four squares).

- 2026-11-18: Medicine test, after the owner tried it: the practice level (ATP) can be chosen
  on its screen (the same setting as the Medicines quiz), and the best score per medicine and
  level is saved (`medicine-test-<medicine id>`), shown in the picker and at the end (MT-F).

- 2026-11-18: Pick the guideline, after the owner tried it: choose Two or Three guidelines at
  the start (three are rows); the others come at random from the first guideline's five related
  guidelines, never a medicine; tap the first guideline's name to pick another; drag a piece
  onto its guideline (the buttons still work) (PG-F to PG-H).

- 2026-11-18: README and plan (sections 8 and 13) describe "mastered", Pick the guideline and
  the Medicine test (GM-A, PG-A to PG-E, MT-A to MT-E). The `demo` tracker's passcode must be
  `demo` (8.4 task 10).

- 2026-11-18: New Medicine test (Quiz tab, `#medicine-test`): every topic of one medicine at
  once, as multiple choice, following the Medicines quiz's practice level. Indications,
  contraindications, cautions and adverse effects are "tick all that apply" (1 to 3 of the
  medicine's own points among other medicines' points for the same topic, 5 in all); each dose
  card, onset and duration is one line with its number blanked and four values (other values
  with the same unit, ten times or a tenth, or a wrong unit, as the guideline quiz does);
  mechanism of action is its first sentence against three others, medicine names put as "It".
  Nothing is saved but the streak day.

- 2026-11-18: New quiz, "Pick the guideline" (Quiz tab, `#pick-guideline`). Two related
  guidelines (each guideline's top related link) are named at the top; up to four pieces of
  text from each, found in only that one, come up one at a time and go in the left or right
  box. No headings, no lines naming either guideline and no version history lines; a short
  section is shown whole, a long one gives one top-level paragraph. Tap a placed piece to take
  it back; Check marks each piece and counts the streak day. Not saved, not editable.

- 2026-11-18: Medicines quiz overview shows "X of Y mastered" (a card is mastered once its
  interval is 21 days or more, `QUIZ_MASTERED_INTERVAL_DAYS`). The passcode screen says, in
  bold, "Enter code demo to take a look".

- 2026-11-18: Mentors removed, now that people make their own accounts. The app has no mentor
  screen (a mentor passcode is "not recognised"), the backend no longer reads the `Mentors`
  tab or accepts "create", and the manager page takes manager passcodes only (assigned
  trackers only). Existing trackers, including ones mentors made, work as before. Needs the
  backend redeploy (8.4 task 10).

- 2026-11-18: Demo and self sign-up. A phone that has never signed in opens on the tracker
  labelled `demo`, with a banner and a big Make an account button (and "I already have a
  passcode"). The passcode screen has the button too. Make an account asks for a name, makes a
  passcode and shows it with Copy and Start studying. The owner is emailed about every new
  account; if the email cannot be sent no account is made. Bot checks: a hidden box bots fill
  in, the form must be open 3 s, and at most 20 sign-ups an hour. New backend actions `demo`
  and `signup`; needs a redeploy and allowing email (README, "Demo and sign-up").

- 2026-11-18: Editor page: tap any text of a question (a card's question or answer, an ordering
  round's situation or one of its cards, a choice question's line or one of its choices) to
  change just that text in a box drawn in its place, then Save or Cancel (Escape cancels,
  Ctrl+Enter saves). Emptying a step or wrong answer takes it out. Changing a random wrong
  answer keeps the others shown, so they stop being random. "Edit" is now "Edit all" (the whole
  form, still where a question is left out). The quiz screens are unchanged: the shared markup
  only adds the clickable boxes when the editor page asks for them.
- 2026-11-18: Study streak: the power-up now moves like a super Saiyan transformation (no gold
  hair). The hype rat's arms are jointed at shoulder and elbow. It drops into a stance with
  elbows out and fists clenched at its hips, strains lower and shakes harder while a flickering
  glow builds, then throws its arms straight down and out with an open-mouthed shout (flash,
  shock wave, aura on at 2 s). It settles back into the stance and keeps breathing, buzzing and
  flexing every 2.4 s. The day count and Continue come in a second later than before (2.4 s and
  3.2 s). Replaces the hopping and fist pumps.
- 2026-11-17: Editor page: each question is shown as learners see it, drawn by the quiz
  screens' own markup (new shared file `src/views/quizMarkup.js`): a Medicines card turned over,
  an ordering round marked all right, a choice question with the right answer ticked. Random
  wrong answers are one example, seeded by the question id so they stay put, with a note saying
  so. The open form keeps the preview above it. No change to the app's quiz screens (same
  markup, moved) or plays (`questionStep()` builds one question as a play does).
- 2026-11-17: Study streak: the top-bar rat is now the whole rat, side on (drawn from the
  owner's reference pictures): shield sunglasses, a laryngoscope in its front paws, a blue bougie
  looping to the floor and trauma shears in a holster on a cartridge belt; sad with its head and
  ear drooping and a tear, powered up with head up and a grin. The pill is 57 by 38 px inside
  the same 40 px button. The power-up has a separate picture, the hype rat stood up with its
  shears holstered, moving the way Duolingo's mascot celebrates: it pops up, crouches, leaps with
  both arms up (flash and aura), lands with a squash and a shock wave, then keeps hopping and
  pumping one fist then the other, head bobbing and tail swishing. New file
  `src/views/ratDrawings.js`.
- 2026-11-17: Study streak: a new rat (dark fur, shield sunglasses with a speckled mint frame and
  a yellow-to-red mirror lens; no gold hair), same size in the top bar. The power-up now charges
  up with closing rings and growing shakes, then a flash, shock wave and screen shake; the
  powered-up rat bursts out in a spinning flame aura with light rays, rising sparks and a lens
  glint, and the day count ticks over from yesterday's number. On the tracker labelled `demo`,
  a double tap on the rat switches today's streak off and back on (with the power-up); a single
  tap still opens the Data tab.
- 2026-11-17: Code audit, a tidy-up with no change in behaviour. The manager and editor pages
  share `src/staffPage.js` (tab passcode, backend requests, refusal messages, warning box);
  dark mode moved to `src/theme.js`. The guideline quiz builds its list of quizzed guidelines
  once and has one shuffle. Exports used only in their own file are private. Every function has
  a short comment; the settings wheel, the app's listeners and the card drag are split into
  smaller functions. The style guide (plan section 10) is back in the plan.
- 2026-11-17: Study streak: the full-screen power-up now stays until Continue is pressed. It
  no longer closes by itself after 4.5 seconds or on a tap elsewhere on the screen.
- 2026-11-17: Editor page layout now matches the study app. The list has the app's header
  (name with Refresh and Sign out, the title, a search box) and its folding sections and rows,
  with how many questions are edited on the right; "Needs review" is a section of its own. A
  guideline opens under the app's coloured guideline header with the back link. Open sections
  stay open after a redraw. The page no longer loads `manager.css`. No change to what it saves.
- 2026-11-17: Study streak (feature 14): a rat in Pit Viper sunglasses sits in the top bar
  beside the Settings cog with the day count (same height, so the header does not grow). It is
  sad until a quiz is finished that day (a Medicines session or practice run to the end, or a
  guideline quiz); the first quiz of the day shows a full-screen power-up, and the rat stays
  powered up for the rest of the day. Settings now has General and Data tabs; Data (`#stats`,
  also opened by the rat) shows the streak, longest streak, quiz days, a 12-week grid, a rank,
  and guideline and Medicines numbers. Saved as one extra entry; no backend change.
- 2026-11-17: Editor page (feature 13): new page `editor.html` where editors (new `Editors`
  tab) change quiz questions: wording, right and wrong answers, ordering steps, or leave a
  question out. Only the edits are stored: the page saves to a new `Edits` tab, and a daily
  workflow (`edits-sync.yml`, `scripts/sync-edits.js`) copies them into
  `content/card-edits.yaml` and `.js` and pushes to `main`. Edits whose question a guidelines
  update changed are listed for review and stay live until an editor decides. Guideline quiz
  questions now have stable ids; plays are unchanged. **Needs `setup()` and a backend
  redeploy** (README, "Editor page"). Plan: ED-A to ED-E; next step is a code audit.
- 2026-11-16: Plan only: the manager view is switched on and works with the real Sheet (8.4
  tasks 1 and 8 done). No app change.
- 2026-11-16: Manager view fix. The owner's check found no passcode worked: the backend address
  the app calls still runs the code from before the manager view (it answers "stats" with
  "bad-action"), so the redeploy did not reach that address. The page now says so and how to
  redeploy, instead of "Something went wrong". Opening the backend address in a browser now
  names the version ("…version with the manager view (16 Nov 2026)"), so a redeploy can be
  checked. **Paste `backend/Code.gs` again and redeploy** (README, "Manager view", step 4).
- 2026-11-16: Medicines quiz, feature 11: with a practice level (ATP) chosen, dose cards follow
  the routes and "(… only)" indication limits of the CPG 1.1 table. Lines for a higher level
  are greyed under a label such as "ICP and CCP"; a card with no line for the level, and the
  RSI table rows below CCP, are left out. New `scripts/practice-level-review.js` lists the
  result per level; line corrections go in `content/practice-level-overrides.js`. Decisions Z18
  to Z22.
- 2026-11-16: Manager view (feature 12): new page `manager.html` for managers and mentors with
  a team table, a page per person (guidelines by section, guideline quiz scores, Medicines and
  flashcards, general numbers) and charts by week over a date range. Backend: new tabs
  `Managers`, `Assignments` and `History`; each save logs status changes and quiz scores (never
  notes); new "stats" action that returns numbers only. **Needs `setup()` and a backend
  redeploy** (README, "Manager view"). The study app itself is unchanged.

- 2026-11-16: Plan for feature 11 (ATP filter by route and indication) and its three questions
  (plan 8.3, 8.6). Red-flag questions kept (at most two a play already); rationale questions
  withdrawn. No app change.
- 2026-11-16: Medicines quiz: Practice level (ATP) setting (All levels, EMT, Paramedic, ICP,
  CCP) limits daily study and the practice list to that ATP's medicines, read from the CPG 1.1
  table. Saved with the daily limits.
- 2026-11-16: Daily PDF check: a leftover `pdf-update-<date>` branch no longer hides a new PDF
  (it skips only while a pull request is open); the pull request is assigned to the owner; new
  test run that treats today's PDF as new and opens a "TEST" pull request. Owner's answers of
  16 Nov recorded in the plan (8.3), with the check of the red-flag explanation idea. No app
  change.
- 2026-11-15: Documentation review, no app change. The plan file cut from 83 KB to its working
  rules, decisions in force, style guide and status, with new lists of open decisions, owner
  tasks and features that can fail silently (sections 8.3 to 8.5). README corrected (file table,
  `FEEDBACK_ADDRESS_PARTS`, header and Settings, a table of the extra entries, Data rows per
  tracker) and shortened. This log shortened. Deleted the duplicate `.prettierrc` and
  `.prettierignore` in `.github/workflows/`.
- 2026-11-15: Guideline quiz saves the most recent score as well as the best; both show when a
  play starts, and the most recent shows on the list row.
- 2026-11-14: Guideline page: Quiz pill beside Review and Complete (85 guidelines), an animated
  score ring at the end, and "Back to the guideline" returning to the same place. The Guidelines
  to learn list no longer shows under a guideline.
- 2026-11-14: List header tidied; Switch tracker moved to Settings; 💬 opens a comment panel
  with "Report a mistake in this point"; a guideline named in a differential diagnosis section
  ranks first in the related list.
- 2026-11-14: Settings is a cog button; filter pills stay on one line; dark mode covers the
  guideline text (coloured table cells keep their PDF colours).
- 2026-11-13: Settings screen: dark mode (this phone) and "Mark guidelines for review N days
  after they're marked Complete" (shared, entry `app-settings`). List header white with green.
- 2026-11-13: New list header with tabs Home, Quiz and To learn. The review queue is renamed
  "Guidelines to learn".
- 2026-11-13: Guideline quiz cards move by arrows or by dragging the grip. "Report a mistake or
  request" is one button under every screen; the address is kept in two parts.
- 2026-11-13: Guideline quiz (`#guideline-quiz`): ordering rounds with distractors, number
  questions and course-changing questions, all built from the content; best score saved as
  `quiz-order-<id>`.
- 2026-11-12: Marked dates on list rows (entry `marked-<id>`); the guideline page loses the
  Incomplete button; made-with-AI notice; report email links.
- 2026-11-12: Medicines quiz: "Practise one medicine" (nothing saved).
- 2026-11-12: Guideline page: status buttons and notes moved below the text. Switch tracker
  keeps the open tracker until another passcode is accepted.
- 2026-11-11: Medicines quiz by medicine: new medicines per day, a review limit, no paediatric
  doses, adult doses per indication for Adrenaline, Midazolam and Morphine. 415 cards.
- 2026-11-11: Medicines quiz (`#quiz`): flashcards built from the medicine guidelines, SM-2
  spaced repetition, progress saved as one entry per medicine.
- 2026-11-11: Review items: unique comment snippets (R4), plain-word search with a 150 ms pause
  (R8), contrast and 15 px text (R11), content checker (R13), placeholder mentor passcode
  refused (C4, needs a backend redeploy). Converter split into smaller files, same output.
- 2026-11-11: Feature 6, stage B: converter from the EAS PDF to `content/guidelines.js`, no AI.
  170 of 180 guidelines rebuild exactly; the daily pull request includes the rebuilt content.
- 2026-11-11: Feature 6, stage A: daily GitHub Action checks the EAS PDF and opens a pull
  request when the export date or a version entry changes.
- 2026-11-11: Feature 7: update banner driven by `version.json`, "Updated" tags, list footer.
- 2026-11-11: Feature 5: related guidelines (up to 5, with reasons) and the review queue (entry
  `review-queue`), built by `scripts/build-related.js`.
- 2026-11-11: Feature 4: "Random guideline" button, weighted Incomplete 6, Needs review 3,
  Complete 1.
- 2026-11-11: Feature 3: completion rings, overall and per section, replacing the progress bar.
  Section counts aligned. Backend address updated.
- 2026-11-11: Refactor, no change in behaviour: split into `index.html`, `styles/`, `content/`
  and `src/`; descriptive names; one state object; backend tidy (column map, wrong-passcode
  delay outside the lock, edit times limited to 5 minutes ahead, generic errors); checks and
  tests.
