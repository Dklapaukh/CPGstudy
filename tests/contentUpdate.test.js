// Tests for merging a rebuilt PDF into the content (scripts/contentUpdate.js, feature 6 stage B).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  guidelineFileText,
  guidelineFingerprint,
  guidelineId,
  mergeRebuilt,
  mergeReport,
} from '../scripts/contentUpdate.js';
import { documentInfo, guidelineData } from '../content/guidelines.js';

/** A rebuilt guideline with one paragraph. */
function rebuilt(number, text) {
  return { n: number, t: `Guideline ${number}`, hc: '#00693C', b: [['p', text, 0]] };
}

/** A published item, optionally with hand-made text the converter does not produce. */
function published(number, text) {
  return { id: guidelineId(number), ...rebuilt(number, text) };
}

const publishedData = {
  sections: [
    { name: 'General', items: [published('1.1', 'One'), published('1.2', 'Two, by hand')] },
    { name: 'Cardiac', items: [published('3.1', 'Three'), published('3.2', 'Gone')] },
  ],
};
const storedRecord = {
  fingerprints: Object.fromEntries(
    [
      rebuilt('1.1', 'One'),
      rebuilt('1.2', 'Two'),
      rebuilt('3.1', 'Three'),
      rebuilt('3.2', 'Gone'),
    ].map((guideline) => [guideline.n, guidelineFingerprint(guideline)]),
  ),
  notExact: ['1.2'],
};

test('an unchanged guideline keeps its published text, even when the converter differs', () => {
  const pdf = [
    rebuilt('1.1', 'One'),
    rebuilt('1.2', 'Two'),
    rebuilt('3.1', 'Three'),
    rebuilt('3.2', 'Gone'),
  ];
  const merged = mergeRebuilt(publishedData, pdf, storedRecord);
  assert.deepEqual(merged.guidelineData, publishedData);
  assert.deepEqual(merged.report.unchanged, ['1.1', '1.2', '3.1', '3.2']);
  assert.deepEqual(merged.record.notExact, ['1.2']);
});

test('changed, new and removed guidelines are applied and reported', () => {
  const pdf = [
    rebuilt('1.1', 'One'),
    rebuilt('1.2', 'Two, updated'),
    rebuilt('1.3', 'New'),
    rebuilt('3.1', 'Three, updated'),
  ];
  const merged = mergeRebuilt(publishedData, pdf, storedRecord);
  const [general, cardiac] = merged.guidelineData.sections;
  assert.deepEqual(
    general.items.map((item) => item.n),
    ['1.1', '1.2', '1.3'],
  );
  assert.deepEqual(
    cardiac.items.map((item) => item.n),
    ['3.1'],
  );
  assert.equal(general.items[1].b[0][1], 'Two, updated');
  assert.equal(general.items[1].id, 'cpg-1-2'); // the id stays, so saved progress is kept
  assert.equal(general.items[2].id, 'cpg-1-3');
  assert.deepEqual(merged.report.changed, ['1.2', '3.1']);
  assert.deepEqual(merged.report.added, ['1.3']);
  assert.deepEqual(merged.report.removed, ['3.2']);
  assert.deepEqual(merged.report.checkFormatting, ['1.2', '1.3']);
  assert.deepEqual(merged.record.notExact, []);
  const report = mergeReport(merged.report, (number) => `Guideline ${number}`);
  assert.match(report, /2 changed, 1 new, 1 removed, 1 unchanged/);
  assert.match(report, /- 1\.3 Guideline 1\.3/);
});

test('the file layout reproduces content/guidelines.js exactly', () => {
  const fileText = readFileSync('content/guidelines.js', 'utf8');
  assert.equal(guidelineFileText(documentInfo, guidelineData), fileText);
});

test('content/pdf-rebuild.json matches the published content', () => {
  const record = JSON.parse(readFileSync('content/pdf-rebuild.json', 'utf8'));
  const numbers = guidelineData.sections.flatMap((section) => section.items.map((item) => item.n));
  assert.equal(record.exportedOn, documentInfo.exportedOn);
  assert.deepEqual(Object.keys(record.fingerprints).sort(), [...numbers].sort());
  record.notExact.forEach((number) => assert.ok(numbers.includes(number), number));
});
