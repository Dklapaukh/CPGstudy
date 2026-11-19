# List, marking and settings

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

## Report a mistake or request

- A button under every screen, and in the comment panel for one point (`src/report.js`), opens
  the student's email app with the subject and body filled in from what is on screen, including
  a quiz question with its choices and the app's answer.
- The repository and site are public, so the address is stored as two parts in
  `FEEDBACK_ADDRESS_PARTS` and joined only when the button is tapped (a test checks the page
  holds no whole address). The app sends nothing itself. `[]` hides the button. Filter email on
  the subject "NZCPG study app:".
