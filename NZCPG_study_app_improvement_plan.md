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
| 9    | Guideline quiz (ordering, number and course-changing questions) | Built; red-flag questions to be removed |

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

### 8.3 Open decisions (owner)

1. **Decision D again: how a new PDF is published** (asked 16 Nov 2026, unanswered). The owner
   wants the app to update by itself when the guidelines change. Today a pull request opens and
   nothing reaches phones until the owner merges it; then each phone shows a banner and updates
   when "Update now" is tapped (Decision U).
2. **Medicines quiz dose cards to drop.** The 23 Adrenaline, Midazolam and Morphine indication
   cards were listed for the owner on 16 Nov 2026; no answer yet.

Answered 16 Nov 2026:

- **Guideline quiz, numbers:** the dose-number questions are good as they are (Z14 review
  closed).
- **Guideline quiz, red flags: not to be tested as a memory item**, because red flags are always
  checked. **To do:** remove the "Which of these is a red flag" questions. Possible replacement,
  to be designed with the owner: where a guideline gives the rationale for a red flag under a
  heading that matches the flag, ask the student to match the rationale to the flag.
- **Mentor question editor:** not needed, given how questions are built.
- **Quiz pill:** guidelines with no quiz show no pill (a disabled pill would confuse).
- **Publishing St John's text:** the owner has permission from their medical director.
- **Real-phone checks:** all done and passed.

### 8.4 Open tasks (owner, by hand)

1. **Redeploy `backend/Code.gs`** if not done since 11 Nov 2026 (README, "Backend"). Until then
   the live backend may still accept the placeholder mentor passcode. Not verifiable from here.
2. **Check that the placeholder mentor passcode was changed** in the Mentors tab.
3. **Email filter** on the subject "NZCPG study app:" for the report address.
4. **Delete nine merged branches on GitHub** (all fully merged, checked 16 Nov 2026):
   `feature-6-converter`, `feature-6-pdf-check`, `feature-quiz`, `guideline-quiz`,
   `layout-and-switch-back`, `ordering-and-report`, `quiz-by-medicine`,
   `quiz-practise-medicine`, `review-items`.
5. **Morphine 14.32:** the owner is telling the guideline coordinator that the PDF page is cut
   short.
6. **When the first real PDF update arrives:** read the "Check formatting" list in the pull
   request before merging.
7. **If commits stop for 60 days**, GitHub pauses the daily PDF check (8.5 item 5): press
   "Enable workflow" on the Actions tab, "pdf-check".

### 8.5 Features that can fail without telling anyone (found 15 Nov 2026)

| #   | What happens                                                                                                                                                                                                                                              | Where                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | **Notes longer than 5000 characters are cut by the backend with no warning.** The phone that typed them keeps the full text and shows "Saved"; every other phone and the mentor get the cut version, and the tail is lost when one of them edits.          | `cleanChange_` in `backend/Code.gs`; the notes box has no length limit |
| 2   | **"Saved" is shown even when the backend ignored a change.** The reply says how many changes were saved; the app never reads it. A change with an older time than the Sheet's, or an id the backend refuses, is dropped and then removed from the queue. | `syncNow` in `src/sync.js`                   |
| 3   | **Unsent edits are deleted without asking** when a sync is answered "passcode not found" (a passcode changed or removed in the Sheet). The message is shown, but the edits are gone.                                                                      | `syncNow`, `signOut` in `src/navigation.js`  |
| 4   | **Fixed 16 Nov 2026.** The daily PDF check skipped a new PDF for ever, with a green run, when a branch `pdf-update-<date>` was left behind. It now skips only while a pull request for that PDF is open, and deletes a leftover branch and builds again. | `.github/workflows/pdf-check.yml` |
| 5   | **GitHub switches off scheduled workflows after 60 days with no repository activity**, so the PDF check stops once commits stop. Not worked around: the usual keep-alive tricks exist to defeat this rule and may break GitHub's terms. See 8.4 task 7. | GitHub |
| 6   | **A blank page with no message** when any app file fails to load: no signal on open (no service worker), or a phone loading a mix of old and new files in the roughly 10 minutes after a push. There is no error handler and no fallback text.            | `index.html`, `src/main.js`                  |
| 7   | **App code updates are never announced** (Decision T). A phone that keeps the page open runs old code until it is reloaded.                                                                                                                                | `src/updateState.js`                         |
| 8   | **A damaged saved entry is read as empty**, and the next save replaces it: a medicine's whole quiz schedule, the queue, a setting. Two phones rating the same medicine before syncing: the newer save replaces the other's ratings.                       | `parseSchedules`, `parseQueue`, `storedSettings` |
| 9   | **"Mark for review after N days" trusts the phone's date.** One phone with a wrong date moves Complete guidelines to Needs review for everyone on the tracker; there is no undo.                                                                           | `applyAutoReview` in `src/settingsState.js`  |
| 10  | **Blocked or full phone storage** is reported on the list and guideline screens only. Quiz ratings, scores and settings made offline are then lost on closing, with no message on those screens.                                                          | `saveSession` in `src/state.js`              |
| 11  | **The report button does nothing** on a phone with no email app set up.                                                                                                                                                                                    | `src/report.js`                              |
| 12  | **CI installs whatever dependency versions are newest** (`package-lock.json` is ignored by git), so the checks or the PDF converter can change behaviour with no change in the repository. The daily `--check` run would show a converter change as red. | `.gitignore`, both workflows                 |

---

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

**16 Nov 2026.** Features 3 to 9 are built and live on `main`. No feature is in progress.

Last change: the daily PDF check was made safer and testable. It no longer skips a PDF because
of a leftover branch, assigns the pull request to the owner (a notification), and has a test run
(README, "Daily check").

**Next steps:** the owner answers 8.3 items 1 and 2. Then, in a fresh chat: remove the red-flag
questions and design the rationale question (8.3), and fix 8.5 items 1 to 3 and 6.
