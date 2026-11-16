# Change log

Newest first. One short entry per change; the detail is in the README and the git history.

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
