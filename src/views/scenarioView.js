/*
 * Scenarios (Quiz > Scenarios): the list (#scenarios), grouped by level and filtered by level
 * chips (one row) and a theme dropdown, and one scenario (#scenario-<id>). A scenario is only an opening for a mentor
 * to run: story, suburb, vitals, patient background, the intention (folded) and its guidelines.
 * Finish scenario opens the debrief: tick the guidelines the learner struggled with (they go to
 * Guidelines to learn) and write a note; the run is saved (scenarioRunState.js).
 * A guideline opened from here gets a "Back to scenario" link (state.scenarioReturn).
 * Scenarios come from content/scenarios.js with the editors' changes (content/scenario-edits.js).
 * Depends on state.js, logic.js, guidelines.js, constants.js, scenarioEdits.js, scenarioLogic.js,
 * scenarioRunState.js, scenarioMarkup.js and templates.js.
 */
import { state } from '../state.js';
import { escapeHtml, formatUpdatedDate } from '../logic.js';
import { guidelineById } from '../guidelines.js';
import { scenarios } from '../../content/scenarios.js';
import { scenarioEdits } from '../../content/scenario-edits.js';
import { liveScenarios } from '../scenarioEdits.js';
import { filterScenarios, themesInUse } from '../scenarioLogic.js';
import { getScenarioRuns } from '../scenarioRunState.js';
import { SCENARIOS_HASH, SCENARIO_HASH_PREFIX, SCENARIO_LEVELS } from '../constants.js';
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

/** The level chips on one row ("All" first, each named in its tooltip) and the theme dropdown. */
function chipsHtml() {
  const { level, theme } = state.scenarioFilter;
  const levels = [chipHtml('scenario-level', 0, 'All', !level, 'All levels')].concat(
    Object.entries(SCENARIO_LEVELS).map(([each, name]) =>
      chipHtml(
        'scenario-level',
        each,
        `Level ${each}`,
        level === Number(each),
        `Level ${each}: ${name}`,
      ),
    ),
  );
  const options = ['<option value="">All themes</option>']
    .concat(
      themesInUse(shownScenarios, sectionOf).map(
        (name) =>
          `<option value="${escapeHtml(name)}"${theme === name ? ' selected' : ''}>${escapeHtml(name)}</option>`,
      ),
    )
    .join('');
  return `<div class="filter-chips scenario-level-chips" role="group" aria-label="Level">${levels.join('')}</div>
    <label class="quiz-setting scenario-theme-setting">Theme
    <select id="scenario-theme-choice">${options}</select></label>`;
}

/** A list row, with when the scenario was last run on this tracker. */
function rowHtml(scenario) {
  const [last] = getScenarioRuns(scenario.id).runs;
  const meta = last
    ? `<small class="scenario-run">✓ Run ${escapeHtml(formatUpdatedDate(last.at))}</small>`
    : '';
  return scenarioRowHtml(scenario, scenarioHref(scenario), meta);
}

/** Draws the list of scenarios that match the chips, one card per level. */
export function renderScenarioList() {
  const shown = filterScenarios(shownScenarios, state.scenarioFilter, sectionOf);
  const groups = shown.length
    ? scenarioGroupsHtml(shown, rowHtml)
    : '<p class="empty-message">No scenario matches. Try another level or theme.</p>';
  app.innerHTML = `<a class="back-link" href="#">‹ All guidelines</a>
    <div class="page-padding scenario-screen"><h1 class="quiz-title">Scenarios</h1>
    <p class="scenario-intro">Openings for a mentor to run. Choose a level that suits the learner,
    then step up once the basics are solid.</p>${chipsHtml()}${groups}</div>`;
}

/** The last debrief, folded: when, how many runs, what was hard and the note. */
function lastDebriefHtml(scenario) {
  const { count, runs } = getScenarioRuns(scenario.id);
  const [last] = runs;
  if (!last) return '';
  const struggled = last.struggled
    .map(guidelineById)
    .filter(Boolean)
    .map((guideline) => `<li>${escapeHtml(guideline.n)} ${escapeHtml(guideline.t)}</li>`)
    .join('');
  const runsText = count === 1 ? 'Run once' : `Run ${count} times`;
  const body = `<p class="scenario-label">${runsText} · last ${escapeHtml(formatUpdatedDate(last.at))}</p>
    <p class="scenario-label">Struggled with</p>
    ${struggled ? `<ul class="scenario-fact">${struggled}</ul>` : '<p class="scenario-fact">Nothing ticked</p>'}
    <p class="scenario-label">Debrief note</p>
    <p class="scenario-fact">${escapeHtml(last.note) || '<i>No note</i>'}</p>`;
  return foldHtml('Last debrief', body, false);
}

/** The Finish form: a tick box per guideline and a note, then Save and Cancel. */
function debriefFormHtml(scenario) {
  const boxes = scenario.guidelines
    .map(guidelineById)
    .filter(Boolean)
    .map(
      (guideline) => `<label class="scenario-check"><input type="checkbox" name="struggled"
        value="${escapeHtml(guideline.id)}"><span><b>${escapeHtml(guideline.n)}</b>
        ${escapeHtml(guideline.t)}</span></label>`,
    )
    .join('');
  return `<section class="scenario-card scenario-debrief">
    <h2 class="scenario-group-title">Finish scenario</h2>
    <p class="scenario-intro">Tick the guidelines the learner struggled with. They go to
    Guidelines to learn.</p>${boxes}
    <label class="scenario-label" for="scenario-debrief-note">Debrief note (optional)</label>
    <textarea class="text-input scenario-note" id="scenario-debrief-note" rows="4"
      maxlength="1000" placeholder="What went well, what to work on"></textarea>
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
    ${lastDebriefHtml(scenario)}${finish}
    <p class="scenario-queue-message" id="scenario-queue-message" role="status"></p></div>`;
}
