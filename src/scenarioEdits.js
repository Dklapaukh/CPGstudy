/*
 * Editors' changes to scenarios (editor page), and the scenarios as the app shows them with
 * those changes. Pure logic: takes scenarios and edits and returns new ones; touches no page,
 * storage or network. Tested in tests/scenarioEdits.test.js.
 *
 * An edit is saved in the Sheet's Edits tab under SCENARIO_EDIT_PREFIX + scenario id, beside the
 * quiz question edits, so it needs no backend change. Its shape:
 *   { kind: 'scenario', off?: true, fields: { <path>: { was, to } } }
 * A path names one value: 'title', 'complexity', 'load', 'outcomes', 'guidelines', 'patients.0.history',
 * 'patients.1.vitals.hr'. `to` is what learners see; `was` is the value in content/scenarios.js
 * when the edit was made, so a later change to that file is noticed and shown for review.
 * Two more shapes (decision 19 Nov 2026):
 *   { kind: 'scenario', off?: true, added: <a whole scenario> }  one an editor created; it is
 *     not in content/scenarios.js, so its values are changed in `added` itself, with no review.
 *   { kind: 'scenario', deleted: true }  one an editor deleted for good; it has no undo.
 * Depends on constants.js.
 */
import { SCENARIO_COMPLEXITY, SCENARIO_LOADS, SCENARIO_VITALS } from './constants.js';

export const SCENARIO_EDIT_PREFIX = 'scenario|';
export const SCENARIO_EDIT_KIND = 'scenario';
export const SCENARIO_TEXT_FIELDS = ['title', 'suburb', 'story', 'intention'];
export const PATIENT_TEXT_FIELDS = ['label', 'history', 'medications', 'allergies', 'social'];
// The longest text one box keeps, so one edit stays well inside the Sheet's limit.
export const MAX_SCENARIO_TEXT = 2000;
// Intended outcomes: one per line in the box, at most this many, each at most this long.
export const MAX_OUTCOMES = 6;
export const MAX_OUTCOME_TEXT = 200;
// The most patients a new scenario has, so its edit stays inside the backend's 20000 characters.
export const MAX_PATIENTS = 4;
// A new scenario's id is made from its title, cut to this length.
const MAX_ID_LENGTH = 60;
// The scenario-wide values an editor may change, besides the text fields.
const OTHER_FIELDS = ['complexity', 'load', 'outcomes', 'guidelines'];

const sameValue = (first, second) => JSON.stringify(first) === JSON.stringify(second);

/** The Edits-tab id of a scenario's edit, and the scenario id back from one (or ''). */
export const scenarioEditId = (scenarioId) => SCENARIO_EDIT_PREFIX + scenarioId;
export const scenarioIdOfEdit = (editId) =>
  editId.startsWith(SCENARIO_EDIT_PREFIX) ? editId.slice(SCENARIO_EDIT_PREFIX.length) : '';

/** The value a path names in a scenario, or undefined when the scenario has no such place. */
export function scenarioValue(scenario, path) {
  return path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), scenario);
}

/** Whether a path names a place an editor may change in this scenario. */
export function isEditablePath(scenario, path) {
  if ([...SCENARIO_TEXT_FIELDS, ...OTHER_FIELDS].includes(path)) return true;
  const [top, index, field, vital] = path.split('.');
  if (top !== 'patients' || !scenario.patients[Number(index)]) return false;
  if (field === 'vitals') return SCENARIO_VITALS.some(([key]) => key === vital);
  return PATIENT_TEXT_FIELDS.includes(field) && vital === undefined;
}

/** A copy of the scenario with one value changed; the parts on the way are copied, not shared. */
export function withScenarioValue(scenario, path, value) {
  const keys = path.split('.');
  const copy = (object, depth) => {
    const clone = Array.isArray(object) ? [...object] : { ...object };
    const key = keys[depth];
    clone[key] = depth === keys.length - 1 ? value : copy(object[key] ?? {}, depth + 1);
    return clone;
  };
  return copy(scenario, 0);
}

/** The scenario as learners see it with this edit (null leaves it as written). */
export function applyScenarioEdit(scenario, edit) {
  if (!edit || !edit.fields) return scenario;
  return Object.entries(edit.fields)
    .filter(([path]) => isEditablePath(scenario, path))
    .reduce((changed, [path, field]) => withScenarioValue(changed, path, field.to), scenario);
}

/**
 * The edit after one value is set: the path is dropped when the value is back to what the
 * scenario has, and the whole edit is null when nothing is left changed or left out.
 */
export function scenarioEditWith(scenario, edit, path, value) {
  const fields = { ...(edit?.fields || {}) };
  const written = scenarioValue(scenario, path);
  if (sameValue(written, value)) delete fields[path];
  else fields[path] = { was: written, to: value };
  return tidyEdit(edit?.off, fields);
}

/** The edit with the scenario left out of the app, or put back. A new one stays new. */
export const scenarioEditOff = (edit, off) => tidyEdit(off, edit?.fields || {}, edit?.added);

/** The edit that deletes a scenario of content/scenarios.js for good. */
export const scenarioEditDeleted = () => ({ kind: SCENARIO_EDIT_KIND, deleted: true });

/**
 * An edit object, or null when it changes nothing. A new scenario's edit keeps only `added`
 * (and `off`), in the order the daily copy writes it, so the page can tell when it is published.
 */
function tidyEdit(off, fields, added) {
  const offPart = off ? { off: true } : {};
  if (added) return { kind: SCENARIO_EDIT_KIND, ...offPart, added };
  if (!off && Object.keys(fields).length === 0) return null;
  return { kind: SCENARIO_EDIT_KIND, ...offPart, fields };
}

/**
 * The paths whose value in content/scenarios.js changed after they were edited, for review.
 * A scenario that is gone has every path to review.
 */
export function scenarioPathsToReview(scenario, edit) {
  const paths = Object.keys(edit?.fields || {});
  if (!scenario) return paths;
  return paths.filter((path) => !sameValue(scenarioValue(scenario, path), edit.fields[path].was));
}

/** The edit with one path's new written value accepted under it: the edit stays. */
export function keepScenarioPath(scenario, edit, path) {
  const field = { ...edit.fields[path], was: scenarioValue(scenario, path) };
  return tidyEdit(edit.off, { ...edit.fields, [path]: field });
}

/** The edit without one path, so learners see the written value again. */
export function dropScenarioPath(edit, path) {
  const fields = { ...edit.fields };
  delete fields[path];
  return tidyEdit(edit.off, fields);
}

/**
 * The scenarios learners see: each with its edit, without those left out or deleted, then the
 * new ones by id. A new one whose id the file has since taken is skipped: the file wins.
 */
export function liveScenarios(scenarios, edits) {
  const editOf = (scenario) => edits[scenarioEditId(scenario.id)];
  const fileIds = new Set(scenarios.map((scenario) => scenario.id));
  const written = scenarios
    .filter((scenario) => !editOf(scenario)?.off && !editOf(scenario)?.deleted)
    .map((scenario) => applyScenarioEdit(scenario, editOf(scenario)));
  const added = Object.keys(edits)
    .sort()
    .map((id) => edits[id])
    .filter((edit) => edit?.added && !edit.off && !fileIds.has(edit.added.id))
    .map((edit) => edit.added);
  return [...written, ...added];
}

/* ---------- New scenarios ---------- */

/** A patient with every box empty, for the new scenario form. */
export const emptyPatient = () => ({
  label: '',
  ...Object.fromEntries(PATIENT_TEXT_FIELDS.slice(1).map((field) => [field, ''])),
  vitals: Object.fromEntries(SCENARIO_VITALS.map(([key]) => [key, ''])),
});

/** The new scenario form before anything is typed: every value as the text in its box. */
export const emptyScenarioDraft = () => ({
  ...Object.fromEntries(SCENARIO_TEXT_FIELDS.map((field) => [field, ''])),
  complexity: '1',
  load: 'single',
  outcomes: '',
  guidelines: '',
  patients: [emptyPatient()],
});

/**
 * An id for a new scenario from its title ("Fall at the marae" -> "fall-at-the-marae"), with
 * "-2", "-3" added when `takenIds` has it. Safe in an address and in the Edits tab.
 */
export function newScenarioId(title, takenIds) {
  const base =
    title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // macrons and accents go: "Kāpiti" -> "kapiti"
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, MAX_ID_LENGTH)
      .replace(/^-+|-+$/g, '') || 'scenario';
  const taken = new Set(takenIds);
  let id = base;
  for (let count = 2; taken.has(id); count += 1) id = `${base}-${count}`;
  return id;
}

/** Every path of one patient, in the order the form shows them. */
const patientPaths = (index) => [
  ...PATIENT_TEXT_FIELDS.map((field) => `patients.${index}.${field}`),
  ...SCENARIO_VITALS.map(([key]) => `patients.${index}.vitals.${key}`),
];

/** Why the patients don't fit the scene load, as { path, error }, or null when they do. */
function patientsProblem(scenario) {
  const isSeveral = scenario.patients.length > 1;
  if ((scenario.load === 'several') !== isSeveral) {
    const error = isSeveral
      ? 'With more than one patient the scene load is several.'
      : 'Several is only for more than one patient.';
    return { path: 'load', error };
  }
  const unlabelled = scenario.patients.findIndex((patient) => !patient.label);
  if (isSeveral && unlabelled >= 0) {
    return { path: `patients.${unlabelled}.label`, error: 'Give each patient a label.' };
  }
  return null;
}

/**
 * Reads the new scenario form (box texts, as emptyScenarioDraft) into a whole scenario with an
 * id not in `takenIds`: { value } or { path, error } for the first box that can't be kept.
 */
export function readNewScenario(draft, takenIds, guidelineIdOfNumber) {
  if (draft.patients.length > MAX_PATIENTS) {
    return { path: 'load', error: `Keep it to ${MAX_PATIENTS} patients.` };
  }
  const paths = [
    ...SCENARIO_TEXT_FIELDS,
    ...OTHER_FIELDS,
    ...draft.patients.flatMap((patient, index) => patientPaths(index)),
  ];
  let scenario = { patients: draft.patients.map(() => ({ vitals: {} })) };
  for (const path of paths) {
    const text = String(scenarioValue(draft, path) ?? '');
    const read = readScenarioBox(path, text, guidelineIdOfNumber);
    if (read.error) return { path, error: read.error };
    scenario = withScenarioValue(scenario, path, read.value);
  }
  const problem = patientsProblem(scenario);
  if (problem) return problem;
  const id = newScenarioId(scenario.title, takenIds);
  return { value: cleanAddedScenario(scenario, id, () => true) };
}

const isText = (value, maxLength = MAX_SCENARIO_TEXT) =>
  typeof value === 'string' && value.trim() !== '' && value.length <= maxLength;
const isTextList = (list, maxCount, maxLength) =>
  Array.isArray(list) &&
  list.length > 0 &&
  list.length <= maxCount &&
  list.every((item) => isText(item, maxLength));

/** One patient with only the keys the app reads, or null when a text or vital is missing. */
function cleanPatient(patient) {
  if (!patient || typeof patient !== 'object' || !patient.vitals) return null;
  const fields = PATIENT_TEXT_FIELDS.slice(1);
  const vitalKeys = SCENARIO_VITALS.map(([key]) => key);
  if (!fields.every((field) => isText(patient[field]))) return null;
  if (!vitalKeys.every((key) => isText(patient.vitals[key]))) return null;
  if (patient.label !== undefined && patient.label !== '' && !isText(patient.label)) return null;
  return {
    ...(patient.label ? { label: patient.label } : {}),
    ...Object.fromEntries(fields.map((field) => [field, patient[field]])),
    vitals: Object.fromEntries(vitalKeys.map((key) => [key, patient.vitals[key]])),
  };
}

/**
 * A new scenario with only the keys the app reads, in one order, under `id`; or null when it is
 * not whole (the same rules as tests/scenarios.test.js). `isGuidelineId` says a guideline is real.
 * Used by the editor page before saving and by the daily copy, which trusts nothing in the Sheet.
 */
export function cleanAddedScenario(scenario, id, isGuidelineId) {
  if (!scenario || typeof scenario !== 'object' || !Array.isArray(scenario.patients)) return null;
  const patients = scenario.patients.map(cleanPatient);
  const isWhole =
    SCENARIO_TEXT_FIELDS.every((field) => isText(scenario[field])) &&
    Boolean(SCENARIO_COMPLEXITY[scenario.complexity]) &&
    Boolean(SCENARIO_LOADS[scenario.load]) &&
    isTextList(scenario.outcomes, MAX_OUTCOMES, MAX_OUTCOME_TEXT) &&
    isTextList(scenario.guidelines, Infinity, MAX_SCENARIO_TEXT) &&
    scenario.guidelines.every(isGuidelineId) &&
    patients.length > 0 &&
    patients.length <= MAX_PATIENTS &&
    patients.every(Boolean);
  if (!isWhole) return null;
  const clean = {
    id,
    complexity: scenario.complexity,
    load: scenario.load,
    ...Object.fromEntries(SCENARIO_TEXT_FIELDS.map((field) => [field, scenario[field]])),
    outcomes: [...scenario.outcomes],
    guidelines: [...scenario.guidelines],
    patients,
  };
  return patientsProblem(clean) ? null : clean;
}

/**
 * A new scenario's edit after one value is changed in place: { edit } or { error } when the
 * change would leave it incomplete (such as several patients' load with only one).
 */
export function addedScenarioEditWith(edit, path, value, isGuidelineId) {
  const changed = withScenarioValue(edit.added, path, value);
  const added = cleanAddedScenario(changed, edit.added.id, isGuidelineId);
  if (!added)
    return { error: patientsProblem(changed)?.error || 'That would leave it incomplete.' };
  return { edit: tidyEdit(edit.off, {}, added) };
}

/**
 * Reads what an editor typed into a box into the value to save: { value } or { error }.
 * `guidelineIdOfNumber` turns a CPG number ("4.11") into a guideline id, or undefined.
 */
export function readScenarioBox(path, text, guidelineIdOfNumber) {
  const trimmed = text.trim();
  if (path === 'complexity') {
    const complexity = Number(trimmed);
    return SCENARIO_COMPLEXITY[complexity]
      ? { value: complexity }
      : { error: 'The complexity is a number, 1 to 3.' };
  }
  if (path === 'load') return readLoad(trimmed);
  if (path === 'outcomes') return readOutcomes(trimmed);
  if (path === 'guidelines') return readGuidelineNumbers(trimmed, guidelineIdOfNumber);
  if (trimmed.length > MAX_SCENARIO_TEXT) return { error: 'That is too long to keep.' };
  if (!trimmed && !path.endsWith('.label')) return { error: 'This can’t be empty.' };
  return { value: trimmed };
}

/** CPG numbers separated by commas, spaces or lines, into guideline ids in the same order. */
function readGuidelineNumbers(text, guidelineIdOfNumber) {
  const numbers = text.split(/[\s,]+/).filter(Boolean);
  if (!numbers.length) return { error: 'List at least one guideline.' };
  const unknown = numbers.filter((number) => !guidelineIdOfNumber(number));
  if (unknown.length) return { error: `No guideline numbered ${unknown.join(', ')}.` };
  return { value: [...new Set(numbers.map(guidelineIdOfNumber))] };
}

/** A scene load typed as its key or name ("delegation", "Several patients"). */
function readLoad(text) {
  const typed = text.toLowerCase();
  const key = Object.keys(SCENARIO_LOADS).find(
    (each) => each === typed || SCENARIO_LOADS[each].name.toLowerCase() === typed,
  );
  return key ? { value: key } : { error: 'Write single, delegation or several.' };
}

/** Intended outcomes, one per line; blank lines are skipped. */
function readOutcomes(text) {
  const outcomes = text
    .split('\n')
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
  if (!outcomes.length) return { error: 'List at least one outcome.' };
  if (outcomes.length > MAX_OUTCOMES) return { error: `Keep it to ${MAX_OUTCOMES} outcomes.` };
  if (outcomes.some((outcome) => outcome.length > MAX_OUTCOME_TEXT)) {
    return { error: `Keep each outcome under ${MAX_OUTCOME_TEXT} characters.` };
  }
  return { value: outcomes };
}
