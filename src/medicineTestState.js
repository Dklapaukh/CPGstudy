/*
 * Medicine test: the test being taken, in memory only (state.medicineTest). Nothing is saved
 * except the streak day when a test is finished. The questions are built by medicineTest.js
 * from the cards the chosen practice level studies.
 * Depends on state.js, streakState.js, guidelines.js, quizState.js, quizCards.js and
 * medicineTest.js.
 */
import { state } from './state.js';
import { recordQuizFinished } from './streakState.js';
import { guidelines } from './guidelines.js';
import { quizCards, studyCards, quizMedicines } from './quizState.js';
import { tableNames } from './quizCards.js';
import { buildMedicineTest, isRightAnswer, TEST_KIND } from './medicineTest.js';

let cachedNames = null;

/** Every medicine's lower-case names by medicine id, built the first time it is needed. */
function namesById() {
  if (!cachedNames) {
    cachedNames = Object.fromEntries(
      quizMedicines(true).map((medicine) => [medicine.id, tableNames(medicine.name)]),
    );
  }
  return cachedNames;
}

/** The parts of the test that start again for every question. */
const freshQuestion = () => ({ ticked: [], picked: null, checked: false });

/**
 * Starts the test of one medicine. state.medicineTest becomes { medicineId, name, questions,
 * index, ticked (option indexes), picked (option index or null), checked, score, finished }.
 */
export function startMedicineTest(medicineId, random = Math.random) {
  const guideline = guidelines.find((candidate) => candidate.id === medicineId);
  const testCards = studyCards().filter((card) => card.medicineId === medicineId);
  if (!guideline || testCards.length === 0) return;
  const questions = buildMedicineTest(
    { testCards, allCards: quizCards(), medicineName: guideline.t, namesById: namesById() },
    random,
  );
  if (questions.length === 0) return;
  state.medicineTest = {
    medicineId,
    name: guideline.t,
    questions,
    index: 0,
    score: 0,
    finished: false,
    ...freshQuestion(),
  };
}

/** The question being shown, or null when no test is running or it is finished. */
export function currentTestQuestion() {
  const test = state.medicineTest;
  return test && !test.finished ? test.questions[test.index] : null;
}

/** Ticks or unticks one point of a tick question before it is checked. */
export function toggleTick(optionIndex) {
  const test = state.medicineTest;
  const question = currentTestQuestion();
  if (!question || question.kind !== TEST_KIND.TICK || test.checked) return;
  test.ticked = test.ticked.includes(optionIndex)
    ? test.ticked.filter((index) => index !== optionIndex)
    : [...test.ticked, optionIndex];
}

/** Marks the current question: the ticked points, or the choice just picked. */
function markAnswer(answer) {
  const test = state.medicineTest;
  test.checked = true;
  if (isRightAnswer(currentTestQuestion(), answer)) test.score++;
}

/** Checks a tick question. */
export function checkTicks() {
  const question = currentTestQuestion();
  if (!question || question.kind !== TEST_KIND.TICK || state.medicineTest.checked) return;
  markAnswer(state.medicineTest.ticked);
}

/** Picks one choice of a choice question, which marks it at once. */
export function pickTestChoice(optionIndex) {
  const question = currentTestQuestion();
  if (!question || question.kind !== TEST_KIND.CHOICE || state.medicineTest.checked) return;
  state.medicineTest.picked = optionIndex;
  markAnswer(optionIndex);
}

/** Moves on after a marked question; after the last one the test is finished. */
export function nextTestQuestion() {
  const test = state.medicineTest;
  if (!test || !test.checked) return;
  Object.assign(test, freshQuestion());
  test.index++;
  if (test.index >= test.questions.length) {
    test.finished = true;
    recordQuizFinished();
  }
}

/** Leaves the test. */
export function endMedicineTest() {
  state.medicineTest = null;
}
