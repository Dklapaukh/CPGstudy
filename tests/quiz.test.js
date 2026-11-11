// Tests for the medicines quiz: building cards from the content (src/quizCards.js) and the
// spaced-repetition schedule (src/quizSchedule.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guidelineData } from '../content/guidelines.js';
import {
  buildQuizCards,
  splitDoseGroups,
  joinUnlabelledGroups,
  blocksUnderHeading,
  tableNames,
  plainText,
} from '../src/quizCards.js';
import {
  dayNumber,
  nextInterval,
  nextSchedule,
  studyPlan,
  advanceSession,
  serialiseSchedules,
  parseSchedules,
  clampNewPerDay,
  intervalText,
} from '../src/quizSchedule.js';
import { RATING, QUIZ_SECTION_NAME, QUIZ_ENTRY_PREFIX } from '../src/constants.js';

// Matches the backend's MAX_NOTE_LENGTH and its id rule (backend/Code.gs).
const BACKEND_MAX_NOTE_LENGTH = 5000;
const BACKEND_ID_PATTERN = /^[\w.-]{1,40}$/;
const cards = buildQuizCards(guidelineData.sections, QUIZ_SECTION_NAME);

test('every medicine gets cards with unique ids, and the introduction guideline gets none', () => {
  const medicines = new Set(cards.map((card) => card.medicineId));
  assert.equal(medicines.size, 45);
  assert.ok(!medicines.has('cpg-14-1'));
  assert.equal(new Set(cards.map((card) => card.id)).size, cards.length);
  assert.ok(cards.every((card) => card.answerBlocks.length > 0 && card.prompt && card.source));
  assert.equal(cards[0].prompt, 'Adenosine – Indications');
});

test('doses are split into one card each, including paediatric and RSI table doses', () => {
  const rocuronium = cards.filter((card) => card.medicineId === 'cpg-14-40').map((c) => c.key);
  assert.ok(rocuronium.filter((key) => key.startsWith('dose-')).length >= 2);
  assert.equal(rocuronium.filter((key) => key.startsWith('paed-')).length, 5);
  assert.equal(rocuronium.filter((key) => key.startsWith('rsi-')).length, 2);
  const glucoseGel = cards.filter((card) => card.prompt.startsWith('Glucose Gel'));
  assert.ok(!glucoseGel.some((card) => card.key.startsWith('paed-')), '10% glucose IV is not gel');
});

test('a full set of schedules fits in one backend entry per medicine', () => {
  const byMedicine = {};
  for (const card of cards) {
    byMedicine[card.medicineId] = byMedicine[card.medicineId] || {};
    byMedicine[card.medicineId][card.key] = {
      due: 99999,
      interval: 365,
      ease: 2.85,
      reps: 999,
      lapses: 99,
      first: 99999,
    };
  }
  for (const [medicineId, schedules] of Object.entries(byMedicine)) {
    assert.match(QUIZ_ENTRY_PREFIX + medicineId, BACKEND_ID_PATTERN);
    assert.ok(serialiseSchedules(schedules).length < BACKEND_MAX_NOTE_LENGTH, medicineId);
  }
});

test('splitDoseGroups keeps sub-points with their dose and drops bare pointers', () => {
  const blocks = [
    ['b', 'Cardiac arrest: 1 mg', 1, '#000'],
    ['b', 'Repeat every 4 minutes', 2, '#000'],
    ['b', 'Anaphylaxis: 0.5 mg IM', 1, '#000'],
    ['b', 'See the paediatric drug doses', 1, '#000'],
  ];
  const groups = splitDoseGroups(blocks);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].length, 2);
  const steps = [
    [['b', '6 mg', 1, '#000']],
    [['b', 'If no response, 12 mg', 1, '#000']],
    [['b', 'Child: 0.1 mg/kg', 1, '#000']],
  ];
  assert.deepEqual(
    joinUnlabelledGroups(steps).map((group) => group.length),
    [2, 1],
    'a dose and its unlabelled repeat stay on one card',
  );
});

test('blocksUnderHeading stops at the next heading; tableNames and plainText', () => {
  const blocks = [
    ['h', '<b>Cautions</b>', '#000'],
    ['b', 'One', 1, '#000'],
    ['h', '<b>Dosage</b>', '#000'],
  ];
  assert.deepEqual(blocksUnderHeading(blocks, 'Cautions'), [blocks[1]]);
  assert.deepEqual(blocksUnderHeading(blocks, 'Missing'), []);
  assert.deepEqual(tableNames('Adrenaline'), ['adrenaline']);
  assert.deepEqual(tableNames('Glucose Gel'), ['glucose gel']);
  assert.equal(plainText('<b>A</b> &lt; 5 &amp; B'), 'A < 5 & B');
});

test('dayNumber uses the local calendar day', () => {
  const nzOffset = -13 * 60; // NZDT, from getTimezoneOffset()
  const lateUtc = Date.UTC(2026, 10, 10, 23, 0); // 12:00 on 11 Nov in Auckland
  const earlyUtc = Date.UTC(2026, 10, 10, 10, 0); // 23:00 on 10 Nov in Auckland
  assert.equal(dayNumber(lateUtc, nzOffset) - dayNumber(earlyUtc, nzOffset), 1);
});

test('intervals: first answers, growth by ease, Again resets, Hard grows slowly', () => {
  assert.equal(nextInterval(null, RATING.AGAIN), 0);
  assert.equal(nextInterval(null, RATING.GOOD), 1);
  assert.equal(nextInterval(null, RATING.EASY), 4);
  const learnt = { interval: 10, ease: 2.5, reps: 3, lapses: 0, first: 1, due: 20 };
  assert.equal(nextInterval(learnt, RATING.GOOD), 25);
  assert.equal(nextInterval(learnt, RATING.EASY), 33);
  assert.equal(nextInterval(learnt, RATING.HARD), 12);
  assert.equal(nextInterval(learnt, RATING.AGAIN), 0);
  assert.equal(nextInterval({ ...learnt, interval: 300 }, RATING.EASY), 365, 'capped at a year');
});

test('nextSchedule updates due day, ease, reps, lapses and keeps the first day', () => {
  const first = nextSchedule(null, RATING.GOOD, 100);
  assert.deepEqual(first, { due: 101, interval: 1, ease: 2.5, reps: 1, lapses: 0, first: 100 });
  const forgotten = nextSchedule(first, RATING.AGAIN, 101);
  assert.equal(forgotten.due, 101);
  assert.equal(forgotten.lapses, 1);
  assert.equal(forgotten.ease, 2.3);
  assert.equal(forgotten.first, 100);
  let hard = first;
  for (let i = 0; i < 20; i++) hard = nextSchedule(hard, RATING.AGAIN, 101);
  assert.equal(hard.ease, 1.3, 'ease never drops below 1.3');
});

test('studyPlan: due cards first by due day, then new cards up to the daily limit', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
  const schedules = {
    b: { due: 10, first: 5 },
    c: { due: 8, first: 12 }, // started today, counts towards the new-card limit
    d: { due: 30, first: 5 },
  };
  const plan = studyPlan(ids, schedules, 12, 2);
  assert.deepEqual(plan.dueIds, ['c', 'b']);
  assert.deepEqual(plan.newIds, ['a']);
  assert.equal(plan.newLeftToday, 1);
});

test('advanceSession: Again puts the card back a few places on, other ratings remove it', () => {
  assert.deepEqual(advanceSession(['a', 'b', 'c', 'd', 'e'], RATING.AGAIN, 3), [
    'b',
    'c',
    'd',
    'a',
    'e',
  ]);
  assert.deepEqual(advanceSession(['a', 'b'], RATING.AGAIN, 3), ['b', 'a']);
  assert.deepEqual(advanceSession(['a', 'b'], RATING.GOOD, 3), ['b']);
});

test('schedules survive saving and reading back; damaged notes give an empty schedule', () => {
  const schedules = { indications: nextSchedule(null, RATING.HARD, 50) };
  assert.deepEqual(parseSchedules(serialiseSchedules(schedules)), schedules);
  assert.deepEqual(parseSchedules('{not json'), {});
  assert.deepEqual(parseSchedules('[1,2]'), {});
  assert.deepEqual(parseSchedules('{"x":[1,2]}'), {});
});

test('clampNewPerDay and intervalText', () => {
  assert.equal(clampNewPerDay('20'), 20);
  assert.equal(clampNewPerDay(100), 30);
  assert.equal(clampNewPerDay(1), 5);
  assert.equal(clampNewPerDay('x'), 10);
  assert.equal(intervalText(0), 'again today');
  assert.equal(intervalText(1), '1 day');
  assert.equal(intervalText(4), '4 days');
});
