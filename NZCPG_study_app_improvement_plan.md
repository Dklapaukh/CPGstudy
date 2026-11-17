# NZCPG study app – working rules, decisions and open items

The project memory. What the app does and how to run it is in `README.md`; what changed and when
is in `CHANGELOG.md`. The original plan, code review, refactor plan and full status history
(written 10 to 15 Nov 2026) were removed from this file on 15 Nov 2026 once everything in them
was built or closed; they are in the git history of this file.

Section numbers are kept from the old plan because `CLAUDE.md` and code comments refer to them:
0 rules, 8 decisions and open items, 10 style guide, 13 status.

---

## 0. How we work (rules for every session)

### Token efficiency

1. **Never read `content/guidelines.js` whole** (about 1.3 MB of data). Use `grep`, a line range
   or a short script.
2. **Edit with targeted replacements.** Do not re-print whole files or paste large blocks of code
   into the chat. Summarise in a few sentences.
3. **This document is the project memory.** Record decisions and status here; do not repeat
   analysis already written here.
4. **Verify by running checks**, not by reading code back: `npm run check` and the behaviour
   checklist in the README.
5. **One feature per chat.** When a chat has grown long, a feature finishes or the topic changes,
   Claude says so and gives a ready-to-paste prompt for a new chat.
6. **Update sections 8 and 13 before ending a chat.**

### Questions

7. Open questions live in section 8. Claude asks all the ones relevant to the next step in one
   message, with the **full text of every option**, and records the answers in section 8.

### Code and publishing

8. All new and changed code follows the style guide (section 10).
9. A tidy-up never changes behaviour; behaviour changes are made separately.
10. **Claude commits and pushes every update straight to `main`** (standing instruction, 14 Nov
    2026): no branches, no pull requests, no asking first. Before each push `npm run check` must
    pass and `CHANGELOG.md` gets an entry. GitHub Pages serves `main`, so a push is live. The
    daily PDF check still opens a pull request, because new guideline content needs the owner's
    review.

---

## 8. Decisions and open items

### 8.1 Features

| #    | Feature                                                       | State                                    |
| ---- | ------------------------------------------------------------- | ---------------------------------------- |
| 1, 2 | Last-reviewed date and overdue flag, as first planned         | Scrapped 11 Nov; replaced, see 8.2 "List" |
| 3    | Completion rings, overall and per section                     | Built                                    |
| 4    | Random guideline button                                       | Built                                    |
| 5    | Related guidelines and the "Guidelines to learn" queue        | Built                                    |
| 6    | Daily check of the EAS PDF and rebuild of the content from it | Built                                    |
| 7    | "Update now" prompt for new guidelines                        | Built                                    |
| 8    | Medicines quiz (flashcards, spaced repetition)                | Built                                    |
| 9    | Guideline quiz (ordering, number and course-changing questions) | Built                                    |
| 10   | Medicines quiz: practice level (ATP) filter, by medicine        | Built 16 Nov 2026 (Z17)                  |
| 11   | Medicines quiz: ATP filter by route and indication              | Built 16 Nov 2026 (Z18 to Z22), see 8.6  |
| 12   | Manager view (`manager.html`): team and person statistics       | Built 16 Nov 2026; live once the owner does 8.4 task 8 |
| 13   | Editor page (`editor.html`): editors change quiz questions      | Built 17 Nov 2026; live once the owner does 8.4 task 9 |
| 14   | Study streak (rat in the top bar) and Settings > Data stats     | Built 17 Nov 2026 (ST-A to ST-C)         |
| 15   | Demo on first visit and self sign-up (Make an account)          | Built 18 Nov 2026; live once the owner does 8.4 task 10 |

### 8.2 Decisions in force

The letter and number codes are the ones used in code comments. Details of how each feature
behaves are in the README.

**General**

- No view tracking: only pressing Review or Complete is recorded; opening a guideline or editing
  its notes records nothing.
- G: separate readable files, no build step (ES modules). I: formatting, lint and tests on every
  push. J: modern JavaScript; the Apps Script project needs the V8 runtime.
- Everything the app saves beyond a guideline's status and notes is an **extra entry** in the
  same Data sheet (list in the README), so the backend never needs changing for a new feature.
- Entry fields stay `s`, `n`, `t` and the saved-on-phone format stays `{c, l, s, p}`.

**Review items (old code review)**

- R4: a comment's snippet is the first 70 characters of its point, longer when another point of
  the guideline starts the same way. Points with identical text cannot be told apart.
- R8: search uses plain words and redraws 150 ms after typing stops.
- R11: secondary text #565c58, green #1a7d53, orange #b35900, base text 15 px. St John colours
  inside the guidelines are unchanged.
- R12: no "do not enter patient details" notice (not wanted: no patient information is entered).
- R13: `scripts/contentCheck.js` refuses any markup other than `<b>`, `<br>`, `&lt;`, `&amp;`,
  hex colours and the six block shapes.
- C2: the backend cuts back edit times more than 5 minutes ahead of its clock
  (`MAX_CLOCK_AHEAD_MS`).
- C4: the backend refuses the placeholder mentor passcode; passcodes stay plain text in the Sheet.
- C5: revisit reading the whole Data tab at about 20,000 rows or when a sync takes over 3 seconds.

**List, marking and settings**

- Rings: green Complete, orange Needs review, empty Incomplete; closing animation only when a
  ring newly reaches 100%.
- Random guideline: weights 6 / 3 / 1 (Incomplete / Needs review / Complete); from the one open
  section if exactly one is open; no memory of earlier picks.
- Marked date: one entry `marked-<id>`, set by pressing Review or Complete (even when already
  selected). The guideline page has no Incomplete button.
- "Mark for review N days after Complete" (0 = off, up to 180) is shared with the tracker
  (`app-settings`). Dark mode is per phone.

**Feature 5, related guidelines and queue**

- L: related list fixed at 5. M: no automatic queue; "Add to queue" buttons. P: ranked by link
  score, then Incomplete, Needs review, Complete. O: queue saved through the backend
  (`review-queue`). Q: the queue shows on the To learn screen only (removed from guideline pages
  14 Nov). R: at most 5. S: empties itself when every item is done.
- A guideline named in another's differential diagnosis section always ranks first.

**Features 6 and 7, PDF and updates**

- Source: `https://cpg.stjohn.org.nz/assets/pdf/EAS.pdf`; the owner has permission to download it
  automatically (I1, I3).
- D: semi-automatic. A plain script (no AI) rebuilds the content and opens a pull request; the
  owner merges. Fully automatic publishing is only worth revisiting after real updates have
  rebuilt exactly.
- Y: a guideline whose rebuild is unchanged keeps its published text; a changed one takes the
  converter's version and is listed under "Check formatting" when it is new or one of the 10
  that do not rebuild exactly (1.3, 1.26, 2.5, 3.14, 3.15, 4.2, 5.4, 6.2, 9.7, 12.6).
- The change signal is the export date plus each guideline's newest version entry, not the file
  fingerprint.
- T: the update banner is shown for new guideline content only, not app code. U: nothing reloads
  until "Update now" is tapped. V: "Updated" tags last until the guideline is opened on that
  phone.
- No service worker (the app needs signal to open); a separate decision, not taken.

**Feature 8, medicines quiz**

- E: progress saved through the backend, one entry per medicine. Z1: Again, Hard, Good, Easy
  (SM-2). Z4: medicines only.
- Z6: review limit 10 to 200 a day, default 30. Z7: 1 to 10 new medicines a day, default 2, each
  bringing all of its cards.
- Z8 to Z10: Adrenaline, Midazolam and Morphine (own Dosage section missing or pointing
  elsewhere) get one adult-dose card per guideline that doses them, written "Medicine –
  Indication – Dose"; guidelines with identical instructions share a card.
- No paediatric doses anywhere.
- Z17 (owner, 16 Nov 2026): the quiz can be limited to one practice level (ATP) from the CPG
  1.1 table: EMT, Paramedic, ICP or CCP. A medicine counts for a level if that level may give it
  by any route. Since feature 11 its dose cards are also filtered by route and indication (Z18
  to Z22); topic cards (Indications, Cautions and so on) stay whole.
- Z18 (owner, 16 Nov 2026): a dose card with lines for a higher level keeps every line; those
  lines are greyed under a label naming the levels that may give them, such as "ICP and CCP",
  so the learner still sees what backup would give. A card with no line for the level is
  dropped.
- Z19 (owner, 16 Nov 2026): the limits in brackets in the CPG 1.1 table apply ("cardiac arrest
  only", "analgesia only", the Midazolam IM and IV limits). A Paramedic sees Amiodarone's
  cardiac arrest card and not its tachydysrhythmia card.
- Z20 (owner, 16 Nov 2026): limits
  come from CPG 1.1 only, not from a medicine's own "Authorised practice levels" lines. So
  Hydrocortisone's dose card stays for Paramedics and Labetalol stays ICP and CCP.
- Z21 (owner, 16 Nov 2026): none of the 23 Adrenaline, Midazolam and Morphine indication cards
  is removed from the quiz. With a practice level chosen, the filter still leaves out the ones
  that level may not give (confirmed by the owner, 16 Nov 2026).
- Z22: how a line gets its level. Its routes are the route words in it (abbreviations in
  capitals only; an infusion is IV); a line with none takes those of the line it sits under,
  otherwise of the lines under it, otherwise of the line before. A line with two routes counts
  for a level that has either. A route CPG 1.1 never names for the medicine (Enoxaparin IV)
  hides nothing. The CPG 9.3 RSI table cards follow the "Rapid sequence intubation" row (CCP).
  Wrong cases are corrected per line in `content/practice-level-overrides.js` (two entries: the
  "adrenaline IV if deteriorating despite IM" line of Anaphylaxis, and Ondansetron's "one IV
  dose in addition to one IM dose" line).
- Z11: Morphine 14.32 is cut short in St John's PDF itself (ends after Contraindications); wait
  for St John to fix it.

**Feature 9, guideline quiz**

- Z12: one ordering round per situation, rounds of 2 or more actions. Z13: 2 distractors a
  round, from guidelines naming the same medicine, then related guidelines.
- Z14: wrong numbers are same-unit values from elsewhere in the guidelines, otherwise ten times
  or one tenth; sometimes the right number with a wrong unit.
- Z15: only questions that can be read from the layout (situation, red flags, "move to which
  guideline"); nothing that would need AI.
- Z16: best and most recent score per guideline saved as `quiz-order-<id>`.

**Feature 12, manager view** (owner, 16 Nov 2026; the owner's letters A to C are written MV-A
to MV-C here because D to Z are already in use above)

- MV-A: the manager view is a second page, `manager.html`, in the same repository, reusing the
  section data, tests and publishing.
- MV-B: the admin assigns people by editing the Assignments tab of the Google Sheet (viewer
  name, tracker label). There is no admin screen.
- MV-C: mentors keep their current access (a tracker passcode opens the tracker with notes) and
  also get the statistics view with their mentor passcode.
- Backend: tabs Managers (name, passcode), Assignments and History. Each save adds a History
  row when a guideline's status changes or a guideline quiz score is saved; notes are never
  logged. The "stats" action answers a manager or mentor passcode with labels, statuses, quiz
  scores and dates of assigned trackers only (mentors: also trackers they created), never
  notes, comments or tracker passcodes; quiz notes are parsed on the server and only numbers
  are returned.
- Quiz attempt counts exist from launch onward only (before it, only best and latest were
  stored).

Choices made while building (Claude, 16 Nov 2026; say if any should change):

- MV-D: History names a tracker by its passcode, as the Data tab does, because labels can
  repeat or be renamed. It has a fifth column, Source, holding "back-fill" on rows made by
  `setup()`, so those rows are left out of the attempt counts.
- MV-E: back-fill writes, per `marked-` date, the guideline's present status at that date, and
  per guideline quiz its best and latest score. It runs once and only adds dates earlier than
  the first row already logged.
- MV-F: guideline counts on the manager page leave out the Medicines section, which has its
  own part of the person page. "Last active" is the newest save time on the tracker, so a
  mentor's note edit counts too. A flashcard is "learnt" when its interval is a day or more
  and "due" when its due day is today or earlier.
- MV-G: the manager passcode is kept in the browser tab only (sessionStorage). Tracker labels
  in Assignments match ignoring capitals; two trackers with the same label are both shown.
- MV-H: the manager page's files are in `src/manager/` and are not listed in `version.json`,
  so phones do not download them with a guideline update.
- MV-I: "stats" sends every History row of the viewer's trackers and the page does the sums.
  Revisit with C5 if the reply becomes slow.

**Editor page (feature 13; owner's choices 17 Nov 2026)**

- ED-A: questions are still built from the guidelines at run time; only edits are stored
  (`content/card-edits.yaml` and `.js`), as with the other override files. No stored copy of
  every card.
- ED-B (saving, Option B of three): the page saves to the Sheet's `Edits` tab; a daily
  workflow copies it into the repo and pushes to `main`. Rejected: A, the backend commits to
  GitHub with a token; C, editors send files to the owner.
- ED-C: editors can change a question, its right answer, its wrong answers, an ordering round's
  steps, or leave a question out.
- ED-D (Claude's choice): review is per question, not per guideline. Unedited questions follow a
  guidelines update at once; an edit whose question changed or went stays live until an editor
  keeps it or drops it. Holding a whole guideline back would mean keeping old guideline text.
- ED-E (Claude's choice): question ids leave out digits, so a changed dose keeps its edit and is
  flagged for review.
- Local-only storage (no Sheet) was considered and rejected: managers use the manager view, which
  reads the Sheet, and phones would lose progress (Safari clears site data after 7 days unused).
- ED-F (owner, 17 Nov 2026): the editor page is laid out like the study app: the list header
  and folding sections for the guideline list (with "Needs review" as its own section), and the
  coloured guideline header for one guideline. It no longer loads `manager.css`.

**Study streak, later changes**

- ST-D (owner, 17 Nov 2026): the full-screen power-up stays until Continue is pressed; no
  timeout and no closing on a tap elsewhere.
- ST-E (owner, 17 Nov 2026): new rat drawn from the owner's reference photo (inspiration, not a
  copy): dark fur, shield sunglasses with a speckled mint frame and a yellow-to-red mirror lens.
  No gold hair; the aura stays. Top-bar size unchanged (32 px). The power-up gained a charge-up,
  flash, shock wave, spinning flame aura, light rays, rising sparks, a lens glint and the day
  count ticking over.
- ST-F (owner asked; Claude's choice of reset): on the tracker labelled `demo` (any case), a
  double tap on the rat takes today off the streak (sad rat, yesterday's count kept), and the
  next double tap puts it back with the full power-up. A single tap still opens the Data tab,
  after 300 ms. Earlier days are kept, so the demo shows a real "still powered up" count; the
  other choice, wiping the whole streak to 0, was not built. Other trackers are unchanged.

- ST-G (owner, 17 Nov 2026, with two reference pictures): the top-bar rat shows the whole body
  side on with the laryngoscope, bougie and holstered shears (`ratSvg`); the power-up uses a
  separate picture, the hype rat stood up with shears holstered (`hypeRatSvg`), moving like
  Duolingo's mascot (pop up, crouch, leap with arms up, squash on landing, then hops with
  alternating fist pumps). Claude's choices: the pill grows from 32 to 57 by 38 px inside the
  same 40 px button; the sad-to-powered swap in the power-up was dropped (the hype rat replaces
  both); shock wave moved to the landing (1.3 s). Both drawings in `src/views/ratDrawings.js`.
- ST-H (owner, 18 Nov 2026): the power-up moves like Goku going super Saiyan, without the hair.
  Claude's choices: arms jointed at shoulder and elbow (`hype-rat__forearm`); an open shouting
  mouth (`hype-rat__shout`) shown through the burst; a flickering charge glow before it; the
  burst at 2 s (was the landing at 1.3 s), so the count and Continue come a second later; once
  powered, a faint buzz and a flex every 2.4 s instead of hops and fist pumps. Plain CSS
  keyframes, no outside animation service needed.

**Editor page, later changes**

- ED-G (owner, 17 Nov 2026): editors see each question as learners see it. Claude's choices:
  shown in its answered-right state (card turned over, round marked all right, right choice
  ticked), since that shows the question and its answer at once; random wrong answers seeded by
  the question id, with a note; the field list stays only in the "Needs review" comparison. The
  quiz screens and the editor share `src/views/quizMarkup.js`; `questionStep()` in
  `guidelineQuizPlay.js` builds one question's step exactly as a play does.

- ED-H (owner, 18 Nov 2026): on a guideline's screen, every question stacked as learners see
  it, and clicking any box edits that text. Claude's choices: the box is changed in place (a
  textarea drawn where the text was, Save and Cancel); one item of a list per box; an emptied
  step or wrong answer is taken out, an emptied single text is ignored; changing one shown
  random wrong answer fixes all the shown ones (chosen ones not shown are kept after them);
  "Edit all" keeps the whole form, the only place to leave a question out. The guideline's own
  order under a marked round is not clickable (the cards above it are the same steps). The
  markup is shared through an optional `editing` argument in `quizMarkup.js`; with none, the
  quiz screens are exactly as before.

**Code audit (17 Nov 2026; tidy-up only, rule 9)**

- AU-A: the manager and editor pages share `src/staffPage.js` (tab passcode, asking the backend,
  refusal messages, the warning box); dark mode is in `src/theme.js` for all three pages. Both
  are in `src/`, so `version.json` lists them (its test wants every `src/*.js`); this adds one
  small file to a phone's update, an exception to MV-H.
- AU-B: `content/card-edits.yaml` stays next to the `.js`, as with the other override files
  (ED-A): the YAML is the readable record. Not changed.
- AU-C: left as they are: `attachEventListeners`, `startCardDrag`, `attachWheel`, `chartSvg`
  and `overTimeHtml` are 43 to 53 lines (rule 5 says normally under 30); the rest is mostly
  markup or listeners sharing local state, and splitting further would make them harder to
  follow. The manager and editor sign-in screens are still two functions because their covers
  now differ.

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

Answered 16 Nov 2026:

- **Feature 11** (old items 2 to 5): recorded as Z18 to Z21 in 8.2; the owner accepted the
  built options for Z20 and Z21.
- **Guideline quiz, numbers:** the dose-number questions are good as they are (Z14 review
  closed).
- **Guideline quiz, red flags (changed 16 Nov 2026):** keep the "Which of these is a red flag"
  questions, at most three a play. The code already asks at most two
  (`RED_FLAG_QUESTIONS_PER_PLAY`), so nothing changes. The earlier to-do to remove them is
  cancelled.
- **Rationale (red-flag explanation) questions: withdrawn** by the owner, 16 Nov 2026.
- **Mentor question editor:** not needed, given how questions are built. Superseded 17 Nov 2026:
  an editor page was asked for (feature 13).
- **Quiz pill:** guidelines with no quiz show no pill (a disabled pill would confuse).
- **Publishing St John's text:** the owner has permission from their medical director.
- **Real-phone checks:** all done and passed.

### 8.4 Open tasks (owner, by hand)

1. Done 16 Nov 2026: `backend/Code.gs` redeployed (see task 8).
2. No longer needed (mentors removed 18 Nov 2026): the `Mentors` tab can be deleted.
3. **Email filter** on the subject "NZCPG study app:" for the report address.
4. **Delete nine merged branches on GitHub** (all fully merged, checked 16 Nov 2026):
   `feature-6-converter`, `feature-6-pdf-check`, `feature-quiz`, `guideline-quiz`,
   `layout-and-switch-back`, `ordering-and-report`, `quiz-by-medicine`,
   `quiz-practise-medicine`, `review-items`; and the two left by the 16 Nov test run,
   `pdf-update-test` and `test-pdf-check`. Claude's workspace cannot delete branches (git and
   the GitHub API both refuse, checked 16 Nov 2026); the owner deletes them on
   <https://github.com/Dklapaukh/CPGstudy/branches/all> (bin icon on each row, never `main`).
5. **Morphine 14.32:** the owner is telling the guideline coordinator that the PDF page is cut
   short.
6. **When the first real PDF update arrives:** read the "Check formatting" list in the pull
   request before merging, and run `node scripts/practice-level-review.js` on its branch to
   check what each practice level is shown (the pull request's check list says so).
7. **If commits stop for 60 days**, GitHub pauses the daily PDF check (8.5 item 5): press
   "Enable workflow" on the Actions tab, "pdf-check".
8. Done 16 Nov 2026: manager view switched on. The first redeploy missed the app's address
   (fixed by redeploying with Manage deployments, New version); the owner confirmed the page
   works with the real Sheet.
9. **Switch on the editor page** (README, "Editor page", "Switching it on"): paste and redeploy
   `backend/Code.gs` and run `setup`, then fill the new `Editors` tab.
10. **Switch on sign-up and the demo** (README, "Demo and sign-up", "Switching it on"): paste
    `backend/Code.gs`, run `setup` and allow "Send email as you", redeploy as a new version,
    and check a `Trackers` row is labelled `demo`. Until then first visits show the passcode
    screen and Make an account fails. Anyone who used a mentor passcode on the manager page
    needs a `Managers` row and `Assignments` rows.

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
13. The README describes the app as it is now. The change log gets a short dated entry per change.

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

## 13. Status

**18 Nov 2026 (mentors removed).** Owner's choice ("remove completely"): self sign-up replaces
mentors. Gone: the app's mentor screen, mentor sign-in, the backend's "create" action, the
`Mentors` tab, the placeholder passcode check, and the manager page's mentor role (managers
see `Assignments` only). Tracker passcodes made by mentors keep working.

**18 Nov 2026 (sign-up).** Feature 15 on `main`: first visits open the `demo` tracker with a
Make an account banner; sign-up takes a name and makes a passcode; the owner is emailed for
each (no email, no account); bot checks are a hidden box, 3 s minimum and 20 an hour (Claude's
choice, owner asked for "something to stop bots"). Needs 8.4 task 10. Open: the demo is shared
by every visitor, so their marks mix; if that is a problem, the demo could be made read-only.

**18 Nov 2026 (later).** On `main`, checked with `npm run check` and seen in headless Chrome at
phone size (not yet on a phone): editing a question's text in place by tapping it (ED-H).
**Next:** the owner tries it on a phone, then looks at the power-up (ST-H) as before.

**18 Nov 2026.** On `main`, checked with `npm run check` and frames seen in headless Chrome
(not yet on a phone): the super Saiyan power-up (ST-H). **Next:** the owner watches it on a phone
via the demo tracker's double tap and says if the timing or poses want changing.

**17 Nov 2026 (late night).** On `main`, checked with `npm run check` and seen in headless
Chrome (not yet on a phone): the whole-body streak rat and the separate hype rat power-up
(ST-G), and the editor showing each question as learners see it (ED-G). **Next:** the owner
looks at both on a phone (the power-up via the demo tracker's double tap).

**17 Nov 2026 (night).** The new rat and power-up (ST-E) and the demo double tap (ST-F) are on
`main`, checked with `npm run check` and frames of the power-up seen in headless Chrome. Not yet
seen on a phone. **Next:** the owner tries the demo tracker's double tap on a phone.

**17 Nov 2026 (evening).** Three changes on `main`, each checked with `npm run check`: the
editor page layout (ED-F; seen in headless Chrome, not yet on a phone), the streak power-up
closing only on Continue (ST-D), and the code audit (AU-A to AU-C). The audit: one quizzed list
shared by `quizzedGuidelines()` and `playContext()`; one `shuffled()`; shared manager and editor
code; unused exports made private; a comment on every function; three long functions split;
section 10 (style guide) put back in this file, as `CLAUDE.md` and rule 8 refer to it. No
behaviour change: same tests, and the card drag compared old against new. **Next:** the owner
looks at the editor page and the power-up on a phone; then 8.3 and 8.4 as before.

**17 Nov 2026 (later).** Feature 14, the study streak and the Data tab, is on `main`. Decisions:
ST-A, a streak day is a local calendar day with at least one finished quiz (a Medicines study
or practice session run to the end, or a guideline quiz play); a streak from yesterday still
counts until today ends. ST-B, the days are one extra entry `study-streak` (no backend change;
its id has no prefix the backend reads). ST-C, the Data tab shows streak, longest streak, quiz
days, a 12-week grid, a light "rat rank", and guideline and Medicines numbers. Not yet seen on
a real phone.

**17 Nov 2026.** Feature 13, the editor page (`editor.html`), is built and on `main` (ED-A to
ED-E). It needs 8.4 task 9 before editors can sign in. The study app now applies published
edits; with none published it behaves exactly as before (same plays, checked by test).

**Next step (owner's request, 17 Nov 2026): a code audit**, in a fresh chat. Check that the
code is clear and concise, has no unnecessary repetition, and can be audited easily. A tidy-up
only: no behaviour change (rule 9). Known places to look first: `quizzedGuidelines()` and
`playContext()` both build the quizzed list; the editor page borrows `manager.css` class names
(`manager-container`, `person-link`, `stats-note`); `sync-edits.js` writes both a YAML record
and the JS the app loads.

**16 Nov 2026.** Features 3 to 12 are built and live on `main`. No feature is in progress.

Latest: feature 11, the Medicines quiz's practice level (ATP) filter now works by route and
indication (Z18 to Z22). With a level chosen: EMT 3 cards with greyed lines and 9 dropped;
Paramedic 3 and 18; ICP 4 dropped (RSI rows); CCP everything. The owner saw the review list
(`node scripts/practice-level-review.js`) and it went live on `main` on 16 Nov 2026. Not yet
looked at on a real phone: the greyed lines and their label.

Before it: the manager view (feature 12, decisions MV-A to MV-I) is on `main` at `manager.html`.
The owner switched it on and confirmed it works with the real Sheet (16 Nov 2026), after a
fix: the first redeploy missed the app's address, and the page now names that case.

**Next steps:** the owner does 8.4 tasks 2 to 4 and answers 8.3 items 1 and 2 (item 2, Midazolam for
eclampsia at Paramedic level, had no recommended option, so it stays as built: not shown). In a
fresh chat: fix 8.5 items 1 to 3 and 6.
