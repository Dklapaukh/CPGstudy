/*
 * Guideline quiz (feature 9): the session in memory and the saved best scores. A play is built
 * by guidelineQuizPlay.js when it starts; state.guidelineQuiz holds where the student is in it.
 * The best and the most recent score of each guideline are saved (Decision Z16, Option 1, plus
 * the latest score, 15 Nov 2026) as one extra entry (GUIDELINE_QUIZ_ENTRY_PREFIX + guideline id,
 * note = JSON { best, at, last, lastAt }), so it is saved, uploaded and merged by the same code
 * as the guidelines and needs no backend change.
 * Depends on state.js, sync.js, guidelines.js, logic.js, quizCards.js, quizDoses.js,
 * content/related.js and the three guidelineQuiz files.
 */
import { state, saveSession } from './state.js';
import { scheduleSync } from './sync.js';
import { sections, guidelines } from './guidelines.js';
import { nextTimestamp } from './logic.js';
import { tableNames } from './quizCards.js';
import { blockText } from './quizDoses.js';
import { relatedLinks } from '../content/related.js';
import { quizGuidelines, markRound } from './guidelineQuizRounds.js';
import { valuePools } from './guidelineQuizNumbers.js';
import { buildPlay, playTotal, redFlags } from './guidelineQuizPlay.js';
import { STATUS, GUIDELINE_QUIZ_ENTRY_PREFIX, QUIZ_SECTION_NAME, BLOCK } from './constants.js';

const PERCENT = 100;
let cachedQuizzed = null;
let cachedContext = null;

/** Every guideline the quiz covers, with its rounds, built the first time it is needed. */
export function quizzedGuidelines() {
  if (!cachedQuizzed) cachedQuizzed = quizGuidelines(sections);
  return cachedQuizzed;
}

/** The medicine names (lower case) of every medicine guideline, for same-medicine distractors. */
function medicineNames() {
  const medicines = sections.find((section) => section.name === QUIZ_SECTION_NAME);
  if (!medicines) return [];
  return medicines.items
    .filter((guideline) =>
      guideline.b.some((block) => block[0] === BLOCK.HEADING && /Indications/.test(block[1])),
    )
    .flatMap((guideline) => tableNames(guideline.t));
}

/** What every play needs from the whole content, built once (see buildPlay). */
function playContext() {
  if (cachedContext) return cachedContext;
  cachedContext = {
    quizzed: quizzedGuidelines(),
    allGuidelines: guidelines,
    medicineNames: medicineNames(),
    pools: valuePools(guidelines.flatMap((guideline) => guideline.b.map(blockText))),
    redFlagLists: guidelines
      .map((guideline) => ({ id: guideline.id, flags: redFlags(guideline) }))
      .filter((list) => list.flags.length > 0),
    relatedIds: (id) => (relatedLinks[id] || []).map((link) => link[0]),
  };
  return cachedContext;
}

/* ---------- Saved scores ---------- */

const entryId = (guidelineId) => GUIDELINE_QUIZ_ENTRY_PREFIX + guidelineId;

/**
 * The saved scores of a guideline: { best, at, last, lastAt } (percents and milliseconds), or
 * null if it has not been played. Notes saved before 15 Nov 2026 hold only the best score, so
 * their best stands in for the most recent until the guideline is played again.
 */
function savedScores(guidelineId) {
  const entry = state.entries[entryId(guidelineId)];
  if (!entry || !entry.n) return null;
  try {
    const saved = JSON.parse(entry.n);
    if (!Number.isFinite(saved.best)) return null;
    const hasLast = Number.isFinite(saved.last);
    return {
      best: saved.best,
      at: saved.at,
      last: hasLast ? saved.last : saved.best,
      lastAt: hasLast ? saved.lastAt : saved.at,
    };
  } catch {
    return null; // a note edited by hand in the Sheet: treated as no score, replaced next time
  }
}

/** The best score of a guideline: { best (percent), at (milliseconds) }, or null. */
export function bestScore(guidelineId) {
  const saved = savedScores(guidelineId);
  return saved && { best: saved.best, at: saved.at };
}

/** The most recent score of a guideline: { last (percent), lastAt (milliseconds) }, or null. */
export function lastScore(guidelineId) {
  const saved = savedScores(guidelineId);
  return saved && { last: saved.last, lastAt: saved.lastAt };
}

/** Saves a finished play as the most recent score, and as the best if it beats (or equals) it. */
function saveScore(guidelineId, percent) {
  const now = Date.now();
  const saved = savedScores(guidelineId);
  const isBest = !saved || percent >= saved.best;
  const id = entryId(guidelineId);
  const previous = state.entries[id];
  const entry = {
    s: STATUS.INCOMPLETE,
    n: JSON.stringify({
      best: isBest ? percent : saved.best,
      at: isBest ? now : saved.at,
      last: percent,
      lastAt: now,
    }),
    t: nextTimestamp(previous ? previous.t : 0, now),
  };
  state.entries[id] = entry;
  state.pendingChanges[id] = { ...entry };
  saveSession();
  scheduleSync();
}

/* ---------- The session ---------- */

/** The step being shown, or null when no play is running. */
export function currentStep() {
  const quiz = state.guidelineQuiz;
  return quiz && !quiz.finished ? quiz.steps[quiz.index] : null;
}

/** Starts a play of one guideline. `random` is Math.random except in tests. */
export function startGuidelineQuiz(guidelineId, random = Math.random) {
  const quizzed = quizzedGuidelines().find((candidate) => candidate.id === guidelineId);
  if (!quizzed) return;
  const steps = buildPlay(quizzed, playContext(), random);
  state.guidelineQuiz = {
    guidelineId,
    title: quizzed.title,
    steps,
    total: playTotal(steps),
    index: 0,
    score: 0,
    finished: false,
    ...freshStep(steps[0]),
  };
}

/**
 * The parts of the session that start again for every step. An ordering round starts with every
 * card in "Your order", in the shuffled order of step.cards.
 */
const freshStep = (step) => ({
  placed: step && step.kind === 'order' ? step.cards.map((_, index) => index) : [],
  discarded: [],
  marked: null,
  picked: null,
});

/** True while the current ordering round can still be changed. */
const canMove = () => {
  const step = currentStep();
  return Boolean(step && step.kind === 'order' && !state.guidelineQuiz.marked);
};

// The two lists a card can be in: "Your order" and "Not in this guideline".
export const CARD_LIST = { PLACED: 'placed', DISCARDED: 'discarded' };

/**
 * Moves a card to `position` in a list (CARD_LIST), taking it out of wherever it was. Used by
 * dragging, the arrows and the "Not in this guideline" / "Put back" buttons. A position past the
 * end puts it last.
 */
export function moveCardTo(cardIndex, listName, position) {
  if (!canMove() || !Object.values(CARD_LIST).includes(listName)) return;
  const quiz = state.guidelineQuiz;
  if (!quiz.placed.includes(cardIndex) && !quiz.discarded.includes(cardIndex)) return;
  quiz.placed = quiz.placed.filter((index) => index !== cardIndex);
  quiz.discarded = quiz.discarded.filter((index) => index !== cardIndex);
  const list = quiz[listName];
  list.splice(Math.max(0, Math.min(position, list.length)), 0, cardIndex);
}

/** Moves a card one place up (-1) or down (+1) in its list; nothing at either end. */
export function moveCardBy(cardIndex, step) {
  const quiz = state.guidelineQuiz;
  if (!quiz) return;
  const listName = quiz.placed.includes(cardIndex) ? CARD_LIST.PLACED : CARD_LIST.DISCARDED;
  const position = quiz[listName].indexOf(cardIndex) + step;
  if (position < 0 || position >= quiz[listName].length) return;
  moveCardTo(cardIndex, listName, position);
}

/** Puts a card at the end of "Not in this guideline". */
export const discardCard = (cardIndex) =>
  moveCardTo(cardIndex, CARD_LIST.DISCARDED, Number.MAX_SAFE_INTEGER);

/** Puts a card from "Not in this guideline" back at the end of "Your order". */
export const returnCard = (cardIndex) =>
  moveCardTo(cardIndex, CARD_LIST.PLACED, Number.MAX_SAFE_INTEGER);

/** Marks the current round (every card is always in one of the two lists). */
export function checkRound() {
  if (!canMove()) return;
  const quiz = state.guidelineQuiz;
  const step = currentStep();
  quiz.marked = markRound(
    step.cards,
    step.real.map((card) => card.text),
    quiz.placed,
    quiz.discarded,
  );
  quiz.score += quiz.marked.score;
}

/** Answers the current choice question (once). */
export function pickChoice(choiceIndex) {
  const step = currentStep();
  const quiz = state.guidelineQuiz;
  if (!step || step.kind !== 'choice' || quiz.picked !== null) return;
  quiz.picked = choiceIndex;
  if (step.choices[choiceIndex] === step.answer) quiz.score += 1;
}

/** The score as a whole percent. */
export const percentOf = (score, total) => (total ? Math.round((score / total) * PERCENT) : 0);

/** Moves to the next step; after the last one, saves the score (see saveScore). */
export function nextStep() {
  const quiz = state.guidelineQuiz;
  if (!quiz || quiz.finished) return;
  const answered = quiz.marked || quiz.picked !== null;
  if (!answered) return;
  quiz.index += 1;
  Object.assign(quiz, freshStep(quiz.steps[quiz.index]));
  if (quiz.index >= quiz.steps.length) {
    quiz.finished = true;
    saveScore(quiz.guidelineId, percentOf(quiz.score, quiz.total));
  }
}

/** Leaves the play without saving a score. */
export function endGuidelineQuiz() {
  state.guidelineQuiz = null;
}
