/*
 * Editor page: every quiz question, as built from the guidelines before any edit, grouped by
 * guideline. Medicines quiz cards come from quizCards.js, guideline quiz questions from
 * guidelineQuizPlay.js, so the page shows exactly what the app would ask.
 * Depends on guidelines.js, constants.js, quizCards.js, questionEdits.js, guidelineQuizPlay.js
 * and content/related.js.
 */
import { sections, guidelines } from '../guidelines.js';
import { QUIZ_SECTION_NAME } from '../constants.js';
import { buildQuizCards } from '../quizCards.js';
import { cardQuestion } from '../questionEdits.js';
import { guidelineQuestions, playContext } from '../guidelineQuizPlay.js';
import { relatedLinks } from '../../content/related.js';

let cached = null;

/**
 * The guidelines that have questions, in list order: [{ id, number, title, questions }], and
 * every question by id. Built once, the first time it is needed.
 */
export function questionBank() {
  if (cached) return cached;
  const byGuideline = {};
  const add = (guidelineId, question) => (byGuideline[guidelineId] ||= []).push(question);
  buildQuizCards(sections, QUIZ_SECTION_NAME).forEach((card) =>
    add(card.medicineId, cardQuestion(card)),
  );
  const context = playContext(sections, relatedLinks);
  context.quizzed.forEach((quizzed) =>
    guidelineQuestions(quizzed, context).forEach((question) => add(quizzed.id, question)),
  );
  const list = guidelines
    .filter((guideline) => byGuideline[guideline.id])
    .map((guideline) => ({
      id: guideline.id,
      number: guideline.n,
      title: guideline.t,
      questions: byGuideline[guideline.id],
    }));
  const byId = {};
  list.forEach((guideline) =>
    guideline.questions.forEach((question) => (byId[question.id] = { question, guideline })),
  );
  cached = { list, byId };
  return cached;
}
