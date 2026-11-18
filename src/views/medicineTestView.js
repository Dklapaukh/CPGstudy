/*
 * The Medicine test screen (address #medicine-test) and its button in the Quiz choice. Drawn
 * from state.medicineTest: the medicine picker, one question, or the score at the end.
 * Depends on state.js, logic.js, quizState.js, medicineTest.js, medicineTestState.js and
 * constants.js.
 */
import { state } from '../state.js';
import { escapeHtml } from '../logic.js';
import { quizMedicines } from '../quizState.js';
import { TEST_KIND, isRightAnswer } from '../medicineTest.js';
import { currentTestQuestion } from '../medicineTestState.js';
import { MEDICINE_TEST_HASH } from '../constants.js';

const app = document.getElementById('app');
const BLANK = '____';
const PERCENT = 100;

/** The "Medicine test" button for the Quiz choice on the list screen. */
export const medicineTestButtonHtml = () =>
  `<a class="quiz-button" href="#${MEDICINE_TEST_HASH}">Medicine test</a>`;

/** The medicine picker and Start button, the screen before a test. */
function pickerHtml() {
  const options = quizMedicines()
    .map(
      (medicine) =>
        `<option value="${escapeHtml(medicine.id)}"${
          medicine.id === state.medicineTestChoice ? ' selected' : ''
        }>${escapeHtml(medicine.name)}</option>`,
    )
    .join('');
  return `<p class="quiz-help">Test everything about one medicine at once: indications,
      contraindications, doses, cautions, adverse effects, onset, duration and how it works.
      Follows the practice level chosen in the Medicines quiz. Nothing is saved but your streak.</p>
    <select id="medicine-test-choice" aria-label="Medicine to test">${options}</select>
    <button class="quiz-start-button" type="button" data-action="test-start">Start test</button>`;
}

/** The line of a number question, with its blank; nothing for other questions. */
function blankLineHtml(question) {
  if (question.before === undefined) return '';
  return `<p class="choice-line">${escapeHtml(question.before)}<span class="choice-blank">${BLANK}</span>${escapeHtml(
    question.after,
  )}</p>`;
}

/** One point of a tick question: a toggle, or once checked marked in words and colour. */
function tickOptionHtml(question, option, index, test) {
  const ticked = test.ticked.includes(index);
  if (!test.checked) {
    return `<button class="choice-button tick-button" type="button" data-action="test-tick"
      data-option="${index}" aria-pressed="${ticked}"><span class="tick-box" aria-hidden="true">${
        ticked ? '☑' : '☐'
      }</span>${escapeHtml(option)}</button>`;
  }
  const isRight = question.rightIndexes.includes(index);
  let mark = '';
  let modifier = '';
  if (isRight) {
    mark = ticked ? '✓ ' : 'Missed: ';
    modifier = ' choice-button--right';
  } else if (ticked) {
    mark = '✗ Not this one: ';
    modifier = ' choice-button--wrong';
  }
  return `<button class="choice-button${modifier}" type="button" disabled>${mark}${escapeHtml(option)}</button>`;
}

/** One choice of a choice question: a button, or once picked marked right or wrong. */
function choiceOptionHtml(question, option, index, test) {
  if (!test.checked) {
    return `<button class="choice-button" type="button" data-action="test-pick"
      data-option="${index}">${escapeHtml(option)}</button>`;
  }
  const isAnswer = option === question.answer;
  const isPicked = index === test.picked;
  const modifier = isAnswer ? ' choice-button--right' : isPicked ? ' choice-button--wrong' : '';
  const mark = isAnswer ? '✓ ' : isPicked ? '✗ ' : '';
  return `<button class="choice-button${modifier}" type="button" disabled>${mark}${escapeHtml(option)}</button>`;
}

/** Under the options: Check (tick questions), then the verdict and Next. */
function verdictHtml(question, test) {
  if (!test.checked) {
    return question.kind === TEST_KIND.TICK
      ? '<button class="quiz-start-button" type="button" data-action="test-check">Check</button>'
      : '';
  }
  const answer = question.kind === TEST_KIND.TICK ? test.ticked : test.picked;
  const right = isRightAnswer(question, answer);
  const last = test.index === test.questions.length - 1;
  return `<p class="quiz-counts">${right ? 'Right' : 'Not quite'}</p>
    <p class="quiz-source">From ${escapeHtml(question.source)}</p>
    <button class="quiz-start-button" type="button" data-action="test-next">${
      last ? 'See score' : 'Next'
    }</button>`;
}

/** The question being asked. */
function questionHtml(question, test) {
  const optionHtml = question.kind === TEST_KIND.TICK ? tickOptionHtml : choiceOptionHtml;
  const options = question.options
    .map((option, index) => optionHtml(question, option, index, test))
    .join('');
  return `<p class="quiz-left">${escapeHtml(test.name)} · question ${test.index + 1} of ${
    test.questions.length
  } · score ${test.score}</p>
    <h2 class="quiz-prompt">${escapeHtml(question.prompt)}</h2>${blankLineHtml(question)}
    <div class="choice-buttons">${options}</div>${verdictHtml(question, test)}`;
}

/** The end of a test: the score as a ring (see .score-ring in app.css) and what next. */
function finishedHtml(test) {
  const percent = Math.round((test.score / test.questions.length) * PERCENT);
  return `<div class="score-ring" role="img" aria-label="Score ${percent}%"
      style="--score-target:${percent}"></div>
    <p class="quiz-finished">${escapeHtml(test.name)}: ${test.score} of ${
      test.questions.length
    } (${percent}%)</p>
    <button class="quiz-start-button" type="button" data-action="test-again">Test again</button>`;
}

/** Draws the Medicine test screen. */
export function renderMedicineTestScreen() {
  const test = state.medicineTest;
  const question = currentTestQuestion();
  let body = pickerHtml();
  if (test && test.finished) body = finishedHtml(test);
  else if (question) body = questionHtml(question, test);
  const end = test
    ? `<button class="quiz-end-button" type="button" data-action="test-end">${
        test.finished ? 'Choose another medicine' : 'End test'
      }</button>`
    : '';
  app.innerHTML = `<a class="back-link" href="#">‹ All guidelines</a>
    <div class="page-padding quiz-screen medicine-test-screen"><h1 class="quiz-title">Medicine test</h1>
    <span class="sync-status"></span>${body}${end}</div>`;
}
