/*
 * The "Pick the guideline" quiz screen (address #pick-guideline) and its button in the Quiz
 * choice. Drawn from state.sortQuiz: a start screen, the round being sorted, or the marked round.
 * Depends on state.js, logic.js, guidelines.js, sortQuiz.js, sortQuizState.js and constants.js.
 */
import { state } from '../state.js';
import { escapeHtml } from '../logic.js';
import { guidelines } from '../guidelines.js';
import { SORT_SIDE } from '../sortQuiz.js';
import { nextUnplacedIndex } from '../sortQuizState.js';
import { SORT_QUIZ_HASH } from '../constants.js';

const app = document.getElementById('app');

/** The "Pick the guideline" button for the Quiz choice on the list screen. */
export const sortQuizButtonHtml = () =>
  `<a class="quiz-button" href="#${SORT_QUIZ_HASH}">Pick the guideline</a>`;

const guidelineById = (id) => guidelines.find((guideline) => guideline.id === id);

/** The two guidelines of the round by side: { left, right }. */
const roundGuidelines = (quiz) => ({
  [SORT_SIDE.LEFT]: guidelineById(quiz.leftId),
  [SORT_SIDE.RIGHT]: guidelineById(quiz.rightId),
});

/** The header naming the two guidelines, left and right. */
function headerHtml(pair) {
  const name = (side) => {
    const guideline = pair[side];
    return `<div class="sort-header__name sort-side--${side}">
      <span class="sort-header__number">CPG ${escapeHtml(guideline.n)}</span>
      <span>${escapeHtml(guideline.t)}</span></div>`;
  };
  return `<div class="sort-header">${name(SORT_SIDE.LEFT)}<span class="sort-header__or">or</span>${name(
    SORT_SIDE.RIGHT,
  )}</div>`;
}

/** The text of one piece: a paragraph, or a short list when it is a few lines. */
function pieceTextHtml(item) {
  if (item.lines.length === 1)
    return `<p class="sort-piece__text">${escapeHtml(item.lines[0])}</p>`;
  const lines = item.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
  return `<ul class="sort-piece__text">${lines}</ul>`;
}

/** The piece to place next, with a button for each box. */
function currentPieceHtml(quiz, pair) {
  const index = nextUnplacedIndex();
  const placedCount = quiz.placed.filter(Boolean).length;
  const button = (side, arrowBefore, arrowAfter) =>
    `<button class="sort-place-button sort-side--${side}" type="button" data-action="sort-place" data-side="${side}">${arrowBefore}CPG ${escapeHtml(pair[side].n)}${arrowAfter}</button>`;
  return `<p class="quiz-left">Piece ${placedCount + 1} of ${quiz.items.length}</p>
    <div class="sort-piece sort-piece--current">${pieceTextHtml(quiz.items[index])}</div>
    <div class="sort-place-buttons">${button(SORT_SIDE.LEFT, '‹ ', '')}${button(
      SORT_SIDE.RIGHT,
      '',
      ' ›',
    )}</div>`;
}

/** One piece inside a box: tap to take it back, or after Check marked right or wrong. */
function boxPieceHtml(quiz, item, index, pair) {
  if (!quiz.checked) {
    return `<li><button class="sort-piece sort-piece--placed" type="button"
      data-action="sort-take-back" data-item="${index}" aria-label="Take back: ${escapeHtml(
        item.lines.join(' '),
      )}">${pieceTextHtml(item)}</button></li>`;
  }
  const isRight = quiz.placed[index] === item.side;
  const verdict = isRight
    ? '<span class="sort-verdict">✓ Right</span>'
    : `<span class="sort-verdict">✗ From CPG ${escapeHtml(pair[item.side].n)}</span>`;
  return `<li class="sort-piece sort-piece--${isRight ? 'right' : 'wrong'}">${verdict}${pieceTextHtml(
    item,
  )}</li>`;
}

/** The two boxes side by side, each holding the pieces put in it. */
function boxesHtml(quiz, pair) {
  const box = (side) => {
    const pieces = quiz.items
      .map((item, index) =>
        quiz.placed[index] === side ? boxPieceHtml(quiz, item, index, pair) : '',
      )
      .join('');
    return `<section class="sort-box sort-side--${side}"
      aria-label="Pieces put in CPG ${escapeHtml(pair[side].n)}">
      <h2 class="sort-box__title">CPG ${escapeHtml(pair[side].n)}</h2>
      <ul class="sort-box__pieces">${pieces || '<li class="sort-box__empty">Empty</li>'}</ul></section>`;
  };
  return `<div class="sort-boxes">${box(SORT_SIDE.LEFT)}${box(SORT_SIDE.RIGHT)}</div>`;
}

/** Under the boxes: Check once every piece is placed; after it, the score and the next round. */
function actionsHtml(quiz, pair) {
  if (quiz.checked) {
    const link = (side) =>
      `<a class="quiz-end-button quiz-link-button" href="#${escapeHtml(pair[side].id)}">Open CPG ${escapeHtml(
        pair[side].n,
      )}</a>`;
    return `<p class="quiz-finished">${quiz.score} of ${quiz.items.length} right</p>
      <button class="quiz-start-button" type="button" data-action="sort-start">Another pair</button>
      ${link(SORT_SIDE.LEFT)}${link(SORT_SIDE.RIGHT)}`;
  }
  if (nextUnplacedIndex() >= 0) {
    return '<p class="quiz-help">Tap a piece in a box to take it back.</p>';
  }
  return `<button class="quiz-start-button" type="button" data-action="sort-check">Check</button>`;
}

/** The start screen, before a round is drawn. */
const startHtml = () => `<p class="quiz-help">Two related guidelines are named at the top. Pieces
    of text that are in only one of them come up one at a time: put each in the box of the
    guideline it is from.</p>
  <button class="quiz-start-button" type="button" data-action="sort-start">Start</button>`;

/** Draws the "Pick the guideline" screen. */
export function renderSortQuizScreen() {
  const quiz = state.sortQuiz;
  let body = startHtml();
  if (quiz) {
    const pair = roundGuidelines(quiz);
    const current = !quiz.checked && nextUnplacedIndex() >= 0 ? currentPieceHtml(quiz, pair) : '';
    body = `${headerHtml(pair)}${current}${boxesHtml(quiz, pair)}${actionsHtml(quiz, pair)}`;
  }
  const end =
    quiz && !quiz.checked
      ? '<button class="quiz-end-button" type="button" data-action="sort-end">End</button>'
      : '';
  app.innerHTML = `<a class="back-link" href="#">‹ All guidelines</a>
    <div class="page-padding quiz-screen sort-quiz-screen"><h1 class="quiz-title">Pick the guideline</h1>
    <span class="sync-status"></span>${body}${end}</div>`;
}
