/*
 * Reading and saving a scenario's runs and debriefs in the state. Stored as one extra entry per
 * scenario (SCENARIO_RUN_ENTRY_PREFIX + scenario id, status always Incomplete, note = JSON), so it
 * is saved, uploaded and merged by the same code as the guidelines and needs no backend change.
 * The learner presses Finish on their own phone (decision 18 Nov 2026), so the run lands in
 * their tracker. Saving a run counts the streak day, like finishing a quiz.
 * Depends on state.js, sync.js, logic.js, scenarioLogic.js, streakState.js and constants.js.
 */
import { state, saveSession } from './state.js';
import { scheduleSync } from './sync.js';
import { nextTimestamp } from './logic.js';
import { parseScenarioRuns, withScenarioRun, latestLevel } from './scenarioLogic.js';
import { recordQuizFinished } from './streakState.js';
import { SCENARIO_RUN_ENTRY_PREFIX, STATUS } from './constants.js';

/** The scenario's record: { count, runs } (see parseScenarioRuns). */
export function getScenarioRuns(scenarioId) {
  const entry = state.entries[SCENARIO_RUN_ENTRY_PREFIX + scenarioId];
  return parseScenarioRuns(entry ? entry.n : '');
}

/**
 * The learner's level saved with this tracker's newest run of any scenario, or '' when none has,
 * so the debrief can start on it.
 */
export function lastLearnerLevel() {
  const records = Object.entries(state.entries)
    .filter(([id]) => id.startsWith(SCENARIO_RUN_ENTRY_PREFIX))
    .map(([, entry]) => parseScenarioRuns(entry.n));
  return latestLevel(records);
}

/**
 * Records one run (`run` is { at, struggled, rated, ratings, level, notes }) and counts today's
 * streak day.
 */
export function saveScenarioRun(scenarioId, run) {
  const entryId = SCENARIO_RUN_ENTRY_PREFIX + scenarioId;
  const previous = state.entries[entryId];
  const record = withScenarioRun(getScenarioRuns(scenarioId), run);
  const entry = {
    s: STATUS.INCOMPLETE,
    n: JSON.stringify(record),
    t: nextTimestamp(previous ? previous.t : 0, Date.now()),
  };
  state.entries[entryId] = entry;
  state.pendingChanges[entryId] = { ...entry };
  saveSession();
  scheduleSync();
  recordQuizFinished();
}
