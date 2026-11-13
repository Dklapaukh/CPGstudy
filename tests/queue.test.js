// Tests for the review queue (src/queue.js), the related ranking (src/related.js) and the
// link builder (scripts/build-related.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseQueue,
  serialiseQueue,
  addToQueue,
  markQueueItemDone,
  removeFromQueue,
  queueProgress,
  queueRoom,
} from '../src/queue.js';
import { rankRelated } from '../src/related.js';
import { buildRelatedLinks } from '../scripts/build-related.js';

const item = (id, done = false) => ({ id, done });

test('parseQueue reads a saved queue and survives bad text', () => {
  assert.deepEqual(parseQueue(serialiseQueue([item('a'), item('b', true)])), [
    item('a'),
    item('b', true),
  ]);
  assert.deepEqual(parseQueue(''), []);
  assert.deepEqual(parseQueue('not json'), []);
  assert.deepEqual(parseQueue('{"id":"a"}'), []);
  assert.deepEqual(parseQueue('[{"id":"a"},{"id":"a"},{"id":5},null]'), [item('a')]);
});

test('parseQueue never returns more than the queue limit', () => {
  const tooMany = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => item(id));
  assert.equal(parseQueue(JSON.stringify(tooMany)).length, 5);
});

test('addToQueue adds new guidelines, skips queued ones and stops when full', () => {
  assert.deepEqual(addToQueue([item('a')], ['a', 'b']), [item('a'), item('b')]);
  const full = addToQueue([], ['a', 'b', 'c', 'd', 'e', 'f']);
  assert.deepEqual(
    full.map((queued) => queued.id),
    ['a', 'b', 'c', 'd', 'e'],
  );
  assert.equal(queueRoom(full), 0);
  assert.equal(addToQueue(full, ['z']).length, 5);
});

test('markQueueItemDone ticks one item and leaves the queue unchanged when not queued', () => {
  const queue = [item('a'), item('b')];
  assert.deepEqual(markQueueItemDone(queue, 'a'), [item('a', true), item('b')]);
  assert.equal(markQueueItemDone(queue, 'zzz'), queue);
});

test('finishing the last queued guideline empties the queue', () => {
  assert.deepEqual(markQueueItemDone([item('a', true), item('b')], 'b'), []);
});

test('removeFromQueue removes one item, and empties a queue that is then all done', () => {
  assert.deepEqual(removeFromQueue([item('a'), item('b')], 'a'), [item('b')]);
  assert.deepEqual(removeFromQueue([item('a', true), item('b')], 'b'), []);
  assert.deepEqual(removeFromQueue([], 'a'), []);
});

test('queueProgress counts done items', () => {
  assert.deepEqual(queueProgress([item('a', true), item('b'), item('c')]), { done: 1, total: 3 });
  assert.deepEqual(queueProgress([]), { done: 0, total: 0 });
});

test('rankRelated: highest score first, then Incomplete before Review before Complete', () => {
  const links = [
    ['complete-one', 2, 'same-section'],
    ['best', 3, 'mentions'],
    ['incomplete-one', 2, 'same-section'],
    ['review-one', 2, 'same-section'],
  ];
  const entries = { 'complete-one': { s: 'c' }, 'review-one': { s: 'v' } };
  const ranked = rankRelated(links, entries, 3);
  assert.deepEqual(
    ranked.map((related) => related.id),
    ['best', 'incomplete-one', 'review-one'],
  );
  assert.equal(ranked[0].reason, 'mentions');
});

// A tiny set of guidelines so the link builder can be checked by hand.
const block = (text) => ['p', text, 0];
const sampleData = {
  sections: [
    {
      name: 'Respiratory',
      items: [
        { id: 'a', n: '2.1', t: 'Asthma', b: [block('Give salbutamol. See Croup.')] },
        { id: 'b', n: '2.2', t: 'Croup', b: [block('Give dexamethasone.')] },
        {
          id: 'c',
          n: '2.7',
          t: 'Stridor',
          b: [block('Nothing here.'), block('Version history'), block('Asthma Croup')],
        },
      ],
    },
    {
      name: 'Medicines',
      items: [{ id: 'm', n: '14.1', t: 'Salbutamol', b: [block('A medicine.')] }],
    },
  ],
};

test('buildRelatedLinks scores mentions, section and numbering, and ignores version history', () => {
  const links = buildRelatedLinks(sampleData, { add: [], remove: [] });
  const fromA = Object.fromEntries(links.a.map(([id, score, reason]) => [id, { score, reason }]));
  // Asthma mentions Croup (3) and is in the same section (1) and next to it (1).
  assert.deepEqual(fromA.b, { score: 5, reason: 'mentions' });
  // Asthma mentions the medicine Salbutamol, which counts for less (1).
  assert.deepEqual(fromA.m, { score: 1, reason: 'mentions' });
  // Stridor's version history names Asthma, but that part is not searched.
  assert.deepEqual(fromA.c, { score: 1, reason: 'same-section' });
  assert.deepEqual(links.b[0], ['a', 5, 'mentioned-by']);
  assert.ok(!('a' in fromA));
});

test('buildRelatedLinks applies manual additions and removals', () => {
  const links = buildRelatedLinks(sampleData, { add: [['c', 'm']], remove: [['a', 'b']] });
  assert.deepEqual(links.c[0], ['m', 10, 'chosen']);
  assert.deepEqual(links.m[0], ['c', 10, 'chosen']);
  assert.ok(!links.a.some(([id]) => id === 'b'));
  assert.ok(!links.b.some(([id]) => id === 'a'));
});

test('buildRelatedLinks puts guidelines named in the differential diagnosis first', () => {
  const data = {
    sections: [
      {
        name: 'Respiratory',
        items: [
          {
            id: 'asthma',
            n: '2.1',
            t: 'Exacerbation of Asthma',
            b: [
              ['p', 'See Stridor.', 0],
              ['p', '<b>The differential diagnosis for asthma</b>', 0],
              ['b', 'COPD. Patients usually:', 1, '#00693C'],
              ['b', 'Have a history of smoking.', 2, '#00693C'],
              ['b', 'Pneumonia. Patients usually have:', 1, '#00693C'],
              ['p', 'Stridor is a different matter.', 0],
            ],
          },
          {
            id: 'copd',
            n: '2.2',
            t: 'Exacerbation of Chronic Obstructive Pulmonary Disease (COPD)',
            b: [],
          },
          { id: 'stridor', n: '2.6', t: 'Stridor', b: [] },
          { id: 'smoking', n: '2.9', t: 'History of Smoking', b: [] },
        ],
      },
    ],
  };
  const links = buildRelatedLinks(data, { add: [], remove: [['asthma', 'copd']] });
  // COPD is matched by its abbreviation and comes first, even though a removal names it.
  assert.deepEqual([links.asthma[0][0], links.asthma[0][2]], ['copd', 'differential']);
  assert.equal(links.asthma[1][0], 'stridor', 'mentioned outside the differential: not first');
  // Only top-level bullets are diagnoses, and the signal goes one way only.
  assert.ok(!links.asthma.some(([id, , reason]) => id === 'smoking' && reason === 'differential'));
  assert.ok(!links.copd.some(([, , reason]) => reason === 'differential'));
});
