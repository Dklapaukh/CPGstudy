/*
 * Medicine test: the test being taken, in memory (state.medicineTest), and the best scores.
 * When a test is finished the streak day is counted and the score saved as the medicine's best
 * at that practice level if it beats the saved one (MT-F): one extra entry per medicine
 * (MEDICINE_TEST_ENTRY_PREFIX + medicine id, note = JSON { levels: { level: { best, at } } }),
 * uploaded and merged like any other entry. The questions are built by medicineTest.js from
 * the cards the chosen practice level studies.
 * Depends on state.js, sync.js, logic.js, streakState.js, guidelines.js, quizState.js,
 * quizCards.js, medicineTest.js and constants.js.
 */
import { state, saveSession } from './state.js';
import { scheduleSync } from './sync.js';
import { nextTimestamp } from './logic.js';
import { recordQuizFinished } from './streakState.js';
import { guidelineById } from './guidelines.js';
import { quizCards, studyCards, quizMedicines, getQuizSettings } from './quizState.js';
import { tableNames } from './quizCards.js';
import {
  buildMedicineTest,
  isRightAnswer,
  TEST_KIND,
  bestScoreKey,
  parseBestScores,
  withTestScore,
} from './medicineTest.js';
import { STATUS, MEDICINE_TEST_ENTRY_PREFIX } from './constants.js';

const PERCENT = 100;

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

/* ---------- Best scores ---------- */

const entryId = (medicineId) => MEDICINE_TEST_ENTRY_PREFIX + medicineId;

/** Every saved best score of a medicine, by level key (see parseBestScores). */
function savedBestScores(medicineId) {
  const entry = state.entries[entryId(medicineId)];
  return parseBestScores(entry && entry.n);
}

/** The best score of a medicine at the chosen practice level: { best, at }, or null. */
export const bestTestScore = (medicineId) =>
  savedBestScores(medicineId)[bestScoreKey(getQuizSettings().practiceLevel)] || null;

/** Saves a finished test's percent as the best at its level when it beats the saved one. */
function saveTestScore(medicineId, levelKey, percent) {
  const now = Date.now();
  const { scores, isBest } = withTestScore(savedBestScores(medicineId), levelKey, percent, now);
  if (!isBest) return false;
  const id = entryId(medicineId);
  const previous = state.entries[id];
  const entry = {
    s: STATUS.INCOMPLETE,
    n: JSON.stringify({ levels: scores }),
    t: nextTimestamp(previous ? previous.t : 0, now),
  };
  state.entries[id] = entry;
  state.pendingChanges[id] = { ...entry };
  saveSession();
  scheduleSync();
  return true;
}

/* ---------- The test ---------- */

/** The parts of the test that start again for every question. */
const freshQuestion = () => ({ ticked: [], picked: null, checked: false });

/**
 * Starts the test of one medicine. state.medicineTest becomes { medicineId, name, levelKey,
 * questions, index, ticked (option indexes), picked (option index or null), checked, score,
 * finished, isNewBest }.
 */
export function startMedicineTest(medicineId, random = Math.random) {
  const guideline = guidelineById(medicineId);
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
    levelKey: bestScoreKey(getQuizSettings().practiceLevel),
    questions,
    index: 0,
    score: 0,
    finished: false,
    isNewBest: false,
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
    const percent = Math.round((test.score / test.questions.length) * PERCENT);
    test.isNewBest = saveTestScore(test.medicineId, test.levelKey, percent);
    recordQuizFinished();
  }
}

/** Leaves the test. */
export function endMedicineTest() {
  state.medicineTest = null;
}
