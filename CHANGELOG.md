# Change log

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
