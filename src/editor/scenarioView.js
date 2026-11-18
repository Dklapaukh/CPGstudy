/*
 * Editor page: markup for scenarios. The list is one folding section on the first screen; one
 * scenario (#s-<id>) is drawn by the app's own markup (views/scenarioMarkup.js) with the edits,
 * and clicking any value opens a box to change it in place. A new scenario is written in one form
 * (#new-scenario), and any scenario can be deleted for good after a second tap. Each function takes prepared data and
 * returns text; main.js puts it on the page and handles the clicks. Text is escaped.
 * Depends on logic.js, constants.js, guidelines.js, scenarioEdits.js, staffPage.js and
 * views/scenarioMarkup.js.
 */
import { escapeHtml } from '../logic.js';
import { warningHtml, noteHtml, actionButtonHtml } from '../staffPage.js';
import { guidelineById } from '../guidelines.js';
import {
  DEFAULT_HEADER_COLOUR,
  SCENARIO_COMPLEXITY,
  SCENARIO_LOADS,
  SCENARIO_VITALS,
} from '../constants.js';
import {
  scenarioValue,
  MAX_PATIENTS,
  MAX_LATER_VITALS,
  PATIENT_TEXT_FIELDS,
} from '../scenarioEdits.js';
import { scenarioBodyHtml, scenarioTagsText } from '../views/scenarioMarkup.js';

export const SCENARIO_EDITOR_HASH_PREFIX = '#s-';
// Not under #s-, so no scenario id can clash with it.
export const NEW_SCENARIO_HASH = '#new-scenario';

const FIELD_NAMES = {
  title: 'Title',
  suburb: 'Suburb',
  story: 'Story',
  intention: 'Scenario intention',
  complexity: 'Complexity',
  load: 'Scene load',
  outcomes: 'Intended outcomes',
  guidelines: 'Guidelines',
  label: 'Patient label',
  history: 'Medical history',
  medications: 'Medications',
  allergies: 'Allergies',
  social: 'Social history',
  vitalsNote: 'Note on the first vitals',
  treatment: 'Treatment and response',
  note: 'Note',
  caption: 'Caption',
};
const VITAL_NAMES = Object.fromEntries(SCENARIO_VITALS);
const HINTS = {
  complexity: '1 Straightforward, 2 Common presentation, 3 Complex or atypical.',
  load: 'single, delegation or several (several only when there is more than one patient).',
  outcomes: 'One per line, short and observable. The debrief rates each one.',
  guidelines: 'CPG numbers in the order shown, separated by commas, for example 1.17, 4.11.',
  label: 'Shown above the patient. Needed when there are several patients.',
};
const LONG_FIELDS = ['story', 'intention', 'outcomes', 'social', 'history', 'medications'];

/** What a path is called on the page: "Story", "Patient 2: HR". */
export function pathName(scenario, path) {
  const [top, index, field, vital] = path.split('.');
  if (top === 'photos') return `Photo ${Number(index) + 1}: caption`;
  if (top !== 'patients') return FIELD_NAMES[top];
  let name = field === 'vitals' ? VITAL_NAMES[vital] : FIELD_NAMES[field];
  if (field === 'laterVitals') {
    const [, , , , part, key] = path.split('.');
    name = `Vitals ${Number(vital) + 2}: ${part === 'vitals' ? VITAL_NAMES[key] : 'note'}`;
  }
  return scenario?.patients.length > 1 ? `Patient ${Number(index) + 1}: ${name}` : name;
}

/** A value as it is typed in a box: guidelines as CPG numbers, the rest as text. */
export function boxTextOf(value, path) {
  if (path === 'guidelines') {
    return (value || []).map((id) => guidelineById(id)?.n || id).join(', ');
  }
  if (path === 'outcomes') return (value || []).join('\n');
  return value === undefined || value === null ? '' : String(value);
}

/** The Scenarios section of the first screen: one row per scenario, by complexity. */
export function scenarioSectionHtml(rows, isOpen) {
  const items = rows
    .map(
      (row) => `<a class="guideline-row" href="${SCENARIO_EDITOR_HASH_PREFIX}${escapeHtml(row.id)}">
      <div class="guideline-row__text"><b>${escapeHtml(row.title)}</b>
      <small>${escapeHtml(scenarioTagsText(row))} · ${escapeHtml(row.suburb)}</small></div>
      ${row.badge ? `<span class="row-meta"><span class="editor-badge">${row.badge}</span></span>` : ''}</a>`,
    )
    .join('');
  const newLink = `<a class="switch-button editor-new-link" href="${NEW_SCENARIO_HASH}">+ New scenario</a>`;
  return `<details class="section-group" data-section="Scenarios"${isOpen ? ' open' : ''}>
    <summary><span class="section-name">Scenarios</span>
    <span class="section-count">${rows.length}</span></summary>${newLink}${items}</details>`;
}

/** The box for changing one value in place, with its hint and any error. */
function boxFormHtml(scenario, path, text, error) {
  const field = path.split('.').at(-1);
  const rows = LONG_FIELDS.includes(field) ? 4 : 2;
  const hint = HINTS[field] || (path.includes('.vitals.') ? 'Write – when not measured.' : '');
  return `<div class="editor-inline">
    <label class="editor-label" for="box-text">${escapeHtml(pathName(scenario, path))}</label>
    <textarea class="text-input editor-box" id="box-text" rows="${rows}">${escapeHtml(text)}</textarea>
    ${hint ? noteHtml(escapeHtml(hint)) : ''}${warningHtml(error)}
    <div class="editor-buttons">${actionButtonHtml('scenario-box-save', 'Save', '', 'button')}
      ${actionButtonHtml('close', 'Cancel')}</div></div>`;
}

/** Makes the markup editable: every value clickable, the open one drawn as a box. */
function editingFor(view) {
  return {
    attrs: (path) =>
      ` data-action="edit-box" data-path="${escapeHtml(path)}" tabindex="0" title="Tap to change"`,
    formFor: (path) =>
      path === view.openPath ? boxFormHtml(view.written, path, view.boxText, view.boxError) : '',
  };
}

/** The values a change to content/scenarios.js altered under the edit, with what to do. */
function reviewHtml(view) {
  if (!view.toReview.length) return '';
  const column = (heading, value, path) =>
    `<div class="editor-column"><h4>${heading}</h4><p>${escapeHtml(boxTextOf(value, path)) || '<i>(none)</i>'}</p></div>`;
  const items = view.toReview.map((path) => {
    const data = ` data-path="${escapeHtml(path)}"`;
    const now = view.written ? scenarioValue(view.written, path) : undefined;
    return `<div class="editor-review"><h4>${escapeHtml(pathName(view.written || view.live, path))}</h4>
      <div class="editor-columns">${column('When edited', view.edit.fields[path].was, path)}
      ${column('Learners see now', view.edit.fields[path].to, path)}
      ${column('Now in the scenario file', now, path)}</div>
      <div class="editor-buttons">${view.written ? actionButtonHtml('scenario-keep', 'Keep the edit', data, 'button') : ''}
      ${actionButtonHtml('scenario-drop', view.written ? 'Use the file’s version' : 'Remove this change', data)}</div></div>`;
  });
  return `${noteHtml('The scenario file changed after these were edited. Until you choose, the app keeps showing the edit.')}${items.join('')}`;
}

/** Labels beside the scenario: edited, left out, not yet in the app, needs review. */
function badgesHtml(view) {
  const badges = [];
  if (view.edit?.added) badges.push('New');
  if (view.edit?.off) badges.push('Left out');
  if (Object.keys(view.edit?.fields || {}).length) badges.push('Edited');
  if (!view.isPublished)
    badges.push(view.edit ? 'Not in the app yet' : 'Edit removed, not in the app yet');
  if (view.toReview.length) badges.push('Needs review');
  return badges.map((badge) => `<span class="editor-badge">${badge}</span>`).join(' ');
}

/**
 * One scenario's screen. `view` is { written (as in content/scenarios.js), live (with the edit),
 * edit, isPublished, toReview (paths), openPath, boxText, boxError }.
 */
export function scenarioEditorHtml(viewer, view, signedInButtons) {
  const { live, edit } = view;
  const offLabel = edit?.off ? 'Put it back in the app' : 'Leave this scenario out of the app';
  const undo = edit && !edit.added ? actionButtonHtml('scenario-undo', 'Undo all edits') : '';
  return `<div class="editor-back-bar"><a class="back-link" href="#">‹ All guidelines</a>
    ${signedInButtons}</div>
    <div class="guideline-header" style="--header-colour:${DEFAULT_HEADER_COLOUR}">
      <h1>${escapeHtml(live.title)}</h1>
      <div class="guideline-meta">Scenario · ${escapeHtml(scenarioTagsText(live))} · ${live.patients.length} patient${live.patients.length === 1 ? '' : 's'}<br>
        Signed in as ${escapeHtml(viewer.name)}</div></div>
    <main class="page-padding">${warningHtml(viewer.message)}
    ${noteHtml('The scenario as learners see it, edits included. Tap any text, vital, the complexity, the scene load, the outcomes or the guidelines to change it. Saved edits reach the app the next morning.')}
    <p>${badgesHtml(view)}</p>${reviewHtml(view)}
    <div class="editor-preview scenario-screen">${scenarioBodyHtml(live, editingFor(view))}</div>
    <div class="editor-buttons">${actionButtonHtml('scenario-off', offLabel)}${undo}</div>
    ${deleteHtml(view.isDeleting)}</main>`;
}

/** The delete button, or after one tap the question that makes sure. */
function deleteHtml(isDeleting) {
  if (!isDeleting) {
    return `<div class="editor-buttons">${actionButtonHtml('scenario-delete', 'Delete this scenario', '', 'switch-button editor-danger')}</div>`;
  }
  return `<div class="editor-inline editor-confirm" role="alert">
    <p><b>Delete this scenario for good?</b> It goes from the app and from this page, with its
    edits, and can’t be put back. To hide it for now instead, leave it out of the app.</p>
    <div class="editor-buttons">${actionButtonHtml('scenario-delete-yes', 'Yes, delete it', '', 'button editor-danger')}
      ${actionButtonHtml('scenario-delete-no', 'Keep it')}</div></div>`;
}

/** The screen for a scenario that was deleted. */
export function deletedScenarioHtml(viewer, signedInButtons) {
  return `<div class="editor-back-bar"><a class="back-link" href="#">‹ All guidelines</a>
    ${signedInButtons}</div>
    <main class="page-padding">${warningHtml(viewer.message)}<h1>Scenario deleted</h1>
    ${noteHtml('This scenario was deleted for good. It leaves the app the next morning.')}</main>`;
}

/* ---------- The new scenario form ---------- */

const SHORT_FIELDS = ['title', 'suburb', 'label', 'vitalsNote', 'note', 'caption'];
const DRAFT_HINTS = {
  ...HINTS,
  suburb: 'Wellington, Porirua, Kāpiti or Hutt Valley.',
  intention: 'What the scenario practises and what to watch for.',
  label: 'Needed when there are several patients, for example "Driver".',
  vitalsNote: 'Optional, for example "On arrival".',
  note: 'Optional, for example "5 min after GTN".',
  treatment: 'Optional: what was done and how they responded. Shown folded, for the mentor.',
  caption: 'Optional, for example "12-lead on arrival".',
};

/** One box of the form: a line for short texts, a few lines for the rest. */
function draftBoxHtml(draft, path) {
  const field = path.split('.').at(-1);
  const id = `draft-${path.replaceAll('.', '-')}`;
  const value = escapeHtml(String(scenarioValue(draft, path) ?? ''));
  const attrs = `class="text-input editor-box" id="${id}" data-draft="${escapeHtml(path)}"`;
  const box = SHORT_FIELDS.includes(field)
    ? `<input ${attrs} type="text" value="${value}">`
    : `<textarea ${attrs} rows="${LONG_FIELDS.includes(field) ? 3 : 2}">${value}</textarea>`;
  const hint = DRAFT_HINTS[field];
  return `<label class="editor-label" for="${id}">${escapeHtml(FIELD_NAMES[field])}</label>${box}
    ${hint ? noteHtml(escapeHtml(hint)) : ''}`;
}

/** A dropdown of the form: complexity or scene load. */
function draftSelectHtml(draft, path, choices) {
  const options = Object.entries(choices)
    .map(([key, { name }]) => {
      const selected = String(draft[path]) === key ? ' selected' : '';
      return `<option value="${key}"${selected}>${escapeHtml(name)}</option>`;
    })
    .join('');
  return `<label class="editor-label" for="draft-${path}">${FIELD_NAMES[path]}</label>
    <select class="text-input" id="draft-${path}" data-draft="${path}">${options}</select>`;
}

/** Eight vital boxes of the form under `prefix` ("patients.0.vitals"). */
function draftVitalsHtml(draft, prefix) {
  return SCENARIO_VITALS.map(([key, name]) => {
    const path = `${prefix}.${key}`;
    const id = `draft-${path.replaceAll('.', '-')}`;
    const value = escapeHtml(String(scenarioValue(draft, path) ?? ''));
    return `<label class="editor-vital" for="${id}">${name}
      <input class="text-input" id="${id}" type="text" data-draft="${path}" value="${value}"></label>`;
  }).join('');
}

/** One later set of vitals: its note, the eight vitals and Remove. */
function draftLaterVitalsHtml(draft, index, setIndex) {
  const prefix = `patients.${index}.laterVitals.${setIndex}`;
  const data = ` data-index="${index}" data-set="${setIndex}"`;
  return `<p class="editor-label">Vitals ${setIndex + 2}</p>
    ${draftBoxHtml(draft, `${prefix}.note`)}
    <div class="editor-vitals">${draftVitalsHtml(draft, `${prefix}.vitals`)}</div>
    <div class="editor-buttons">${actionButtonHtml('draft-remove-vitals', 'Remove these vitals', data)}</div>`;
}

/**
 * One patient of the form: label, background, the first vitals with their note, any later
 * vitals (each with a note such as "After GTN"), then the treatment and response.
 */
function draftPatientHtml(draft, index) {
  const prefix = `patients.${index}`;
  const patient = draft.patients[index];
  const remove =
    draft.patients.length > 1
      ? actionButtonHtml('draft-remove-patient', 'Remove this patient', ` data-index="${index}"`)
      : '';
  const later = (patient.laterVitals || [])
    .map((set, setIndex) => draftLaterVitalsHtml(draft, index, setIndex))
    .join('');
  const addVitals =
    (patient.laterVitals || []).length < MAX_LATER_VITALS
      ? actionButtonHtml('draft-add-vitals', '+ Add later vitals', ` data-index="${index}"`)
      : '';
  return `<fieldset class="editor-patient"><legend>Patient ${index + 1}</legend>
    ${PATIENT_TEXT_FIELDS.map((field) => draftBoxHtml(draft, `${prefix}.${field}`)).join('')}
    <p class="editor-label">Vitals</p>${draftBoxHtml(draft, `${prefix}.vitalsNote`)}
    <div class="editor-vitals">${draftVitalsHtml(draft, `${prefix}.vitals`)}</div>
    ${noteHtml('Write – for a vital that isn’t measured.')}${later}
    <div class="editor-buttons">${addVitals}</div>
    ${draftBoxHtml(draft, `${prefix}.treatment`)}
    ${remove ? `<div class="editor-buttons">${remove}</div>` : ''}</fieldset>`;
}

/** The photos of a submitted job: each as it will show, its caption and Remove. */
function draftPhotosHtml(draft) {
  if (!draft.photos?.length) return '';
  const photos = draft.photos
    .map(
      (photo, index) => `<figure class="scenario-photo">
        ${photo.preview ? `<img src="${escapeHtml(photo.preview)}" alt="Photo ${index + 1}">` : noteHtml('Loading the photo…')}
        ${draftBoxHtml(draft, `photos.${index}.caption`)}
        <div class="editor-buttons">${actionButtonHtml('draft-remove-photo', 'Remove this photo', ` data-index="${index}"`)}</div>
      </figure>`,
    )
    .join('');
  return `<fieldset class="editor-patient"><legend>Photos</legend>
    ${noteHtml('A removed photo is never published. Check nothing in a photo names the patient.')}${photos}</fieldset>`;
}

/**
 * The new scenario form. `draft` holds each box's text (scenarioEdits.js emptyScenarioDraft);
 * `error` is { path, error } for the box that couldn't be kept, or null. With `job` (a submitted
 * job, { id }) it is the Edit and approve form for that job.
 */
export function newScenarioHtml(viewer, draft, error, signedInButtons, job = null) {
  const errorText = error ? `${pathName(draft, error.path)}: ${error.error}` : '';
  const addPatient =
    draft.patients.length < MAX_PATIENTS
      ? actionButtonHtml('draft-add-patient', '+ Add a patient')
      : '';
  const heading = job ? 'Edit and approve a submitted job' : 'New scenario';
  const intro = job
    ? `Change anything before approving: the job becomes a new scenario. Check nothing in the
      text or photos could identify the patient. Boxes marked optional can be left empty.`
    : 'Every box is needed except those marked optional.';
  const save = job ? 'Save and approve' : 'Save the scenario';
  const cancel = job ? `#j-${escapeHtml(job.id)}` : '#';
  return `<div class="editor-back-bar"><a class="back-link" href="${cancel}">‹ Back</a>
    ${signedInButtons}</div>
    <main class="page-padding">${warningHtml(viewer.message)}<h1>${heading}</h1>
    ${noteHtml(`${intro} Saved scenarios reach the app the next morning; after saving, tap any value to change it.`)}
    ${['title', 'suburb', 'story', 'intention'].map((path) => draftBoxHtml(draft, path)).join('')}
    ${draftSelectHtml(draft, 'complexity', SCENARIO_COMPLEXITY)}
    ${draftSelectHtml(draft, 'load', SCENARIO_LOADS)}${noteHtml(escapeHtml(HINTS.load))}
    ${draftBoxHtml(draft, 'outcomes')}${draftBoxHtml(draft, 'guidelines')}
    ${draft.patients.map((patient, index) => draftPatientHtml(draft, index)).join('')}
    <div class="editor-buttons">${addPatient}</div>${draftPhotosHtml(draft)}${warningHtml(errorText)}
    <div class="editor-buttons">${actionButtonHtml('draft-save', save, '', 'button')}
      <a class="switch-button" href="${cancel}">Cancel</a></div></main>`;
}

/** The screen for an edit whose scenario is no longer in content/scenarios.js. */
export function goneScenarioHtml(viewer, view, signedInButtons) {
  return `<div class="editor-back-bar"><a class="back-link" href="#">‹ All guidelines</a>
    ${signedInButtons}</div>
    <main class="page-padding">${warningHtml(viewer.message)}
    <h1>Scenario no longer in the app</h1>
    ${noteHtml('This scenario was taken out of the scenario file, so its edit does nothing.')}
    ${reviewHtml(view)}<div class="editor-buttons">${actionButtonHtml('scenario-undo', 'Remove the edit', '', 'button')}</div></main>`;
}
