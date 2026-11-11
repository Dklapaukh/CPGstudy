/*
 * Rebuilds content/guidelines.js from the EAS guidelines PDF (feature 6 stage B, Decision Y
 * Option 2). No AI: a plain converter, so the same PDF always gives the same content.
 * Usage:
 *   node scripts/build-guidelines.js <EAS.pdf> [<report.md>]
 *       Merges the PDF into the content (see scripts/contentUpdate.js), checks it with
 *       scripts/contentCheck.js, sets the export date in
 *       content/guidelines.js and version.json, updates content/pdf-rebuild.json and writes the
 *       pull request report. Run scripts/build-related.js afterwards.
 *   node scripts/build-guidelines.js <EAS.pdf> --check
 *       Acceptance test: says how many guidelines the PDF rebuilds exactly, and fails if the
 *       converter no longer gives the rebuild recorded for the same PDF. Changes nothing.
 *   node scripts/build-guidelines.js <EAS.pdf> --baseline
 *       Records content/pdf-rebuild.json for the PDF the published content came from.
 * Run by .github/workflows/pdf-check.yml. Depends on the `mupdf` development dependency.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { documentInfo, guidelineData } from '../content/guidelines.js';
import { readPdfPages } from './pdfPages.js';
import { buildAllGuidelines } from './pdfContent.js';
import { contentProblems } from './contentCheck.js';
import {
  guidelineFileText,
  guidelineFingerprint,
  isExactRebuild,
  itemsByNumber,
  mergeRebuilt,
  mergeReport,
} from './contentUpdate.js';

const CONTENT_FILE = 'content/guidelines.js';
const RECORD_FILE = 'content/pdf-rebuild.json';
const VERSION_FILE = 'version.json';
// A real EAS PDF has about 180 guidelines; far fewer means the PDF could not be read.
const MINIMUM_GUIDELINE_COUNT = 100;
const EXPORT_DATE = /Uncontrolled document exported (\d{1,2})\.(\d{1,2})\.(\d{4})/;

/** The export date printed on the PDF pages, as dd.mm.yyyy. Throws if it is missing. */
function exportDateOf(pages) {
  for (const page of pages) {
    for (const span of page.spans) {
      const match = span.t.match(EXPORT_DATE);
      if (match) return `${match[1].padStart(2, '0')}.${match[2].padStart(2, '0')}.${match[3]}`;
    }
  }
  throw new Error('No export date found in the PDF');
}

/** Reads the PDF and rebuilds its guidelines. Throws if the result looks wrong. */
function rebuildPdf(pdfPath) {
  const pages = readPdfPages(readFileSync(pdfPath));
  const rebuilt = buildAllGuidelines(pages);
  if (rebuilt.length < MINIMUM_GUIDELINE_COUNT) {
    throw new Error(`Not a usable EAS PDF: only ${rebuilt.length} guidelines found`);
  }
  return { exportedOn: exportDateOf(pages), rebuilt };
}

/** Published guideline items by number. */
const publishedByNumber = () => itemsByNumber(guidelineData);

/** Writes a JSON file with two-space indents and a final new line. */
function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Throws when the converter no longer gives the rebuild recorded for this same PDF. That means
 * the converter's output has changed (re-record the baseline if that was intended, see README)
 * or the PDF changed without a new export date.
 */
function confirmRecordedRebuild(exportedOn, rebuilt) {
  const record = JSON.parse(readFileSync(RECORD_FILE, 'utf8'));
  if (record.exportedOn !== exportedOn) {
    console.log(`The record is for the ${record.exportedOn} PDF, so it was not compared.`);
    return;
  }
  const different = rebuilt
    .filter((guideline) => record.fingerprints[guideline.n] !== guidelineFingerprint(guideline))
    .map((guideline) => guideline.n);
  if (different.length) {
    throw new Error(`Not the recorded rebuild of this PDF for: ${different.join(' ')}`);
  }
  console.log('The converter gives the recorded rebuild of this PDF.');
}

/**
 * --check: prints how many guidelines are rebuilt exactly, and which are not, then confirms
 * that the converter still gives the recorded rebuild.
 */
function checkExact(exportedOn, rebuilt) {
  const published = publishedByNumber();
  const notExact = rebuilt.filter((guideline) => {
    const item = published.get(guideline.n);
    return !item || !isExactRebuild(item, guideline);
  });
  const missing = [...published.keys()].filter((number) => !rebuilt.some((g) => g.n === number));
  console.log(
    `${rebuilt.length - notExact.length} of ${published.size} guidelines rebuild exactly.`,
  );
  console.log(`Not exact: ${notExact.map((guideline) => guideline.n).join(' ') || 'none'}.`);
  if (missing.length) console.log(`In the content but not the PDF: ${missing.join(' ')}.`);
  confirmRecordedRebuild(exportedOn, rebuilt);
}

/** --baseline: records the rebuild of the PDF that the published content came from. */
function recordBaseline(exportedOn, rebuilt) {
  if (exportedOn !== documentInfo.exportedOn) {
    throw new Error(`The PDF is from ${exportedOn}, the content from ${documentInfo.exportedOn}`);
  }
  const published = publishedByNumber();
  const fingerprints = {};
  rebuilt.forEach((guideline) => {
    fingerprints[guideline.n] = guidelineFingerprint(guideline);
  });
  const notExact = rebuilt
    .filter(
      (guideline) =>
        !published.has(guideline.n) || !isExactRebuild(published.get(guideline.n), guideline),
    )
    .map((guideline) => guideline.n);
  writeJson(RECORD_FILE, { exportedOn, fingerprints, notExact });
  console.log(`Baseline recorded: ${rebuilt.length - notExact.length} of ${rebuilt.length} exact.`);
}

/** Default mode: merges the PDF into the content and writes every changed file. */
function updateContent(exportedOn, rebuilt, reportPath) {
  const storedRecord = JSON.parse(readFileSync(RECORD_FILE, 'utf8'));
  const merged = mergeRebuilt(guidelineData, rebuilt, storedRecord);
  // The app shows the content as markup, so nothing unexpected may be written (review item R13).
  const problems = contentProblems(merged.guidelineData);
  if (problems.length) {
    throw new Error(`Unexpected content, nothing was written:\n${problems.join('\n')}`);
  }
  writeFileSync(
    CONTENT_FILE,
    guidelineFileText({ ...documentInfo, exportedOn }, merged.guidelineData),
  );
  writeJson(RECORD_FILE, { exportedOn, ...merged.record });
  const version = JSON.parse(readFileSync(VERSION_FILE, 'utf8'));
  writeJson(VERSION_FILE, { ...version, guidelinesExportedOn: exportedOn });

  const titles = new Map(rebuilt.map((guideline) => [guideline.n, guideline.t]));
  publishedByNumber().forEach((item, number) => {
    if (!titles.has(number)) titles.set(number, item.t);
  });
  const report = mergeReport(merged.report, (number) => titles.get(number));
  if (reportPath) writeFileSync(reportPath, report);
  console.log(report);
}

/** Runs the script from the command line arguments. */
function main() {
  const [pdfPath, option] = process.argv.slice(2);
  if (!pdfPath)
    throw new Error(
      'Usage: node scripts/build-guidelines.js <pdf> [<report.md> | --check | --baseline]',
    );
  const { exportedOn, rebuilt } = rebuildPdf(pdfPath);
  if (option === '--check') checkExact(exportedOn, rebuilt);
  else if (option === '--baseline') recordBaseline(exportedOn, rebuilt);
  else updateContent(exportedOn, rebuilt, option);
}

main();
