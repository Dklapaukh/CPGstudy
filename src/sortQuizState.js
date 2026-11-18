/*
 * "Pick the guideline" quiz: the round being played, in memory only (state.sortQuiz). Nothing
 * is saved except the streak day when a round is checked. The round itself is built by
 * sortQuiz.js; the partners of a guideline are the related guidelines its page lists.
 * Depends on state.js, streakState.js, guidelines.js, related.js, content/related.js and
 * sortQuiz.js.
 */
import { state } from './state.js';
import { recordQuizFinished } from './streakState.js';
import { guidelines } from './guidelines.js';
import { rankRelated } from './related.js';
import { relatedLinks } from '../content/related.js';
import {
  randomSortRound,
  sortPartners,
  sortableGuidelines,
  sortScore,
  SORT_GROUP_SIZES,
} from './sortQuiz.js';

const guidelinesById = new Map(guidelines.map((guideline) => [guideline.id, guideline]));

/** The guidelines a round for `guideline` may compare it with: the five on its page, no medicines. */
const partnersOf = (guideline) =>
  sortPartners(
    rankRelated(relatedLinks[guideline.id] || [], state.entries).map((item) => item.id),
    guidelinesById,
  );

const startCache = new Map();

/**
 * The guidelines a round of `count` can start with (for the picker), in guideline order. Built
 * the first time it is needed, as the picker is drawn after every piece placed.
 */
export function sortStartGuidelines(count) {
  if (!startCache.has(count)) {
    startCache.set(count, sortableGuidelines(guidelines, partnersOf, count));
  }
  return startCache.get(count);
}

/**
 * Starts a round of `count` guidelines (2 or 3). The first is `firstId`, or one picked at
 * random; the others are picked at random from its partners. state.sortQuiz becomes
 * { ids, items, placed (a side or null per item), checked, score }. `random` is Math.random
 * except in tests.
 */
export function startSortQuiz(count, firstId = '', random = Math.random) {
  const size = SORT_GROUP_SIZES.includes(count) ? count : SORT_GROUP_SIZES[0];
  state.sortQuizCount = size;
  const chosen = guidelinesById.get(firstId);
  const firsts = chosen ? [chosen] : sortStartGuidelines(size);
  if (firsts.length === 0) return;
  const first = firsts[Math.floor(random() * firsts.length)];
  const round = randomSortRound(first, partnersOf(first), size, random);
  if (!round) return;
  state.sortQuiz = { ...round, placed: round.items.map(() => null), checked: false, score: 0 };
}

/** The index of the next item still to be placed, or -1 when every item is in a box. */
export const nextUnplacedIndex = () => (state.sortQuiz ? state.sortQuiz.placed.indexOf(null) : -1);

/** Puts the next unplaced item in the box of guideline number `side` (0 is the first). */
export function placeNextItem(side) {
  const quiz = state.sortQuiz;
  const index = nextUnplacedIndex();
  if (index < 0 || quiz.checked || !(side >= 0 && side < quiz.ids.length)) return;
  quiz.placed[index] = side;
}

/** Takes an item back out of its box, so it is the next one to place again. */
export function takeItemBack(index) {
  const quiz = state.sortQuiz;
  if (!quiz || quiz.checked || quiz.placed[index] === null) return;
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
