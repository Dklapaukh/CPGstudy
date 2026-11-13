/*
 * The Guideline quiz screen (address #guideline-quiz) and its button on the list screen.
 * Drawn from the state: the guideline picker when no play is running, otherwise the current
 * step (an ordering round or a choice question), and the result at the end.
 * Cards are placed by tapping (Place next / Not in this guideline / Take back) rather than
 * dragged, because dragging is unreliable on phones and cannot be done with a screen reader.
 * Depends on state.js, logic.js, guidelineQuizState.js, templates.js and constants.js.
 */
import { state } from '../state.js';
import { escapeHtml, formatUpdatedDate } from '../logic.js';
import { quizzedGuidelines, currentStep, bestScore, percentOf } from '../guidelineQuizState.js';
import { blockHtml } from './templates.js';
import { GUIDELINE_QUIZ_HASH } from '../constants.js';

const app = document.getElementById('app');
const BLANK = '____';

/** The "Guideline quiz" button for the list screen. */
export function guidelineQuizButtonHtml() {
  return `<a class="quiz-button" href="#${GUIDELINE_QUIZ_HASH}">Guideline quiz</a>`;
}

/** " · best 80%" for a guideline that has been played, otherwise ''. */
function bestText(guidelineId) {
  const saved = bestScore(guidelineId);
  return saved ? ` · best ${saved.best}%` : '';
}

/** The guideline dropdown, grouped by section, with the chosen one selected. */
function pickerSelectHtml() {
  const groups = [];
  for (const quizzed of quizzedGuidelines()) {
    let group = groups.find((candidate) => candidate.name === quizzed.section);
    if (!group) {
      group = { name: quizzed.section, options: [] };
      groups.push(group);
    }
    const selected = quizzed.id === state.guidelineQuizChoice ? ' selected' : '';
    group.options.push(
      `<option value="${escapeHtml(quizzed.id)}"${selected}>${escapeHtml(
        `${quizzed.number} ${quizzed.title}${bestText(quizzed.id)}`,
      )}</option>`,
    );
  }
  const optionGroups = groups
    .map(
      (group) => `<optgroup label="${escapeHtml(group.name)}">${group.options.join('')}</optgroup>`,
    )
    .join('');
  return `<select id="guideline-quiz-choice" aria-label="Guideline to quiz">${optionGroups}</select>`;
}

function pickerHtml() {
  const played = quizzedGuidelines().filter((quizzed) => bestScore(quizzed.id)).length;
  return `<p class="quiz-help">Put the actions at the top of a guideline in order, and put the
      cards that come from other guidelines in “Not in this guideline”. Then answer a few
      questions on its numbers and on what changes the treatment.</p>
    ${pickerSelectHtml()}
    <button class="quiz-start-button" type="button" data-action="guideline-quiz-start">Start</button>
    <button class="quiz-end-button" type="button" data-action="guideline-quiz-random">
      Random guideline</button>
    <p class="quiz-totals">${played} of ${quizzedGuidelines().length} guidelines played</p>`;
}

/* ---------- Ordering round ---------- */

/** A card's text with the buttons that move it. `moves` is [{ action, label }]. */
function cardRowHtml(card, cardIndex, moves) {
  const buttons = moves
    .map(
      ({ action, label }) => `<button class="order-move-button" type="button"
        data-action="${action}" data-card="${cardIndex}">${label}</button>`,
    )
    .join('');
  return `<li class="order-card"><span class="order-card-text">${escapeHtml(card.text)}</span>
    <span class="order-card-buttons">${buttons}</span></li>`;
}

const TAKE_BACK = [{ action: 'guideline-quiz-return', label: 'Take back' }];
const PLACE = [
  { action: 'guideline-quiz-place', label: 'Place next' },
  { action: 'guideline-quiz-discard', label: 'Not in this guideline' },
];

/** The round while cards are still being placed. */
function orderingHtml(step) {
  const quiz = state.guidelineQuiz;
  const left = step.cards
    .map((card, index) => ({ card, index }))
    .filter(({ index }) => !quiz.placed.includes(index) && !quiz.discarded.includes(index));
  const list = (indexes, moves) =>
    indexes.map((index) => cardRowHtml(step.cards[index], index, moves)).join('');
  const ready = left.length === 0;
  return `<h3 class="order-heading">Your order</h3>
    <ol class="order-list">${list(quiz.placed, TAKE_BACK) || '<li class="order-empty">Tap “Place next” on the first action.</li>'}</ol>
    ${
      left.length
        ? `<h3 class="order-heading">Cards to place (${left.length})</h3>
          <ul class="order-list order-list--pool">${left
            .map(({ card, index }) => cardRowHtml(card, index, PLACE))
            .join('')}</ul>`
        : ''
    }
    <h3 class="order-heading">Not in this guideline</h3>
    <ul class="order-list order-list--aside">${list(quiz.discarded, TAKE_BACK) || '<li class="order-empty">None yet.</li>'}</ul>
    <button class="quiz-start-button" type="button" data-action="guideline-quiz-check"${
      ready ? '' : ' disabled'
    }>${ready ? 'Check' : 'Place every card to check'}</button>`;
}

/** One marked card: right or wrong (in words, not only colour) and where it really belongs. */
function markedCardHtml(step, cardIndex, placedHere) {
  const card = step.cards[cardIndex];
  const right = state.guidelineQuiz.marked.correctIndexes.has(cardIndex);
  let note = '';
  if (card.isDistractor)
    note = right ? `From ${card.source}` : `Not in this guideline: from ${card.source}`;
  else if (!placedHere) note = 'This is in the guideline';
  else if (!right) note = 'Out of order';
  return `<li class="order-card order-card--${right ? 'right' : 'wrong'}">
    <span class="order-mark">${right ? '✓ Right' : '✗ Wrong'}</span>
    <span class="order-card-text">${escapeHtml(card.text)}</span>
    ${note ? `<span class="order-note">${escapeHtml(note)}</span>` : ''}</li>`;
}

/** The round after Check: the marks, then the guideline's order with the detail of each action. */
function markedRoundHtml(step) {
  const quiz = state.guidelineQuiz;
  const guidelineOrder = step.real
    .map(
      (action) =>
        `<li class="order-answer">${action.blocks.map((block) => blockHtml(block, '')).join('')}</li>`,
    )
    .join('');
  return `<p class="quiz-counts">${quiz.marked.score} of ${quiz.marked.total} right</p>
    <h3 class="order-heading">Your order</h3>
    <ol class="order-list">${quiz.placed.map((index) => markedCardHtml(step, index, true)).join('')}</ol>
    <h3 class="order-heading">Not in this guideline</h3>
    <ul class="order-list order-list--aside">${
      quiz.discarded.map((index) => markedCardHtml(step, index, false)).join('') ||
      '<li class="order-empty">None.</li>'
    }</ul>
    <h3 class="order-heading">The guideline’s order</h3>
    <ol class="order-answers quiz-answer">${guidelineOrder}</ol>
    <p class="quiz-source">From ${escapeHtml(step.real[0].source)}</p>
    <button class="quiz-start-button" type="button" data-action="guideline-quiz-next">Next</button>`;
}

function orderStepHtml(step) {
  const situation = step.title ? `<p class="order-situation">${escapeHtml(step.title)}</p>` : '';
  const body = state.guidelineQuiz.marked ? markedRoundHtml(step) : orderingHtml(step);
  return `<h2 class="quiz-prompt">Put the actions in order</h2>${situation}${body}`;
}

/* ---------- Choice question ---------- */

/** The line the question is about: a sentence with a blank, or a quoted action or condition. */
function questionLineHtml(step) {
  const context = step.context ? `<p class="choice-context">${escapeHtml(step.context)}</p>` : '';
  if (step.type === 'number') {
    return `${context}<p class="choice-line">${escapeHtml(step.before)}<span class="choice-blank">${BLANK}</span>${escapeHtml(step.after)}</p>`;
  }
  return step.line ? `${context}<p class="choice-line">${escapeHtml(step.line)}</p>` : context;
}

function choiceButtonHtml(step, choice, index) {
  const picked = state.guidelineQuiz.picked;
  if (picked === null) {
    return `<button class="choice-button" type="button" data-action="guideline-quiz-pick"
      data-choice="${index}">${escapeHtml(choice)}</button>`;
  }
  const isAnswer = choice === step.answer;
  const modifier = isAnswer
    ? ' choice-button--right'
    : index === picked
      ? ' choice-button--wrong'
      : '';
  const mark = isAnswer ? '✓ ' : index === picked ? '✗ ' : '';
  return `<button class="choice-button${modifier}" type="button" disabled>${mark}${escapeHtml(choice)}</button>`;
}

function choiceStepHtml(step) {
  const quiz = state.guidelineQuiz;
  const buttons = step.choices
    .map((choice, index) => choiceButtonHtml(step, choice, index))
    .join('');
  const verdict =
    quiz.picked === null
      ? ''
      : `<p class="quiz-counts">${step.choices[quiz.picked] === step.answer ? 'Right' : `Wrong: the answer is ${escapeHtml(step.answer)}`}</p>
        <button class="quiz-start-button" type="button" data-action="guideline-quiz-next">Next</button>`;
  return `<h2 class="quiz-prompt">${escapeHtml(step.prompt)}</h2>${questionLineHtml(step)}
    <div class="choice-buttons">${buttons}</div>${verdict}`;
}

/* ---------- Result and screen ---------- */

function finishedHtml() {
  const quiz = state.guidelineQuiz;
  const saved = bestScore(quiz.guidelineId);
  const best = saved
    ? `<p class="quiz-totals">Best: ${saved.best}% (${formatUpdatedDate(saved.at)})</p>`
    : '';
  return `<p class="quiz-finished">Finished: ${quiz.score} of ${quiz.total} (${percentOf(
    quiz.score,
    quiz.total,
  )}%)</p>${best}
    <button class="quiz-start-button" type="button" data-action="guideline-quiz-again">Play again</button>`;
}

/** Draws the guideline quiz screen. */
export function renderGuidelineQuizScreen() {
  const quiz = state.guidelineQuiz;
  const step = currentStep();
  let body = pickerHtml();
  if (quiz && quiz.finished) body = finishedHtml();
  else if (step) {
    const progress = `<p class="quiz-left">${escapeHtml(quiz.title)} · step ${quiz.index + 1} of ${
      quiz.steps.length
    } · score ${quiz.score}</p>`;
    body = progress + (step.kind === 'order' ? orderStepHtml(step) : choiceStepHtml(step));
  }
  const end = quiz
    ? `<button class="quiz-end-button" type="button" data-action="guideline-quiz-end">${
        quiz.finished ? 'Choose another guideline' : 'End quiz (score not saved)'
      }</button>`
    : '';
  app.innerHTML = `<a class="back-link" href="#">‹ All guidelines</a>
    <div class="page-padding quiz-screen guideline-quiz-screen"><h1 class="quiz-title">Guideline quiz</h1>
    <span class="sync-status"></span>${body}${end}</div>`;
}
