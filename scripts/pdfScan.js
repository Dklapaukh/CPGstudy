/*
 * Pure functions that read the text of the EAS guidelines PDF (feature 6).
 * The text comes from `pdftotext -layout`; one page per form feed character.
 * Finds the export date and each guideline's newest version-history entry, compares two scans
 * and writes a short report. No AI and no network: the same PDF always gives the same result.
 * Used by scripts/check-pdf.js and tests/pdfScan.test.js. No dependencies.
 */

const PAGE_BREAK = '\f';
const GUIDELINE_HEADER = /CPG EAS (\d+(?:\.\d+)*) St John New Zealand/;
const EXPORT_DATE = /Uncontrolled document exported (\d{1,2}\.\d{1,2}\.\d{4})/;
const VERSION_HISTORY_HEADING = /^\s*Version history\s*$/;
// An entry starts with a line holding only a date and a version number, e.g. "28 October 2024 1.0.5".
const VERSION_ENTRY_START = /^\s*(\d{1,2} [A-Z][a-z]+ \d{4})\s+(\d+(?:\.\d+)+)\s*$/;
// The page footer repeats on every page and is not part of the guideline text.
const PAGE_FOOTER = /^\s*Clinical Practice Guidelines\s.*Page \d+ of \d+\s*$/;
// Every page header (number, title, export date) ends with this line.
const PAGE_HEADER_LAST_LINE = /View online at cpg\.stjohn\.org\.nz/;

/** Splits the whole PDF text into pages. Returns an array of page texts. */
export function splitPages(pdfText) {
  return pdfText.split(PAGE_BREAK).filter((page) => page.trim() !== '');
}

/** Guideline number printed in a page header (e.g. "3.12"), or null if the page has none. */
export function pageGuidelineNumber(pageText) {
  const match = pageText.match(GUIDELINE_HEADER);
  return match ? match[1] : null;
}

/** Export date (dd.mm.yyyy, zero-padded) stamped on the PDF, or null if none is found. */
export function exportDateOf(pdfText) {
  const match = pdfText.match(EXPORT_DATE);
  if (!match) return null;
  const [day, month, year] = match[1].split('.');
  return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
}

/**
 * Joins the pages of each guideline, in PDF order.
 * Returns a Map from guideline number to its text. Pages without a header are skipped.
 */
export function groupPagesByGuideline(pages) {
  const guidelineTexts = new Map();
  pages.forEach((pageText) => {
    const number = pageGuidelineNumber(pageText);
    if (number === null) return;
    const earlierText = guidelineTexts.get(number) || '';
    guidelineTexts.set(number, `${earlierText}${pageBody(pageText)}\n`);
  });
  return guidelineTexts;
}

/**
 * A page without its header and footer, so text that runs over a page break stays together.
 * Returns the page unchanged if it has no recognisable header.
 */
export function pageBody(pageText) {
  const lines = pageText.split('\n');
  const headerEnd = lines.findIndex((line) => PAGE_HEADER_LAST_LINE.test(line));
  return lines
    .slice(headerEnd + 1)
    .filter((line) => !PAGE_FOOTER.test(line))
    .join('\n');
}

/**
 * Newest version-history entry of one guideline: { date, version, change }, or null when the
 * guideline has no version history. The PDF lists the newest entry first.
 */
export function latestVersionEntry(guidelineText) {
  const lines = guidelineText.split('\n');
  const headingIndex = lines.findIndex((line) => VERSION_HISTORY_HEADING.test(line));
  if (headingIndex === -1) return null;
  const startIndex = lines.findIndex(
    (line, index) => index > headingIndex && VERSION_ENTRY_START.test(line),
  );
  if (startIndex === -1) return null;
  const [, date, version] = lines[startIndex].match(VERSION_ENTRY_START);
  return { date, version, change: entryDescription(lines, startIndex + 1) };
}

/**
 * Description of a version entry: the lines after `firstIndex` up to the next blank line or
 * entry. Blank lines before it are skipped, because a page break can fall between date and text.
 */
function entryDescription(lines, firstIndex) {
  const descriptionLines = [];
  for (let index = firstIndex; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (VERSION_ENTRY_START.test(lines[index])) break;
    if (line === '' && descriptionLines.length === 0) continue;
    if (line === '') break;
    descriptionLines.push(line);
  }
  return descriptionLines.join(' ').replace(/\s+/g, ' ');
}

/**
 * Reads the whole PDF text.
 * Returns { exportedOn, guidelines }, where guidelines maps each guideline number (sorted) to its
 * newest version entry or null.
 */
export function scanPdfText(pdfText) {
  const guidelineTexts = groupPagesByGuideline(splitPages(pdfText));
  const numbers = [...guidelineTexts.keys()].sort(compareGuidelineNumbers);
  const guidelines = {};
  numbers.forEach((number) => {
    guidelines[number] = latestVersionEntry(guidelineTexts.get(number));
  });
  return { exportedOn: exportDateOf(pdfText), guidelines };
}

/** Sort order for guideline numbers: "1.2" before "1.10". */
export function compareGuidelineNumbers(first, second) {
  const firstParts = first.split('.').map(Number);
  const secondParts = second.split('.').map(Number);
  const length = Math.max(firstParts.length, secondParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (firstParts[index] ?? -1) - (secondParts[index] ?? -1);
    if (difference !== 0) return difference;
  }
  return 0;
}

/**
 * What differs between an earlier and a later scan.
 * Returns { dateChanged, changed: [{ number, before, after }], added: [], removed: [] }.
 * The file fingerprint is not compared on purpose: only the content signal matters.
 */
export function compareScans(earlier, later) {
  const earlierNumbers = Object.keys(earlier.guidelines);
  const laterNumbers = Object.keys(later.guidelines);
  const changed = laterNumbers
    .filter((number) => number in earlier.guidelines)
    .filter((number) => !sameEntry(earlier.guidelines[number], later.guidelines[number]))
    .map((number) => ({
      number,
      before: earlier.guidelines[number],
      after: later.guidelines[number],
    }));
  return {
    dateChanged: earlier.exportedOn !== later.exportedOn,
    changed,
    added: laterNumbers.filter((number) => !(number in earlier.guidelines)),
    removed: earlierNumbers.filter((number) => !(number in later.guidelines)),
  };
}

/** True when two version entries (or nulls) are the same. */
function sameEntry(first, second) {
  return JSON.stringify(first) === JSON.stringify(second);
}

/** True when a comparison found anything that needs a content update. */
export function hasDifferences(difference) {
  const { dateChanged, changed, added, removed } = difference;
  return dateChanged || changed.length > 0 || added.length > 0 || removed.length > 0;
}

/**
 * Markdown report of a comparison, for the pull request body.
 * `titles` maps guideline numbers to titles (unknown numbers show the number only).
 */
export function differenceReport(earlier, later, difference, titles) {
  const label = (number) => (titles[number] ? `${number} ${titles[number]}` : number);
  const versionText = (entry) => (entry ? `${entry.version} (${entry.date})` : 'no version');
  const lines = [`Export date: ${earlier.exportedOn} → ${later.exportedOn}`, ''];
  lines.push(`### Changed guidelines (${difference.changed.length})`);
  difference.changed.forEach(({ number, before, after }) => {
    const change = after && after.change ? ` – ${after.change}` : '';
    lines.push(`- ${label(number)}: ${versionText(before)} → ${versionText(after)}${change}`);
  });
  lines.push('', `### New guidelines (${difference.added.length})`);
  difference.added.forEach((number) => lines.push(`- ${number}`));
  lines.push('', `### Removed or renumbered guidelines (${difference.removed.length})`);
  difference.removed.forEach((number) => lines.push(`- ${label(number)}`));
  return `${lines.join('\n')}\n`;
}
