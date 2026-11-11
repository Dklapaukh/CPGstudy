/*
 * Pure functions that merge guidelines rebuilt from a new EAS PDF into the published content
 * (feature 6 stage B, Decision Y Option 2) and write content/guidelines.js.
 * The converter does not rebuild every guideline exactly (170 of 180 for the 24.09.2026 PDF),
 * so a guideline whose rebuilt version has not changed since the last PDF keeps its published
 * text untouched. Only guidelines that changed in the PDF take the converter's version.
 * content/pdf-rebuild.json records, for each guideline, a fingerprint of its rebuilt version and
 * whether the published text differs from it ("notExact").
 * Used by scripts/build-guidelines.js and tests/contentUpdate.test.js. Depends on node:crypto.
 */
import { createHash } from 'node:crypto';

/** Fingerprint of a rebuilt guideline: a SHA-256 of its JSON, shortened to 16 hex characters. */
export function guidelineFingerprint(guideline) {
  return createHash('sha256').update(JSON.stringify(guideline)).digest('hex').slice(0, 16);
}

/** The id used for a new guideline number, for example "cpg-14-53" for 14.53. */
export function guidelineId(number) {
  return `cpg-${number.replace('.', '-')}`;
}

/** True when a published guideline item has exactly the rebuilt content. */
export function isExactRebuild(item, rebuilt) {
  const published = { n: item.n, t: item.t, hc: item.hc, b: item.b };
  return JSON.stringify(published) === JSON.stringify(rebuilt);
}

/** The published item for a rebuilt guideline: id first, then the rebuilt fields. */
function itemFrom(id, rebuilt) {
  return { id, n: rebuilt.n, t: rebuilt.t, hc: rebuilt.hc, b: rebuilt.b };
}

/** Published guideline items by number. */
export function itemsByNumber(guidelineData) {
  return new Map(
    guidelineData.sections.flatMap((section) => section.items.map((item) => [item.n, item])),
  );
}

/** Section name of every published guideline number. */
function sectionsByNumber(guidelineData) {
  const sectionOf = new Map();
  guidelineData.sections.forEach((section) => {
    section.items.forEach((item) => sectionOf.set(item.n, section.name));
  });
  return sectionOf;
}

/**
 * Decides what one rebuilt guideline becomes. Takes the rebuilt guideline, its fingerprint, the
 * published item with its number (undefined for a new guideline) and the stored record as
 * { fingerprints, notExact (a Set) }. Returns { item, outcome, notExact, checkFormatting }:
 * outcome is 'unchanged', 'changed' or 'added', notExact says the kept published text differs
 * from the rebuilt version, and checkFormatting says the rebuilt layout is not proven exact.
 */
function mergeOne(rebuilt, fingerprint, published, stored) {
  if (published && stored.fingerprints[rebuilt.n] === fingerprint) {
    // Unchanged in the PDF: keep the published text, even where the converter's version differs.
    const notExact = !isExactRebuild(published, rebuilt);
    return { item: published, outcome: 'unchanged', notExact, checkFormatting: false };
  }
  if (published) {
    // Changed in the PDF: take the rebuilt version. The id stays, so progress is kept.
    const unproven = stored.notExact.has(rebuilt.n) || !stored.fingerprints[rebuilt.n];
    const item = itemFrom(published.id, rebuilt);
    return { item, outcome: 'changed', notExact: false, checkFormatting: unproven };
  }
  const item = itemFrom(guidelineId(rebuilt.n), rebuilt);
  return { item, outcome: 'added', notExact: false, checkFormatting: true };
}

/** The published sections holding the placed items ({ sectionName, item }), empty ones dropped. */
function sectionsOf(guidelineData, placed) {
  return guidelineData.sections
    .map((section) => ({
      name: section.name,
      items: placed
        .filter((entry) => entry.sectionName === section.name)
        .map((entry) => entry.item),
    }))
    .filter((section) => section.items.length > 0);
}

/**
 * Merges rebuilt guidelines into the published content.
 * Takes the published guidelineData, the rebuilt guidelines in PDF order and the stored rebuild
 * record ({ fingerprints, notExact }, or null on the first run).
 * Returns { guidelineData, record, report } where report lists the guideline numbers that are
 * unchanged, changed, added, removed and "checkFormatting" (changed or new guidelines whose
 * rebuilt version replaces text the converter could not, or cannot be shown to, rebuild exactly).
 */
export function mergeRebuilt(guidelineData, rebuiltList, storedRecord) {
  const publishedItems = itemsByNumber(guidelineData);
  const sectionOf = sectionsByNumber(guidelineData);
  const stored = {
    fingerprints: storedRecord ? storedRecord.fingerprints : {},
    notExact: new Set(storedRecord ? storedRecord.notExact : []),
  };
  const report = { unchanged: [], changed: [], added: [], removed: [], checkFormatting: [] };
  const fingerprints = {};
  const notExact = [];
  const placed = []; // { sectionName, item } in PDF order
  // A new guideline joins the section of the guideline before it in the PDF (the first section
  // when nothing comes before it).
  let previousSection = guidelineData.sections[0].name;

  for (const rebuilt of rebuiltList) {
    const fingerprint = guidelineFingerprint(rebuilt);
    fingerprints[rebuilt.n] = fingerprint;
    const merged = mergeOne(rebuilt, fingerprint, publishedItems.get(rebuilt.n), stored);
    report[merged.outcome].push(rebuilt.n);
    if (merged.notExact) notExact.push(rebuilt.n);
    if (merged.checkFormatting) report.checkFormatting.push(rebuilt.n);
    const sectionName = sectionOf.get(rebuilt.n) || previousSection;
    previousSection = sectionName;
    placed.push({ sectionName, item: merged.item });
  }

  const rebuiltNumbers = new Set(rebuiltList.map((rebuilt) => rebuilt.n));
  report.removed = [...publishedItems.keys()].filter((number) => !rebuiltNumbers.has(number));
  const sections = sectionsOf(guidelineData, placed);
  return { guidelineData: { sections }, record: { fingerprints, notExact }, report };
}

/**
 * The text of content/guidelines.js for the given document info and guideline data, in the
 * layout of the published file (one guideline per line so an update shows as a small diff).
 */
export function guidelineFileText(documentInfo, guidelineData) {
  const sectionTexts = guidelineData.sections.map((section) => {
    const itemLines = section.items.map((item) => `        ${JSON.stringify(item)},`).join('\n');
    return [
      '    {',
      `      name: ${JSON.stringify(section.name)},`,
      '      items: [',
      itemLines,
      '      ],',
      '    },',
    ].join('\n');
  });
  return [
    '/*',
    ' * Guideline content for the NZCPG study app.',
    ' * Data only, no logic. One guideline per line so that a content update shows as a small diff.',
    ' * Source: CPG EAS, St John New Zealand. Do not edit by hand; it is rebuilt from the PDF.',
    ' */',
    '',
    'export const documentInfo = {',
    `  exportedOn: ${JSON.stringify(documentInfo.exportedOn)},`,
    `  sourceLine: ${JSON.stringify(documentInfo.sourceLine)},`,
    '};',
    '',
    'export const guidelineData = {',
    '  sections: [',
    ...sectionTexts,
    '  ],',
    '};',
    '',
  ].join('\n');
}

/** A markdown list of guideline numbers with their titles, or "None." when empty. */
function numberList(numbers, titleOf) {
  if (numbers.length === 0) return 'None.';
  return numbers.map((number) => `- ${number} ${titleOf(number)}`).join('\n');
}

/**
 * The pull request report of a content merge. Takes the report from mergeRebuilt and a function
 * giving a guideline's title. Returns markdown.
 */
export function mergeReport(report, titleOf) {
  return [
    `### Content rebuilt from the PDF`,
    `${report.changed.length} changed, ${report.added.length} new, ` +
      `${report.removed.length} removed, ${report.unchanged.length} unchanged (kept as published).`,
    '',
    '#### Check formatting (compare on your phone before merging)',
    'The converter rebuilt these; its layout is not proven exact for them, or they are new.',
    numberList(report.checkFormatting, titleOf),
    '',
    '#### Changed (rebuilt from the PDF)',
    numberList(report.changed, titleOf),
    '',
    '#### New (placed in the section of the guideline before them in the PDF; check the section)',
    numberList(report.added, titleOf),
    '',
    '#### Removed (no longer in the PDF; saved progress stays in the Sheet but is not shown)',
    numberList(report.removed, titleOf),
    '',
  ].join('\n');
}
