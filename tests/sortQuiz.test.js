/*
 * "Pick the guideline" quiz (sortQuiz.js): pieces, pairs, rounds and marking, on small made-up
 * guidelines and on the real content (counts only).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guidelineData } from '../content/guidelines.js';
import { relatedLinks } from '../content/related.js';
import { flattenGuidelines } from '../src/logic.js';
import {
  headingGroups,
  sortPieces,
  relatedPairs,
  buildSortRound,
  randomSortRound,
  sortScore,
  SORT_SIDE,
  SORT_ITEMS_PER_SIDE,
} from '../src/sortQuiz.js';

const FIRST = () => 0;
const heading = (text) => ['h', text, '#00693C'];
const bullet = (text, level = 1) => ['b', text, level, ''];
const shared = 'Give high flow oxygen and monitor the patient closely';
const asthma = {
  id: 'a',
  t: 'Asthma',
  b: [
    heading('Assessment'),
    bullet('Listen for a wheeze on both sides of the chest'),
    heading('Treatment'),
    bullet(shared),
    bullet('Give salbutamol by nebuliser every twenty minutes'),
    bullet('A long line about asthma that names the guideline and must be left out'),
    heading('Long'),
    ...Array.from({ length: 5 }, (_, i) => bullet(`Top level point number ${i} of the long one`)),
    bullet('A sub-point that is never shown alone in a long section', 2),
  ],
};
const copd = {
  id: 'c',
  t: 'COPD',
  b: [heading('Treatment'), bullet(shared), bullet('Aim for oxygen saturations of 88 to 92%')],
};

test('headingGroups groups text blocks by heading and leaves headings out', () => {
  const groups = headingGroups(asthma);
  assert.equal(groups.length, 3);
  assert.ok(groups.flat().every((block) => block[0] !== 'h'));
});

test('sortPieces keeps lines unique to the guideline, drops ones naming it, splits long sections', () => {
  const pieces = sortPieces(asthma, copd, FIRST);
  assert.deepEqual(pieces[0], ['Listen for a wheeze on both sides of the chest']);
  assert.deepEqual(pieces[1], ['Give salbutamol by nebuliser every twenty minutes']);
  assert.deepEqual(pieces[2], ['Top level point number 0 of the long one'], 'one paragraph');
  assert.ok(pieces.flat().every((line) => line !== shared && !/asthma/i.test(line)));
});

test('relatedPairs pairs each guideline with its best related one, each pair once', () => {
  const links = { a: [['c', 9, 'mentions']], c: [['a', 9, 'mentioned-by']], x: [['gone', 1, '']] };
  assert.deepEqual(relatedPairs([asthma, copd, { id: 'x' }], links), [['a', 'c']]);
});

test('buildSortRound needs enough pieces on both sides', () => {
  assert.equal(buildSortRound(asthma, copd, FIRST), null, 'COPD has only one unique piece');
});

test('real content: most related pairs can be played and rounds hold only unique text', () => {
  const guidelines = flattenGuidelines(guidelineData);
  const byId = new Map(guidelines.map((guideline) => [guideline.id, guideline]));
  const pairs = relatedPairs(guidelines, relatedLinks);
  const rounds = pairs
    .map(([first, second]) => buildSortRound(byId.get(first), byId.get(second), Math.random))
    .filter(Boolean);
  assert.ok(rounds.length >= pairs.length / 2, `${rounds.length} of ${pairs.length} playable`);
  for (const round of rounds) {
    assert.ok(round.items.length <= SORT_ITEMS_PER_SIDE * 2);
    const other = { [SORT_SIDE.LEFT]: round.rightId, [SORT_SIDE.RIGHT]: round.leftId };
    for (const item of round.items) {
      const otherText = byId.get(other[item.side]).b.map((block) => String(block[1]));
      assert.ok(item.lines.every((line) => !otherText.includes(line)));
    }
  }
  assert.ok(randomSortRound(guidelines, relatedLinks, Math.random));
});

test('sortScore counts pieces put on their own side', () => {
  const items = [{ side: SORT_SIDE.LEFT }, { side: SORT_SIDE.RIGHT }, { side: SORT_SIDE.LEFT }];
  assert.equal(sortScore(items, [SORT_SIDE.LEFT, SORT_SIDE.LEFT, SORT_SIDE.LEFT]), 2);
});

test('version history entries are never pieces', () => {
  const dated = {
    id: 'd',
    t: 'Dated',
    b: [heading('Additional information'), ['p', '11 September 2023 1.0.4 Update: changes', 0]],
  };
  assert.deepEqual(sortPieces(dated, copd, FIRST), []);
});
