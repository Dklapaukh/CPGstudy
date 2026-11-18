/*
 * The "Pick the guideline" quiz screen (address #pick-guideline) and its button in the Quiz
 * choice. Drawn from state.sortQuiz: a start screen (two or three guidelines), the round being
 * sorted, or the marked round. Two guidelines sit side by side; three are rows, so their names
 * and boxes stay wide enough to read. The first guideline's name is a picker for another one.
 * Pieces are dragged onto a guideline (see sortDrag.js) or placed with a button for each.
 * Depends on state.js, logic.js, guidelines.js, sortQuiz.js, sortQuizState.js and constants.js.
 */
import { state } from '../state.js';
import { escapeHtml } from '../logic.js';
import { guidelineById } from '../guidelines.js';
import { SORT_GROUP_SIZES } from '../sortQuiz.js';
import { nextUnplacedIndex, sortStartGuidelines } from '../sortQuizState.js';
import { SORT_QUIZ_HASH } from '../constants.js';
import { quizIconHtml } from './templates.js';

const app = document.getElementById('app');
const GROUP_SIZE_TEXT = { 2: 'Two guidelines', 3: 'Three guidelines' };
// Two guidelines fit side by side on a phone; three are laid out as rows.
const ROWS_FROM = 3;

/** The "Pick the guideline" button for the Quiz choice on the list screen. */
export const sortQuizButtonHtml = () =>
  `<a class="quiz-button" href="#${SORT_QUIZ_HASH}">${quizIconHtml('grid')}<span>Pick the guideline</span></a>`;

/** The layout modifier for the header, buttons and boxes: rows for three guidelines. */
const layoutClass = (quiz, block) =>
  quiz.ids.length >= ROWS_FROM ? ` ${block}--rows` : ` ${block}--columns`;

/** The picker over the first guideline's name: every guideline a round can start with. */
function firstPickerHtml(quiz) {
  const options = sortStartGuidelines(quiz.ids.length)
    .map(
      (guideline) =>
        `<option value="${escapeHtml(guideline.id)}"${
          guideline.id === quiz.ids[0] ? ' selected' : ''
        }>CPG ${escapeHtml(guideline.n)} ${escapeHtml(guideline.t)}</option>`,
    )
    .join('');
  return `<select class="sort-header__picker" id="sort-first-choice"
    aria-label="Choose a different first guideline">${options}</select>`;
}

/** One guideline's name in the header; the first one can be tapped to choose another. */
function headerNameHtml(quiz, guideline, side) {
  const isFirst = side === 0;
  const tag = isFirst ? 'label' : 'div';
  const hint = isFirst ? ' · change ▾' : '';
  return `<${tag} class="sort-header__name sort-side--${side}${
    isFirst ? ' sort-header__name--pick' : ''
  }" data-sort-drop="${side}">
    <span class="sort-header__number">CPG ${escapeHtml(guideline.n)}${hint}</span>
    <span>${escapeHtml(guideline.t)}</span>${isFirst ? firstPickerHtml(quiz) : ''}</${tag}>`;
}

/** The header naming the guidelines of the round. */
function headerHtml(quiz, group) {
  const names = group.map((guideline, side) => headerNameHtml(quiz, guideline, side));
  const joined =
    group.length === 2 ? names.join('<span class="sort-header__or">or</span>') : names.join('');
  return `<div class="sort-header${layoutClass(quiz, 'sort-header')}">${joined}</div>`;
}

/** The text of one piece: a paragraph, or a short list when it is a few lines. */
function pieceTextHtml(item) {
  if (item.lines.length === 1)
    return `<p class="sort-piece__text">${escapeHtml(item.lines[0])}</p>`;
  const lines = item.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
  return `<ul class="sort-piece__text">${lines}</ul>`;
}

/** The piece to place next, which can be dragged, with a button for each guideline. */
function currentPieceHtml(quiz, group) {
  const index = nextUnplacedIndex();
  const placedCount = quiz.placed.filter((side) => side !== null).length;
  const buttons = group
    .map(
      (guideline, side) =>
        `<button class="sort-place-button sort-side--${side}" type="button" data-action="sort-place"
          data-side="${side}" data-sort-drop="${side}">CPG ${escapeHtml(guideline.n)}</button>`,
    )
    .join('');
  return `<p class="quiz-left">Piece ${placedCount + 1} of ${quiz.items.length}</p>
    <div class="sort-piece sort-piece--current" data-sort-drag>${pieceTextHtml(quiz.items[index])}</div>
    <p class="quiz-help sort-drag-help">Drag it onto its guideline, or tap a button.</p>
    <div class="sort-place-buttons${layoutClass(quiz, 'sort-place-buttons')}">${buttons}</div>`;
}

/** One piece inside a box: tap to take it back, or after Check marked right or wrong. */
function boxPieceHtml(quiz, item, index, group) {
  if (!quiz.checked) {
    return `<li><button class="sort-piece sort-piece--placed" type="button"
      data-action="sort-take-back" data-item="${index}" aria-label="Take back: ${escapeHtml(
        item.lines.join(' '),
      )}">${pieceTextHtml(item)}</button></li>`;
  }
  const isRight = quiz.placed[index] === item.side;
  const verdict = isRight
    ? '<span class="sort-verdict">✓ Right</span>'
    : `<span class="sort-verdict">✗ From CPG ${escapeHtml(group[item.side].n)}</span>`;
  return `<li class="sort-piece sort-piece--${isRight ? 'right' : 'wrong'}">${verdict}${pieceTextHtml(
    item,
  )}</li>`;
}

/** The boxes, one per guideline, each holding the pieces put in it. */
function boxesHtml(quiz, group) {
  const box = (guideline, side) => {
    const pieces = quiz.items
      .map((item, index) =>
        quiz.placed[index] === side ? boxPieceHtml(quiz, item, index, group) : '',
      )
      .join('');
    return `<section class="sort-box sort-side--${side}" data-sort-drop="${side}"
      aria-label="Pieces put in CPG ${escapeHtml(guideline.n)}">
      <h2 class="sort-box__title">CPG ${escapeHtml(guideline.n)}</h2>
      <ul class="sort-box__pieces">${pieces || '<li class="sort-box__empty">Empty</li>'}</ul></section>`;
  };
  return `<div class="sort-boxes${layoutClass(quiz, 'sort-boxes')}">${group.map(box).join('')}</div>`;
}

/** Under the boxes: Check once every piece is placed; after it, the score and what next. */
function actionsHtml(quiz, group) {
  if (quiz.checked) {
    const links = group
      .map(
        (guideline) =>
          `<a class="quiz-end-button quiz-link-button" href="#${escapeHtml(guideline.id)}">Open CPG ${escapeHtml(
            guideline.n,
          )}</a>`,
      )
      .join('');
    return `<p class="quiz-finished">${quiz.score} of ${quiz.items.length} right</p>
      <button class="quiz-start-button" type="button" data-action="sort-start"
        data-count="${quiz.ids.length}">Another round</button>
      <button class="quiz-end-button" type="button"
        data-action="sort-start" data-count="${quiz.ids.length}"
        data-first="${escapeHtml(quiz.ids[0])}">CPG ${escapeHtml(group[0].n)} again</button>
      ${links}`;
  }
  if (nextUnplacedIndex() >= 0) {
    return '<p class="quiz-help">Tap a piece in a box to take it back.</p>';
  }
  return `<button class="quiz-start-button" type="button" data-action="sort-check">Check</button>`;
}

/** The start screen: how it works, and a button for two or for three guidelines. */
function startHtml() {
  const buttons = SORT_GROUP_SIZES.map(
    (count) =>
      `<button class="quiz-start-button" type="button" data-action="sort-start"
        data-count="${count}">${GROUP_SIZE_TEXT[count]}</button>`,
  ).join('');
  return `<p class="quiz-help">A guideline and one or two of its related guidelines are named at
      the top. Pieces of text that are in only one of them come up one at a time: drag each onto
      the guideline it is from. Tap the first guideline's name to choose a different one.</p>
    <div class="sort-start-buttons">${buttons}</div>`;
}

/** Draws the "Pick the guideline" screen. */
export function renderSortQuizScreen() {
  const quiz = state.sortQuiz;
  let body = startHtml();
  if (quiz) {
    const group = quiz.ids.map(guidelineById);
    const current = !quiz.checked && nextUnplacedIndex() >= 0 ? currentPieceHtml(quiz, group) : '';
    body = `${headerHtml(quiz, group)}${current}${boxesHtml(quiz, group)}${actionsHtml(quiz, group)}`;
  }
  const end = quiz
    ? '<button class="quiz-end-button" type="button" data-action="sort-end">End</button>'
    : '';
  app.innerHTML = `<a class="back-link" href="#">‹ All guidelines</a>
    <div class="page-padding quiz-screen sort-quiz-screen"><h1 class="quiz-title">Pick the guideline</h1>
    <span class="sync-status"></span>${body}${end}</div>`;
}
