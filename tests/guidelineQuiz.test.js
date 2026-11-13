// Tests for the guideline quiz (feature 9): rounds and marking (src/guidelineQuizRounds.js),
// number questions (src/guidelineQuizNumbers.js) and whole plays (src/guidelineQuizPlay.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guidelineData } from '../content/guidelines.js';
import { relatedLinks } from '../content/related.js';
import {
  quizGuidelines,
  situations,
  isTreatmentGuideline,
  distractorCandidates,
  pickDistractors,
  inOrderPositions,
  markRound,
  normalisedText,
} from '../src/guidelineQuizRounds.js';
import {
  valuesInText,
  valuePools,
  wrongValues,
  numberQuestion,
  CHOICE_COUNT,
} from '../src/guidelineQuizNumbers.js';
import {
  buildPlay,
  playTotal,
  redFlags,
  isSameFlag,
  moveToActions,
  isForChildAges,
  cardText,
  DISTRACTORS_PER_ROUND,
} from '../src/guidelineQuizPlay.js';
import { tableNames } from '../src/quizCards.js';
import { blockText } from '../src/quizDoses.js';

const sections = guidelineData.sections;
const allGuidelines = sections.flatMap((section) => section.items);
const byNumber = (number) => allGuidelines.find((guideline) => guideline.n === number);
const quizzed = quizGuidelines(sections);
const quizzedByNumber = (number) => quizzed.find((candidate) => candidate.number === number);

/** A repeatable stand-in for Math.random (Park-Miller). */
function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}

const medicineNames = sections
  .find((section) => section.name === 'Medicines')
  .items.filter((guideline) => guideline.b.some((block) => /Indications/.test(block[1])))
  .flatMap((guideline) => tableNames(guideline.t));
const context = {
  quizzed,
  allGuidelines,
  medicineNames,
  pools: valuePools(allGuidelines.flatMap((guideline) => guideline.b.map(blockText))),
  redFlagLists: allGuidelines
    .map((guideline) => ({ id: guideline.id, flags: redFlags(guideline) }))
    .filter((list) => list.flags.length > 0),
  relatedIds: (id) => (relatedLinks[id] || []).map((link) => link[0]),
};

/* ---------- Rounds ---------- */

test('VT is split into its four situations, in guideline order', () => {
  const rounds = quizzedByNumber('3.8').rounds;
  assert.deepEqual(
    rounds.map((round) => round.title),
    [
      '',
      'If the patient is not compromised or is mildly compromised',
      'If the patient is moderately compromised or is severely compromised',
      'If torsades de pointes is present or has occurred',
    ],
  );
  assert.equal(
    rounds[0].actions[0].text,
    'Attach defibrillation pads in the anterior/posterior position when feasible.',
  );
  assert.equal(rounds[3].actions.length, 2, 'two-action rounds are kept');
});

test('situations: lines indented under an action stay with it; Backup ends the actions', () => {
  const asthma = situations(byNumber('2.1').b);
  const severe = asthma.find((round) => round.title === 'Severe asthma');
  const adrenaline = severe.actions.find((action) => /^Administer adrenaline IM/.test(action.text));
  assert.equal(adrenaline.blocks.length, 3, 'the action and its two lines for adult and child');
  const allText = asthma.flatMap((round) => round.actions.map((action) => action.text)).join(' ');
  assert.doesNotMatch(allText, /Backup from/, 'nothing after the Backup heading');
});

test('only treatment guidelines and action lists are quizzed; Medicines are not', () => {
  assert.equal(isTreatmentGuideline(byNumber('1.7')), false, 'Documentation');
  assert.equal(isTreatmentGuideline(byNumber('3.11')), true, 'Cardioversion Action List');
  assert.ok(quizzedByNumber('12.12'), 'Anaphylaxis');
  assert.equal(quizzedByNumber('1.10'), undefined, 'Status Codes');
  assert.ok(quizzed.every((candidate) => candidate.section !== 'Medicines'));
  assert.ok(quizzed.length > 70, `${quizzed.length} guidelines quizzed`);
});

test('distractors come from the same medicine first and never copy this guideline', () => {
  const vt = quizzedByNumber('3.8');
  const round = vt.rounds[1]; // amiodarone
  const candidates = distractorCandidates(
    round,
    vt,
    quizzed,
    medicineNames,
    context.relatedIds(vt.id),
  );
  const own = new Set(vt.rounds.flatMap((r) => r.actions.map((a) => normalisedText(a.text))));
  assert.ok(candidates.every((candidate) => !own.has(normalisedText(candidate.text))));
  assert.ok(candidates[0].sameMedicine && /amiodarone/i.test(candidates[0].text));
  const picked = pickDistractors(candidates, 2, seededRandom(3));
  assert.equal(picked.length, 2);
  assert.ok(picked.every((candidate) => candidate.sameMedicine));
});

/* ---------- Marking ---------- */

test('marking counts the longest run in order, so one early card costs one mark', () => {
  assert.deepEqual([...inOrderPositions(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd'])], [0, 1, 2, 3]);
  assert.equal(inOrderPositions(['d', 'a', 'b', 'c'], ['a', 'b', 'c', 'd']).size, 3);
  assert.equal(inOrderPositions(['b', 'a'], ['a', 'b']).size, 1);
});

test('a round gives one mark per card in order and per distractor put aside', () => {
  // Shown shuffled: the guideline's order is first, second, third.
  const cards = [
    { text: 'third', isDistractor: false },
    { text: 'other', isDistractor: true },
    { text: 'first', isDistractor: false },
    { text: 'second', isDistractor: false },
  ];
  const expected = ['first', 'second', 'third'];
  assert.equal(markRound(cards, expected, [2, 3, 0], [1]).score, 4);
  assert.equal(markRound(cards, expected, [0, 2, 3], [1]).score, 3, 'third placed first');
  const distractorPlaced = markRound(cards, expected, [2, 1, 3, 0], []);
  assert.equal(distractorPlaced.score, 3);
  assert.equal(distractorPlaced.correctIndexes.has(1), false);
  assert.equal(markRound(cards, expected, [2, 3], [1, 0]).score, 3, 'a real card put aside');
});

/* ---------- Numbers ---------- */

test('values: ranges, units with a slash and no-space units are read whole', () => {
  const values = valuesInText(
    'Give 150-200 mcg, then 1 mg/kg over 30 minutes; 0.9% saline; 100/minute.',
  );
  assert.deepEqual(
    values.map(({ value, unit }) => `${value} ${unit}`),
    ['150-200 mcg', '1 mg/kg', '30 minutes', '0.9 %', '100 /minute'],
  );
  assert.deepEqual(valuesInText('Acquire a 12 lead ECG.'), []);
});

test('wrong numbers: same unit from the guidelines, never a value in the line, else ten times', () => {
  const pools = { mg: new Set(['150', '300', '450', '600', '5-10']) };
  const wrong = wrongValues('300', 'mg', pools, ['300', '150'], 3, seededRandom(1));
  assert.equal(wrong.length, 3);
  assert.ok(!wrong.includes('300') && !wrong.includes('150'));
  assert.ok(!wrong.includes('5-10'), 'a range is only offered for a range');
  assert.deepEqual(wrongValues('2', 'joules', {}, ['2'], 2, seededRandom(1)), ['20', '0.2']);
  assert.deepEqual(wrongValues('0.1', 'mg', {}, [], 1, seededRandom(1)), ['1']);
});

test('a number question has four different choices including the answer', () => {
  const line = 'Administer 300 mg of amiodarone IV over approximately 30 minutes.';
  for (let seed = 1; seed < 40; seed++) {
    const question = numberQuestion(line, 0, context.pools, seededRandom(seed));
    assert.equal(question.answer, '300 mg');
    assert.equal(question.before, 'Administer ');
    assert.equal(new Set(question.choices).size, CHOICE_COUNT);
    assert.ok(question.choices.includes('300 mg'));
  }
});

test('some questions offer the right number with a wrong unit', () => {
  const line = 'Administer 0.5 mg IM for an adult.';
  const choiceSets = [1, 2, 3, 4, 5, 6, 7, 8].map(
    (seed) => numberQuestion(line, 0, context.pools, seededRandom(seed)).choices,
  );
  assert.ok(choiceSets.some((choices) => choices.includes('0.5 mcg') || choices.includes('0.5 g')));
});

test('the 0.9% of "0.9% sodium chloride" is never asked', () => {
  const line = 'Administer 0.9% sodium chloride IV.';
  assert.equal(numberQuestion(line, 0, context.pools, seededRandom(1)), null);
});

test('lines for children by age range are recognised', () => {
  assert.equal(isForChildAges('10 mg for a patient aged 1-11 years.'), true);
  assert.equal(
    isForChildAges('20 mg for a patient aged greater than or equal to 12 years.'),
    false,
  );
  assert.equal(
    isForChildAges('For a child aged less than five years:'),
    false,
    'words, not digits',
  );
  assert.equal(
    cardText('Administer 1 g cefazolin IV. See the paediatric drug dose tables for a child.'),
    'Administer 1 g cefazolin IV.',
  );
});

/* ---------- Course-changing questions ---------- */

test('red flags are read from the Red flags heading; near copies count as the same flag', () => {
  const flags = redFlags(byNumber('6.4'));
  assert.equal(flags.length, 11);
  assert.equal(flags[0], 'Severe pain, blistering or skin necrosis.');
  assert.equal(isSameFlag('Temperature > 40°C.', 'Temperature > 40°C'), true);
  assert.equal(isSameFlag('Rapidly spreading.', 'Abnormal speech.'), false);
});

test('"If …, move to the … guideline" actions name the guideline to move to', () => {
  const [found] = moveToActions(quizzedByNumber('6.4'), allGuidelines);
  assert.equal(found.condition, 'If the patient has suspected bacterial sepsis');
  assert.equal(found.target.t, 'Bacterial Sepsis');
});

/* ---------- Whole plays ---------- */

test('every play of every guideline is well formed', () => {
  const random = seededRandom(11);
  for (const candidate of quizzed) {
    const steps = buildPlay(candidate, context, random);
    const orders = steps.filter((step) => step.kind === 'order');
    assert.equal(orders.length, candidate.rounds.length, candidate.number);
    for (const step of orders) {
      const distractors = step.cards.filter((card) => card.isDistractor);
      assert.ok(distractors.length <= DISTRACTORS_PER_ROUND, candidate.number);
      const realTexts = new Set(step.real.map((card) => normalisedText(card.text)));
      assert.ok(distractors.every((card) => !realTexts.has(normalisedText(card.text))));
      assert.ok(step.cards.every((card) => card.text.length > 0));
    }
    for (const step of steps.filter((s) => s.kind === 'choice')) {
      assert.ok(step.choices.includes(step.answer), `${candidate.number} ${step.type}`);
      assert.equal(
        new Set(step.choices).size,
        step.choices.length,
        `${candidate.number} ${step.type}`,
      );
      assert.ok(step.choices.length >= 2);
    }
    assert.ok(playTotal(steps) > 0);
  }
});

test('Paediatrics, Croup and Bronchiolitis get no number questions', () => {
  for (const number of ['7.3', '2.7', '2.9']) {
    const steps = buildPlay(quizzedByNumber(number), context, seededRandom(5));
    assert.ok(
      steps.every((step) => step.type !== 'number'),
      number,
    );
  }
});
