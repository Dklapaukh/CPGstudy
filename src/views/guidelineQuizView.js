/*
 * The Guideline quiz screen (address #guideline-quiz) and its button on the list screen.
 * Drawn from the state: the guideline picker when no play is running, otherwise the current
 * step (an ordering round or a choice question), and the result at the end.
 * Cards start in one list in shuffled order and are moved by dragging their grip (see
 * dragCards.js) or with the up and down arrows, which also work with a screen reader.
 * Depends on state.js, logic.js, guidelineQuizState.js, templates.js and constants.js.
 */
import { state } from '../state.js';
import { escapeHtml, formatUpdatedDate } from '../logic.js';
import { quizzedGuidelines, currentStep, bestScore, percentOf } from '../guidelineQuizState.js';
import { blockHtml } from './templates.js';
import { GUIDELINE_QUIZ_HASH } from '../constants.js';
import { CARD_LIST } from '../guidelineQuizState.js';

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

const ARROW_UP =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"></path></svg>';
const ARROW_DOWN =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>';
const GRIP = `<svg viewBox="0 0 24 24" aria-hidden="true">${[6, 12, 18]
  .flatMap((y) => [9, 15].map((x) => `<circle cx="${x}" cy="${y}" r="1.6"></circle>`))
  .join('')}</svg>`;
// Shortened card text for button labels read by screen readers.
const LABEL_LENGTH = 40;

/**
 * One card that can still be moved: a grip to drag it on the left, its text, a button to move it
 * to the other list, and up and down arrows on the right. `position` and `count` are its place
 * in its own list, so the arrows at either end are switched off.
 */
function movableCardHtml(card, cardIndex, position, count, isAside) {
  const name = escapeHtml(card.text.slice(0, LABEL_LENGTH));
  const other = isAside
    ? `<button class="order-switch-button" type="button" data-action="guideline-quiz-return"
        data-card="${cardIndex}">Put back in the order</button>`
    : `<button class="order-switch-button" type="button" data-action="guideline-quiz-discard"
        data-card="${cardIndex}">Not in this guideline</button>`;
  const arrow = (action, svg, label, disabled) =>
    `<button class="order-arrow" type="button" data-action="${action}" data-card="${cardIndex}"
      aria-label="${label}: ${name}"${disabled ? ' disabled' : ''}>${svg}</button>`;
  return `<li class="order-card order-card--movable" data-card="${cardIndex}">
    <span class="order-grip" data-card="${cardIndex}" title="Drag to move">${GRIP}</span>
    <span class="order-card-main"><span class="order-card-text">${escapeHtml(card.text)}</span>
      ${other}</span>
    <span class="order-arrows">${arrow('guideline-quiz-up', ARROW_UP, 'Move up', position === 0)}${arrow(
      'guideline-quiz-down',
      ARROW_DOWN,
      'Move down',
      position === count - 1,
    )}</span></li>`;
}

/** The round while cards are being ordered. Every card is in one of the two lists. */
function orderingHtml(step) {
  const quiz = state.guidelineQuiz;
  const list = (indexes, isAside) =>
    indexes
      .map((index, position) =>
        movableCardHtml(step.cards[index], index, position, indexes.length, isAside),
      )
      .join('');
  return `<p class="quiz-help">Drag a card by its grip, or use the arrows. Move cards from other
      guidelines to “Not in this guideline”.</p>
    <h3 class="order-heading">Your order</h3>
    <ol class="order-list" data-drop-list="${CARD_LIST.PLACED}">${list(quiz.placed, false)}</ol>
    <h3 class="order-heading">Not in this guideline</h3>
    <ul class="order-list order-list--aside" data-drop-list="${CARD_LIST.DISCARDED}">${
      list(quiz.discarded, true) ||
      '<li class="order-empty">Drag cards here that do not belong.</li>'
    }</ul>
    <button class="quiz-start-button" type="button" data-action="guideline-quiz-check">Check</button>`;
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

/**
 * The score as a ring that fills up while its percent counts up (both done in CSS, see
 * .score-ring in app.css). The percent is also in the label, for screen readers.
 */
function scoreRingHtml(percent) {
  return `<div class="score-ring" role="img" aria-label="Score ${percent}%"
    style="--score-target:${percent}"></div>`;
}

function finishedHtml() {
  const quiz = state.guidelineQuiz;
  const percent = percentOf(quiz.score, quiz.total);
  const saved = bestScore(quiz.guidelineId);
  const best = saved
    ? `<p class="quiz-totals">Best: ${saved.best}% (${formatUpdatedDate(saved.at)})</p>`
    : '';
  const place = state.guidelineQuizReturn;
  // Opened from a guideline: going back to it is the main button, Play again the second.
  const actions = place
    ? `<a class="quiz-start-button quiz-link-button" href="#${escapeHtml(place.guidelineId)}"
        >Back to the guideline</a>
      <button class="quiz-end-button" type="button" data-action="guideline-quiz-again">Play again</button>`
    : `<button class="quiz-start-button" type="button" data-action="guideline-quiz-again">Play again</button>`;
  return `${scoreRingHtml(percent)}
    <p class="quiz-finished">Finished: ${quiz.score} of ${quiz.total} (${percent}%)</p>${best}
    ${actions}`;
}

/**
 * The button under the play. Opened from a guideline's Quiz pill it is a link back to that
 * guideline (route() then puts the page back where the student was); otherwise it ends the play.
 */
function endButtonHtml(quiz) {
  const place = state.guidelineQuizReturn;
  if (place && quiz.finished) return ''; // the finished screen has its own Back button
  if (place) {
    return `<a class="quiz-end-button quiz-link-button" href="#${escapeHtml(place.guidelineId)}"
      >End quiz (score not saved)</a>`;
  }
  return `<button class="quiz-end-button" type="button" data-action="guideline-quiz-end">${
    quiz.finished ? 'Choose another guideline' : 'End quiz (score not saved)'
  }</button>`;
}

/** The link at the top: back to the guideline the quiz was opened from, or to the list. */
function backLinkHtml() {
  const place = state.guidelineQuizReturn;
  return place
    ? `<a class="back-link" href="#${escapeHtml(place.guidelineId)}">‹ Back to the guideline</a>`
    : '<a class="back-link" href="#">‹ All guidelines</a>';
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
  const end = quiz ? endButtonHtml(quiz) : '';
  app.innerHTML = `${backLinkHtml()}
    <div class="page-padding quiz-screen guideline-quiz-screen"><h1 class="quiz-title">Guideline quiz</h1>
    <span class="sync-status"></span>${body}${end}</div>`;
}
