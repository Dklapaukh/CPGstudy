/*
 * "Pick the guideline" quiz (sortQuiz.js): pieces, partners, rounds of two and three and
 * marking, on small made-up guidelines and on the real content (counts only).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guidelineData } from '../content/guidelines.js';
import { relatedLinks } from '../content/related.js';
import { flattenGuidelines } from '../src/logic.js';
import { rankRelated } from '../src/related.js';
import {
  headingGroups,
  sortPieces,
  sortPartners,
  sortableGuidelines,
  buildSortRound,
  randomSortRound,
  sortScore,
  isMedicine,
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
  const pieces = sortPieces(asthma, [copd], FIRST);
  assert.deepEqual(pieces[0], ['Listen for a wheeze on both sides of the chest']);
  assert.deepEqual(pieces[1], ['Give salbutamol by nebuliser every twenty minutes']);
  assert.deepEqual(pieces[2], ['Top level point number 0 of the long one'], 'one paragraph');
  assert.ok(pieces.flat().every((line) => line !== shared && !/asthma/i.test(line)));
});

test('sortPartners keeps the related guidelines that exist and are not medicines', () => {
  const medicine = { id: 'm', t: 'Adrenaline', sec: 'Medicines', b: [] };
  const byId = new Map([asthma, copd, medicine].map((guideline) => [guideline.id, guideline]));
  assert.deepEqual(sortPartners(['m', 'gone', 'c'], byId), [copd]);
});

test('buildSortRound needs enough pieces on every side', () => {
  assert.equal(buildSortRound([asthma, copd], FIRST), null, 'COPD has only one unique piece');
});

const realGuidelines = flattenGuidelines(guidelineData);
const realById = new Map(realGuidelines.map((guideline) => [guideline.id, guideline]));
const realPartners = (guideline) =>
  sortPartners(
    rankRelated(relatedLinks[guideline.id] || [], {}).map((item) => item.id),
    realById,
  );

for (const count of [2, 3]) {
  test(`real content: rounds of ${count} start with a guideline and use only its related ones`, () => {
    const firsts = sortableGuidelines(realGuidelines, realPartners, count);
    assert.ok(firsts.length >= 90, `${firsts.length} guidelines can start a round`);
    for (const first of firsts) {
      const round = randomSortRound(first, realPartners(first), count, Math.random);
      assert.ok(round, `CPG ${first.n} plays`);
      assert.equal(round.ids[0], first.id);
      assert.equal(round.ids.length, count);
      const related = realPartners(first).map((partner) => partner.id);
      assert.ok(round.ids.slice(1).every((id) => related.includes(id)));
      assert.ok(
        round.ids.every((id) => !isMedicine(realById.get(id))),
        'no medicines',
      );
      assert.ok(round.items.length <= SORT_ITEMS_PER_SIDE[count] * count);
      for (const item of round.items) {
        const otherTexts = round.ids
          .filter((_, side) => side !== item.side)
          .flatMap((id) => realById.get(id).b.map((block) => String(block[1])));
        assert.ok(item.lines.every((line) => !otherTexts.includes(line)));
      }
    }
  });
}

test('sortScore counts pieces put on their own side', () => {
  const items = [{ side: 0 }, { side: 2 }, { side: 0 }];
  assert.equal(sortScore(items, [0, 1, 0]), 2);
});

test('version history entries are never pieces', () => {
  const dated = {
    id: 'd',
    t: 'Dated',
    b: [heading('Additional information'), ['p', '11 September 2023 1.0.4 Update: changes', 0]],
  };
  assert.deepEqual(sortPieces(dated, [copd], FIRST), []);
});
