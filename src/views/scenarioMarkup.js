/*
 * Markup for scenarios, shared by the app (views/scenarioView.js) and the editor page
 * (editor/scenarioView.js), so editors change a scenario exactly as learners see it.
 * Each function takes data and returns text; nothing here touches the page.
 * On the editor page an optional `editing` argument makes each value clickable and puts the
 * editor's box in place of the open one: { attrs(path), formFor(path) }, where a path names one
 * value as in scenarioEdits.js. It may also have commentFor(part), which gives the in-line
 * comment button and box of a part (scenarioComments.js) to put at the end of that part.
 * Without it the markup is the app's. With `readOnly: true` (a
 * submitted job waiting for approval) it is the editor's layout with nothing to tap.
 * jobBodyHtml draws an approved anonymised job (Quiz > Anonymised jobs) with the same parts.
 * Depends on logic.js, guidelines.js, constants.js, scenarioEdits.js and scenarioVariations.js.
 */
import { escapeHtml } from '../logic.js';
import { guidelineById } from '../guidelines.js';
import {
  SCENARIO_HASH_PREFIX,
  SCENARIO_COMPLEXITY,
  SCENARIO_LOADS,
  SCENARIO_LEVELS,
  SCENARIO_VITALS,
  GIVE_IF_ASKED_GUIDE,
} from '../constants.js';
import { tidyLevels } from '../scenarioEdits.js';
import { variationHeading, variationLevelsText } from '../scenarioVariations.js';

const boxAttrs = (editing, path) => (editing ? editing.attrs(path) : '');
const openForm = (editing, path) => (editing ? editing.formFor(path) : '');
const commentSlot = (editing, part) => (editing?.commentFor ? editing.commentFor(part) : '');

const complexityName = (scenario) => SCENARIO_COMPLEXITY[scenario.complexity]?.name || '';
const loadName = (scenario) => SCENARIO_LOADS[scenario.load]?.name || '';

/** The complexity and scene load in words: "Common presentation · Delegation". */
export const scenarioTagsText = (scenario) => `${complexityName(scenario)} · ${loadName(scenario)}`;

/** The levels a scenario suits in short words, "Student–Grad" style: "Student, Grad", or ''. */
export const levelsText = (scenario) =>
  (tidyLevels(scenario.levels) || []).map((key) => SCENARIO_LEVELS[key].short).join(', ');

/** The levels pill; on the editor page it shows "Levels not set" so it can be tapped. */
function levelsPillHtml(scenario, editing) {
  const text = levelsText(scenario);
  if (!text && !editing) return '';
  return (
    openForm(editing, 'levels') ||
    `<span class="scenario-level scenario-level--levels"${boxAttrs(editing, 'levels')}>${
      text ? `Suits ${escapeHtml(text)}` : 'Levels not set'
    }</span>`
  );
}

/** The pills: complexity, scene load and the levels it suits; an editor taps any to change it. */
export const scenarioTagsHtml = (scenario, editing) =>
  `<p class="scenario-tags">${
    openForm(editing, 'complexity') ||
    `<span class="scenario-level"${boxAttrs(editing, 'complexity')}>${escapeHtml(complexityName(scenario))}</span>`
  } ${
    openForm(editing, 'load') ||
    `<span class="scenario-level scenario-level--load"${boxAttrs(editing, 'load')}>${escapeHtml(loadName(scenario))}</span>`
  } ${levelsPillHtml(scenario, editing)}</p>`;

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

/** A labelled long text from a sent job (treatment, follow up); '' when it is empty. */
const longTextHtml = (label, text) =>
  text
    ? `<p class="scenario-label">${escapeHtml(label)}</p>
      <p class="scenario-fact scenario-long-text">${escapeHtml(text)}</p>`
    : '';

/** A sent job's assessment of this patient, folded; '' when there is none. */
function assessmentHtml(patient, editing) {
  if (!patient.assessment) return '';
  const text = `<p class="scenario-fact scenario-long-text">${escapeHtml(patient.assessment)}</p>`;
  return foldHtml('Assessment', text, Boolean(editing));
}

/**
 * What happened after the first vitals, from a submitted job: later vitals, each with its note,
 * then the treatment and response, then the follow up. Folded in the app, so the mentor reveals
 * it when it fits. Nothing when the patient has none of them.
 */
function nextHtml(patient, index, editing) {
  const later = (patient.laterVitals || [])
    .map((set) => `${vitalsNoteHtml(set.note)}${vitalsTableHtml(set.vitals, '')}`)
    .join('');
  const texts =
    longTextHtml('Treatment and response', patient.treatment) +
    longTextHtml('Follow up', patient.followUp);
  if (!later && !texts) return '';
  const comment = commentSlot(editing, `patients.${index}.next`);
  // A job is a real call, not a scenario run by a mentor.
  return foldHtml(
    editing?.isJob ? 'What happened next' : 'What happened next (for the mentor)',
    later + texts + comment,
    Boolean(editing),
  );
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
  const comment = commentSlot(editing, 'photos');
  return foldHtml(`ECGs and photos (${photos.length})`, figures + comment, Boolean(editing));
}

/** The vitals and background of one patient, its assessment, then what happened next when known. */
function patientHtml(patient, index, editing) {
  const prefix = `patients.${index}`;
  const background =
    factHtml('Medical history', patient.history, `${prefix}.history`, editing) +
    factHtml('Medications', patient.medications, `${prefix}.medications`, editing) +
    factHtml('Allergies', patient.allergies, `${prefix}.allergies`, editing) +
    factHtml('Social history', patient.social, `${prefix}.social`, editing);
  const vitals =
    vitalsNoteHtml(patient.vitalsNote) +
    vitalsTableHtml(patient.vitals, prefix, editing) +
    commentSlot(editing, `${prefix}.vitals`);
  return `${patientLabelHtml(patient, prefix, editing)}
    ${foldHtml('Vitals', vitals, true)}
    ${foldHtml('Patient background', background + commentSlot(editing, `${prefix}.background`), true)}${assessmentHtml(patient, editing)}${nextHtml(patient, index, editing)}`;
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
  return foldHtml(
    `Guidelines (${scenario.guidelines.length})`,
    body + commentSlot(editing, 'guidelines'),
    true,
  );
}

/**
 * The facts the learner finds out by asking (SC-P), under the story, for the mentor: folded in
 * the app, open for an editor. Nothing in the app when the scenario has none.
 */
function giveIfAskedHtml(scenario, editing) {
  const facts = scenario.giveIfAsked || [];
  if (!facts.length && (!editing || editing.readOnly)) return '';
  const list = facts.length
    ? facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join('')
    : '<li><i>None yet</i></li>';
  const body =
    openForm(editing, 'giveIfAsked') ||
    `<ul class="scenario-fact scenario-give-if-asked"${boxAttrs(editing, 'giveIfAsked')}>${list}</ul>`;
  return foldHtml(
    'Give if asked (for the mentor)',
    `<p class="scenario-intro">${escapeHtml(GIVE_IF_ASKED_GUIDE)}</p>${body}${commentSlot(editing, 'giveIfAsked')}`,
    Boolean(editing),
  );
}

/**
 * The variation cards (SC-N): one way each to change the scenario for a learner, with the
 * levels it suits. Folded in the app, open for an editor; nothing in the app when there are none.
 */
function variationsHtml(scenario, editing) {
  const cards = scenario.variations || [];
  if (!cards.length && (!editing || editing.readOnly)) return '';
  const items = cards.length
    ? cards
        .map(
          (card) => `<li><b>${escapeHtml(variationHeading(card))}</b>
            <small>· ${escapeHtml(variationLevelsText(card))}</small><br>${escapeHtml(card.text)}</li>`,
        )
        .join('')
    : '<li><i>None yet</i></li>';
  const body =
    openForm(editing, 'variations') ||
    `<ul class="scenario-fact scenario-variations"${boxAttrs(editing, 'variations')}>${items}</ul>`;
  return foldHtml(
    `Ways to vary it (${cards.length})`,
    `<p class="scenario-intro">Pick one card, or none, to match your learner. Change severity or the level, not both at once.</p>${body}${commentSlot(editing, 'variations')}`,
    Boolean(editing),
  );
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
  // The outcomes are what the scenario emphasises; the debrief rates the six competencies (SC-R).
  const outcomesLabel = 'What this scenario emphasises';
  const intention = `${text('intention', 'p', 'scenario-fact')}${commentSlot(editing, 'intention')}
    <p class="scenario-label">${outcomesLabel}</p>${outcomes}${commentSlot(editing, 'outcomes')}`;
  const intentionTitle = editing ? 'Intention and debrief points' : 'Scenario intention';
  return `<section class="scenario-card">${scenarioTagsHtml(scenario, editing)}
      ${text('title', 'h1', 'scenario-title')}${text('suburb', 'p', 'scenario-label')}
      ${text('story', 'p', 'scenario-story')}${commentSlot(editing, 'story')}</section>
    ${giveIfAskedHtml(scenario, editing)}
    ${scenario.patients.map((patient, index) => patientHtml(patient, index, editing)).join('')}
    ${photosHtml(scenario, editing)}
    ${foldHtml(intentionTitle, intention, Boolean(editing))}
    ${variationsHtml(scenario, editing)}
    ${guidelinesHtml(scenario, editing)}`;
}

// Every fold open and nothing to tap: an anonymised job is read whole, not revealed in stages.
const JOB_LAYOUT = { attrs: () => '', formFor: () => '', readOnly: true, isJob: true };

/** A lesson list, or a note when there are none. */
const lessonsHtml = (lessons) =>
  lessons.length
    ? `<ul class="scenario-fact scenario-outcomes">${lessons
        .map((lesson) => `<li>${escapeHtml(lesson)}</li>`)
        .join('')}</ul>`
    : '<p class="scenario-intro">No lessons written yet.</p>';

/** The recordings and links, each opening in a new tab; nothing when there are none. */
function linksHtml(links) {
  if (!links.length) return '';
  const rows = links
    .map(
      (link) => `<a class="scenario-guideline" href="${escapeHtml(link.url)}" target="_blank"
        rel="noopener noreferrer"><span>${escapeHtml(link.title)}</span><span aria-hidden="true">↗</span></a>`,
    )
    .join('');
  return foldHtml(`Recordings and links (${links.length})`, rows, true);
}

/**
 * An approved anonymised job (AJ-C): the job as sent (story, each patient with what happened
 * next, the photos, the guidelines), then Lessons learnt, then Recordings and links. `dateText`
 * is when it was approved, in words. On the editor page (`isEditorPage`) guidelines are plain text.
 */
export function jobBodyHtml(job, dateText, isEditorPage = false) {
  // No presentation or scene load tags: a job is not a scenario, and editors may not set them.
  return `<section class="scenario-card">
      <h1 class="scenario-title">${escapeHtml(job.title)}</h1>
      <p class="scenario-label">${escapeHtml(job.suburb)} · Added ${escapeHtml(dateText)}</p>
      <p class="scenario-story">${escapeHtml(job.story)}</p></section>
    ${job.patients.map((patient, index) => patientHtml(patient, index, JOB_LAYOUT)).join('')}
    ${photosHtml(job, JOB_LAYOUT)}
    ${guidelinesHtml(job, isEditorPage ? JOB_LAYOUT : undefined)}
    ${foldHtml('Lessons learnt', lessonsHtml(job.lessons), true)}
    ${linksHtml(job.links)}`;
}
