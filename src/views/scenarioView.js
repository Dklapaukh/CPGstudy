/*
 * Scenarios (Quiz > Scenarios): the list (#scenarios), grouped by level, and one scenario
 * (#scenario-<id>). A scenario is only an opening for a mentor to run: story, suburb, vitals,
 * patient background, the intention (folded) and its guidelines. A guideline opened from here
 * gets a "Back to scenario" link (state.scenarioReturn, see navigation.js).
 * Depends on state.js, logic.js, guidelines.js, constants.js and content/scenarios.js.
 */
import { state } from '../state.js';
import { escapeHtml } from '../logic.js';
import { guidelineById } from '../guidelines.js';
import { scenarios } from '../../content/scenarios.js';
import {
  SCENARIOS_HASH,
  SCENARIO_HASH_PREFIX,
  SCENARIO_LEVELS,
  SCENARIO_VITALS,
} from '../constants.js';
import { quizIconHtml } from './templates.js';

const app = document.getElementById('app');

/** The scenario with this id, or undefined. */
export const scenarioById = (id) => scenarios.find((scenario) => scenario.id === id);

/** The scenario named by an address like "scenario-long-lie", or undefined. */
export const scenarioFromHash = (hash) =>
  hash.startsWith(SCENARIO_HASH_PREFIX)
    ? scenarioById(hash.slice(SCENARIO_HASH_PREFIX.length))
    : undefined;

/** The "Scenarios" button for the Quiz choice on the list screen. */
export const scenariosButtonHtml = () =>
  `<a class="quiz-button" href="#${SCENARIOS_HASH}">${quizIconHtml('pulse')}<span>Scenarios</span></a>`;

const levelPillHtml = (level) => `<span class="scenario-level">Level ${level}</span>`;

/** One row of the list: title, suburb and level. */
function scenarioRowHtml(scenario) {
  return `<a class="scenario-row" href="#${SCENARIO_HASH_PREFIX}${escapeHtml(scenario.id)}">
    <span class="scenario-row__text"><b>${escapeHtml(scenario.title)}</b>
    <small>${escapeHtml(scenario.suburb)}</small></span><span aria-hidden="true">›</span></a>`;
}

/** Draws the list of scenarios, one card per level. */
export function renderScenarioList() {
  const groups = Object.entries(SCENARIO_LEVELS)
    .map(([level, name]) => {
      const rows = scenarios.filter((scenario) => scenario.level === Number(level));
      if (!rows.length) return '';
      return `<section class="scenario-card"><h2 class="scenario-group-title">Level ${level} · ${name}</h2>
        ${rows.map(scenarioRowHtml).join('')}</section>`;
    })
    .join('');
  app.innerHTML = `<a class="back-link" href="#">‹ All guidelines</a>
    <div class="page-padding scenario-screen"><h1 class="quiz-title">Scenarios</h1>
    <p class="scenario-intro">Openings for a mentor to run. Choose a level that suits the learner,
    then step up once the basics are solid.</p>${groups}</div>`;
}

/** The vitals in one row, in the order of SCENARIO_VITALS. */
function vitalsTableHtml(vitals) {
  const heads = SCENARIO_VITALS.map(([, name]) => `<th scope="col">${name}</th>`).join('');
  const values = SCENARIO_VITALS.map(([key]) => `<td>${escapeHtml(vitals[key] || '–')}</td>`).join(
    '',
  );
  return `<table class="scenario-vitals"><thead><tr>${heads}</tr></thead>
    <tbody><tr>${values}</tr></tbody></table>`;
}

/** A label and its text in the patient background. */
const factHtml = (label, text) =>
  `<p class="scenario-label">${label}</p><p class="scenario-fact">${escapeHtml(text)}</p>`;

/** A folding card, styled like the guideline list's sections. */
const foldHtml = (title, body, open) =>
  `<details class="section-group scenario-fold"${open ? ' open' : ''}>
    <summary><span class="section-name">${title}</span></summary>
    <div class="scenario-fold__body">${body}</div></details>`;

/** The vitals and background of one patient (a label first when there are several). */
function patientHtml(patient) {
  const label = patient.label
    ? `<h2 class="scenario-patient">${escapeHtml(patient.label)}</h2>`
    : '';
  const background =
    factHtml('Medical history', patient.history) +
    factHtml('Medications', patient.medications) +
    factHtml('Allergies', patient.allergies) +
    factHtml('Social history', patient.social);
  return `${label}${foldHtml('Vitals', vitalsTableHtml(patient.vitals), true)}
    ${foldHtml('Patient background', background, true)}`;
}

/** One guideline row, linking to the guideline in the app. */
function guidelineRowHtml(id) {
  const guideline = guidelineById(id);
  if (!guideline) return '';
  return `<a class="scenario-guideline" href="#${escapeHtml(id)}">
    <span><b>${escapeHtml(guideline.n)}</b> ${escapeHtml(guideline.t)}</span>
    <span aria-hidden="true">›</span></a>`;
}

/** Draws one scenario. Guidelines opened from it link back here. */
export function renderScenario(scenario) {
  state.scenarioReturn = scenario.id;
  const guidelines = scenario.guidelines.map(guidelineRowHtml).join('');
  app.innerHTML = `<a class="back-link" href="#${SCENARIOS_HASH}">‹ Scenarios</a>
    <div class="page-padding scenario-screen">
    <section class="scenario-card">${levelPillHtml(scenario.level)}
      <h1 class="scenario-title">${escapeHtml(scenario.title)}</h1>
      <p class="scenario-label">${escapeHtml(scenario.suburb)}</p>
      <p class="scenario-story">${escapeHtml(scenario.story)}</p></section>
    ${scenario.patients.map(patientHtml).join('')}
    ${foldHtml('Scenario intention', `<p class="scenario-fact">${escapeHtml(scenario.intention)}</p>`, false)}
    ${foldHtml(`Guidelines (${scenario.guidelines.length})`, guidelines, true)}
    <button class="scenario-queue-button" type="button" data-action="scenario-add-to-queue"
      data-id="${escapeHtml(scenario.id)}">Add all to queue</button>
    <p class="scenario-queue-message" id="scenario-queue-message" role="status"></p></div>`;
}
