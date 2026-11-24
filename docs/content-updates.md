# Content updates

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

## Decisions

- I1, I3: the owner has permission to download the PDF automatically and, from their medical
  director, to publish St John's text.
- D: semi-automatic: a plain script rebuilds and opens a pull request; the owner merges (fully
  automatic is open, plan 8.3 item 1).
- Y: an unchanged rebuild keeps its published text (above). The change signal is the export
  date plus each guideline's newest version entry, not the file fingerprint.
- T: the banner is for new guideline content only. U: nothing reloads until "Update now".
  V: "Updated" tags last until opened on that phone.
- R13: `scripts/contentCheck.js` refuses other markup (above).
- No service worker (the app needs signal to open); not taken.
