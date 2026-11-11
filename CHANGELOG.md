# Change log

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
