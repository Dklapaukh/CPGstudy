/*
 * The markup of quiz questions as learners see them: a Medicines card turned over, a guideline
 * quiz choice question and a marked ordering round. Shared by the quiz screens and the editor
 * page, so editors see exactly what learners see. Takes everything as arguments (no app state).
 * Depends on logic.js, practiceLevels.js and templates.js.
 */
import { escapeHtml } from '../logic.js';
import { levelsLabel } from '../practiceLevels.js';
import { blockHtml } from './templates.js';

const BLANK = '____';

/* ---------- Medicines card ---------- */

/** A Medicines card's question. */
export const cardPromptHtml = (card) => `<h2 class="quiz-prompt">${escapeHtml(card.prompt)}</h2>`;

/**
 * The answer of a card. Lines that only other practice levels may give (card.otherLevelLines)
 * are greyed, each run of them under a label naming those levels, such as "ICP and CCP"
 * (Decision Z18), so the learner still sees what backup would give.
 */
function answerHtml(card) {
  const otherLevelLines = card.otherLevelLines || [];
  let labelAbove = '';
  return card.answerBlocks
    .map((block, index) => {
      const levels = otherLevelLines[index];
      if (!levels) {
        labelAbove = '';
        return blockHtml(block, '');
      }
      const label = levelsLabel(levels);
      const labelHtml =
        label === labelAbove ? '' : `<p class="other-level-label">${escapeHtml(label)}</p>`;
      labelAbove = label;
      return `${labelHtml}<div class="other-level-line">${blockHtml(block, '')}</div>`;
    })
    .join('');
}

/** A card turned over: its question, its answer and where the answer is from. */
export function turnedCardHtml(card) {
  return `${cardPromptHtml(card)}<div class="quiz-answer">${answerHtml(card)}</div>
    <p class="quiz-source">From ${escapeHtml(card.source)}</p>`;
}

/* ---------- Ordering round ---------- */

/** The heading of an ordering round and, when it has one, its situation. */
export function orderHeadHtml(step) {
  const situation = step.title ? `<p class="order-situation">${escapeHtml(step.title)}</p>` : '';
  return `<h2 class="quiz-prompt">Put the actions in order</h2>${situation}`;
}

/** One marked card: right or wrong (in words, not only colour) and where it really belongs. */
function markedCardHtml(step, round, cardIndex, placedHere) {
  const card = step.cards[cardIndex];
  const right = round.marked.correctIndexes.has(cardIndex);
  let note = '';
  if (card.isDistractor) {
    // A wrong card written by an editor has no source.
    const notHere = card.source
      ? `Not in this guideline: from ${card.source}`
      : 'Not in this guideline';
    note = right && card.source ? `From ${card.source}` : notHere;
  } else if (!placedHere) note = 'This is in the guideline';
  else if (!right) note = 'Out of order';
  return `<li class="order-card order-card--${right ? 'right' : 'wrong'}">
    <span class="order-mark">${right ? '✓ Right' : '✗ Wrong'}</span>
    <span class="order-card-text">${escapeHtml(card.text)}</span>
    ${note ? `<span class="order-note">${escapeHtml(note)}</span>` : ''}</li>`;
}

/**
 * A round after Check: the marks, then the guideline's order with the detail of each action.
 * `round` is { marked, placed, discarded }: markRound()'s result and the two lists of card indexes.
 */
export function markedRoundHtml(step, round) {
  const guidelineOrder = step.real
    .map(
      (action) =>
        `<li class="order-answer">${action.blocks.map((block) => blockHtml(block, '')).join('')}</li>`,
    )
    .join('');
  const cards = (indexes, placedHere) =>
    indexes.map((index) => markedCardHtml(step, round, index, placedHere)).join('');
  return `<p class="quiz-counts">${round.marked.score} of ${round.marked.total} right</p>
    <h3 class="order-heading">Your order</h3>
    <ol class="order-list">${cards(round.placed, true)}</ol>
    <h3 class="order-heading">Not in this guideline</h3>
    <ul class="order-list order-list--aside">${
      cards(round.discarded, false) || '<li class="order-empty">None.</li>'
    }</ul>
    <h3 class="order-heading">The guideline’s order</h3>
    <ol class="order-answers quiz-answer">${guidelineOrder}</ol>
    <p class="quiz-source">From ${escapeHtml(step.real[0].source)}</p>`;
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

/** One choice of a question: a button, or after a pick (`picked` not null) marked right or wrong. */
function choiceButtonHtml(step, choice, index, picked) {
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

/** A choice question: its prompt, its line and the choices; `picked` is the choice index or null. */
export function choiceQuestionHtml(step, picked) {
  const buttons = step.choices
    .map((choice, index) => choiceButtonHtml(step, choice, index, picked))
    .join('');
  return `<h2 class="quiz-prompt">${escapeHtml(step.prompt)}</h2>${questionLineHtml(step)}
    <div class="choice-buttons">${buttons}</div>`;
}
