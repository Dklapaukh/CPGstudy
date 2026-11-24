// Tests for the lookup commands' pure helpers (scripts/lookupText.js), on small made-up
// guidelines and scenarios, and one check against the real content.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guidelineData } from '../content/guidelines.js';
import {
  findGuideline,
  blockLines,
  headingPart,
  guidelineHeadings,
  guidelineText,
  searchGuidelines,
  scenarioListLine,
  scenarioReport,
} from '../scripts/lookupText.js';

const blocks = [
  ['p', 'Intro <b>text</b>', 0],
  ['h', '<b>Mild pain</b>', '#000'],
  ['b', 'Give paracetamol.', 1, '#000'],
  ['h', 'Severe pain', '#000'],
  ['tbl', [[{ t: 'Dose' }, null]]],
];
const item = { id: 'cpg-9-9', n: '9.9', t: 'Pain', b: blocks };
const data = { sections: [{ name: 'Test', items: [item] }] };

test('finds a guideline by number or id', () => {
  assert.equal(findGuideline(data, '9.9'), item);
  assert.equal(findGuideline(data, 'CPG-9-9'), item);
  assert.equal(findGuideline(data, '9.1'), undefined);
});

test('turns blocks into readable lines', () => {
  assert.deepEqual(blockLines(blocks[1]), ['', '## Mild pain']);
  assert.deepEqual(blockLines(blocks[2]), ['  - Give paracetamol.']);
  assert.deepEqual(blockLines(blocks[4]), ['| Dose |  |']);
  assert.deepEqual(blockLines(['box', [blocks[0]]]), ['[box]', 'Intro text', '[/box]']);
  assert.deepEqual(blockLines(['k', 'I', 'Identify']), ['I: Identify']);
});

test('keeps only the part under the matching heading', () => {
  assert.deepEqual(headingPart(blocks, 'mild'), [blocks[1], blocks[2]]);
  assert.deepEqual(headingPart(blocks, 'severe'), [blocks[3], blocks[4]]);
  assert.deepEqual(headingPart(blocks, 'none'), []);
  assert.deepEqual(guidelineHeadings(item), ['Mild pain', 'Severe pain']);
});

test('prints the title line first', () => {
  assert.match(guidelineText(item), /^9\.9 Pain \(cpg-9-9\)\nIntro text\n/);
});

test('searches with a count and a snippet', () => {
  const [hit] = searchGuidelines(data, 'PAIN');
  assert.equal(hit.n, '9.9');
  assert.equal(hit.matches, 2);
  assert.match(hit.snippet, /Mild pain/);
  assert.deepEqual(searchGuidelines(data, 'ketamine'), []);
});

test('finds real guidelines in the content', () => {
  assert.equal(findGuideline(guidelineData, '1.1').id, 'cpg-1-1');
  assert.ok(searchGuidelines(guidelineData, 'paracetamol').length > 0);
});

const scenario = { id: 'ankle', complexity: 1, load: 'single', title: 'Ankle', guidelines: ['g1'] };

test('lists a scenario on one line with its reviews', () => {
  assert.match(scenarioListLine(scenario), /^ankle\s+c1 {2}single\s+0 reviews {2}Ankle$/);
  assert.match(scenarioListLine(scenario, { reviewers: 1 }), / 1 review {2}/);
});

test('names guidelines and leaves the review id and title out', () => {
  const report = scenarioReport(scenario, { id: 'ankle', title: 'Ankle', reviewers: 2 }, (id) =>
    id.toUpperCase(),
  );
  assert.deepEqual(report.scenario.guidelines, ['G1']);
  assert.deepEqual(report.editorsReviews, { reviewers: 2 });
  assert.equal(scenarioReport(scenario, undefined, String).editorsReviews, 'none yet');
});
