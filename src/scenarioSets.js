/*
 * Benchmark and "move on" sets (SC-L, docs/scenario-variations.md): for each learner level, the
 * scenarios that place a learner there and move them on to it, in order. Pure logic: takes the
 * file's sets, the editors' change and the scenarios and returns new values; touches no page,
 * storage or network. Tested in tests/scenarioSets.test.js.
 *
 * Claude's draft is content/scenario-sets.js. An editor's change is saved in the Sheet's Edits
 * tab under SCENARIO_SETS_EDIT_ID, beside the scenario edits, so it needs no backend change:
 *   { kind: 'scenario-sets', sets: { <level>: [scenario ids in order] } }
 * Only the levels an editor changed are in it; the others keep the file's set.
 * Depends on constants.js.
 */
import { SCENARIO_LEVELS, SCENARIO_COMPLEXITY } from './constants.js';

export const SCENARIO_SETS_EDIT_ID = 'scenario-sets';
export const SCENARIO_SETS_EDIT_KIND = 'scenario-sets';
// The most scenarios one set keeps; the owner asked for 5, so a few spare allow for swaps.
export const MAX_SET_SIZE = 8;
// How many of each presentation (complexity 1, 2, 3) a set aims for (owner, 26 Nov 2026).
export const SET_MIX = {
  student: [5, 0, 0],
  grad: [3, 2, 0],
  supervised: [2, 3, 0],
  paramedic: [1, 2, 2],
  icp: [0, 1, 4],
};

const isLevel = (level) => Object.hasOwn(SCENARIO_LEVELS, level);

/** The ids as a list of strings, each once, in order; [] for anything that is not a list. */
const tidyIds = (ids) => (Array.isArray(ids) ? [...new Set(ids.map(String))] : []);

/**
 * Every level's set as learners see it: the editors' set where they changed one, else the
 * file's, keeping only ids in `liveIds` (so a deleted or left-out scenario drops out).
 */
export function liveSets(fileSets, edit, liveIds) {
  const live = new Set(liveIds);
  const changed = edit?.kind === SCENARIO_SETS_EDIT_KIND ? edit.sets || {} : {};
  return Object.fromEntries(
    Object.keys(SCENARIO_LEVELS).map((level) => [
      level,
      tidyIds(Object.hasOwn(changed, level) ? changed[level] : fileSets[level]).filter((id) =>
        live.has(id),
      ),
    ]),
  );
}

/**
 * The edit with one level's set changed to `ids`, or that level's change taken out when `ids`
 * is null (back to the file's set). Null when no level is left changed, so the edit goes.
 */
export function setsEditWith(edit, level, ids) {
  const sets = { ...(edit?.sets || {}) };
  if (ids === null) delete sets[level];
  else sets[level] = tidyIds(ids);
  return Object.keys(sets).length ? { kind: SCENARIO_SETS_EDIT_KIND, sets } : null;
}

/**
 * Reads the editor's box for one set: scenario ids, one per line or separated by commas, in
 * order. Returns { value: ids } or { error } for an unknown id, a repeat or too many.
 */
export function readSetBox(text, liveIds) {
  const ids = String(text)
    .split(/[\n,]/)
    .map((id) => id.trim())
    .filter(Boolean);
  const unknown = ids.find((id) => !liveIds.includes(id));
  if (unknown) return { error: `No scenario has the id “${unknown}”.` };
  if (new Set(ids).size < ids.length) return { error: 'A scenario is in the list twice.' };
  if (ids.length > MAX_SET_SIZE) return { error: `A set keeps at most ${MAX_SET_SIZE}.` };
  return { value: ids };
}

/** "3 Common, 2 Undifferentiated": a count per presentation, those with none left out. */
const mixText = (counts) =>
  counts
    .map((count, index) => (count ? `${count} ${SCENARIO_COMPLEXITY[index + 1].short}` : ''))
    .filter(Boolean)
    .join(', ') || 'none';

/**
 * Notes for the editor on one level's set (scenarios as learners see them, in set order): when
 * its presentation mix differs from SET_MIX, and any scenario not ticked for that level.
 */
export function setWarnings(level, setScenarios) {
  const counts = [1, 2, 3].map(
    (complexity) => setScenarios.filter((scenario) => scenario.complexity === complexity).length,
  );
  const aim = SET_MIX[level] || [0, 0, 0];
  const warnings = [];
  if (counts.join() !== aim.join()) {
    warnings.push(`Aims for ${mixText(aim)}; this set has ${mixText(counts)}.`);
  }
  const unticked = setScenarios.filter((scenario) => !(scenario.levels || []).includes(level));
  if (unticked.length) {
    const titles = unticked.map((scenario) => scenario.title).join(', ');
    warnings.push(`Not ticked for ${SCENARIO_LEVELS[level].name}: ${titles}.`);
  }
  return warnings;
}

/**
 * The sets edit with only what the app knows (known levels, ids that pass `isScenarioId`, at
 * most MAX_SET_SIZE each), or null when it is not one; for the daily copy.
 */
export function cleanSetsEdit(edit, isScenarioId) {
  if (edit?.kind !== SCENARIO_SETS_EDIT_KIND || !edit.sets || typeof edit.sets !== 'object') {
    return null;
  }
  const sets = {};
  Object.keys(edit.sets)
    .filter(isLevel)
    .sort()
    .forEach((level) => {
      sets[level] = tidyIds(edit.sets[level]).filter(isScenarioId).slice(0, MAX_SET_SIZE);
    });
  return Object.keys(sets).length ? { kind: SCENARIO_SETS_EDIT_KIND, sets } : null;
}
