/*
 * The Medicines quiz screen (address #quiz) and its button on the list screen.
 * Drawn from the state: the overview when no session is running, otherwise the current card.
 * Depends on state.js, logic.js, quizState.js, quizSchedule.js and templates.js.
 */
import { state } from '../state.js';
import { escapeHtml } from '../logic.js';
import {
  quizCards,
  allSchedules,
  currentStudyPlan,
  currentCard,
  previewRatings,
  getQuizSettings,
  QUIZ_SETTINGS,
} from '../quizState.js';
import { intervalText } from '../quizSchedule.js';
import { blockHtml } from './templates.js';
import { RATING, QUIZ_HASH } from '../constants.js';

const app = document.getElementById('app');

// The rating buttons, in the order shown. `hint` is read out to screen readers.
const RATING_BUTTONS = [
  { rating: RATING.AGAIN, label: 'Again', hint: 'I forgot it' },
  { rating: RATING.HARD, label: 'Hard', hint: 'I remembered it with difficulty' },
  { rating: RATING.GOOD, label: 'Good', hint: 'I remembered it' },
  { rating: RATING.EASY, label: 'Easy', hint: 'I remembered it easily' },
];

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** The "Medicines quiz" button for the list screen, with the number of cards to study today. */
export function quizButtonHtml() {
  const plan = currentStudyPlan();
  const waiting = plan.dueIds.length + plan.newIds.length;
  const count = waiting ? ` (${waiting} today)` : '';
  return `<a class="quiz-button" href="#${QUIZ_HASH}">Medicines quiz${count}</a>`;
}

// The daily-limit dropdowns on the overview: setting name, element id and label.
const SETTING_SELECTS = [
  { name: 'newMedicinesPerDay', id: 'quiz-new-medicines', label: 'New medicines per day' },
  { name: 'reviewsPerDay', id: 'quiz-reviews', label: 'Review cards per day' },
];

/** One daily-limit dropdown, with the saved value selected. */
function settingSelectHtml({ name, id, label }, settings) {
  const limits = QUIZ_SETTINGS[name];
  let options = '';
  for (let value = limits.MIN; value <= limits.MAX; value += limits.STEP) {
    const selected = value === settings[name] ? ' selected' : '';
    options += `<option value="${value}"${selected}>${value}</option>`;
  }
  return `<label class="quiz-setting">${label}
    <select id="${id}" data-setting="${name}">${options}</select></label>`;
}

/** The line of today's numbers, for example "12 cards due · 2 new medicines (31 cards) today". */
function countsText(plan) {
  const medicines = plural(plan.newMedicineCount, 'new medicine');
  const newCards = plan.newIds.length ? ` (${plural(plan.newIds.length, 'card')})` : '';
  return `${plural(plan.dueIds.length, 'card')} due · ${medicines}${newCards} today`;
}

function overviewHtml() {
  const plan = currentStudyPlan();
  const cards = quizCards();
  const learnt = Object.keys(allSchedules()).length;
  const waiting = plan.dueIds.length + plan.newIds.length;
  const finished =
    state.quiz && state.quiz.answered
      ? `<p class="quiz-finished">Session finished: ${plural(state.quiz.answered, 'answer')}.</p>`
      : '';
  const startButton = waiting
    ? '<button class="quiz-start-button" type="button" data-action="quiz-start">Start</button>'
    : '<p class="empty-message">Nothing left to study today. Come back tomorrow.</p>';
  const settings = getQuizSettings();
  return `${finished}
    <p class="quiz-counts">${countsText(plan)}</p>
    ${startButton}
    <p class="quiz-totals">${learnt} of ${cards.length} cards started</p>
    ${SETTING_SELECTS.map((select) => settingSelectHtml(select, settings)).join('')}
    <p class="quiz-help">Read the question, answer it in your head, then tap Show answer and rate
      how hard it was. Cards you find easy come back less often. Each new medicine brings all of
      its cards; review cards are cards you have studied before that are due again.</p>`;
}

function ratingButtonsHtml(card) {
  const preview = previewRatings(
    card,
    RATING_BUTTONS.map((button) => button.rating),
  );
  return RATING_BUTTONS.map(({ rating, label, hint }) => {
    const when = intervalText(preview[rating].interval);
    return `<button class="rating-button rating-button--${rating}" type="button"
      data-action="quiz-rate" data-rating="${rating}" aria-label="${label}: ${hint}, next ${when}">
      <span>${label}</span><span class="rating-interval">${when}</span></button>`;
  }).join('');
}

function cardHtml(card) {
  const left = `<p class="quiz-left">${plural(state.quiz.queue.length, 'card')} left</p>`;
  const prompt = `<h2 class="quiz-prompt">${escapeHtml(card.prompt)}</h2>`;
  if (!state.quiz.revealed) {
    return `${left}${prompt}<button class="quiz-show-button" type="button"
      data-action="quiz-show-answer">Show answer</button>`;
  }
  const answer = card.answerBlocks.map((block) => blockHtml(block, '')).join('');
  return `${left}${prompt}<div class="quiz-answer">${answer}</div>
    <p class="quiz-source">From ${escapeHtml(card.source)}</p>
    <div class="rating-buttons">${ratingButtonsHtml(card)}</div>`;
}

/** Draws the quiz screen. */
export function renderQuizScreen() {
  const card = currentCard();
  const body = card ? cardHtml(card) : overviewHtml();
  const end = card
    ? '<button class="quiz-end-button" type="button" data-action="quiz-end">End session</button>'
    : '';
  app.innerHTML = `<a class="back-link" href="#">‹ All guidelines</a>
    <div class="page-padding quiz-screen"><h1 class="quiz-title">Medicines quiz</h1>
    <span class="sync-status"></span>${body}${end}</div>`;
  window.scrollTo(0, 0);
}
