/*
 * Guideline quiz (feature 9): the session in memory and the saved best scores. A play is built
 * by guidelineQuizPlay.js when it starts; state.guidelineQuiz holds where the student is in it.
 * Only the best score of each guideline is saved (Decision Z16, Option 1), as one extra entry
 * (GUIDELINE_QUIZ_ENTRY_PREFIX + guideline id, note = JSON { best, at }), so it is saved,
 * uploaded and merged by the same code as the guidelines and needs no backend change.
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

/* ---------- Best scores ---------- */

const entryId = (guidelineId) => GUIDELINE_QUIZ_ENTRY_PREFIX + guidelineId;

/** The saved best score of a guideline: { best (percent), at (milliseconds) }, or null. */
export function bestScore(guidelineId) {
  const entry = state.entries[entryId(guidelineId)];
  if (!entry || !entry.n) return null;
  try {
    const saved = JSON.parse(entry.n);
    return Number.isFinite(saved.best) ? saved : null;
  } catch {
    return null; // a note edited by hand in the Sheet: treated as no score, replaced next time
  }
}

/** Saves the score of a finished play if it beats (or equals, to update the date) the best. */
function saveIfBest(guidelineId, percent) {
  const saved = bestScore(guidelineId);
  if (saved && saved.best > percent) return;
  const id = entryId(guidelineId);
  const previous = state.entries[id];
  const entry = {
    s: STATUS.INCOMPLETE,
    n: JSON.stringify({ best: percent, at: Date.now() }),
    t: nextTimestamp(previous ? previous.t : 0, Date.now()),
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
    ...freshStep(),
  };
}

/** The parts of the session that start again for every step. */
const freshStep = () => ({ placed: [], discarded: [], marked: null, picked: null });

/** True while the current ordering round can still be changed. */
const canMove = () => {
  const step = currentStep();
  return Boolean(step && step.kind === 'order' && !state.guidelineQuiz.marked);
};

/** Puts a card at the end of "Your order". */
export function placeCard(cardIndex) {
  if (!canMove()) return;
  const quiz = state.guidelineQuiz;
  quiz.discarded = quiz.discarded.filter((index) => index !== cardIndex);
  if (!quiz.placed.includes(cardIndex)) quiz.placed.push(cardIndex);
}

/** Puts a card in "Not in this guideline". */
export function discardCard(cardIndex) {
  if (!canMove()) return;
  const quiz = state.guidelineQuiz;
  quiz.placed = quiz.placed.filter((index) => index !== cardIndex);
  if (!quiz.discarded.includes(cardIndex)) quiz.discarded.push(cardIndex);
}

/** Takes a card back out of "Your order" or "Not in this guideline". */
export function returnCard(cardIndex) {
  if (!canMove()) return;
  const quiz = state.guidelineQuiz;
  quiz.placed = quiz.placed.filter((index) => index !== cardIndex);
  quiz.discarded = quiz.discarded.filter((index) => index !== cardIndex);
}

/** Marks the current round once every card has been placed or put aside. */
export function checkRound() {
  if (!canMove()) return;
  const quiz = state.guidelineQuiz;
  const step = currentStep();
  if (quiz.placed.length + quiz.discarded.length < step.cards.length) return;
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

/** Moves to the next step; after the last one, saves the score if it is the best so far. */
export function nextStep() {
  const quiz = state.guidelineQuiz;
  if (!quiz || quiz.finished) return;
  const answered = quiz.marked || quiz.picked !== null;
  if (!answered) return;
  quiz.index += 1;
  Object.assign(quiz, freshStep());
  if (quiz.index >= quiz.steps.length) {
    quiz.finished = true;
    saveIfBest(quiz.guidelineId, percentOf(quiz.score, quiz.total));
  }
}

/** Leaves the play without saving a score. */
export function endGuidelineQuiz() {
  state.guidelineQuiz = null;
}
