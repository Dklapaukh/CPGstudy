# NZCPG Study App – Improvement Plan

Status: refactor steps 1 to 8 of section 11 are done (11 Nov 2026), with no change in behaviour. See section 13 for the current status and next step.
Based on: `index.html` (the attached latest version, guideline content exported 24.09.2026) and `Code.gs` (the Apps Script backend). After the refactor the app is a folder of files (see the README in the repository); the 1.3 MB single file no longer exists.

Revision 2: added the backend review, the hosting and PDF source details, and a GitHub-based update pipeline. Items I could not verify are marked **Unverified**.

Revision 3: **no view tracking.** The app records only when a guideline is marked Complete or Review, not when it is opened. This removes the "last viewed" field and most of the backend complexity from revision 2.

Revision 4: added working rules (section 0), a consolidated open questions list (section 8), a code review (section 9), a style guide for readable code (section 10), a refactor plan (section 11), a handoff prompt for new chats (section 12) and a status log (section 13).

---

## 0. How we work (rules for every session)

### Token efficiency

Work is done in as token-efficient a way as possible. Every message in a chat makes Claude re-read the whole conversation, so long chats and large file dumps are the main cost.

1. **Never read the whole app file.** `index.html` is about 1.3 MB, and about 1.27 MB of that is one line of guideline data (line 102 of the current file). Read only the code (lines 103 onward) or a specific line range, using `grep`, `sed` or `cut`. Never print the data line.
2. **Edit with targeted replacements.** Do not re-print or rewrite whole files, and do not paste large blocks of code into the chat. Deliver changed files and summarise in a few sentences.
3. **This document is the project memory.** Record decisions and status here. Do not repeat analysis that is already written here.
4. **Ask all questions in one message.** Present only the questions that are relevant to the next step (see "Questions" below).
5. **Verify by running checks, not by reading code back.** Use syntax checks, tests and the behaviour checklist in section 11.
6. **One phase or feature per chat.** Starting a new chat is cheaper than carrying a long history. When the conversation has grown long, when a phase finishes, or when the topic changes, Claude says so and gives a ready-to-paste prompt (template in section 12) so the new chat starts with only the files, this document and a short task.
7. **Update sections 8 and 13 before ending a chat**, so the next chat can start from them.

### Questions

8. All unanswered questions live in section 8.
9. Whenever questions are unanswered and relevant to the next step, Claude presents them in the chat with the **full text of every option, never abbreviated**, and then records the answers in section 8 and section 13.

### Code quality

10. All new and changed code follows the style guide in section 10, so that a human programmer can audit it without help.
11. A refactor changes how code is written, not what it does. Behaviour changes are made separately.

---

## 1. How the app works today (what the plan has to fit around)

| Area | Current state |
|---|---|
| Delivery | One self-contained HTML file, about 1.29 MB, no service worker, no build step |
| Content | 180 guidelines in 14 sections, embedded as JSON in `<script id="d">` (about 1.27 MB of the file) |
| Content structure | Each guideline has `id`, `n` (e.g. 3.12), `t` (title), `hc` (header colour) and `b` (blocks). Block types: heading, paragraph, bullet, key-line, box, table |
| Progress | Three states per guideline: `i` Incomplete, `v` Review, `c` Complete, plus free-text notes |
| Timestamp | One field, `t`, set whenever the status **or the note** changes. Because note edits also change it, it cannot be used as the "last reviewed" date |
| Storage | `localStorage` key `eas-cpg-tracker-v2`, plus a pending-changes queue `P` |
| Sync | Google Apps Script web app. Passcode login, `load` and `save` actions, polled every 30 seconds. Merge rule is last-write-wins per guideline using `t` |
| Sharing | A tracker is shared by everyone who has its passcode (mentee and mentor). Mentors can create trackers |
| Navigation | Hash routing (`#cpg-3-12`), a list grouped by section with filter chips and search, previous and next links on the detail page |
| Progress display | A single stacked bar plus counts: complete, to review, not done. Section headers show `done/total` |
| Backend | `Code.gs`, a Google Apps Script web app on a Google Sheet with tabs Mentors, Trackers and Data. Actions: `open`, `load`, `save`, `create` |
| Backend data | The Data sheet has one row per tracker and guideline with columns Key, Tracker passcode, Guideline, Status, Note, Updated (ms). Only status, note and the timestamp are stored or returned |
| Hosting | GitHub repository `Dklapaukh/Mentoring`. **Unverified:** I could not open the repository (the fetch was rate limited), so I do not know whether it is served by GitHub Pages or how the file is laid out |
| Version info | 156 of 180 guidelines contain a "Version history" block in their text. Each guideline carries the footer "exported 24.09.2026" |

### Three findings that shape the design

1. **`t` cannot be reused for "last reviewed".** It also changes when a note is edited, so a note tweak would restart the review clock. A separate field, `r`, is needed that changes only when the status is set to Complete or Review.
2. **`r` can travel with the status change.** Because `r` is written in the same save as the status, it follows the existing last-write-wins rule. No separate merge rule is needed, and the shared tracker (mentee and mentor on one passcode) stays consistent: everyone sees the same review dates.
3. **Guidelines almost never link to each other explicitly.** Only 1 of 180 guidelines contains a literal "CPG EAS x.y" reference. Related guidelines have to be found by other means (see feature 5).

---

## 2. Feature list at a glance

| # | Feature | Size | Needs backend change? |
|---|---|---|---|
| 1 | Show when a guideline was last reviewed (marked Complete or Review) | Small | Yes (new field) |
| 2 | Flag guidelines not reviewed for X days | Small | Optional (setting) |
| 3 | Completion rings: overall and per section | Small–medium | No |
| 4 | Suggest a random guideline to review | Small | No |
| 5 | Related-guideline review queue | Large | Optional (queue persistence) |
| 6 | Check for guideline updates from the PDF | Large | Yes, plus a new build step |
| 7 | Prompt the user to update the app | Medium | No |
| 8 | Medicines quiz: flashcards with spaced repetition | Medium | No (stored as entries) |

---

## 3. Data model and backend changes (foundation for 1, 2, 4, 5)

### New per-guideline fields

- `r` – last reviewed timestamp. Set when the status is changed to Complete or Review, and nowhere else. Opening a guideline records nothing.
- `ver` – the guideline version the person last completed against (needed for feature 6; can be added later with feature 6).

Existing saved data has no `r` or `ver`. For guidelines already marked Complete or Review, the app can fall back to the existing `t` as an estimate of the review date until they are next reviewed. Missing `r` on an Incomplete guideline means "not reviewed yet".

### What has to change in `Code.gs`

I read the backend and these are the changes. They are now small:

1. **Store and return `r`.** `readData_` returns `s`, `n`, `t` and `save_` writes columns 4 to 6. Fix: add column G "Last reviewed" (and column H "Version" when feature 6 is built), return them from `readData_`, and write them in `save_` alongside the status.
2. **No special merge rule.** Because `r` is saved together with the status under the existing "newest `t` wins" check in `save_`, it needs no separate logic. Use the same check on the app side in `merge()`: copy `r` when the server record is accepted.
3. **Set `r` only on a real review.** The app sets `r` when the person changes the status to Complete or Review. Editing a note must send the existing `r` unchanged, not a new one.
4. **Write volume does not increase.** Saves happen only when status or notes change, as they do now. The extra 30-second polling load is unchanged.
5. **Settings storage.** If the stale threshold and queue size are shared (Decision E), they need a home. Simplest option: a new Settings tab keyed by tracker passcode, with a `settings` action to read and write it. If settings are per device, no backend change is needed.
6. **Update information.** A new `content` action (no passcode needed, it holds no private data) returns the current content version and the changed-guideline list from feature 6.
7. **Deployment.** Edit the existing deployment and choose "New version", so the web app URL stays the same. Old copies of the app on phones keep working because they ignore the new fields and the existing response shape is unchanged. Deploy the backend before the app.

The `Code.gs` input checks (id format, status values, 5000-character note limit) are sound and should stay as they are.

---

## 4. Feature details

### Feature 1 – Show when a guideline was last reviewed

**What the user sees**

- On the list: a muted line under each title, for example "CPG EAS 3.12 · Reviewed 12 days ago", or "Not reviewed yet" for Incomplete guidelines.
- On the detail page: "Last reviewed 28 Oct 2026 (Complete)" next to the existing "Updated" hint.

**Key design decisions**

- "Reviewed" means the status was set to Complete or Review. Opening a guideline is not recorded.
- A guideline already marked Complete has no way to record a second review, because tapping Complete again changes nothing. Suggested solution: when a guideline is already Complete, show a "Reviewed again today" button that updates the date without changing the status. See Decision A.
- Use relative wording ("12 days ago") on the list and full dates on the detail page.

### Feature 2 – Flag guidelines not reviewed for X days

**What the user sees**

- A small amber "Not reviewed in 30 days" tag on the list row.
- A new filter chip: "Overdue (N)".
- A setting for the number of days, with an off position.

**Key design decisions**

- Flagging applies to guidelines marked Complete (that is where forgetting matters). Guidelines marked Review are already flagged by their status. Incomplete guidelines show "Not reviewed yet" and are not counted as overdue.
- Suggested default threshold: 30 days, adjustable from 7 to 90.
- Show the overdue count on the cover so it is visible without opening the filter.

### Feature 3 – Completion rings (overall and per section)

**What the user sees**

- One large ring on the cover replacing or sitting beside the current bar. The ring shows the percentage complete, with a second arc in orange for "to review".
- A small ring in each section header, replacing the `done/total` text on the right, with the count kept as a label.

**Key design decisions**

- Rings are drawn as inline SVG circles, so no libraries are needed and they work offline.
- A ring segment per state (complete green, review orange, remaining grey) keeps the same colours the app already uses.
- Optional second ring or tint for stale guidelines, so a section that is "complete but going stale" looks different from one that is genuinely fresh. Decide later; build the basic ring first.
- Ring percentages should recalculate whenever the sync merge changes data, using the existing refresh function.

### Feature 4 – Suggest a random guideline to review

**What the user sees**

- A "Suggest one" button on the list screen. It opens one guideline with a short reason, for example "Not reviewed for 41 days".

**Key design decisions**

- Use weighted random, not pure random, so it favours: stale guidelines, then guidelines marked Review, then Incomplete, then everything else.
- Avoid repeating the last few suggestions in a row (keep a short history of the last 5).
- Optional scope: all guidelines, or only the section the person is currently looking at.
- Optional "skip" button that draws another one.

### Feature 5 – Related-guideline review queue

**Goal:** similar guidelines get reviewed together to improve retention, without producing a long, discouraging list.

**What the user sees**

- At the bottom of a guideline (and when marking it Complete or Review), a "Review these next" panel of at most 5 related guidelines, each with a one-line reason such as "Mentioned in this guideline" or "Same section".
- A "Review queue" progress strip: "2 of 5 done".
- When the queue is finished, the next guideline the person opens generates a fresh queue.
- A "Recommended" block that is always available, not just at the end of a guideline.

**How relatedness is calculated**

Explicit "CPG EAS x.y" references only exist in 1 of 180 guidelines, so they cannot be the main source. A link graph is built ahead of time (when the content is generated), not while the app runs, from these signals:

1. Title mentions. A scan of guideline text (excluding the Version history block) for other guidelines' titles. Raw results are noisy: the median guideline mentions 4 other titles and the maximum is 31, so the matches must be scored, not simply listed.
2. Medicine mentions. Non-medicine guidelines mention about 2.5 medicine titles each on average. A guideline that uses adrenaline links to the Adrenaline medicine guideline, and guidelines that share medicines link to each other.
3. Same section or adjacent numbering (for example the croup, stridor and bronchiolitis guidelines).
4. Manual overrides: a small hand-edited file of pairs to force-add or remove, because clinical judgement beats text matching.

Each link gets a score; the queue takes the top 5 by score.

**Keeping the list short (the main risk)**

- Hard cap of 5 per queue, adjustable in settings (3, 5 or 8).
- Exclude guidelines reviewed in the last few days, and guidelines already in the current queue.
- Prefer guidelines that are stale, Review, or Incomplete over ones already fresh and complete.
- The queue is generated when a guideline is marked Complete or Review, and does not grow while it is being worked through. A guideline in the queue is ticked off when it is marked Complete or Review. Only after the queue is finished does the next guideline marked start a new one.
- Medicine guidelines should count as lower-weight links, since 46 of the 180 guidelines are medicines and they would otherwise dominate every list.

**Storage:** the queue only needs to survive the session; it can be kept in `localStorage` per device. Persisting it through the backend is optional.

### Feature 6 – Check for guideline updates from the PDF

**The source (from what you told me)**

You said the guidelines page at `cpg.stjohn.org.nz/tabs/guidelines` has a download option for the EAS guidelines, among three download links, and that the EAS one is the one to use. **Unverified:** I could not open it. The site is a JavaScript app, so fetching the page returns only page metadata, and I cannot see the link behind the button. I need the direct file address (long-press or right-click the EAS download button and copy the link). Please also paste it without the `?fbclid=...` tracking part, which is not needed.

What I did find: the site also hosts single-guideline PDFs at addresses of the form `cpg.stjohn.org.nz/assets/pdf/guidelines/<guideline title> - EAS.pdf`, each stamped "Uncontrolled document exported <date>". These are a possible fallback source, but your chosen single EAS download should be the primary one.

**The practical constraints**

- A browser app cannot normally download a PDF from another website, because the other site must allow it (CORS). This is not something the app can control.
- Apps Script can download the file (`UrlFetchApp`) and run on a timer, but it has no built-in way to read text out of a PDF. It is good for checking whether the file has changed, not for converting it.
- A PDF does not keep the structure your app uses (coloured headings, key-lines, boxes, tables), so converting it back into the app's content is lossy. A manual check is needed before anything is published.
- The "exported" date on the PDF is when it was generated, not when the content changed. The real change signal is each guideline's "Version history" entry (for example "28 October 2024 1.0.5 Update…"), which 156 of your 180 guidelines have.
- **Unverified:** St John's terms of use for the guideline PDFs. An automatic download on a schedule is worth clearing with whoever manages the CPGs, particularly as the documents are marked uncontrolled.

**Recommended approach – three stages, using GitHub**

Because the app is already in a GitHub repository, a **GitHub Action** on a schedule is a better fit than Apps Script for the PDF work:

*Stage A – Detect and notify (do first).* A scheduled Action (for example daily) downloads the EAS PDF, compares a fingerprint (file hash and size) with the last one, and, when it has changed, extracts the text with a PDF tool and reads each guideline's newest version-history entry. It writes a small `content-version.json` to the repository containing the PDF export date, a content version number, and a list of guideline ids with their latest version. If nothing changed, it does nothing. The app fetches that small file from its own site (no CORS problem) and compares it with the version it ships with.

*Stage B – Semi-automatic update.* When a change is detected, the Action also builds the new content file and opens a **pull request** instead of publishing. You review it (a changed-guideline summary is included), merge it, and the app picks it up. This keeps the manual check in place.

*Stage C – Fully automatic (only if A and B prove reliable).* The Action publishes without the review step.

For the app to use updated content without being re-uploaded, the 1.27 MB of guideline data would move out of `index.html` into its own `content.json`, cached on the phone. This also makes updates smaller and faster.

**What happens to a person's progress when a guideline changes**

- Progress is keyed by guideline `id`, so ids must stay stable across updates. The extraction step must match guidelines by number (e.g. 3.12), and any new, removed or renumbered guideline must be flagged in the pull request.
- If a guideline they marked Complete has a newer version than their stored `ver`, show an "Updated" badge and offer to move it to Review. This also creates a natural revision prompt.
- Keep a short "What changed" line taken from the version-history entry.

### Feature 7 – Prompt the user to update the app

**What the user sees**

- A banner at the top: "A new version of the guidelines is available. Update now."
- Guidelines that changed are tagged "Updated" in the list.

**Key design decisions**

- Check on open and when the app returns to the foreground (the app already listens for both events).
- The app has no service worker, so updating means fetching the new content and reloading. A service worker would also make the app work fully offline, which is a useful extra for use on shift, but it is a separate decision.
- Never update while the person is partway through typing a note. Apply on next list view or on tap.
- Show the current content version and the date it was last checked in a footer or settings area.
- Always show a "Guidelines exported <date>" line. The source documents are marked uncontrolled, so the app should make clear it is a study aid and the official site is the reference for clinical use.

---

## 5. Suggested order of work

0. **Refactor first, with no behaviour change** (section 11), if Decision H is answered "refactor first". Every feature below then lands in readable code.
1. **Foundation:** the `r` field, the small backend update to store it, and a settings object.
2. **Features 1 and 2:** last reviewed and stale flagging (they depend directly on the new field).
3. **Feature 3:** rings (independent, can be done in parallel).
4. **Feature 4:** random suggestion (uses the stale logic from feature 2).
5. **Feature 5:** build the link graph offline, check it manually, then add the queue.
6. **Feature 7 and Stage A of feature 6:** version detection and the update banner.
7. **Stage B of feature 6:** semi-automatic content updates.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| A note edit restarting the review clock | `r` changes only when the status is set to Complete or Review |
| Review queue becomes long and discouraging | Hard cap, exclusion rules, queue not allowed to grow |
| Noisy relatedness (a title mentioned in passing) | Scoring, a cap on medicine links, manual overrides file |
| PDF cannot be fetched from the browser | Do the fetching server-side, never in the app |
| PDF-to-app conversion loses formatting | Keep a manual check step (Stage B) before publishing |
| Phones with blocked storage | The app already shows a warning; new features must degrade the same way |
| Backend (Apps Script) change breaks existing trackers | New fields are optional, missing values treated as "never", deploy backend first, keep the same web app URL by editing the existing deployment |
| Automatic download conflicts with St John's terms | Confirm permission before enabling the scheduled download; Stage A can be switched off without affecting the app |
| A bad extraction publishes wrong clinical content | Pull request review in Stage B, "exported" date shown in the app, study-aid disclaimer |

---

## 7. Testing checklist (when coding starts)

- Old saved trackers (no `r`, `ver`) load without errors, and already-complete guidelines fall back to `t`.
- Editing a note does not change the last reviewed date.
- Two devices on the same passcode: a review on one device appears on the other with the same date.
- Offline use: a review is recorded locally and synced when back online.
- Stale threshold off, 7 days, and 90 days behave correctly.
- Rings show correct values for 0%, 100% and a section with zero completed.
- Queue never exceeds the cap and never repeats a guideline reviewed recently.
- Update banner appears once, not repeatedly, and does not interrupt note typing.

---

## 8. Open questions

Rule: unanswered questions are shown to the user in the chat with full option text whenever they are relevant to the next step (section 0). Answers are moved to the answered log at the end of this section. Note: "Decision I" (automatic checks) and the information items I1 to I4 share a letter. Items are always written "item I1" below.

### Which questions block what

| ID | Topic | Needed before |
|---|---|---|
| G, H, Decisions I, J, K | Code structure and refactor | Answered, see the log |
| A, B, C, F | Feature behaviour | Closed: features 1 and 2 scrapped 11 Nov 2026 |
| E, Z1 to Z4 | Feature 8 (medicines quiz) | Answered 11 Nov 2026, see the log |
| Z6 to Z11 | Feature 8 changes: quiz by medicine, review limit, adult doses from the guidelines, Morphine | Answered 11 Nov 2026, see the log |
| Z5, Z12 to Z16 | Feature 9: guideline quiz (ordering game, distractors, numbers, course-changing questions, saving) | Answered 13 Nov 2026, see the log |
| L, M, N, O, P | Feature 5 behaviour (review queue) | Answered 11 Nov 2026, see the log |
| Q, R, S | Feature 5: where the queue is seen, its size limit, when it clears | Answered 11 Nov 2026, see the log |
| T, U, V | Feature 7 behaviour (update prompt) | Answered 11 Nov 2026, see the log |
| D, items I1 and I3 | PDF update pipeline | Answered 11 Nov 2026, see the log |
| Y | Feature 6 stage B: guidelines the converter cannot rebuild exactly | Answered 11 Nov 2026, see the log |
| Review items R4, R8, R11, R12, R13, C4, C5 | Open review items from section 9 | Answered 11 Nov 2026, see the log |

### Information needed

All answered (I1 to I4). See the answered log.

### Decisions: code structure and readability

All answered (G, H, I, J, K). See the answered log.

### Decisions: feature behaviour

**Scrapped on 11 Nov 2026:** features 1 and 2 (time-based reviews) are dropped. Decisions A, B, C and F are closed and kept below only as a record. Decision E was reworded for the medicines quiz and answered (see the log).

Decision Z5 (quiz for the clinical guidelines) answered 13 Nov 2026 as feature 9, the guideline quiz: see Z12 to Z16 in the log. Open for review, no decision needed to use it: the rules that make wrong numbers (Z14) and the red-flag wrong answers.

**Decision A – How is a second review of an already-Complete guideline recorded?**

- Option 1: A "Reviewed again today" button appears on guidelines already marked Complete. It updates the date and leaves the status as Complete.
- Option 2: Tapping Complete again when it is already selected updates the date. This needs no new button, but an accidental tap resets the review clock.

**Decision B – What happens to the last reviewed date when a guideline is set back to Incomplete?**

- Option 1: The date is cleared, so the guideline shows "Not reviewed yet".
- Option 2: The date is kept, so the guideline still shows when it was last reviewed, even though it is now Incomplete.

**Decision C – What counts toward the completion rings?**

- Option 1: Only Complete guidelines count, as with the current bar.
- Option 2: Complete guidelines count, but a Complete guideline that is overdue for review counts as partial, so the ring slowly drops if it is not revisited.

**Decision E – Where do settings (overdue threshold, queue length) live?**

- Option 1: Shared with the tracker, stored in a new Settings tab, so the mentee and mentor see the same thresholds. This needs a backend change.
- Option 2: Per device only, stored in the phone's browser. No backend change, but settings do not follow the person to another phone.

**Decision F – Queue length**

- Option 1: Fixed at 5.
- Option 2: Adjustable in settings between 3 and 8, default 5.

### Decisions: feature 5 (related-guideline review queue)

All answered (L to S). See the answered log.

### Decisions: feature 7 (update prompt)

All answered (T, U, V). See the answered log.

### Decision: PDF update pipeline

Decisions D and Y answered (see the log). No open questions.

### Answered log

- 13 Nov 2026, feature 9 (guideline quiz). **Z5:** yes, as a separate guideline quiz (your instructions: each top action is a card to put in order; a few cards from guidelines with similar actions or medicines; number questions with generated wrong numbers, to be reviewed; cards for information that changes the course of treatment, leaving out anything that would need AI). **Z12 (rounds): Option 1**, one ordering round per situation (heading or short "If …" line), title shown; rounds of 2 actions or more. **Z13 (distractors): Option 1**, 2 per round, from other guidelines naming the same medicine first, then related guidelines; never the same wording as this guideline. **Z14 (wrong numbers): your own option**, values with the same unit from elsewhere in the guidelines when possible, otherwise ten times (and one tenth); sometimes the right number with a wrong unit. **Z15 (course-changing, my choice from your instruction):** only kinds read from the layout: which situation an action belongs to, red flags, and "If …, move to the … guideline"; conditions inside a sentence are left out (would need AI). **Z16 (progress): Option 1**, best score and date per guideline saved as entry `quiz-order-<id>`. Also my choices: only treatment guidelines (a Backup, Referral and transport or Red flags heading, or "action list"/"checklist" in the title); cards placed by tapping, not dragging; marking by longest run in order; no number questions for Paediatrics, Croup, Bronchiolitis or lines for ages under 15; the 0.9% of "0.9% sodium chloride" is never asked.
- 11 Nov 2026, quiz changes after PR #4 (your instructions: new medicines instead of new cards, all of a medicine's cards at once, no paediatric doses, adult doses from the relevant guidelines, dose cards as "Drug – indication – dose"). **Z6 (what "review cards based on new cards" means): Option 2**, a daily review limit beside the new-medicines setting, **default 30** (range 10 to 200 in steps of 10 is my choice, because the asked default is below the offered 50). **Z7: Option 2**, 1 to 10 new medicines a day, default 2. **Z8: Option 1**, one card per guideline (indication) with all of that medicine's adult doses in it; no question mark, format "Adrenaline – Anaphylaxis – Dose". **Z9: Option 1**, only medicines whose own Dosage section is missing or points elsewhere (Adrenaline, Midazolam, Morphine, plus labelled pointers to a named guideline such as Fentanyl's "post intubation"); others keep their own doses, now "Amiodarone – Cardiac arrest – Dose". **Z10: Option 2**, guidelines with the same adult instructions share one card naming them all. **Z11: Option 1**, Morphine's missing sections wait for St John to fix the export.
- 11 Nov 2026, converter and Morphine findings: **Morphine 14.32 is missing its sections in the source PDF**, not because of the converter. Its page in the 24.09.2026 EAS PDF (page 678) is "Page 1 of 1" and ends after Contraindications (checked by rendering it). The converter gives the recorded rebuild of that PDF (170 of 180 exact). **The old comprehensive edition (2019-22 printed book, 562 pages) cannot be converted, by design**: it has no "CPG EAS x.y" page headers, so the converter finds 0 guidelines and stops with "Not a usable EAS PDF" (the safety guard). It also has no Morphine guideline (its 14.32 is Naloxone), so it cannot fill the gap.
- 11 Nov 2026, choices I made building the quiz changes (say if you want any different):
  - 415 cards (was 522): 102 dosage cards. Paediatric doses removed everywhere: CPG 7.2 and the paediatric RSI table are not used; lines, and sentences inside lines, that name a child and not an adult are removed with the lines indented under them ("0.5 mg for adults and children" stays). The Paediatrics section and Croup and Bronchiolitis (`CHILD_ONLY_GUIDELINE_TITLES`) are never searched.
  - Finding adult doses in a guideline: a top-level bullet and the lines under it form one instruction. If the bullet names the medicine and any line gives its dose (a number with mg, mcg, g, ml or units), the whole instruction is shown; otherwise only the indented lines that dose the medicine, under the bullet. A dose belongs to the nearest medicine named in its line, so "150-200 mcg of fentanyl or 15-20 mg of morphine" is not a midazolam dose. Adrenaline gets 15 indication cards (Spinal Cord Injury and Meningococcal Septicaemia share one), Midazolam 5, Morphine 3. Expect a few odd ones (for example Adrenaline – Bleeding following Trauma gives the topical dilution); tell me which to drop.
  - Doses with no label, when others have labels, are "Other dose" (Ketamine's CPR-movement dose). Groups in a Dosage section with no number and unit are advice, not cards (Midazolam's "use the lower end of a range", Suxamethonium's onset note). Labels taken from the text before a colon are unchanged, so Metaraminol still has "Titrate the dose and frequency to the patient’s blood pressure – Dose".
  - New medicines: a medicine with any card first studied today keeps its remaining new cards without using another place; otherwise the next medicines with unstudied cards, in guideline order. Medicines partly studied under the old per-card setting count as new medicines for their remaining cards.
  - Review limit: counts cards first studied before today and answered today (worked out from the schedule, no new data); a card rated Again today always comes back. Settings stored together in `quiz-settings` as `{ newMedicinesPerDay, reviewsPerDay }`; the old `newPerDay` is ignored.
  - Schedules for removed cards (paediatric bands, the old Adrenaline and Midazolam "Dosage" cards) are left in the notes and ignored.
- 11 Nov 2026, feature 8 (medicines quiz) answers: **Decision E (reworded: where quiz progress is stored): Option 1**, through the backend as entries. **Z1: Option 1**, four buttons Again, Hard, Good, Easy (SM-2). **Z2: Option 2**, the medicine's own Dosage section plus the doses in the guidelines it points to, and each unique dose is its own card (only for dosage). **Z3: Option 2**, new cards per day adjustable 5 to 30, default 10. **Z4: medicines only for now** (all 45 medicines, all topics). Features 1 and 2 are scrapped. The old comprehensive-edition PDF is for checking the converter, next chat.
- 11 Nov 2026, choices I made building feature 8 (say if you want any different):
  - Cards are built from the content in the app on each start (no generated file), so a PDF update changes them automatically. 522 cards: 45 each for Indications and Contraindications, 44 each for Cautions, Common adverse effects, Usual onset, Usual duration and Mechanism, and 212 dosage cards (86 from each medicine's own Dosage section, 116 from the CPG 7.2 paediatric weight bands, 10 from the CPG 9.3 RSI tables).
  - "Unique dose": each top-level dose bullet with a label before a colon ("For RSI: …") is a card, with its sub-points. Neighbouring bullets without a label are kept on one card, because they are usually a first dose and its repeat (Adenosine "6 mg", then the repeat). Bullets that only say "See the paediatric drug doses…" are not cards. Paediatric doses are one card per medicine per weight band (rows with "-" skipped); RSI is one card per table row.
  - Medicines are matched in the dose tables by the first word of their title, with overrides in `TABLE_NAME_OVERRIDES` (Glucose Gel must not match "10% glucose IV"; Prednisone and Prednisolone; Sodium Bicarbonate; the two GTN forms).
  - Progress is one entry per medicine (`quiz-<id>`), not one entry for everything, because the backend cuts notes at 5000 characters (a full set of 522 schedules would not fit) and so two phones only overwrite each other for the same medicine. A test checks the largest medicine fits. Adds up to 46 Data rows per tracker (relevant to C5).
  - Again puts the card back 3 cards later in the same session and makes it due today. First answers: Hard and Good 1 day, Easy 4 days. Afterwards Good multiplies the interval by the ease (start 2.5), Hard by 1.2, Easy by ease × 1.3; ease changes −0.2 / −0.15 / 0 / +0.15, never below 1.3; intervals capped at 365 days. Each button shows its next interval.
  - Due cards come first (oldest first), then new cards in guideline order (14.2 onward, topic order as you listed). Quiz ratings never change a guideline's Complete or Review status.
  - A card keeps its schedule while its key stays the same. If a PDF update rewords a dose label, that one card starts again as new.
  - **Content problem found:** Morphine (14.32) has only 12 blocks in `content/guidelines.js` and is missing Cautions, Dosage, adverse effects, onset and duration, so it has only 7 cards. Likely a converter or source PDF issue; check in the converter chat.
  - Not checked on a real phone: the quiz layout and two phones sharing progress. Checked in phone-size Chromium: overview, card and answer screens, no errors.

- 11 Nov 2026, feature 6 stage B: **Decision Y: Option 2** (the pull request uses the converter's version and lists it under "Check formatting"). You asked whether this covers new and deleted guidelines: it does now, as follows (my choices, say if you want any different):
  - Acceptance test against the 24.09.2026 PDF: **170 of 180 guidelines rebuild exactly**. The 10 that do not (1.3, 1.26, 2.5, 3.14, 3.15, 4.2, 5.4, 6.2, 9.7, 12.6) differ in small details the old content got from its original tool: where a subscript "2" lands, numbered list items, one bordered box, and two tables the old content kept as text (4.2 page 2, 1.26 EWS chart). Chasing them further would mean copying that tool's quirks.
  - A guideline whose rebuilt version has not changed since the last PDF keeps its published text untouched (fingerprints in `content/pdf-rebuild.json`), so the 10 are never rewritten just because the converter differs. A changed guideline takes the converter's version and keeps its id (progress kept); it is listed under "Check formatting" if it is one of the 10.
  - **New guidelines** are added with the id `cpg-<number>`, placed in the section of the guideline before them in the PDF (the PDF has no section names), and listed under "New" and "Check formatting". **Removed guidelines** are dropped from the content and listed under "Removed"; their saved progress stays in the Sheet but is not shown. A renumbered guideline shows as one removed plus one new (its progress does not follow).
  - The converter uses MuPDF (`mupdf` npm package, development dependency only, AGPL licence; it never ships with the app). It writes only escaped text, `<b>` and `<br>`.
  - The pull request now also runs `npm run check` and reports the result. Workflows moved to the v5 actions (Node 24, fixes the Node 20 warning) and a fixed `ubuntu-24.04` image (the Ubuntu 26 notice).
  - If the converter is ever changed, re-run `node scripts/build-guidelines.js EAS.pdf --baseline` with the PDF the content came from, or every guideline looks changed.
- 11 Nov 2026, feature 6: **Item I1:** `https://cpg.stjohn.org.nz/assets/pdf/EAS.pdf`. **Item I3:** yes, permission to download automatically. **Decision D: Option 2** (semi-automatic). You chose Option 3 unless Option 2 can be done without AI; it can (a plain script, same PDF gives the same result), so Option 2. Option 3 is only worth revisiting after the converter has rebuilt real updates exactly. **Question W:** you attached the 24.09.2026 PDF (727 pages, 17.9 MB, a merge of 180 single-guideline PDFs). **Question X:** add `.prettierrc` and `.prettierignore` (done, plus `.gitignore`).
- 11 Nov 2026, feature 6 stage A built (choices I made, say if you want any different):
  - Formatting: the PDF has fonts, colours and drawn boxes but no structure, so rebuilding `content/guidelines.js` from it can change formatting. **Stage A never touches the content.** The converter (stage B) is the next step and is only trusted once it rebuilds the attached 24.09.2026 PDF into the current `content/guidelines.js` exactly (that file is the test).
  - The change signal is the export date plus each guideline's newest version entry, not the file fingerprint (stored for information only), so a re-exported identical PDF does not open a pull request.
  - Checked against the attached PDF: all 180 guideline numbers match the content, and all 156 version entries match in date, version and "Update:" text. A version entry split by a page break (1.12) is handled.
  - The Action runs daily at 18:23 UTC, opens one pull request per new export date (branch `pdf-update-dd-mm-yyyy`, skipped if it exists), and commits only `content/pdf-status.json`. The test that `pdf-status.json` matches the content makes `npm run check` fail on that pull request until the content is rebuilt, on purpose.
  - Needs you, once: GitHub Settings, Actions, General, Workflow permissions, tick "Allow GitHub Actions to create and approve pull requests".
  - The CPG website blocks downloads from Claude's workspace, so the download step has only been checked by you giving the file; the first GitHub run checks it for real.

- No view tracking: only marking a guideline Complete or Review is recorded (revision 3).
- The EAS download on the CPG site is the correct PDF source (the link itself is still needed, see I1).
- The app is hosted in the GitHub repository `Dklapaukh/Mentoring`.
- The code is to be made as easy to read and audit as possible, with written style rules for all future code (section 10).
- Work is to be as token efficient as possible, including using a fresh chat with a new prompt when that is cheaper (section 0).
- 11 Nov 2026, code structure (all answered):
  - **Decision G: Option 2.** Separate readable files, no build step; the page loads them directly (ES modules, so it needs a web server such as GitHub Pages).
  - **Decision H: Option 1.** Refactor first, with no behaviour change. Done (section 11, steps 1 to 8).
  - **Decision I: Option 1.** Automatic formatting and error checking on every GitHub change, plus tests for the logic that matters. In place (`.github/workflows/checks.yml`, `npm run check`).
  - **Decision J: Option 1.** Modern JavaScript (`const` and `let`, arrow functions, modules). `Code.gs` also uses it, so the Apps Script project must use the V8 runtime (Project Settings, "Enable Chrome V8 runtime").
  - **Decision K: Option 1.** The comment button works as before, now in its own file (`src/comments.js`) with tests. The weakness is unchanged: two points that start with the same 70 characters share a highlight (test written to show it).
- 11 Nov 2026, information: **item I2** answered: GitHub Pages serves `index.html` from the `main` branch (so the web address stays the same). **Item I4** answered: you can edit the Sheet and redeploy the Apps Script; the README explains what the script does and how to redeploy. **Items I1 (EAS download link) and I3 (permission to download automatically) are still open.**
- 11 Nov 2026, choices made during the refactor (no behaviour change unless stated):
  - Guideline data is `content/guidelines.js` (data only, one guideline per line, identical content, checked). The export date and source line now come from that file (R9).
  - Entry fields stay `s`, `n`, `t` and the saved-on-phone format stays `{c, l, s, p}`, so nobody is signed out and the backend needs no change to work with the new app.
  - Colours that come from the guideline content are passed as CSS custom properties (`--block-colour`), not as inline styles. Unused CSS (`.danger`, `--am`, `.ui`) was removed.
  - Search results are identical. The search text is now built once per guideline (R8, first half). **Not done, because it changes behaviour:** stripping HTML tags from the search text and waiting about 150 ms after typing (R8, second half).
  - Backend changes that do alter behaviour slightly, as listed in step 6: the wrong-passcode 1.5 s delay now happens after the lock is released (C1); edit times are cut back to at most 5 minutes ahead of the server clock (C2/R10; the 5 minutes is my choice, change `MAX_CLOCK_AHEAD_MS` to adjust); failures return `server-error` instead of the raw error text (C6). The app treats any unknown error as before.
  - Verified without a real phone: 23 app and logic tests plus 3 backend tests pass; for all 180 guidelines the rendered text and element counts match the old code, and 52 filter and search combinations give identical results. **Not yet checked by you on a real phone:** the items marked "by hand" in the README checklist (sections staying open, two devices, offline).

- 11 Nov 2026, scope change by you: **features 1 and 2 (last reviewed date, stale flagging) are skipped for now**; **feature 3 (completion rings) was built instead**. Rules you set: one overall ring and one ring per section; green for Complete, orange for Needs review, empty for Incomplete; a short animation when a ring closes. Choices I made: the rings replace the progress bar (the legend text under it stays); the section ring sits beside the `done/total` count; a closed section ring shows a tick; the animation (arc fills, tick draws, ring pops) plays only when a ring newly reaches 100% while the list is shown, never on first load or when switching tracker, and not when the phone asks for reduced motion. Say if you want any of these different.
- 11 Nov 2026, feature 4 (random guideline) answers: **Q1:** weighted random with Incomplete ranked above Needs review, then Complete (weights 6, 3, 1 in `SUGGESTION_WEIGHT`, `src/constants.js`; change them there). **Q2:** a button marked "Random guideline" opens the guideline immediately, no reason shown, no Skip. **Q3:** scope is the one open section if exactly one is open, otherwise all guidelines (filters and search do not limit the choice). **Q4:** no memory of earlier suggestions, so a repeat is possible. The stale-based ordering from the original feature 4 spec (section 4) is not used because features 1 and 2 are shelved.
- 11 Nov 2026, bug fix: section `done/total` counts were not aligned because one CSS rule pushed both the count and the ring apart. The name now takes the free space and the count has a fixed right-aligned width.
- 11 Nov 2026: new Apps Script deployment address put into `src/constants.js` (`BACKEND_URL`).
- 11 Nov 2026, checks: `npm run check` run on the full repository. All 31 tests pass, including the Random guideline button app test, and lint is clean. The only failure was Prettier on one hand-wrapped line in `tests/logic.test.js`, now fixed. **The zip did not contain dotfiles** (`.prettierrc`, `.prettierignore`, `.github`), so I used a guessed config (print width 100, single quotes, ignoring `content/guidelines.js`, `backend/Code.gs` and this plan) that matched every other file. Do not copy my guessed dotfiles; keep the repository's own.
- 11 Nov 2026, feature 5 answers: **Decision L: Option 1** (related list fixed at 5). **Decision M: Option 2, plus a button** to add related guidelines to a review queue (opening any guideline shows its related guidelines; there is no automatic queue). **Decision N: Option 1** (no always-available Recommended block; see Decision Q for where the queue is seen). **Decision O: Option 2** (queue stored through the backend; needs a `backend/Code.gs` change and an Apps Script redeploy). **Decision P: Option 1** (link score first, then Incomplete, Needs review, Complete; nothing excluded for being recently reviewed).
- 11 Nov 2026: **the repository has no `.prettierrc`, `.prettierignore` or `.github` folder** (you copied everything from GitHub, so they were never added, probably because they are hidden files). So `npm run check` fails on every file with Prettier's default settings, and the automatic GitHub checks (Decision I) are not running. Replacement files were supplied in the chat (print width 100, single quotes; ignore `content/guidelines.js`, `backend/Code.gs`, this plan and `node_modules`; workflow `.github/workflows/checks.yml`). With them, all 31 tests, lint and format pass.- 11 Nov 2026, feature 5 answers (continued): **Decision Q: Option 2** (queue strip on every guideline plus a "Review queue (n)" button on the list screen that opens a Review queue screen, address `#queue`). **Decision R: Option 1** (queue holds at most 5; add buttons show "Queue full"). **Decision S: Option 1** (the queue empties automatically when every item is done).
- 11 Nov 2026, choices I made building feature 5 (say if you want any different):
  - **Decision O (backend) needed no `Code.gs` change and no redeploy.** The queue is stored through the backend as one extra entry with the id `review-queue` (its note holds the queue as JSON), using the normal save and sync path. It follows the person across phones, works offline, and is shared by everyone with the tracker passcode (so a mentor sees it too). It shows as one extra row in the Data sheet. Two devices editing the queue at once: the newest edit wins as a whole.
  - Related list: top 5 by link score, ties broken Incomplete, Needs review, Complete. Links are built offline by `scripts/build-related.js` into `content/related.js` (top 10 kept per guideline). Signals and scores are named constants at the top of that script: title mention 3 (a medicine title 1), titles mentioned by more than 20 guidelines count half, shared medicines 0.5 each up to 1.5, same section 1 (sections up to 20 guidelines), next number 1, manual "add" 10. 11 guidelines have fewer than 5 links, and a few have none (no panel is shown).
  - Ticking off: a queued guideline is done when it is marked Complete or Review while queued. Adding one that is already Complete leaves it not done until it is marked again. Setting a ticked guideline back to Incomplete does not un-tick it.
  - I added a "Remove" button on each queue item (not asked for): with a fixed limit of 5 a queue could otherwise get stuck.
  - The "Review queue (n)" button on the list screen only shows when the queue is not empty.
  - Manual overrides live in `content/related-overrides.js` (empty); run `node scripts/build-related.js` after editing it.
  - Not checked on a real phone: layout of the panels, the Review queue screen, two devices sharing a queue.
  - Not done: the plan's "queue length 3, 5 or 8 in settings" (Decision L chose fixed 5) and "exclude guidelines reviewed in the last few days" (no review dates; Decision P chose no exclusion).
- 11 Nov 2026, feature 7 answers: **Decision T: Option 1** (the banner is triggered by guideline content only, a later export date in `version.json`; app code changes alone do not show it). **Decision U: Option 1** (applied only when "Update now" is tapped; nothing reloads by itself). **Decision V: Option 1** (the "Updated" tag lasts until the guideline is opened on that phone). Format check: **Option 1**, run with the settings recorded in this plan in a scratch copy; the zip again had no `.prettierrc` or `.prettierignore` (`.github` was there).
- 11 Nov 2026, choices I made building feature 7 (say if you want any different):
  - `version.json` at the root holds `guidelinesExportedOn` and `files` (every file the app loads). A test fails if the date differs from `content/guidelines.js` or a file is missing from the list, so publishing new guidelines means committing the content, `content/related.js` and `version.json` together.
  - Only a **later** date counts (dates are `dd.mm.yyyy`), so a stale cached `version.json` can never offer a downgrade. Checks: on open, on `pageshow` and on return to the foreground, at most once a minute (`UPDATE_CHECK_MIN_INTERVAL_MS`). Offline checks fail quietly and retry next time.
  - "Update now" re-fetches every listed file with `cache: 'reload'` (GitHub Pages lets browsers keep files about 10 minutes, so a plain reload could load old copies), then reloads. If any download fails it does not reload (there is no service worker, so a failed reload would be a blank page) and shows "Couldn’t download the update. Check your signal and try again." Unsent edits are saved first and sent after the reload.
  - "Updated" tags are worked out on each phone: fingerprints of each guideline's title and text are stored under their own key `eas-cpg-update-v1` (the saved tracker format is unchanged) and compared when the export date changes. The first run tags nothing. Not shared across phones or with the mentor.
  - The banner sits above every screen (outside the app container, so redrawing it never touches a note). The list screen has a footer: "Guidelines exported <date> · last checked for updates <time>", plus "Study aid only. The guidelines here are an uncontrolled copy; for clinical use refer to the official guidelines. View online at cpg.stjohn.org.nz".
  - Not done: a service worker / full offline mode (a separate decision, see feature 7 in section 4).
  - Not checked on a real phone: banner layout, an update on GitHub Pages end to end.
- **11 Nov 2026 – open review items (section 9).** Every recommendation accepted except R12.
  - **R4: Option 2.** Comments stay inside the notes text. A snippet is the first 70 characters of the point, or one character past the longest start it shares with a different point of the same guideline. Comments written with the older 70-character snippet still highlight (and are still shared by points that start the same way). Points with exactly the same text cannot be told apart.
  - **R8: Option 1.** Search uses the plain words of each guideline (markup and data punctuation removed) and the list is redrawn 150 ms after typing stops. Fixed in passing: the search box used to drop a typed space and lower-case the text on every redraw.
  - **R11a: Option 1.** Secondary text #565c58 everywhere (6.85:1 on white, 6.01:1 on the grey controls).
  - **R11b: Option 1.** Green #1a7d53 (5.12:1 with white text) and orange #b35900 (4.83:1), for buttons, dots and rings. St John header colours inside the guidelines unchanged.
  - **R11c: Option 1.** Base text 15 px (was 13.33 px).
  - **R12: no notice.** You decided it is not needed: the app is not used with patients and no patient information is entered. Closed.
  - **R13: Option 1.** `scripts/contentCheck.js` allows only the six block shapes, `<b>`, `<br>`, `&lt;`, `&amp;`, hex colours and indent levels 0 to 3. It stops a rebuild from the PDF and fails `npm run check`.
  - **C4: Option 1.** The backend refuses the placeholder mentor passcode; passcodes stay plain text in the Sheet. Needs a redeploy of `backend/Code.gs`.
  - **C5: Option 1.** Code unchanged; README says to revisit at about 20,000 Data rows (roughly 110 full trackers) or when a sync takes over 3 seconds.
  - **Converter tidy-up: Option 1.** No change in output intended. Not confirmed against the PDF in the chat (the PDF could not be downloaded there); the daily run and `--check` now fail if the converter stops giving the recorded rebuild.

---

## 9. Code review

### 9.1 Scope and method

- **Read in full:** `Code.gs` (144 lines) and all of the code and styles in `index.html`.
- **Analysed by script, not read line by line:** the guideline content (1.27 MB of data).
- **Not done:** the app was not run in a browser, no tests exist to run, and I could not open the GitHub repository. Findings come from reading the code, so a finding about behaviour is a strong reading, not a confirmed bug.
- Severity: **High** means it badly affects auditing or can cause wrong behaviour. **Medium** means it should be fixed during the refactor. **Low** means worth fixing when the area is touched.

### 9.2 Overall verdict

- **`Code.gs` is in good shape.** It is short, has clear function names, validates its input, and uses a lock to avoid two saves clashing. It needs a few targeted fixes (C1 to C7).
- **`index.html` works but is written in a very compact style that is hard for a human auditor to read.** The main problem is how the code is written and organised, not obvious logic errors. This is fixable without changing what the app does.

### 9.3 Measurements for `index.html`

| Measure | Result |
|---|---|
| JavaScript size | 176 lines in 3 separate script blocks, with about 92 function definitions |
| Long lines (over 120 characters) | 42 of 176 JavaScript lines; the longest is 419 characters |
| Stylesheet | 92 lines, 20 of them over 120 characters |
| Explanatory comments in the code | None found |
| Empty `catch` blocks | 4 |
| Styles written inside the JavaScript | 10 places |
| Content and code | One file; the content is a single 1.27 MB line |

### 9.4 Findings: `index.html`

| ID | Severity | Finding | Recommendation |
|---|---|---|---|
| R1 | High | **Compact, minified-looking style.** One-letter names (`S`, `P`, `K`, `D`, `M`, `q`, `st`, `rb`, `rf`), several statements per line, and very long lines make it hard to follow. | Rename, reformat and comment following section 10. |
| R2 | High | **Code, styles and 1.27 MB of data share one file, and the data sits on a single line.** A content update rewrites the file and changes cannot be compared line by line. | Separate the content from the code (Decision G). |
| R3 | High | **The 2nd and 3rd script blocks are add-on patches.** They change the page after the main code has drawn it, using a `MutationObserver` and a timer that runs every 2 seconds (`setInterval(mark, 2000)`) even when nothing has changed. Behaviour is spread across places. | Fold them into the main drawing code, work from the saved state, and remove the timer and observer. |
| R4 | High | **Comments are fragile** (see Decision K). They live inside the notes text and are found again by matching the first 70 characters. | Decision K. |
| R5 | Medium | **Shared global state.** About 14 variables (`S`, `P`, `view`, `cur`, `flt`, `q`, `busy`, `lastErr`, `fail`, `tm`, `lastY`, `code`, `lbl`, `M`) are changed from many functions. Screens are rebuilt wholesale and the handlers re-attached, and `rf()` has special cases to avoid losing focus and scroll position. | One state object, one drawing function per screen, event handlers attached once. |
| R6 | Medium | **Page built by joining strings with logic inside.** Class names are one letter (`.p`, `.w`, `.r`, `.d`, `.s`, `.q`, `.c`, `.v`, `.i`, `.l1`), and 10 places carry inline styles. | Small template helpers, descriptive class names, styles kept in the stylesheet. |
| R7 | Medium | **Status codes `i`, `v`, `c` and their labels are repeated** throughout the app and again in `Code.gs`. | One named constants table in each file, each pointing to the other. |
| R8 | Medium | **Search is wasteful.** For every keystroke, each guideline whose title does not match is converted with `JSON.stringify` and searched, 180 times, with no pause after typing. The search text also includes HTML tags. | Build the search text once at load (tags removed) and wait about 150 ms after typing stops. |
| R9 | Medium | **Hard-coded document details.** "Uncontrolled document exported 24.09.2026" and the source line are typed into the guideline page code. They will go stale when content updates (feature 6). | Take them from the content file. |
| R10 | Medium | **The phone's clock decides who wins a merge.** A phone with its clock set ahead would beat every later edit from other devices until that date arrives. | Make the backend limit timestamps to the server time plus a small allowance (see also C2). |
| R11 | Medium | **Contrast and text size.** The grey secondary text measures 3.29:1 on white and 2.88:1 on the grey buttons, below the 4.5:1 that WCAG AA asks for normal text. White text on the orange Review state measures 2.53:1, and on green 4.08:1. Base text is 13.33 px. This matters for use in poor light, such as in a vehicle. | Propose darker secondary text and a darker orange for text backgrounds. The St John header colours inside the guidelines are not changed. I will ask before changing the app's own colours. |
| R12 | Medium | **Notes are shared and stored in a Google Sheet, and could contain patient details.** The app gives no warning. | Add a one-line notice under the notes box: do not enter patient-identifiable information. Check this against your service's information rules. |
| R13 | Low | **Content is inserted into the page without escaping.** This is safe only because the content is built into the app and trusted. If content is later downloaded (feature 6), it must be treated as untrusted. | Validate and clean the content during the build step, before it is published. |
| R14 | Low | **Four empty `catch` blocks** hide errors (saving to the phone, copying to the clipboard). | Each should say why the error is safe to ignore, or show a message. |
| R15 | Low | **The passcode is kept in the browser in plain text, and the web address of the backend is in the page.** This is reasonable for a low-risk study tool. Anyone with a passcode can read and change that tracker. | Document it in the README and keep tracker passcodes long and unguessable. |
| R16 | Low | **Small leftovers.** The cover function contains `(btn?'':'')`, which does nothing. The date format is written twice. Open sections are remembered as a property on the `list` function. There are no tests and no explanatory comments. | Tidy during the refactor. |

### 9.5 Findings: `Code.gs`

| ID | Severity | Finding | Recommendation |
|---|---|---|---|
| C1 | High | **A wrong passcode waits 1.5 seconds while holding the lock.** `doPost` takes the lock and then `handle_` sleeps inside it. A burst of wrong guesses makes every other user wait, and requests can fail after the 20-second lock wait. | Check the passcode and apply the delay outside the lock, or use a different throttle. |
| C2 | Medium | **Client timestamps are trusted.** `Number(c.t) \|\| Date.now()` accepts whatever time the phone sends (see R10). | Limit `t` to the server time plus a small allowance. |
| C3 | Medium | **Magic column numbers.** `getRange(row, 4, 1, 3)` and `getRange(row, 6)` break silently when a column is added, which feature 1 will do. | One column map constant used everywhere, including `setup()`. |
| C4 | Medium | **Plain-text passcodes, and a placeholder mentor passcode.** `setup()` adds the passcode `change-this-to-a-long-passcode`. If it is not changed, anyone who guesses it can create trackers. | Check it has been changed, keep the sheet's sharing limited to you, and note this in the README. Hashing passcodes is possible but adds complexity, and I would only do it if you want it. |
| C5 | Low | **Every request reads the whole Data sheet, for all trackers.** Fine at the current size. It will slow down as trackers and notes grow. | Leave for now, and note the size at which to revisit it. |
| C6 | Low | **Raw error text goes back to the phone** (`String(err)`). | Return a generic message and log the details on the server. |
| C7 | Low | **Few explanatory comments.** Only a couple of functions describe their purpose or return value. | Add a short comment on every function (section 10). |

### 9.6 What is already good

- `Code.gs`: lock service, input checks (id pattern, status values, note length), plain-text columns so notes are never treated as formulas, and a consistent trailing-underscore name for internal functions.
- `index.html`: changes are queued and retried when offline, merging is separate from saving, user text is escaped, status buttons use `aria-pressed`, tap targets are 44 to 48 px, and it handles phone safe areas and blocked storage.

---

## 10. Style guide: how all future code is written

Goal: a human programmer who does not know the project can read any function once and explain what it does. These rules apply to `index.html`, its script files, the stylesheet and `Code.gs`. Where code is changed, the changed area is brought up to this guide.

### Names and layout

1. **Full descriptive names.** `guidelineStatus`, not `st`. `pendingChanges`, not `P`. A name says what the thing is or does. No one-letter names except a loop counter.
2. **One statement per line.** No chained statements with commas or semicolons on a single line.
3. **Lines of at most 100 characters.** A formatter enforces this (Decision I).
4. **Descriptive CSS class names** (for example `guideline-row`, `status-button--complete`), not `.r` or `.c`. No styles written inside JavaScript.
5. **Named constants, not magic values.** Status codes, storage keys, time limits, column numbers and colours each have one named definition.

### Structure

6. **Small functions that do one thing.** A function is normally under 30 lines. If it needs "and" in its description, split it.
7. **Logic is kept apart from the screen.** Pure functions (merging, review dates, overdue flags, queue building) take input and return a result, and touch nothing else. They can be tested without a browser.
8. **One state object, one way to draw.** The screen is drawn from the saved state. Code does not reach into the page afterwards to patch it, and there are no polling timers for display changes.
9. **Content is data, not code.** Guideline text lives in its own content file and is never typed into the code.
10. **Group the code by purpose, with a labelled heading for each group**: constants, state, storage, sync, merge, screens, events, start-up.
11. **Modern JavaScript** (`const` and `let`, arrow functions) if Decision J is Option 1. Never `var`.

### Comments and documentation

12. **Every function has a one-to-three line comment** saying what it is for, what it takes, and what it returns.
13. **Comments explain why, not what.** Any rule that came from a real need (for example "viewing must not change the review date") has a comment saying so.
14. **Every file starts with a short header** describing its purpose and what it depends on.
15. **A README in the repository** explains the structure, how to run and publish the app, how the backend and sheet are set up, and how updates are made.
16. **A short change log.** Each change gets a dated one-line entry.

### Safety and quality

17. **No silent errors.** An empty `catch` states why it is safe, or the error is shown or logged.
18. **Treat all text from outside as untrusted.** Escape it before putting it on the page. Content downloaded for updates is validated before it is published.
19. **Accessibility.** Contrast of at least 4.5:1 for normal text, tap targets of at least 44 px, labels on every button, and status never shown by colour alone.
20. **Tests for logic.** Every pure function has tests (Decision I). Fixing a bug starts with a test that shows it.
21. **Small changes.** One purpose per change, with no behaviour change mixed into a tidy-up.

### Apps Script specifics (`Code.gs`)

22. One column map constant for the sheet, one place that defines the status values, a short comment on every function, no work that waits or sleeps while holding the lock, and generic error messages returned to the app.

### Checklist before any change is accepted

- Does every new name say what it is?
- Can each new function be explained in one sentence?
- Are there constants rather than magic values?
- Is the screen drawn from state, with no page patching or timers?
- Do new pure functions have tests?
- Is the README or change log updated?

---

## 11. Refactor plan (no change in behaviour)

Decision H was Option 1, so this ran first. **Steps 1 to 8 are done (11 Nov 2026).** Step 1 baseline: the old files stay in the repository's git history (tag the last commit before this change, for example `before-refactor`, so you can go back). Step 7: tests are in `tests/`. Step 8: the checklist is now in the README and mostly automated (`tests/app.test.js`); the "by hand" items need a real phone. Each step can be checked separately.

1. **Baseline.** Keep a copy of the current files and write the behaviour checklist below.
2. **Separate the content.** Move the guideline data into its own content file and the styles into their own file (shape depends on Decision G). The data line is never printed or read into the chat.
3. **Reformat and rename.** Mechanical changes only: formatting, full names, constants. No logic changes.
4. **Fold in the add-ons.** Merge the 2nd and 3rd script blocks into the main drawing code and remove the timer and observer (R3).
5. **One state object and one drawing function per screen** (R5, R6).
6. **Backend tidy.** Column map, lock fix, timestamp limit, comments (C1 to C3, C6, C7).
7. **Tests** for the pure functions (Decision I).
8. **Re-run the behaviour checklist** and compare with the baseline.

### Behaviour checklist (same result before and after the refactor)

- Sign in with a tracker passcode and with a mentor passcode, and a wrong passcode shows the message.
- Mentor creates a tracker and sees the new passcode; opens an existing tracker.
- List shows 14 sections with correct counts; sections open and close and stay as left.
- Filters (All, Incomplete, Needs review, Complete) and search give the same results.
- Opening a guideline shows all content; previous and next work; the headings fold and unfold.
- Changing status and editing notes saves, and shows "Saving…" then "Saved".
- Two devices on the same passcode show the same data after a sync.
- Offline: changes are kept and sent when signal returns.
- Comment button adds to the notes and highlights the point (or the behaviour decided in Decision K).
- Switch tracker and sign out work.

---

## 12. Handoff prompt for a new chat

Use this when Claude recommends a fresh chat (section 0, rule 6). Attach this document, `index.html` and `Code.gs`, and replace the text in the square brackets.

```
I'm continuing work on my NZCPG study app (GitHub: Dklapaukh/Mentoring).
Attached: the plan (NZCPG_study_app_improvement_plan.md) and [the repository as a zip, or only the
files this task touches, for example src/logic.js and backend/Code.gs].

First read the plan: section 0 (working rules), section 8 (open questions and the answered log)
and section 13 (status). Follow section 10 for all code. Read the README, then only the files this
task needs. Do not read content/guidelines.js: it is 1.3 MB of guideline data.

Task for this chat: [one task, for example "Answer Decisions A to F, then build features 1 and 2"].

Be as token efficient as possible. Ask me any relevant unanswered questions in one message with
the full text of every option. Run `npm run check` before finishing. At the end, update sections 8
and 13 of the plan, and tell me whether the next step is cheaper in a fresh chat, with the prompt
to paste.
```

---

## 13. Status log

Review items from section 9: all are now fixed, documented or closed by decision. Only R10 remains as handled through C2 (the backend cuts back edit times more than 5 minutes ahead).

| Date | What happened | Next step |
|---|---|---|
| 10 Nov 2026 | Plan written, `Code.gs` and `index.html` reviewed, working rules and style guide added. No code written. | Answer Decisions G to K, then start the refactor (section 11) in a fresh chat. |
| 11 Nov 2026 | Decisions G2, H1, I1, J1, K1 recorded. Refactor steps 1 to 8 done with no change in behaviour: new file structure, descriptive names and classes, one state object, add-ons folded in (timer and observer removed), backend tidy (C1 to C3, C6, C7), tests, README, change log, GitHub checks. Fixed in passing: R1, R2, R3, R5, R6, R7, R9, R14, R16, C1, C2, C3, C6, C7. Documented only: R15, C4. Still open: R4 (kept, K1), R8 second half, R10 (via C2), R11 contrast, R12 patient-information notice, R13, C5. | You: copy the files into the repository, tag the old commit, redeploy `backend/Code.gs` (optional, the app works with the old one), and check the "by hand" items on your phone. Then answer Decisions A to F (section 8) and build features 1 and 2 in a fresh chat. |
| 11 Nov 2026 | You skipped features 1 and 2 (time-based reviews; Decisions A to F shelved). Feature 3 built: overall and per-section completion rings (green Complete, orange Needs review, empty Incomplete) with a closing animation; `ringArcs` in `src/logic.js` with a test, an app test for ring count and label, CSS in `styles/app.css`, README structure unchanged. New backend address set. `npm run check` passes (27 tests). Not checked on a real phone: how the animation looks. | You: copy the changed files into the repository, check the rings and animation on your phone (complete the last guideline of a section). Then pick the next feature (4 to 7) in a fresh chat. |
| 11 Nov 2026 | Count alignment fixed (`styles/app.css`, `src/views/listView.js`). Feature 4 built: `suggestionCandidates` and `pickSuggestion` in `src/logic.js` (3 tests), `SUGGESTION_WEIGHT` constant, "Random guideline" button in `src/views/listView.js` with its own click listener (the shared event file was not available this chat), one app test, CSS, change log. **`npm run check` NOT run**: only the changed files were uploaded, so I could only run the 14 logic tests and syntax checks (all pass). Long lines I added were wrapped by hand; Prettier was not run. | You: copy the files into the repository, run `npm run check` (if the format check fails run the repo's format command), try the button on your phone with one section open and with none open. Then pick the next feature (5 to 7) in a fresh chat with the full repository zip. |
| 11 Nov 2026 | `npm run check` run on the full repository: 31 tests pass (including the Random guideline button test), lint clean; one Prettier fix in `tests/logic.test.js`. Feature 5 not started: Decisions L to P (section 8) written and asked, unanswered. | You: copy `tests/logic.test.js` and `CHANGELOG.md` into the repository. Answer Decisions L to P, then feature 5 is built: offline link-graph script and data file, queue logic with tests, panel and progress strip, CSS, change log. |
| 11 Nov 2026 | Decisions L1, M2 plus add-to-queue button, N1, O2, P1 recorded. Found that the repository lacks `.prettierrc`, `.prettierignore` and `.github/` (never uploaded); replacements supplied. Feature 5 summary given for you to confirm; Decisions Q, R, S asked, unanswered. No feature 5 code yet. | You: add the three config files to the repository (GitHub, Add file, Create new file; the name `.github/workflows/checks.yml` creates the folders). Confirm the feature summary and answer Q, R, S. Then feature 5 is built (backend change first, then app). |
| 11 Nov 2026 | Feature 5 built: related-guideline panel (top 5 with reasons), review queue (add, add all, remove, ticking off, auto-empty), queue strip on every guideline, Review queue screen and list-screen button. New files `src/queue.js`, `src/related.js`, `src/queueState.js`, `src/views/queueView.js`, `scripts/build-related.js`, `content/related.js` (generated), `content/related-overrides.js`; README, change log, CSS updated. No backend change needed (queue stored as the entry `review-queue`). `npm run check` passes (43 tests) using the config files supplied earlier. | You: copy the changed and new files into the repository, add `content/related.js` to `.prettierignore`, try it on your phone (add related guidelines, mark one Complete, open the Review queue screen, check on a second phone). Then pick feature 6 or 7 in a fresh chat with the full repository zip. |
| 11 Nov 2026 | Decisions T1, U1, V1 recorded. Feature 7 built: `version.json`, `src/updates.js` (pure, 7 tests), `src/updateState.js`, `src/views/updateView.js`, banner in `index.html`, "Updated" tag and footer on the list screen, check on open and return to the app, CSS, README ("Publishing an update"), change log. No backend change. `npm run check` passes (53 tests) with the plan's recorded Prettier settings (dotfiles missing from the zip again). Checked in real Chromium: banner shows for a later date, Update now reloads, no errors. | You: copy the changed and new files into the repository (and add the `.prettierrc` and `.prettierignore` if they are really missing on GitHub). Test on your phone: temporarily set a later date in `version.json` on GitHub, open the app, tap Update now, then put the date back. Next: feature 6 needs items I1 and I3 and Decision D; or revisit features 1 and 2 (Decisions A to F). |
| 11 Nov 2026 | Items I1, I3 and Decision D2 recorded. Feature 6 stage A built on branch `feature-6-pdf-check` (pull request): `scripts/pdfScan.js` (pure, 6 tests), `scripts/check-pdf.js`, daily `.github/workflows/pdf-check.yml`, baseline `content/pdf-status.json` (180 guidelines, 156 version entries, all matching the content). `.prettierrc`, `.prettierignore`, `.gitignore` added. `npm run check` passes in full (59 tests, format and lint). README and change log updated. Decision Y asked. | You: merge the pull request, tick "Allow GitHub Actions to create and approve pull requests", run "pdf-check" once from the Actions tab (expect "No change"). Answer Decision Y, then build the converter (stage B) in a fresh chat with the attached PDF. |
| 11 Nov 2026 | Decision Y2 recorded. Feature 6 stage B built on branch `feature-6-converter` (pull request): converter `scripts/pdfPages.js` (MuPDF) and `scripts/pdfContent.js`, merge and file writer `scripts/contentUpdate.js`, command `scripts/build-guidelines.js` (`--check`, `--baseline`), baseline `content/pdf-rebuild.json`. Acceptance test: 170 of 180 guidelines rebuild exactly from the 24.09.2026 PDF; the 10 others keep their published text until the PDF changes them. `pdf-check.yml` now commits the rebuilt content, `content/related.js`, `version.json` and the rebuild record, runs `npm run check` and reports it in the pull request; actions moved to v5 and `ubuntu-24.04`. `npm run check` passes (69 tests). | You: merge the pull request, then run "pdf-check" once from the Actions tab (expect "No change", and no Node 20 warning). The first real PDF update will test the whole path: read the "Check formatting" list in that pull request before merging. Next feature: features 1 and 2 (Decisions A to F) or the open review items (R4, R8, R11 to R13, C4, C5), in a fresh chat. |
| 11 Nov 2026 | Open review items built on branch `review-items` (pull request): R4 unique comment snippets, R8 plain-text search with a 150 ms pause, R11 contrast and 15 px base text, R13 content checker, C4 placeholder passcode refused, C5 README note; R12 closed (not wanted). Converter reviewed (clear and efficient) and tidied with no intended change in output: `scripts/pdfRows.js` and `scripts/pdfTables.js` split out, `mergeRebuilt` split, named constants. `--check` and the daily run now confirm the recorded rebuild. `npm run check` passes (78 tests). Not checked: the look of the new colours and text size on a real phone; the converter against the real PDF. | You: before merging, run "pdf-check" from the Actions tab on the branch `review-items` (expect a green run with "The converter gives the recorded rebuild of this PDF"). Merge, redeploy `backend/Code.gs`, check colours, text size, search and comments on your phone. Next: features 1 and 2 (Decisions A to F, section 8), in a fresh chat. |
| 11 Nov 2026 | Features 1 and 2 scrapped (A, B, C, F closed). Decisions E1, Z1-1, Z2-2 (one card per dose), Z3-2, Z4 medicines only recorded. Feature 8 built on branch `feature-quiz` (pull request): medicines quiz at `#quiz`, 522 cards built from the content, SM-2 spaced repetition with Again / Hard / Good / Easy, 5 to 30 new cards a day, progress saved as one backend entry per medicine (no backend change). New `src/quizCards.js`, `src/quizSchedule.js`, `src/quizState.js`, `src/views/quizView.js`, `tests/quiz.test.js`; README, change log, `version.json`. `npm run check` passes (91 tests). Found: Morphine 14.32 content is incomplete. | You: merge the pull request, try the quiz on your phone (a few cards, change the new-cards setting, check on a second phone). Next, in a fresh chat: check the converter against the old comprehensive-edition PDF and look into the Morphine 14.32 content. Decision Z5 (guideline cards) when you are ready. |
| 11 Nov 2026 | Decisions Z6 to Z11 recorded. Converter checked: still the recorded rebuild of the EAS PDF; the old comprehensive edition is a different format with no Morphine and is rejected by the converter's guard. Morphine 14.32 is truncated in the source PDF itself. Quiz changes on branch `quiz-by-medicine` (pull request): new medicines per day (1 to 10, default 2) with all their cards, review limit (10 to 200, default 30), no paediatric doses, adult doses per indication from the guidelines for Adrenaline, Midazolam and Morphine (identical ones shared), dose cards "Medicine – Indication – Dose". New `src/quizDoses.js`; README, change log, `version.json`. `npm run check` passes (95 tests). Not checked on a real phone. | You: merge the pull request, try the quiz on your phone and skim the Adrenaline, Midazolam and Morphine dose cards; say which indication cards to drop. Check the Morphine page on cpg.stjohn.org.nz now and then (Z11). Decision Z5 (guideline cards) when you are ready. |
| 13 Nov 2026 | Decisions Z5 and Z12 to Z16 recorded. Feature 9 built on branch `guideline-quiz` (pull request): guideline quiz at `#guideline-quiz`, 85 treatment guidelines, 137 ordering rounds with 2 distractors each, number questions (wrong values from the guidelines, ten times, sometimes a wrong unit), situation, red-flag and move-to questions, best score per guideline saved as `quiz-order-<id>` (no backend change). New `src/guidelineQuizRounds.js`, `src/guidelineQuizNumbers.js`, `src/guidelineQuizPlay.js`, `src/guidelineQuizState.js`, `src/views/guidelineQuizView.js`, `tests/guidelineQuiz.test.js`; README, change log, `version.json`, CSS. `npm run check` passes (118 tests). Checked in Chrome at phone size; not on a real phone. | You: merge the pull request, play a few guidelines on your phone. Review the number rules (Z14) and red-flag wrong answers: note any question whose wrong answer is actually right, or whose round order is not meaningful, and say which rounds or guidelines to drop. |
| 13 Nov 2026 | Your instructions: ordering cards get up/down arrows on the right and can be dragged (grip on the left; all cards start in "Your order"); the report button on every screen, address set. My choice of protection: address stored in two parts and joined only when tapped (not in source or page), no form or server so nothing to flood. Branch `ordering-and-report` (pull request). New `src/report.js`, `src/views/dragCards.js`. `npm run check` passes (121 tests). Dragging checked in Chrome with a mouse; not on a real phone. | You: merge, try dragging on your phone (by the grip) and send one test report from a quiz question. |
