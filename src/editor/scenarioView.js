/*
 * Editor page: markup for scenarios. The list is one folding section on the first screen; one
 * scenario (#s-<id>) is drawn by the app's own markup (views/scenarioMarkup.js) with the edits,
 * and clicking any value opens a box to change it in place. Each function takes prepared data and
 * returns text; main.js puts it on the page and handles the clicks. Text is escaped.
 * Depends on logic.js, constants.js, guidelines.js, scenarioEdits.js, staffPage.js and
 * views/scenarioMarkup.js.
 */
import { escapeHtml } from '../logic.js';
import { warningHtml } from '../staffPage.js';
import { guidelineById } from '../guidelines.js';
import { DEFAULT_HEADER_COLOUR, SCENARIO_VITALS } from '../constants.js';
import { scenarioValue } from '../scenarioEdits.js';
import { scenarioBodyHtml, scenarioTagsText } from '../views/scenarioMarkup.js';

export const SCENARIO_EDITOR_HASH_PREFIX = '#s-';

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
const note = (text) => `<p class="editor-note">${text}</p>`;
const button = (action, label, data = '', style = 'switch-button') =>
  `<button class="${style}" type="button" data-action="${action}"${data}>${label}</button>`;

/** What a path is called on the page: "Story", "Patient 2: HR". */
export function pathName(scenario, path) {
  const [top, index, field, vital] = path.split('.');
  if (top !== 'patients') return FIELD_NAMES[top];
  const name = field === 'vitals' ? VITAL_NAMES[vital] : FIELD_NAMES[field];
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
  return `<details class="section-group" data-section="Scenarios"${isOpen ? ' open' : ''}>
    <summary><span class="section-name">Scenarios</span>
    <span class="section-count">${rows.length}</span></summary>${items}</details>`;
}

/** The box for changing one value in place, with its hint and any error. */
function boxFormHtml(scenario, path, text, error) {
  const field = path.split('.').at(-1);
  const rows = LONG_FIELDS.includes(field) ? 4 : 2;
  const hint = HINTS[field] || (path.includes('.vitals.') ? 'Write – when not measured.' : '');
  return `<div class="editor-inline">
    <label class="editor-label" for="box-text">${escapeHtml(pathName(scenario, path))}</label>
    <textarea class="text-input editor-box" id="box-text" rows="${rows}">${escapeHtml(text)}</textarea>
    ${hint ? note(escapeHtml(hint)) : ''}${warningHtml(error)}
    <div class="editor-buttons">${button('scenario-box-save', 'Save', '', 'button')}
      ${button('close', 'Cancel')}</div></div>`;
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
      <div class="editor-buttons">${view.written ? button('scenario-keep', 'Keep the edit', data, 'button') : ''}
      ${button('scenario-drop', view.written ? 'Use the file’s version' : 'Remove this change', data)}</div></div>`;
  });
  return `${note('The scenario file changed after these were edited. Until you choose, the app keeps showing the edit.')}${items.join('')}`;
}

/** Labels beside the scenario: edited, left out, not yet in the app, needs review. */
function badgesHtml(view) {
  const badges = [];
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
  return `<div class="editor-back-bar"><a class="back-link" href="#">‹ All guidelines</a>
    ${signedInButtons}</div>
    <div class="guideline-header" style="--header-colour:${DEFAULT_HEADER_COLOUR}">
      <h1>${escapeHtml(live.title)}</h1>
      <div class="guideline-meta">Scenario · ${escapeHtml(scenarioTagsText(live))} · ${live.patients.length} patient${live.patients.length === 1 ? '' : 's'}<br>
        Signed in as ${escapeHtml(viewer.name)}</div></div>
    <main class="page-padding">${warningHtml(viewer.message)}
    ${note('The scenario as learners see it, edits included. Tap any text, vital, the complexity, the scene load, the outcomes or the guidelines to change it. Saved edits reach the app the next morning.')}
    <p>${badgesHtml(view)}</p>${reviewHtml(view)}
    <div class="editor-preview scenario-screen">${scenarioBodyHtml(live, editingFor(view))}</div>
    <div class="editor-buttons">${button('scenario-off', offLabel)}
      ${edit ? button('scenario-undo', 'Undo all edits') : ''}</div></main>`;
}

/** The screen for an edit whose scenario is no longer in content/scenarios.js. */
export function goneScenarioHtml(viewer, view, signedInButtons) {
  return `<div class="editor-back-bar"><a class="back-link" href="#">‹ All guidelines</a>
    ${signedInButtons}</div>
    <main class="page-padding">${warningHtml(viewer.message)}
    <h1>Scenario no longer in the app</h1>
    ${note('This scenario was taken out of the scenario file, so its edit does nothing.')}
    ${reviewHtml(view)}<div class="editor-buttons">${button('scenario-undo', 'Remove the edit', '', 'button')}</div></main>`;
}
