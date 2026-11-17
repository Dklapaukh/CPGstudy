/*
 * Editor page: every quiz question, as built from the guidelines before any edit, grouped by
 * guideline, and each question as learners see it. Medicines quiz cards come from quizCards.js,
 * guideline quiz questions and their steps from guidelineQuizPlay.js, so the page shows exactly
 * what the app would ask.
 * Depends on guidelines.js, constants.js, quizCards.js, questionEdits.js, guidelineQuizPlay.js,
 * guidelineQuizRounds.js and content/related.js.
 */
import { sections, guidelines } from '../guidelines.js';
import { QUIZ_SECTION_NAME } from '../constants.js';
import { buildQuizCards } from '../quizCards.js';
import { cardQuestion, seededRandom, textToBlocks } from '../questionEdits.js';
import { guidelineQuestions, playContext, questionStep } from '../guidelineQuizPlay.js';
import { markRound } from '../guidelineQuizRounds.js';
import { relatedLinks } from '../../content/related.js';

let cached = null;

/**
 * The guidelines that have questions, in list order:
 * [{ id, number, title, section, colour, questions }]; every question by id, with the card or
 * quizzed guideline it came from; and the play context. Built once, the first time it is needed.
 */
export function questionBank() {
  if (cached) return cached;
  const byGuideline = {};
  const origins = {}; // where each question came from: { card } or { quizzed }
  const add = (guidelineId, question, origin) => {
    (byGuideline[guidelineId] ||= []).push(question);
    origins[question.id] = origin;
  };
  buildQuizCards(sections, QUIZ_SECTION_NAME).forEach((card) =>
    add(card.medicineId, cardQuestion(card), { card }),
  );
  const context = playContext(sections, relatedLinks);
  context.quizzed.forEach((quizzed) =>
    guidelineQuestions(quizzed, context).forEach((question) =>
      add(quizzed.id, question, { quizzed }),
    ),
  );
  const list = guidelines
    .filter((guideline) => byGuideline[guideline.id])
    .map((guideline) => ({
      id: guideline.id,
      number: guideline.n,
      title: guideline.t,
      section: guideline.sec,
      colour: guideline.hc,
      questions: byGuideline[guideline.id],
    }));
  const byId = {};
  list.forEach((guideline) =>
    guideline.questions.forEach(
      (question) => (byId[question.id] = { question, guideline, ...origins[question.id] }),
    ),
  );
  cached = { list, byId, context };
  return cached;
}

/** A Medicines card as learners see it, with an edited question's prompt and answer. */
function liveCard(card, built, live) {
  const answerBlocks = live.answer === built.answer ? card.answerBlocks : textToBlocks(live.answer);
  return { ...card, prompt: live.prompt, answerBlocks };
}

/**
 * A round marked as if every card were placed right: the real cards in the guideline's order
 * and the distractors set aside. `round` is what markedRoundHtml() takes.
 */
export function perfectRound(step) {
  const placed = step.real.map((card) => step.cards.indexOf(card));
  const discarded = step.cards
    .map((card, index) => (card.isDistractor ? index : -1))
    .filter((index) => index >= 0);
  const expected = step.real.map((card) => card.text);
  return { placed, discarded, marked: markRound(step.cards, expected, placed, discarded) };
}

/**
 * One question as learners see it, `live` being the question with any edit in place:
 * { kind: 'card', card }, { kind: 'order', step, round } or { kind: 'choice', step }, or null
 * when the question could not be asked. Random choices are seeded by the question's id.
 */
export function questionPreview(id, live) {
  const { question, card, quizzed } = questionBank().byId[id];
  if (card) return { kind: 'card', card: liveCard(card, question, live) };
  const step = questionStep(live, quizzed, questionBank().context, seededRandom(id));
  if (!step) return null;
  return step.kind === 'order'
    ? { kind: 'order', step, round: perfectRound(step) }
    : { kind: 'choice', step };
}
