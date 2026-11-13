/*
 * "Report a mistake or request" (on every screen, and in the comment panel for one point). The button sits under the app in index.html;
 * tapping it opens the student's email app with a message about what is on screen: the
 * guideline, the medicine card or the guideline quiz step, so a mistake can be found and fixed.
 * Nothing is sent by the app itself: there is no form or server to abuse, and the address is
 * only put together at the tap (see FEEDBACK_ADDRESS_PARTS).
 * Depends on state.js, guidelines.js, logic.js, quizState.js, guidelineQuizState.js and
 * constants.js.
 */
import { state } from './state.js';
import { documentInfo } from '../content/guidelines.js';
import { joinAddress, reportMessage, feedbackMailto } from './logic.js';
import { currentCard } from './quizState.js';
import { currentStep } from './guidelineQuizState.js';
import {
  FEEDBACK_ADDRESS_PARTS,
  QUIZ_HASH,
  GUIDELINE_QUIZ_HASH,
  QUEUE_HASH,
  SETTINGS_HASH,
} from './constants.js';

const app = document.getElementById('app');
const SCREEN_NAMES = {
  [QUIZ_HASH]: 'Medicines quiz',
  [GUIDELINE_QUIZ_HASH]: 'Guideline quiz',
  [QUEUE_HASH]: 'Guidelines to learn',
  [SETTINGS_HASH]: 'Settings',
};

/** True when the report button should show (an address is set). */
export const canReport = () => Boolean(joinAddress(FEEDBACK_ADDRESS_PARTS));

/** The lines describing the current guideline quiz step, which was made by the app. */
function guidelineQuizLines(quiz, step) {
  const lines = [`Guideline quiz step ${quiz.index + 1} of ${quiz.steps.length}`];
  if (step.kind === 'order') {
    lines.push(`Ordering round${step.title ? `: ${step.title}` : ''}`);
    step.cards.forEach((card) => {
      lines.push(`- ${card.text}${card.isDistractor ? ` (from ${card.source})` : ''}`);
    });
  } else {
    const shown = step.type === 'number' ? `${step.before}____${step.after}` : step.line;
    lines.push(`Question: ${step.prompt}`);
    if (step.context) lines.push(step.context);
    if (shown) lines.push(shown);
    lines.push(`Choices: ${step.choices.join(' / ')}`, `Answer given by the app: ${step.answer}`);
  }
  return lines;
}

/** What is on screen now: { title, lines }. */
export function reportContext() {
  const hash = window.location.hash.slice(1);
  if (state.currentGuideline && app.querySelector('.guideline-body')) {
    const name = `CPG EAS ${state.currentGuideline.n} ${state.currentGuideline.t}`;
    return { title: name, lines: [`Guideline: ${name}`] };
  }
  if (hash === GUIDELINE_QUIZ_HASH && state.guidelineQuiz) {
    const quiz = state.guidelineQuiz;
    const step = quiz.finished ? null : currentStep();
    const title = `Guideline quiz, ${quiz.title}`;
    return { title, lines: [title, ...(step ? guidelineQuizLines(quiz, step) : [])] };
  }
  const card = hash === QUIZ_HASH && state.quiz ? currentCard() : null;
  if (card) {
    return {
      title: `Medicines quiz, ${card.prompt}`,
      lines: [`Medicines quiz card: ${card.prompt}`, `Source: ${card.source}`],
    };
  }
  let screen = SCREEN_NAMES[hash] || 'Guideline list';
  if (!state.passcode) screen = 'Passcode screen';
  return { title: 'mistake or request', lines: [`Screen: ${screen}`] };
}

/**
 * Opens the student's email app with a report about the current screen. `extraLines` are added
 * after the screen's own lines (the comment panel adds the point and any comment typed).
 */
export function openReport(extraLines = []) {
  const context = reportContext();
  const { subject, body } = reportMessage(
    { ...context, lines: [...context.lines, ...extraLines] },
    documentInfo.exportedOn,
  );
  const href = feedbackMailto(joinAddress(FEEDBACK_ADDRESS_PARTS), subject, body);
  if (href) window.location.href = href;
}
