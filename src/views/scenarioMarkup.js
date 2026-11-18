/*
 * Markup for scenarios, shared by the app (views/scenarioView.js) and the editor page
 * (editor/scenarioView.js), so editors change a scenario exactly as learners see it.
 * Each function takes data and returns text; nothing here touches the page.
 * On the editor page an optional `editing` argument makes each value clickable and puts the
 * editor's box in place of the open one: { attrs(path), formFor(path) }, where a path names one
 * value as in scenarioEdits.js. Without it the markup is the app's. With `readOnly: true` (a
 * submitted job waiting for approval) it is the editor's layout with nothing to tap.
 * Depends on logic.js, guidelines.js, constants.js and scenarioEdits.js.
 */
import { escapeHtml } from '../logic.js';
import { guidelineById } from '../guidelines.js';
import {
  SCENARIO_HASH_PREFIX,
  SCENARIO_COMPLEXITY,
  SCENARIO_LOADS,
  SCENARIO_VITALS,
} from '../constants.js';

const boxAttrs = (editing, path) => (editing ? editing.attrs(path) : '');
const openForm = (editing, path) => (editing ? editing.formFor(path) : '');

const complexityName = (scenario) => SCENARIO_COMPLEXITY[scenario.complexity]?.name || '';
const loadName = (scenario) => SCENARIO_LOADS[scenario.load]?.name || '';

/** The complexity and scene load in words: "Common presentation · Delegation". */
export const scenarioTagsText = (scenario) => `${complexityName(scenario)} · ${loadName(scenario)}`;

/** The two pills, complexity and scene load; an editor taps either to change it. */
export const scenarioTagsHtml = (scenario, editing) =>
  `<p class="scenario-tags">${
    openForm(editing, 'complexity') ||
    `<span class="scenario-level"${boxAttrs(editing, 'complexity')}>${escapeHtml(complexityName(scenario))}</span>`
  } ${
    openForm(editing, 'load') ||
    `<span class="scenario-level scenario-level--load"${boxAttrs(editing, 'load')}>${escapeHtml(loadName(scenario))}</span>`
  }</p>`;

/**
 * One row of the list: title, suburb and the scene load when it is not a single patient, then
 * `metaHtml` (such as when it was last run and its score).
 */
export function scenarioRowHtml(scenario, href, metaHtml = '') {
  const where =
    scenario.load === 'single' ? scenario.suburb : `${scenario.suburb} · ${loadName(scenario)}`;
  return `<a class="scenario-row" href="${href}">
    <span class="scenario-row__text"><b>${escapeHtml(scenario.title)}</b>
    <small>${escapeHtml(where)}</small>${metaHtml}</span><span aria-hidden="true">›</span></a>`;
}

/** The scenarios in one card per complexity, simplest first. `rowFor` draws each row. */
export function scenarioGroupsHtml(scenarios, rowFor) {
  return Object.entries(SCENARIO_COMPLEXITY)
    .map(([complexity, { name }]) => {
      const rows = scenarios.filter((scenario) => scenario.complexity === Number(complexity));
      if (!rows.length) return '';
      return `<section class="scenario-card"><h2 class="scenario-group-title">${escapeHtml(name)}</h2>
        ${rows.map(rowFor).join('')}</section>`;
    })
    .join('');
}

/** The address of a scenario in the app. */
export const scenarioHref = (scenario) => `#${SCENARIO_HASH_PREFIX}${escapeHtml(scenario.id)}`;

/** A folding card, styled like the guideline list's sections. */
export const foldHtml = (title, body, open) =>
  `<details class="section-group scenario-fold"${open ? ' open' : ''}>
    <summary><span class="section-name">${title}</span></summary>
    <div class="scenario-fold__body">${body}</div></details>`;

/** The vitals in one row, then the box for the open one (it would not fit in a cell). */
function vitalsTableHtml(vitals, prefix, editing) {
  const heads = SCENARIO_VITALS.map(([, name]) => `<th scope="col">${name}</th>`).join('');
  const values = SCENARIO_VITALS.map(
    ([key]) =>
      `<td${boxAttrs(editing, `${prefix}.vitals.${key}`)}>${escapeHtml(vitals[key] || '–')}</td>`,
  ).join('');
  const form = SCENARIO_VITALS.map(([key]) => openForm(editing, `${prefix}.vitals.${key}`)).join(
    '',
  );
  return `<table class="scenario-vitals"><thead><tr>${heads}</tr></thead>
    <tbody><tr>${values}</tr></tbody></table>${form}`;
}

/** A label and its text in the patient background. */
const factHtml = (label, text, path, editing) =>
  `<p class="scenario-label">${label}</p>${
    openForm(editing, path) ||
    `<p class="scenario-fact"${boxAttrs(editing, path)}>${escapeHtml(text)}</p>`
  }`;

/** A patient's label, shown when there are several; an editor can always add or change one. */
function patientLabelHtml(patient, prefix, editing) {
  const path = `${prefix}.label`;
  if (openForm(editing, path)) return openForm(editing, path);
  if (!patient.label && (!editing || editing.readOnly)) return '';
  const text = patient.label ? escapeHtml(patient.label) : '<i>No patient label</i>';
  return `<h2 class="scenario-patient"${boxAttrs(editing, path)}>${text}</h2>`;
}

/** A note above a set of vitals ("On arrival", "After GTN"), when there is one. */
const vitalsNoteHtml = (text) => (text ? `<p class="scenario-label">${escapeHtml(text)}</p>` : '');

/**
 * What happened after the first vitals, from a submitted job: later vitals, each with its note,
 * then the treatment and response. Folded in the app, so the mentor reveals it when it fits.
 * Nothing when the patient has neither.
 */
function nextHtml(patient, editing) {
  const later = (patient.laterVitals || [])
    .map((set) => `${vitalsNoteHtml(set.note)}${vitalsTableHtml(set.vitals, '')}`)
    .join('');
  const treatment = patient.treatment
    ? `<p class="scenario-label">Treatment and response</p>
      <p class="scenario-fact">${escapeHtml(patient.treatment)}</p>`
    : '';
  if (!later && !treatment) return '';
  return foldHtml('What happened next (for the mentor)', later + treatment, Boolean(editing));
}

/** A submitted job's photos (ECGs, the monitor) with captions, folded in the app. */
function photosHtml(scenario, editing) {
  const photos = scenario.photos || [];
  if (!photos.length) return '';
  const figures = photos
    .map(
      (photo, index) => `<figure class="scenario-photo">
        <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.caption || `Photo ${index + 1}`)}"
          loading="lazy">${photo.caption ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : ''}
      </figure>`,
    )
    .join('');
  return foldHtml(`ECGs and photos (${photos.length})`, figures, Boolean(editing));
}

/** The vitals and background of one patient, then what happened next when it is known. */
function patientHtml(patient, index, editing) {
  const prefix = `patients.${index}`;
  const background =
    factHtml('Medical history', patient.history, `${prefix}.history`, editing) +
    factHtml('Medications', patient.medications, `${prefix}.medications`, editing) +
    factHtml('Allergies', patient.allergies, `${prefix}.allergies`, editing) +
    factHtml('Social history', patient.social, `${prefix}.social`, editing);
  return `${patientLabelHtml(patient, prefix, editing)}
    ${foldHtml('Vitals', vitalsNoteHtml(patient.vitalsNote) + vitalsTableHtml(patient.vitals, prefix, editing), true)}
    ${foldHtml('Patient background', background, true)}${nextHtml(patient, editing)}`;
}

/** One guideline row: a link in the app, plain text for an editor (the list is one box). */
function guidelineRowHtml(id, editing) {
  const guideline = guidelineById(id);
  if (!guideline) return '';
  const text = `<span><b>${escapeHtml(guideline.n)}</b> ${escapeHtml(guideline.t)}</span>`;
  if (editing) return `<div class="scenario-guideline">${text}</div>`;
  return `<a class="scenario-guideline" href="#${escapeHtml(id)}">${text}
    <span aria-hidden="true">›</span></a>`;
}

/** The guidelines fold. */
function guidelinesHtml(scenario, editing) {
  const rows = scenario.guidelines.map((id) => guidelineRowHtml(id, editing)).join('');
  const body =
    openForm(editing, 'guidelines') ||
    (editing ? `<div${boxAttrs(editing, 'guidelines')}>${rows}</div>` : rows);
  return foldHtml(`Guidelines (${scenario.guidelines.length})`, body, true);
}

/**
 * The scenario as learners see it: the story card, each patient (with what happened next and
 * the photos, for a submitted job), the intention and intended
 * outcomes (folded in the app, open for an editor) and the guidelines.
 */
export function scenarioBodyHtml(scenario, editing) {
  const text = (path, tag, className) =>
    openForm(editing, path) ||
    `<${tag} class="${className}"${boxAttrs(editing, path)}>${escapeHtml(scenario[path])}</${tag}>`;
  const outcomes =
    openForm(editing, 'outcomes') ||
    `<ul class="scenario-fact scenario-outcomes"${boxAttrs(editing, 'outcomes')}>${(
      scenario.outcomes || []
    )
      .map((outcome) => `<li>${escapeHtml(outcome)}</li>`)
      .join('')}</ul>`;
  const intention = `${text('intention', 'p', 'scenario-fact')}
    <p class="scenario-label">Intended outcomes</p>${outcomes}`;
  return `<section class="scenario-card">${scenarioTagsHtml(scenario, editing)}
      ${text('title', 'h1', 'scenario-title')}${text('suburb', 'p', 'scenario-label')}
      ${text('story', 'p', 'scenario-story')}</section>
    ${scenario.patients.map((patient, index) => patientHtml(patient, index, editing)).join('')}
    ${photosHtml(scenario, editing)}
    ${foldHtml('Scenario intention', intention, Boolean(editing))}
    ${guidelinesHtml(scenario, editing)}`;
}
