/*
 * Medicine test (medicineTest.js): question styles by topic, wrong answers and marking, on the
 * real quiz cards (counts and shapes only, no guideline text in the output).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guidelineData } from '../content/guidelines.js';
import { flattenGuidelines } from '../src/logic.js';
import { buildQuizCards, tableNames } from '../src/quizCards.js';
import { buildMedicineTest, isRightAnswer, TEST_KIND } from '../src/medicineTest.js';
import { namesMedicine } from '../src/quizDoses.js';
import { QUIZ_SECTION_NAME } from '../src/constants.js';

const allCards = buildQuizCards(guidelineData.sections, QUIZ_SECTION_NAME);
const guidelines = flattenGuidelines(guidelineData);
const medicineIds = [...new Set(allCards.map((card) => card.medicineId))];
const titleOf = (id) => guidelines.find((guideline) => guideline.id === id).t;
const namesById = Object.fromEntries(medicineIds.map((id) => [id, tableNames(titleOf(id))]));
const allNames = Object.values(namesById).flat();

/** The test of one medicine, by the start of its title. */
function testOf(titleStart, random = Math.random) {
  const id = medicineIds.find((each) => titleOf(each).startsWith(titleStart));
  const testCards = allCards.filter((card) => card.medicineId === id);
  return buildMedicineTest({ testCards, allCards, medicineName: titleOf(id), namesById }, random);
}

test('Adrenaline: indications are tick-all, doses are one of four values', () => {
  const questions = testOf('Adrenaline');
  const indications = questions.find((question) => question.prompt.startsWith('Indications'));
  assert.equal(indications.kind, TEST_KIND.TICK);
  assert.equal(indications.options.length, 5);
  assert.ok(indications.rightIndexes.length >= 1 && indications.rightIndexes.length <= 3);
  const doses = questions.filter((question) => /Dose: which is right\?$/.test(question.prompt));
  assert.ok(doses.length >= 10, `${doses.length} dose questions`);
  for (const dose of doses) {
    assert.equal(dose.kind, TEST_KIND.CHOICE);
    assert.equal(dose.options.length, 4);
    assert.equal(new Set(dose.options).size, 4, 'four different values');
    assert.ok(dose.options.includes(dose.answer));
    assert.ok(!dose.prompt.startsWith('Adrenaline'), 'the medicine is named once, at the top');
  }
});

test('every medicine gets a test; options are short and wrong ones name no medicine', () => {
  for (const id of medicineIds) {
    const testCards = allCards.filter((card) => card.medicineId === id);
    const questions = buildMedicineTest(
      { testCards, allCards, medicineName: titleOf(id), namesById },
      Math.random,
    );
    assert.ok(questions.length > 0, titleOf(id));
    for (const question of questions) {
      assert.ok(question.options.every((option) => option.length <= 140));
      const wrong =
        question.kind === TEST_KIND.TICK
          ? question.options.filter((_, index) => !question.rightIndexes.includes(index))
          : question.options.filter((option) => option !== question.answer);
      if (question.before === undefined) {
        assert.ok(wrong.every((option) => !namesMedicine(option, allNames)));
      }
    }
  }
});

test('mechanism answers do not give the medicine away by name', () => {
  const mechanism = testOf('Adrenaline').find((question) => question.prompt.startsWith('Mech'));
  assert.ok(mechanism);
  assert.ok(mechanism.options.every((option) => !namesMedicine(option, allNames)));
});

test('isRightAnswer needs exactly the right points ticked, or the right choice', () => {
  const tick = { kind: TEST_KIND.TICK, options: ['a', 'b', 'c'], rightIndexes: [0, 2] };
  assert.equal(isRightAnswer(tick, [2, 0]), true);
  assert.equal(isRightAnswer(tick, [0]), false);
  assert.equal(isRightAnswer(tick, [0, 1, 2]), false);
  const choice = { kind: TEST_KIND.CHOICE, options: ['1 mg', '10 mg'], answer: '1 mg' };
  assert.equal(isRightAnswer(choice, 0), true);
  assert.equal(isRightAnswer(choice, 1), false);
});
