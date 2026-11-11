# NZCPG study app (EAS CPG Mentoring Tracker)

A phone-first web app: guidelines list, per-guideline status and notes, shared with a mentor
through a Google Sheet.

## Structure

| Path                                                      | Purpose                                                                          |
| --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `index.html`                                              | Page shell. Loads the styles and `src/main.js`.                                  |
| `styles/app.css`                                          | All styles. Class names say what the element is.                                 |
| `content/guidelines.js`                                   | Guideline text as data, one guideline per line. Not edited by hand.              |
| `src/constants.js`                                        | Named constants: status codes, storage key, backend address, timings, messages.  |
| `src/logic.js`, `src/comments.js`                         | Pure logic (merge, filters, comment lines). Tested.                              |
| `src/queue.js`, `src/related.js`                          | Pure logic for the review queue and the related list. Tested.                    |
| `src/queueState.js`                                       | Reading and saving the review queue in the state.                                |
| `content/related.js`, `content/related-overrides.js`      | Related-guideline links (built by script) and the hand-edited overrides.         |
| `scripts/build-related.js`                                | `node scripts/build-related.js` rebuilds `content/related.js`.                   |
| `src/state.js`                                            | The one state object and saving it on the phone.                                 |
| `src/updates.js`, `src/updateState.js`                    | Update prompt: pure logic (tested), and checking, downloading and tags.          |
| `version.json`                                            | Published export date and the list of app files (read by the update prompt).     |
| `scripts/pdfScan.js`, `scripts/check-pdf.js`              | Reads the EAS PDF: export date and newest version per guideline. Tested.         |
| `content/pdf-status.json`                                 | Last PDF scan (fingerprint, export date, versions). Written by the script.       |
| `scripts/pdfPages.js`, `scripts/pdfContent.js`            | Converter: reads the PDF's text and shapes, and turns them into content. Tested. |
| `scripts/contentUpdate.js`, `scripts/build-guidelines.js` | Merges a rebuilt PDF into `content/guidelines.js` and writes the report.         |
| `content/pdf-rebuild.json`                                | Fingerprint of each rebuilt guideline, and which ones are not rebuilt exactly.   |
| `.github/workflows/pdf-check.yml`                         | Daily PDF check; opens a pull request with the rebuilt content.                  |
| `src/api.js`, `src/sync.js`                               | Talking to the backend; queued edits and merging.                                |
| `src/views/`                                              | One file per screen: login, mentor, list, guideline.                             |
| `src/navigation.js`, `src/events.js`, `src/main.js`       | Screen changes, all clicks and typing, start-up.                                 |
| `backend/Code.gs`                                         | The Google Apps Script service (see "Backend").                                  |
| `tests/`                                                  | `npm test`. Includes a simulated-browser run of the whole app.                   |

## Run, check and publish

- Needs a web server: ES modules do not load from a file opened directly. Locally: `npx serve .`.
- Publishing: GitHub Pages serving the `main` branch root. The address stays the same.
- `npm install` once, then `npm run check` (formatting, error checking, tests). GitHub runs it on
  every push.

## Related guidelines and the review queue

- `content/related.js` is built, not edited. To change a link, add a pair to `add` or `remove`
  in `content/related-overrides.js` and run `node scripts/build-related.js`. Scores and weights
  are named constants at the top of `scripts/build-related.js`. Rebuild after any change to
  `content/guidelines.js`.
- The review queue is saved as one extra entry with the id `review-queue` in the tracker's
  data (its note holds the queue as JSON). It uses the normal save and sync path, so the backend
  needs no change. It appears as a row in the Data sheet; do not edit that row by hand.

## Publishing an update (feature 7)

- The app reads `version.json` on open and whenever it comes back to the foreground (at most
  once a minute). If `guidelinesExportedOn` is later than the export date in
  `content/guidelines.js` it shows "A new version of the guidelines is available. Update now."
- Tapping "Update now" downloads every file in the `files` list again, then reloads. Nothing
  reloads by itself, so a note being typed is never interrupted. Unsent edits are kept.
- After the update, each phone compares the old and new text and tags changed guidelines
  "Updated" in the list until they are opened on that phone.
- When you publish new guidelines: commit `content/guidelines.js`, the rebuilt
  `content/related.js` and `version.json` with the new date **together**. `npm run check` fails
  if the dates differ or if a file in `src/`, `src/views/`, `content/` is missing from `files`.
- App code changes alone do not show the banner (Decision T). Phones pick them up on a normal
  reload once GitHub Pages' cache (about 10 minutes) has expired.

## Checking for a new guidelines PDF (feature 6)

- Every morning a GitHub Action downloads `https://cpg.stjohn.org.nz/assets/pdf/EAS.pdf` and
  runs `node scripts/check-pdf.js`. It is a plain script with no AI: the same PDF always gives
  the same result. It reads the export date and each guideline's newest version-history entry.
- If nothing changed it does nothing. If the export date or any version entry changed, it
  rebuilds the content from the PDF (see below), rebuilds `content/related.js`, sets the date in
  `version.json`, runs `npm run check` and opens a pull request named "New EAS guidelines PDF
  (date)" with the report. Nothing in the app changes until you merge.
- One-off setup on GitHub: Settings, Actions, General, Workflow permissions, tick "Allow GitHub
  Actions to create and approve pull requests". Run it by hand from the Actions tab
  ("pdf-check", "Run workflow"). Pull requests made by the Action do not start the normal
  checks by themselves; push any commit to the branch to start them.
- To run it on your computer: install poppler (`pdftotext`), then
  `node scripts/check-pdf.js path/to/EAS.pdf report.md`.

## Rebuilding the content from the PDF

- `scripts/pdfPages.js` reads every page with MuPDF (the `mupdf` npm package, a development
  dependency only; it is AGPL-licensed and never shipped with the app). `scripts/pdfContent.js`
  turns text and shapes into blocks: coloured bands become headings, taller coloured or outlined
  boxes become boxes, chevrons become bullets, coloured squares with a letter become keys, grey
  ruled grids become tables. No AI: the same PDF always gives the same content.
- Acceptance test: `node scripts/build-guidelines.js path/to/EAS.pdf --check`. For the
  24.09.2026 PDF, 170 of 180 guidelines rebuild exactly; the other 10 (1.3, 1.26, 2.5, 3.14,
  3.15, 4.2, 5.4, 6.2, 9.7, 12.6) differ in small layout details (subscripts, numbered lists, one
  table the old content kept as text).
- Decision Y (Option 2): a guideline whose rebuilt version is the same as last time keeps its
  published text, so those 10 stay as they are until the PDF changes them. A changed guideline
  takes the converter's version and keeps its id (progress is kept). It is listed under "Check
  formatting" if it was one of the 10, or new. New guidelines go into the section of the
  guideline before them in the PDF; removed ones are dropped (their saved progress stays in the
  Sheet but is not shown). All of this is listed in the pull request.
- If you change the converter, re-record the baseline from the PDF the content came from:
  `node scripts/build-guidelines.js path/to/EAS.pdf --baseline` (otherwise every guideline
  looks changed on the next update).
- The converter only writes plain text (with `<` and `&` escaped), `<b>` and `<br>`, so content
  from the PDF cannot add markup or scripts to the app.

## Content

Guideline text is trusted content built into the app and is put on the page as markup.
If content is ever downloaded automatically (feature 6) it must be validated first.
The export date and source line shown on each guideline come from `content/guidelines.js`.

## Backend (what the Apps Script does)

A small program attached to the Google Sheet. The app sends it the passcode and any edits; it
checks the passcode against the `Mentors` and `Trackers` tabs, reads or writes the `Data` tab,
and sends back this tracker's entries. To update it: Sheet, Extensions, Apps Script, paste
`backend/Code.gs`, then Deploy, Manage deployments, edit, New version. The address stays the same.
Passcodes are stored as plain text in the Sheet, so keep its sharing limited and replace the
placeholder mentor passcode created by `setup()`. The passcode is also kept in the phone's
browser and the backend address is in the page; anyone with a tracker passcode can read and
change that tracker, so keep passcodes long and unguessable.

## Behaviour checklist (same result before and after any tidy-up)

Automated in `tests/app.test.js` unless marked "by hand".

- Sign in with a tracker passcode and a mentor passcode; a wrong passcode shows the message.
- Mentor creates a tracker and sees the new passcode; opens an existing tracker.
- List shows 14 sections and 180 guidelines with correct counts; sections stay as left (by hand).
- Filters (All, Incomplete, Needs review, Complete) and search.
- Opening a guideline shows all content; headings fold and unfold; previous and next (by hand).
- Changing status and notes saves, showing "Saving…" then "Saved".
- Two devices on one passcode show the same data after a sync (by hand).
- Offline: changes are kept and sent when signal returns (by hand).
- Related guidelines (at most 5) show under a guideline; "Add to review queue" and "Add all" fill the queue (at most 5); marking a queued guideline Complete or Review ticks it off; the last tick empties the queue; the list screen has a "Review queue (n)" button.
- Comment button adds to the notes and highlights the point.
- A later date in `version.json` shows the update banner; "Update now" downloads every file and reloads (a failed download shows a message and does not reload); a changed guideline is tagged "Updated" until opened; the list footer shows the export date, last check and study-aid notice.
- Switch tracker and sign out.
