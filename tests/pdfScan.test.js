// Tests for the PDF scan used by the guideline update check (scripts/pdfScan.js, feature 6).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareGuidelineNumbers,
  compareScans,
  differenceReport,
  exportDateOf,
  hasDifferences,
  latestVersionEntry,
  scanPdfText,
} from '../scripts/pdfScan.js';

/** One fake PDF page in the layout that `pdftotext -layout` prints. */
function fakePage(number, title, bodyLines) {
  return [
    `  ${title}                         CPG EAS ${number} St John New Zealand`,
    '                                  Uncontrolled document exported 24.09.2026',
    '                                  View online at cpg.stjohn.org.nz',
    '',
    ...bodyLines,
    `Clinical Practice Guidelines      ${title} CPG EAS ${number}   Page 1 of 1`,
  ].join('\n');
}

const versionHistory = [
  '  Version history',
  '',
  '  28 October 2024                                         1.0.5',
  '  Update: Added nebulised route',
  '  to tranexamic acid.',
  '',
  '  22 November 2022                                        1.0.1',
  '  Update: Multiple changes.',
];

const fakePdf = [
  'Emergency Ambulance Service\nUncontrolled document exported 24.9.2026',
  fakePage('1.2', 'General', ['  Some text.']),
  fakePage('1.10', 'Later', versionHistory),
].join('\f');

test('the export date is read and zero-padded', () => {
  assert.equal(exportDateOf(fakePdf), '24.09.2026');
  assert.equal(exportDateOf('no date here'), null);
});

test('the newest version entry is read, joining wrapped description lines', () => {
  assert.deepEqual(latestVersionEntry(versionHistory.join('\n')), {
    date: '28 October 2024',
    version: '1.0.5',
    change: 'Update: Added nebulised route to tranexamic acid.',
  });
  assert.equal(latestVersionEntry('  No history here'), null);
});

test('a version entry split by a page break keeps its description', () => {
  const firstPage = fakePage('1.12', 'Helicopter', [
    '  Version history',
    '',
    '  16 June 2026  1.1.0.1',
  ]);
  const secondPage = fakePage('1.12', 'Helicopter', ['', '  Update: Dispatch guidance updated.']);
  const scan = scanPdfText(`${firstPage}\f${secondPage}`);
  assert.equal(scan.guidelines['1.12'].change, 'Update: Dispatch guidance updated.');
});

test('the scan lists every guideline in number order', () => {
  const scan = scanPdfText(fakePdf);
  assert.equal(scan.exportedOn, '24.09.2026');
  assert.deepEqual(Object.keys(scan.guidelines), ['1.2', '1.10']);
  assert.equal(scan.guidelines['1.2'], null);
  assert.equal(scan.guidelines['1.10'].version, '1.0.5');
  assert.deepEqual(['1.10', '2.1', '1.2'].sort(compareGuidelineNumbers), ['1.2', '1.10', '2.1']);
});

test('comparing scans finds changed, new and removed guidelines', () => {
  const entry = (version) => ({ date: '1 May 2026', version, change: 'Update: x.' });
  const earlier = { exportedOn: '24.09.2026', guidelines: { 1.1: entry('1.0'), 1.2: null } };
  const same = compareScans(earlier, structuredClone(earlier));
  assert.equal(hasDifferences(same), false);

  const later = { exportedOn: '01.12.2026', guidelines: { 1.1: entry('1.1'), 1.3: null } };
  const difference = compareScans(earlier, later);
  assert.equal(difference.dateChanged, true);
  assert.deepEqual(
    difference.changed.map((item) => item.number),
    ['1.1'],
  );
  assert.deepEqual(difference.added, ['1.3']);
  assert.deepEqual(difference.removed, ['1.2']);

  const report = differenceReport(earlier, later, difference, { 1.1: 'Title' });
  assert.match(report, /1\.1 Title: 1\.0 \(1 May 2026\) → 1\.1 \(1 May 2026\) – Update: x\./);
  assert.match(report, /Export date: 24\.09\.2026 → 01\.12\.2026/);
});

test('content/pdf-status.json matches the published content', async () => {
  const { readFileSync } = await import('node:fs');
  const { documentInfo, guidelineData } = await import('../content/guidelines.js');
  const status = JSON.parse(readFileSync('content/pdf-status.json', 'utf8'));
  const numbers = guidelineData.sections.flatMap((section) => section.items.map((item) => item.n));
  assert.equal(status.exportedOn, documentInfo.exportedOn);
  assert.deepEqual(Object.keys(status.guidelines).sort(), [...numbers].sort());
});
