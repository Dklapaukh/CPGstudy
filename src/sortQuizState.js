/*
 * "Pick the guideline" quiz: the round being played, in memory only (state.sortQuiz). Nothing
 * is saved except the streak day when a round is checked. The round itself is built by
 * sortQuiz.js.
 * Depends on state.js, streakState.js, guidelines.js, content/related.js and sortQuiz.js.
 */
import { state } from './state.js';
import { recordQuizFinished } from './streakState.js';
import { guidelines } from './guidelines.js';
import { relatedLinks } from '../content/related.js';
import { randomSortRound, sortScore } from './sortQuiz.js';

/**
 * Starts a round with a new pair of related guidelines. state.sortQuiz becomes
 * { leftId, rightId, items, placed (a side or null per item), checked, score }.
 * `random` is Math.random except in tests.
 */
export function startSortQuiz(random = Math.random) {
  const round = randomSortRound(guidelines, relatedLinks, random);
  if (!round) return;
  state.sortQuiz = { ...round, placed: round.items.map(() => null), checked: false, score: 0 };
}

/** The index of the next item still to be placed, or -1 when every item is in a box. */
export const nextUnplacedIndex = () => (state.sortQuiz ? state.sortQuiz.placed.indexOf(null) : -1);

/** Puts the next unplaced item in the box on `side` (SORT_SIDE). */
export function placeNextItem(side) {
  const index = nextUnplacedIndex();
  if (index < 0 || state.sortQuiz.checked) return;
  state.sortQuiz.placed[index] = side;
}

/** Takes an item back out of its box, so it is the next one to place again. */
export function takeItemBack(index) {
  const quiz = state.sortQuiz;
  if (!quiz || quiz.checked || !quiz.placed[index]) return;
  quiz.placed[index] = null;
}

/** Marks the round once every item is placed, and counts the day for the streak. */
export function checkSortQuiz() {
  const quiz = state.sortQuiz;
  if (!quiz || quiz.checked || nextUnplacedIndex() >= 0) return;
  quiz.checked = true;
  quiz.score = sortScore(quiz.items, quiz.placed);
  recordQuizFinished();
}

/** Leaves the round. */
export function endSortQuiz() {
  state.sortQuiz = null;
}
