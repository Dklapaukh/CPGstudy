/*
 * Scenarios: themes and filters for the list, and the saved record of runs and debriefs. Pure
 * logic: touches no page, storage or network. Tested in tests/scenarioLogic.test.js.
 * Depends on constants.js.
 */
import { SCENARIO_THEMES, SCENARIO_RUNS_KEPT, MAX_DEBRIEF_NOTE } from './constants.js';

/**
 * The themes of a scenario, in the order of SCENARIO_THEMES. A theme comes from the sections
 * of the scenario's guidelines (`sectionOf` gives a guideline's section name) or its own
 * guideline list; Rural comes from the scenario's `rural` field.
 */
export function scenarioThemes(scenario, sectionOf) {
  return SCENARIO_THEMES.filter((theme) => {
    if (theme.rural) return Boolean(scenario.rural);
    return scenario.guidelines.some(
      (id) => theme.guidelines?.includes(id) || theme.sections?.includes(sectionOf(id)),
    );
  }).map((theme) => theme.name);
}

/** The themes at least one scenario has, so the list offers no chip that would show nothing. */
export const themesInUse = (scenarios, sectionOf) =>
  SCENARIO_THEMES.map((theme) => theme.name).filter((name) =>
    scenarios.some((scenario) => scenarioThemes(scenario, sectionOf).includes(name)),
  );

/** The scenarios matching the chosen level (0 = any) and theme ('' = any). */
export function filterScenarios(scenarios, filter, sectionOf) {
  return scenarios.filter(
    (scenario) =>
      (!filter.level || scenario.level === filter.level) &&
      (!filter.theme || scenarioThemes(scenario, sectionOf).includes(filter.theme)),
  );
}

/**
 * A scenario's saved record read from its entry note: { count, runs }, runs newest first, each
 * { at (milliseconds), struggled (guideline ids), note }. Bad or missing text gives no runs.
 */
export function parseScenarioRuns(savedText) {
  let parsed;
  try {
    parsed = JSON.parse(savedText);
  } catch {
    return { count: 0, runs: [] }; // no record yet, or a note edited by hand
  }
  const runs = Array.isArray(parsed?.runs) ? parsed.runs.filter(isRun) : [];
  const count = Number.isInteger(parsed?.count) ? Math.max(parsed.count, runs.length) : runs.length;
  return { count, runs };
}

const isRun = (run) =>
  Number.isFinite(run?.at) && Array.isArray(run.struggled) && typeof run.note === 'string';

/** The record with one more run first. Only the latest few are kept so the note stays small. */
export function withScenarioRun(record, run) {
  const kept = {
    at: run.at,
    struggled: [...run.struggled],
    note: run.note.slice(0, MAX_DEBRIEF_NOTE),
  };
  return { count: record.count + 1, runs: [kept, ...record.runs].slice(0, SCENARIO_RUNS_KEPT) };
}
