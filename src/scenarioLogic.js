/*
 * Scenarios: themes and filters for the list, the saved record of runs and debriefs, scores and
 * progress. Pure
 * logic: touches no page, storage or network. Tested in tests/scenarioLogic.test.js.
 * Depends on constants.js.
 */
import {
  SCENARIO_THEMES,
  SCENARIO_RUNS_KEPT,
  MAX_DEBRIEF_NOTE,
  MAX_SCENARIO_RECORD,
  DEBRIEF_RATING_TOP,
  DEBRIEF_TEXTS,
  SCENARIO_COMPLEXITY,
  SCENARIO_LOADS,
} from './constants.js';

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

/**
 * The scenarios matching the chosen complexity (0 = any), scene load ('' = any) and theme
 * ('' = any).
 */
export function filterScenarios(scenarios, filter, sectionOf) {
  return scenarios.filter(
    (scenario) =>
      (!filter.complexity || scenario.complexity === filter.complexity) &&
      (!filter.load || scenario.load === filter.load) &&
      (!filter.theme || scenarioThemes(scenario, sectionOf).includes(filter.theme)),
  );
}

/**
 * A scenario's saved record read from its entry note: { count, runs }, runs newest first, each
 * { at (milliseconds), struggled (guideline ids), ratings (one per outcome: 0 to
 * DEBRIEF_RATING_TOP, or null when not rated), score (0 to 100, or null), plus, delta, takeaway,
 * note }. Runs saved before ratings existed have only a note. Bad or missing text gives no runs.
 */
export function parseScenarioRuns(savedText) {
  let parsed;
  try {
    parsed = JSON.parse(savedText);
  } catch {
    return { count: 0, runs: [] }; // no record yet, or a note edited by hand
  }
  const runs = Array.isArray(parsed?.runs) ? parsed.runs.filter(isRun).map(tidyRun) : [];
  const count = Number.isInteger(parsed?.count) ? Math.max(parsed.count, runs.length) : runs.length;
  return { count, runs };
}

const isRun = (run) => Number.isFinite(run?.at) && Array.isArray(run.struggled);
const isRating = (rating) =>
  Number.isInteger(rating) && rating >= 0 && rating <= DEBRIEF_RATING_TOP;
const textOf = (value) => (typeof value === 'string' ? value.slice(0, MAX_DEBRIEF_NOTE) : '');

/** A run with every field present and of the right kind. */
function tidyRun(run) {
  const ratings = Array.isArray(run.ratings)
    ? run.ratings.map((rating) => (isRating(rating) ? rating : null))
    : [];
  const texts = Object.fromEntries(DEBRIEF_TEXTS.map(([key]) => [key, textOf(run[key])]));
  return {
    at: run.at,
    struggled: run.struggled.filter((id) => typeof id === 'string'),
    ratings,
    score: scoreOf(ratings),
    ...texts,
    note: typeof run.note === 'string' ? run.note : '',
  };
}

/**
 * The score of a run's ratings: the points as a percentage of the most possible, counting only
 * the outcomes rated, rounded. null when nothing was rated.
 */
export function scoreOf(ratings) {
  const rated = ratings.filter(isRating);
  if (!rated.length) return null;
  const points = rated.reduce((sum, rating) => sum + rating, 0);
  return Math.round((points / (rated.length * DEBRIEF_RATING_TOP)) * 100);
}

/**
 * The record with one more run first. Only the latest few are kept, and older ones are dropped
 * until the saved text fits MAX_SCENARIO_RECORD, so the entry stays inside the backend's limit.
 */
export function withScenarioRun(record, run) {
  let runs = [{ ...run, note: '' }, ...record.runs].slice(0, SCENARIO_RUNS_KEPT).map(savedRun);
  const next = () => ({ count: record.count + 1, runs });
  while (runs.length > 1 && JSON.stringify(next()).length > MAX_SCENARIO_RECORD) {
    runs = runs.slice(0, -1);
  }
  return next();
}

/** A run as saved: tidy, without the score (worked out again when read) or an empty note. */
function savedRun(run) {
  const saved = tidyRun(run);
  delete saved.score;
  if (!saved.note) delete saved.note;
  return saved;
}

/** The latest score of a scenario's record, or null when no run has one. */
export const latestScore = (record) => record.runs.find((run) => run.score !== null)?.score ?? null;

/**
 * Progress for the list: for each complexity and each scene load, how many of its scenarios
 * have been run and the average of their latest scores. `recordOf` gives a scenario's record.
 * Returns { complexity: [row], load: [row] }, row = { key, name, total, run, average or null }.
 */
export function scenarioProgress(scenarios, recordOf) {
  const rowsFor = (groups, field) =>
    Object.entries(groups).map(([key, { name }]) => {
      const inGroup = scenarios.filter((scenario) => String(scenario[field]) === key);
      const records = inGroup.map(recordOf).filter((record) => record.runs.length);
      const scores = records.map(latestScore).filter((score) => score !== null);
      const average = scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : null;
      return { key, name, total: inGroup.length, run: records.length, average };
    });
  return {
    complexity: rowsFor(SCENARIO_COMPLEXITY, 'complexity'),
    load: rowsFor(SCENARIO_LOADS, 'load'),
  };
}
