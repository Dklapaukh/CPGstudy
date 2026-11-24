/*
 * Editor page: markup for grading scenarios. The Review card under a scenario (who it suits,
 * a grade per criterion, problems, an overall call, a note, then short summary questions and
 * what would make it fit each level) and the line on the first screen that says how many you
 * have reviewed, how many scenarios have their REVIEWS_GOAL editors, and opens the next one. Each function takes prepared data
 * and returns text; main.js reads the form and saves it. Text is escaped.
 * Depends on logic.js, staffPage.js, constants.js and scenarioReviews.js.
 */
import { escapeHtml } from '../logic.js';
import { warningHtml, noteHtml, actionButtonHtml } from '../staffPage.js';
import { SCENARIO_LEVELS } from '../constants.js';
import {
  REVIEW_CRITERIA,
  REVIEW_SCORES,
  REVIEW_VERDICTS,
  REVIEW_PROBLEMS,
  MAX_REVIEW_NOTE,
  MAX_REVIEW_ANSWER,
  REVIEW_QUESTIONS,
  REVIEWS_GOAL,
  LEVEL_NOTE_PLACEHOLDER,
} from '../scenarioReviews.js';

export const REVIEW_FORM_ID = 'review-form';

/** One pill: a radio button or tick box drawn as a pill, checked when `isOn`. */
const pillHtml = (type, name, value, text, isOn, tip = '') =>
  `<label class="rating-pill"${tip ? ` title="${escapeHtml(tip)}"` : ''}>
    <input type="${type}" name="${name}" value="${escapeHtml(String(value))}"${isOn ? ' checked' : ''}>
    <span>${escapeHtml(text)}</span></label>`;

/** A group of pills under a heading; `wrap` lets many pills run onto more lines. */
const groupHtml = (legend, pills, wrap = false, help = '') =>
  `<fieldset class="scenario-outcome"><legend>${escapeHtml(legend)}</legend>
    ${help ? `<p class="review-help">${escapeHtml(help)}</p>` : ''}
    <div class="rating-pills${wrap ? ' review-pills' : ''}">${pills.join('')}</div></fieldset>`;

/** The grades, one row of Poor / OK / Good per criterion. */
const criteriaHtml = (scores) =>
  REVIEW_CRITERIA.map(({ key, name, help }) =>
    groupHtml(
      name,
      REVIEW_SCORES.map((score) =>
        pillHtml('radio', `score-${key}`, score.value, score.name, scores[key] === score.value),
      ),
      false,
      help,
    ),
  ).join('');

/** One short answer box: a label, then a line of text kept in `data-answer` or `data-level`. */
const answerBoxHtml = (data, key, label, value, placeholder) =>
  `<label class="scenario-label" for="review-${data}-${key}">${escapeHtml(label)}</label>
    <input class="text-input review-answer" id="review-${data}-${key}" type="text"
      data-${data}="${key}" maxlength="${MAX_REVIEW_ANSWER}" value="${escapeHtml(value || '')}"
      placeholder="${escapeHtml(placeholder)}">`;

/** The summary at the end: the short questions, then what would make it fit each level. */
function summaryHtml(form) {
  const questions = REVIEW_QUESTIONS.map(([key, question, placeholder]) =>
    answerBoxHtml('answer', key, question, form.answers?.[key], placeholder),
  ).join('');
  const levels = Object.entries(SCENARIO_LEVELS)
    .map(([key, level]) =>
      answerBoxHtml('level', key, level.name, form.levelNotes?.[key], LEVEL_NOTE_PLACEHOLDER),
    )
    .join('');
  return `<h3 class="scenario-group-title">Summary</h3>${questions}
    <p class="scenario-label">To suit each level, change…</p>
    <p class="review-help">One line each; leave a level empty if you have nothing to add.</p>${levels}`;
}

/**
 * The Review card. `review` is { form ({ levels, scores, verdict, problems, note }), error,
 * savedAt (milliseconds, or 0 when not yet reviewed by this editor), nextId ('' when none) }.
 */
export function reviewCardHtml(review) {
  const { form, error, savedAt, nextId, reviewer } = review;
  const levels = Object.entries(SCENARIO_LEVELS).map(([key, level]) =>
    pillHtml('checkbox', 'levels', key, level.short, form.levels.includes(key), level.name),
  );
  const verdicts = Object.entries(REVIEW_VERDICTS).map(([key, name]) =>
    pillHtml('radio', 'verdict', key, name, form.verdict === key),
  );
  const problems = Object.entries(REVIEW_PROBLEMS).map(([key, name]) =>
    pillHtml('checkbox', 'problems', key, name, form.problems.includes(key)),
  );
  const saved = savedAt
    ? `Your review was saved on ${new Date(savedAt).toLocaleDateString('en-NZ')}. Saving again replaces it.`
    : 'Not reviewed by you yet.';
  const who = reviewer ? `Reviewing as ${reviewer}. ` : '';
  const next = nextId ? actionButtonHtml('review-save-next', 'Save and next', '', 'button') : '';
  return `<section class="scenario-card review-card" id="${REVIEW_FORM_ID}">
    <h2 class="scenario-group-title">Review this scenario</h2>
    ${noteHtml(escapeHtml(who) + saved)}
    ${groupHtml('Suits these levels', levels, true, 'Tick every level it suits. This changes the scenario in the app too.')}
    ${criteriaHtml(form.scores)}
    ${groupHtml('Problems', problems, true, 'Tick any that apply.')}
    ${groupHtml('Overall', verdicts, true)}
    <label class="scenario-label" for="review-note">What would make it better</label>
    <textarea class="text-input scenario-note" id="review-note" name="note" rows="3"
      maxlength="${MAX_REVIEW_NOTE}">${escapeHtml(form.note)}</textarea>
    ${summaryHtml(form)}${warningHtml(error)}
    <div class="editor-buttons">${next}${actionButtonHtml('review-save', 'Save review', '', nextId ? 'switch-button' : 'button')}</div>
  </section>`;
}

/**
 * The first screen's line: how many you have reviewed, how many scenarios have REVIEWS_GOAL
 * editors' reviews (`atGoal`), and a link to the next one.
 */
export function reviewProgressHtml(reviewed, total, nextHref, atGoal = 0) {
  const link = nextHref
    ? `<a class="button review-next-link" href="${nextHref}">Review ${reviewed ? 'the next' : 'the first'} scenario</a>`
    : '';
  const text = nextHref
    ? `You have reviewed ${reviewed} of ${total} scenarios.`
    : `You have reviewed all ${total} scenarios.`;
  const goal = `${atGoal} of ${total} have been reviewed by ${REVIEWS_GOAL} editors.`;
  return `<div class="review-progress">${noteHtml(`${text} ${goal}`)}${link}</div>`;
}
