/*
 * Scenarios (Quiz > Scenarios): the list (#scenarios), grouped by complexity and filtered by
 * complexity and scene-load chips and a theme dropdown, with a progress fold; and one scenario
 * (#scenario-<id>). A scenario is only an opening for a mentor to run: story, suburb, vitals,
 * "give if asked" facts and patient background, the intention and intended outcomes (folded)
 * and its guidelines.
 * Finish scenario opens the debrief: a PEARLS guide, a rating of each intended outcome, the
 * guidelines the learner struggled with (they go to Guidelines to learn) and three short notes;
 * the run and its score are saved (scenarioRunState.js).
 * A guideline opened from here gets a "Back to scenario" link (state.scenarioReturn).
 * The list ends with a link to the Add a scenario form (submit.html).
 * Scenarios come from content/scenarios.js with the editors' changes, new scenarios (approved
 * submitted jobs among them) and deletions (content/scenario-edits.js).
 * Depends on state.js, logic.js, guidelines.js, constants.js, scenarioEdits.js, scenarioLogic.js,
 * scenarioRunState.js, scenarioMarkup.js and templates.js.
 */
import { state } from '../state.js';
import { escapeHtml, formatUpdatedDate } from '../logic.js';
import { guidelineById } from '../guidelines.js';
import { scenarios } from '../../content/scenarios.js';
import { scenarioEdits } from '../../content/scenario-edits.js';
import { liveScenarios } from '../scenarioEdits.js';
import {
  filterScenarios,
  themesInUse,
  levelsInUse,
  latestScore,
  scenarioProgress,
} from '../scenarioLogic.js';
import { getScenarioRuns } from '../scenarioRunState.js';
import {
  SCENARIOS_HASH,
  SCENARIO_HASH_PREFIX,
  SCENARIO_COMPLEXITY,
  SCENARIO_LOADS,
  SCENARIO_LEVELS,
  DEBRIEF_RATINGS,
  DEBRIEF_TEXTS,
  MAX_DEBRIEF_NOTE,
  SUBMIT_PAGE,
} from '../constants.js';
import {
  scenarioBodyHtml,
  scenarioGroupsHtml,
  scenarioRowHtml,
  scenarioHref,
  foldHtml,
} from './scenarioMarkup.js';
import { quizIconHtml } from './templates.js';

const app = document.getElementById('app');
const shownScenarios = liveScenarios(scenarios, scenarioEdits);
const sectionOf = (guidelineId) => guidelineById(guidelineId)?.sec;

/** The scenario with this id, or undefined. */
export const scenarioById = (id) => shownScenarios.find((scenario) => scenario.id === id);

/** The scenario named by an address like "scenario-long-lie", or undefined. */
export const scenarioFromHash = (hash) =>
  hash.startsWith(SCENARIO_HASH_PREFIX)
    ? scenarioById(hash.slice(SCENARIO_HASH_PREFIX.length))
    : undefined;

/** The "Scenarios" button for the Quiz choice on the list screen. */
export const scenariosButtonHtml = () =>
  `<a class="quiz-button" href="#${SCENARIOS_HASH}">${quizIconHtml('pulse')}<span>Scenarios</span></a>`;

/** One chip; `action` and `value` say what it sets, `tip` is its tooltip. */
const chipHtml = (action, value, text, isOn, tip = text) =>
  `<button class="filter-chip" type="button" data-action="${action}" data-value="${escapeHtml(String(value))}"
    title="${escapeHtml(tip)}" aria-pressed="${isOn}">${escapeHtml(text)}</button>`;

/** One row of chips with its label: "All" first, then one per group (`groups` as in constants). */
function chipRowHtml(label, action, groups, chosen, allTip) {
  const chips = [chipHtml(action, '', 'All', !chosen, allTip)].concat(
    Object.entries(groups).map(([key, group]) =>
      chipHtml(action, key, group.short, String(chosen) === key, group.name),
    ),
  );
  return `<div class="filter-chips scenario-level-chips" role="group" aria-label="${label}">
    <span class="scenario-chip-label">${label}</span>${chips.join('')}</div>`;
}

/** The level dropdown, offering only levels some scenario suits; '' when none has levels yet. */
function levelChoiceHtml(chosen) {
  const levels = levelsInUse(shownScenarios);
  if (!levels.length) return '';
  const options = ['<option value="">All levels</option>']
    .concat(
      levels.map(
        (key) =>
          `<option value="${key}"${chosen === key ? ' selected' : ''}>${escapeHtml(SCENARIO_LEVELS[key].name)}</option>`,
      ),
    )
    .join('');
  return `<label class="quiz-setting scenario-theme-setting">Suits
    <select id="scenario-level-choice">${options}</select></label>`;
}

/** The complexity and scene-load chips (one row each), and the level and theme dropdowns. */
function filtersHtml() {
  const { complexity, load, level, theme } = state.scenarioFilter;
  const options = ['<option value="">All themes</option>']
    .concat(
      themesInUse(shownScenarios, sectionOf).map(
        (name) =>
          `<option value="${escapeHtml(name)}"${theme === name ? ' selected' : ''}>${escapeHtml(name)}</option>`,
      ),
    )
    .join('');
  return `${chipRowHtml('Complexity', 'scenario-complexity', SCENARIO_COMPLEXITY, complexity, 'Any complexity')}
    ${chipRowHtml('Scene', 'scenario-load', SCENARIO_LOADS, load, 'Any scene load')}
    ${levelChoiceHtml(level)}    <label class="quiz-setting scenario-theme-setting">Theme
    <select id="scenario-theme-choice">${options}</select></label>`;
}

const scoreText = (score) => (score === null ? 'not rated' : `${score}%`);

/** A list row, with when the scenario was last run on this tracker and its latest score. */
function rowHtml(scenario) {
  const record = getScenarioRuns(scenario.id);
  const [last] = record.runs;
  const score = latestScore(record);
  const meta = last
    ? `<small class="scenario-run">✓ Run ${escapeHtml(formatUpdatedDate(last.at))}${
        score === null ? '' : ` · ${score}%`
      }</small>`
    : '';
  return scenarioRowHtml(scenario, scenarioHref(scenario), meta);
}

/** The progress fold: for each complexity and scene load, how many were run and the average. */
function progressHtml() {
  const progress = scenarioProgress(shownScenarios, (scenario) => getScenarioRuns(scenario.id));
  const rows = (list) =>
    list
      .map(
        (
          row,
        ) => `<tr><th scope="row">${escapeHtml(row.name)}</th><td>${row.run} of ${row.total}</td>
        <td>${row.average === null ? '–' : `${row.average}%`}</td></tr>`,
      )
      .join('');
  if (!progress.complexity.some((row) => row.run)) return '';
  const body = `<p class="scenario-intro">Scenarios run on this tracker, and the average of each
    one's latest score against its intended outcomes.</p>
    <table class="scenario-progress"><thead><tr><th scope="col">Complexity</th><th scope="col">Run</th>
    <th scope="col">Average</th></tr></thead><tbody>${rows(progress.complexity)}</tbody>
    <thead><tr><th scope="col">Scene</th><th scope="col"></th><th scope="col"></th></tr></thead>
    <tbody>${rows(progress.load)}</tbody></table>`;
  return foldHtml('Your progress', body, false);
}

/** Draws the list of scenarios that match the filters, one card per complexity. */
export function renderScenarioList() {
  const shown = filterScenarios(shownScenarios, state.scenarioFilter, sectionOf);
  const groups = shown.length
    ? scenarioGroupsHtml(shown, rowHtml)
    : '<p class="empty-message">No scenario matches. Try another complexity, scene, level or theme.</p>';
  app.innerHTML = `<a class="back-link" href="#">‹ All guidelines</a>
    <div class="page-padding scenario-screen"><h1 class="quiz-title">Scenarios</h1>
    <p class="scenario-intro">Openings for a mentor to run. Start with straightforward,
    single-patient scenarios, then add complexity or scene load once the basics are solid.</p>
    ${filtersHtml()}${progressHtml()}${groups}
    <a class="scenario-queue-button scenario-submit-link" href="${SUBMIT_PAGE}">Add a job you went
    to as a scenario</a></div>`;
}

/** The latest run's rating of each intended outcome, as a list. */
function ratingsHtml(scenario, run) {
  const items = (scenario.outcomes || [])
    .map((outcome, index) => {
      const rating = DEBRIEF_RATINGS.find((each) => each.value === run.ratings[index]);
      return `<li>${escapeHtml(outcome)}: <b>${rating ? escapeHtml(rating.name) : 'not rated'}</b></li>`;
    })
    .join('');
  return items ? `<ul class="scenario-fact">${items}</ul>` : '';
}

/** The debriefs, folded: the scores of the runs kept, then the latest run in full. */
function debriefsHtml(scenario) {
  const { count, runs } = getScenarioRuns(scenario.id);
  const [last] = runs;
  if (!last) return '';
  const scores = runs
    .map((run) => `${scoreText(run.score)} (${escapeHtml(formatUpdatedDate(run.at))})`)
    .join(' · ');
  const struggled = last.struggled
    .map(guidelineById)
    .filter(Boolean)
    .map((guideline) => `<li>${escapeHtml(guideline.n)} ${escapeHtml(guideline.t)}</li>`)
    .join('');
  const texts = DEBRIEF_TEXTS.concat([['note', 'Debrief note']])
    .filter(([key]) => last[key])
    .map(
      ([key, label]) => `<p class="scenario-label">${label}</p>
      <p class="scenario-fact">${escapeHtml(last[key])}</p>`,
    )
    .join('');
  const runsText = count === 1 ? 'Run once' : `Run ${count} times`;
  const body = `<p class="scenario-label">${runsText}</p>
    <p class="scenario-fact scenario-scores">${runs.length === 1 ? 'Score' : 'Scores, newest first'}: ${scores}</p>
    ${last.ratings.length ? `<p class="scenario-label">Latest outcomes</p>${ratingsHtml(scenario, last)}` : ''}
    <p class="scenario-label">Struggled with</p>
    ${struggled ? `<ul class="scenario-fact">${struggled}</ul>` : '<p class="scenario-fact">Nothing ticked</p>'}
    ${texts}`;
  return foldHtml('Debriefs', body, false);
}

/** The PEARLS guide for the mentor (Eppich and Cheng 2015), in four steps. */
const DEBRIEF_GUIDE = [
  ['Reactions', 'Start with how it felt. Let them let off steam before anything else.'],
  [
    'Description',
    'Ask them to sum up the case and the main problem in a sentence or two, so you agree on what happened.',
  ],
  [
    'Analysis',
    'Go through the outcomes below. Ask what went well and what they would change. Where there was a gap, say what you saw and ask what they were thinking at the time. Teach directly when the gap is knowledge.',
  ],
  ['Summary', 'Ask for one or two things they will do next time, in their own words.'],
];

/** The PEARLS debrief guide, as a numbered list. */
function guideHtml() {
  const steps = DEBRIEF_GUIDE.map(
    ([name, text]) => `<li><b>${name}.</b> ${escapeHtml(text)}</li>`,
  ).join('');
  return foldHtml('Debrief guide', `<ol class="scenario-guide">${steps}</ol>`, true);
}

/** One outcome with its four ratings, as radio buttons drawn as pills. */
function outcomeRatingHtml(outcome, index) {
  const pills = DEBRIEF_RATINGS.map(
    (rating) => `<label class="rating-pill" title="${escapeHtml(rating.help)}">
      <input type="radio" name="rating-${index}" value="${rating.value}">
      <span>${escapeHtml(rating.name)}</span></label>`,
  ).join('');
  return `<fieldset class="scenario-outcome"><legend>${escapeHtml(outcome)}</legend>
    <div class="rating-pills">${pills}</div></fieldset>`;
}

/** The Finish form: the guide, a rating per outcome, the hard guidelines and three notes. */
function debriefFormHtml(scenario) {
  const outcomes = (scenario.outcomes || []).map(outcomeRatingHtml).join('');
  const scale = DEBRIEF_RATINGS.map(
    (rating) => `<b>${escapeHtml(rating.name)}</b>: ${escapeHtml(rating.help)}`,
  ).join('; ');
  const boxes = scenario.guidelines
    .map(guidelineById)
    .filter(Boolean)
    .map(
      (guideline) => `<label class="scenario-check"><input type="checkbox" name="struggled"
        value="${escapeHtml(guideline.id)}"><span><b>${escapeHtml(guideline.n)}</b>
        ${escapeHtml(guideline.t)}</span></label>`,
    )
    .join('');
  const texts = DEBRIEF_TEXTS.map(
    ([
      key,
      label,
      placeholder,
    ]) => `<label class="scenario-label" for="scenario-debrief-${key}">${label}</label>
    <textarea class="text-input scenario-note" id="scenario-debrief-${key}" rows="2"
      maxlength="${MAX_DEBRIEF_NOTE}" placeholder="${escapeHtml(placeholder)}"></textarea>`,
  ).join('');
  return `<section class="scenario-card scenario-debrief">
    <h2 class="scenario-group-title">Finish scenario</h2>${guideHtml()}
    ${
      outcomes
        ? `<h3 class="scenario-label">Intended outcomes</h3>
    <p class="scenario-intro">Rate how much help the learner needed. ${scale}. Leave one blank if
    it didn't come up.</p>${outcomes}`
        : ''
    }
    <h3 class="scenario-label">Guidelines to learn</h3>
    <p class="scenario-intro">Tick the guidelines the learner struggled with. They go to
    Guidelines to learn.</p>${boxes}${texts}
    <button class="scenario-queue-button scenario-queue-button--main" type="button"
      data-action="scenario-finish-save" data-id="${escapeHtml(scenario.id)}">Save the run</button>
    <button class="scenario-queue-button" type="button" data-action="scenario-finish-cancel">Cancel</button>
    </section>`;
}

/** Draws one scenario. Guidelines opened from it link back here. */
export function renderScenario(scenario) {
  state.scenarioReturn = scenario.id;
  const finish =
    state.scenarioDebriefId === scenario.id
      ? debriefFormHtml(scenario)
      : `<button class="scenario-queue-button" type="button" data-action="scenario-finish">
          Finish scenario</button>`;
  app.innerHTML = `<a class="back-link" href="#${SCENARIOS_HASH}">‹ Scenarios</a>
    <div class="page-padding scenario-screen">${scenarioBodyHtml(scenario)}
    ${debriefsHtml(scenario)}${finish}
    <p class="scenario-queue-message" id="scenario-queue-message" role="status"></p></div>`;
}
