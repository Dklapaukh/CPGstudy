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
function withValue(scenario, path, value) {
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
    .reduce((changed, [path, field]) => withValue(changed, path, field.to), scenario);
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

/** The edit with the scenario left out of the app, or put back. */
export const scenarioEditOff = (edit, off) => tidyEdit(off, edit?.fields || {});

/** An edit object, or null when it changes nothing. */
function tidyEdit(off, fields) {
  if (!off && Object.keys(fields).length === 0) return null;
  return { kind: SCENARIO_EDIT_KIND, ...(off ? { off: true } : {}), fields };
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

/** The scenarios learners see: each with its edit, without those left out. */
export function liveScenarios(scenarios, edits) {
  return scenarios
    .filter((scenario) => !edits[scenarioEditId(scenario.id)]?.off)
    .map((scenario) => applyScenarioEdit(scenario, edits[scenarioEditId(scenario.id)]));
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
