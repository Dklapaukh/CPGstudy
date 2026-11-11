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
  isPointerGroup,
} from '../src/quizCards.js';
import {
  dayNumber,
  nextInterval,
  nextSchedule,
  studyPlan,
  advanceSession,
  serialiseSchedules,
  parseSchedules,
  clampSetting,
  intervalText,
} from '../src/quizSchedule.js';
import {
  RATING,
  QUIZ_SECTION_NAME,
  QUIZ_ENTRY_PREFIX,
  QUIZ_NEW_MEDICINES_PER_DAY,
  QUIZ_REVIEWS_PER_DAY,
} from '../src/constants.js';
import {
  withoutChildDoses,
  dosesMedicine,
  instructionGroups,
  adultDosesByIndication,
} from '../src/quizDoses.js';

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

test('doses are split into one card each, with adult RSI table doses and no paediatric ones', () => {
  const rocuronium = cards.filter((card) => card.medicineId === 'cpg-14-40').map((c) => c.key);
  assert.ok(rocuronium.some((key) => key.startsWith('dose-')));
  assert.equal(rocuronium.filter((key) => key.startsWith('rsi-')).length, 1, 'adult table only');
  assert.ok(!cards.some((card) => /paediatric/i.test(card.prompt)));
  const answerText = (card) => JSON.stringify(card.answerBlocks);
  assert.ok(!cards.some((card) => /See the paediatric drug dose tables/.test(answerText(card))));
  const amiodarone = cards.find((card) => card.id === 'cpg-14-4|dose-cardiac-arrest');
  assert.equal(amiodarone.prompt, 'Amiodarone – Cardiac arrest – Dose');
});

test('a medicine sent to "the individual guideline" gets one card per indication', () => {
  const adrenaline = cards.filter((card) => card.medicineId === 'cpg-14-3');
  const prompts = adrenaline.map((card) => card.prompt);
  assert.ok(prompts.includes('Adrenaline – Anaphylaxis – Dose'));
  assert.ok(prompts.includes('Adrenaline – Cardiac Arrest – Dose'));
  assert.ok(!prompts.includes('Adrenaline – Dose'), 'the pointer itself is not a card');
  assert.ok(
    !prompts.some((prompt) => prompt.includes('Croup')),
    'child-only guidelines are skipped',
  );
  const anaphylaxis = adrenaline.find((card) => card.prompt === 'Adrenaline – Anaphylaxis – Dose');
  assert.match(JSON.stringify(anaphylaxis.answerBlocks), /0\.5 mg IM for an adult/);
  assert.doesNotMatch(JSON.stringify(anaphylaxis.answerBlocks), /child/i);
  const morphine = cards.filter((card) => card.medicineId === 'cpg-14-32').map((c) => c.prompt);
  assert.ok(morphine.includes('Morphine – Cardiogenic Pulmonary Oedema – Dose'));
  const midazolam = cards.filter((card) => card.medicineId === 'cpg-14-31').map((c) => c.prompt);
  assert.ok(!midazolam.some((prompt) => prompt.includes('Analgesia for Acute Pain')));
});

test('withoutChildDoses drops child-only lines with the lines indented under them', () => {
  const blocks = [
    ['b', 'Administer adrenaline:', 1],
    ['b', '0.5 mg IM for an adult.', 2],
    ['b', 'See the paediatric drug dose tables.', 2],
    ['p', 'For a child aged 5-14 years:', 1],
    ['b', '1 drop/second.', 2],
    ['b', '0.5 mg for adults and children. See the tables for a child.', 1],
    ['h', 'Next', '#000'],
    ['b', 'Kept.', 1],
  ];
  assert.deepEqual(
    withoutChildDoses(blocks).map((block) => block[1]),
    [
      'Administer adrenaline:',
      '0.5 mg IM for an adult.',
      '0.5 mg for adults and children.',
      'Next',
      'Kept.',
    ],
  );
  const groups = instructionGroups(blocks);
  assert.deepEqual(
    groups.map((group) => group.length),
    [5, 1, 1],
    'a top-level bullet takes the lines under it; a heading ends a group',
  );
});

test('dosesMedicine gives each dose to the nearest medicine named in the line', () => {
  const medicine = (name, others) => ({ names: [name], otherNames: others });
  const line = 'Prior to midazolam give 150-200 mcg of fentanyl or 15-20 mg of morphine.';
  assert.equal(dosesMedicine(line, medicine('midazolam', ['fentanyl', 'morphine'])), false);
  assert.equal(dosesMedicine(line, medicine('morphine', ['fentanyl', 'midazolam'])), true);
  assert.equal(dosesMedicine('Administer 0.5 mg IM.', medicine('adrenaline', [])), true);
  assert.equal(dosesMedicine('Administer adrenaline IM.', medicine('adrenaline', [])), false);
});

test('adultDosesByIndication shares one entry between guidelines with the same doses', () => {
  const guideline = (n, t, colour) => ({ n, t, b: [['b', 'Give 1 mg of drug IV.', 1, colour]] });
  const entries = adultDosesByIndication(
    [guideline('1', 'One', '#111'), guideline('2', 'Two', '#222'), { n: '3', t: 'Three', b: [] }],
    { names: ['drug'], otherNames: [] },
  );
  assert.equal(entries.length, 1);
  assert.deepEqual(
    entries[0].guidelines.map((g) => g.t),
    ['One', 'Two'],
  );
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

test('splitDoseGroups keeps sub-points with their dose; bare pointers are recognised', () => {
  const blocks = [
    ['b', 'Cardiac arrest: 1 mg', 1, '#000'],
    ['b', 'Repeat every 4 minutes', 2, '#000'],
    ['b', 'Anaphylaxis: 0.5 mg IM', 1, '#000'],
    ['b', 'See the paediatric drug doses', 1, '#000'],
  ];
  const groups = splitDoseGroups(blocks);
  assert.deepEqual(
    groups.map((group) => group.length),
    [2, 1, 1],
  );
  assert.deepEqual(groups.map(isPointerGroup), [false, false, true]);
  assert.equal(isPointerGroup([['b', 'For RSI: see the ‘RSI’ guideline.', 1]]), true);
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

test('studyPlan: due cards first, reviews limited, then whole new medicines', () => {
  const card = (id, medicineId) => ({ id, medicineId });
  const list = [
    card('a1', 'a'),
    card('a2', 'a'),
    card('b1', 'b'),
    card('b2', 'b'),
    card('c1', 'c'),
    card('d1', 'd'),
  ];
  const schedules = {
    a1: { due: 12, interval: 0, first: 12 }, // started today and rated Again
    b1: { due: 10, interval: 3, first: 5 }, // review due
    b2: { due: 9, interval: 2, first: 5 }, // review due, older
    d1: { due: 13, interval: 1, first: 4 }, // reviewed today, counts towards the review limit
  };
  const plan = studyPlan(list, schedules, 12, { newMedicinesPerDay: 2, reviewsPerDay: 2 });
  assert.deepEqual(plan.dueIds, ['a1', 'b2'], 'Again cards always; one review left of two');
  assert.deepEqual(plan.newIds, ['a2', 'c1'], 'the started medicine, then one new medicine');
  assert.equal(plan.newMedicineCount, 1);
  assert.equal(plan.reviewsLeftToday, 1);
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

test('clampSetting and intervalText', () => {
  assert.equal(clampSetting('3', QUIZ_NEW_MEDICINES_PER_DAY), 3);
  assert.equal(clampSetting(100, QUIZ_NEW_MEDICINES_PER_DAY), 10);
  assert.equal(clampSetting(0, QUIZ_NEW_MEDICINES_PER_DAY), 1);
  assert.equal(clampSetting('x', QUIZ_NEW_MEDICINES_PER_DAY), 2);
  assert.equal(clampSetting(undefined, QUIZ_REVIEWS_PER_DAY), 30);
  assert.equal(intervalText(0), 'again today');
  assert.equal(intervalText(1), '1 day');
  assert.equal(intervalText(4), '4 days');
});
