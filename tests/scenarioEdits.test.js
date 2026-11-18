/*
 * Tests for src/scenarioEdits.js (editors' changes to scenarios) and src/scenarioLogic.js
 * (themes, filters and the record of runs).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scenarioEditId,
  scenarioIdOfEdit,
  scenarioValue,
  isEditablePath,
  applyScenarioEdit,
  scenarioEditWith,
  scenarioEditOff,
  scenarioPathsToReview,
  keepScenarioPath,
  dropScenarioPath,
  liveScenarios,
  readScenarioBox,
} from '../src/scenarioEdits.js';
import {
  scenarioThemes,
  themesInUse,
  filterScenarios,
  parseScenarioRuns,
  withScenarioRun,
  scoreOf,
  latestScore,
  scenarioProgress,
} from '../src/scenarioLogic.js';
import { SCENARIO_RUNS_KEPT, MAX_DEBRIEF_NOTE, MAX_SCENARIO_RECORD } from '../src/constants.js';

const vitals = {
  gcs: '15',
  rr: '16',
  spo2: '99%',
  hr: '80',
  bp: '120/80',
  temp: '36.8',
  bgl: '5',
  pain: '0',
};
const written = {
  id: 'sample',
  complexity: 2,
  load: 'single',
  title: 'Sample',
  suburb: 'Petone',
  story: 'A story.',
  intention: 'An intention.',
  outcomes: ['Does one thing', 'Does another'],
  guidelines: ['cpg-2-1', 'cpg-1-16'],
  patients: [
    { history: 'Asthma', medications: 'Nil', allergies: 'None', social: 'Lives alone', vitals },
  ],
};

test('edit ids carry the scenario id and are told apart from question ids', () => {
  assert.equal(scenarioEditId('long-lie'), 'scenario|long-lie');
  assert.equal(scenarioIdOfEdit('scenario|long-lie'), 'long-lie');
  assert.equal(scenarioIdOfEdit('cpg-3-8|order|0'), '');
});

test('paths name values, and only the editable ones are accepted', () => {
  assert.equal(scenarioValue(written, 'patients.0.vitals.hr'), '80');
  assert.equal(scenarioValue(written, 'patients.3.history'), undefined);
  assert.ok(isEditablePath(written, 'story'));
  assert.ok(isEditablePath(written, 'patients.0.label'));
  assert.ok(!isEditablePath(written, 'patients.1.history'), 'no second patient');
  assert.ok(!isEditablePath(written, 'patients.0.vitals.colour'));
  assert.ok(!isEditablePath(written, 'id'));
});

test('an edit changes one value, keeps what it was, and leaves the scenario untouched', () => {
  const edit = scenarioEditWith(written, null, 'patients.0.vitals.hr', '120');
  assert.deepEqual(edit, {
    kind: 'scenario',
    fields: { 'patients.0.vitals.hr': { was: '80', to: '120' } },
  });
  const live = applyScenarioEdit(written, edit);
  assert.equal(live.patients[0].vitals.hr, '120');
  assert.equal(live.patients[0].vitals.bp, '120/80');
  assert.equal(written.patients[0].vitals.hr, '80', 'the written scenario is not changed');
});

test('setting a value back to the written one removes it; nothing left is no edit', () => {
  const edit = scenarioEditWith(written, null, 'title', 'New');
  assert.equal(scenarioEditWith(written, edit, 'title', 'Sample'), null);
  const off = scenarioEditOff(edit, true);
  assert.deepEqual(scenarioEditWith(written, off, 'title', 'Sample'), {
    kind: 'scenario',
    off: true,
    fields: {},
  });
  assert.equal(scenarioEditOff(scenarioEditOff(null, true), false), null);
});

test('a value changed in the file after its edit is listed for review, kept or dropped', () => {
  const edit = scenarioEditWith(written, null, 'story', 'Edited story.');
  const changed = { ...written, story: 'A new story in the file.' };
  assert.deepEqual(scenarioPathsToReview(written, edit), []);
  assert.deepEqual(scenarioPathsToReview(changed, edit), ['story']);
  assert.deepEqual(scenarioPathsToReview(undefined, edit), ['story'], 'a removed scenario');
  const kept = keepScenarioPath(changed, edit, 'story');
  assert.deepEqual(scenarioPathsToReview(changed, kept), []);
  assert.equal(applyScenarioEdit(changed, kept).story, 'Edited story.');
  assert.equal(dropScenarioPath(edit, 'story'), null);
});

test('learners see the edited scenarios, without those left out', () => {
  const other = { ...written, id: 'other' };
  const edits = {
    'scenario|sample': scenarioEditWith(written, null, 'title', 'Changed'),
    'scenario|other': scenarioEditOff(null, true),
  };
  assert.deepEqual(
    liveScenarios([written, other], edits).map((scenario) => scenario.title),
    ['Changed'],
  );
});

test('boxes: complexity 1 to 3, a known load, outcomes one per line, CPG numbers, text', () => {
  const ids = { 2.1: 'cpg-2-1', 4.11: 'cpg-4-11' };
  const idOf = (number) => ids[number];
  assert.deepEqual(readScenarioBox('complexity', ' 3 ', idOf), { value: 3 });
  assert.ok(readScenarioBox('complexity', '4', idOf).error);
  assert.deepEqual(readScenarioBox('load', 'Delegation', idOf), { value: 'delegation' });
  assert.deepEqual(readScenarioBox('load', 'several patients', idOf), { value: 'several' });
  assert.ok(readScenarioBox('load', 'crowd', idOf).error);
  assert.deepEqual(readScenarioBox('outcomes', '- First\n\n• Second ', idOf), {
    value: ['First', 'Second'],
  });
  assert.ok(readScenarioBox('outcomes', ' \n ', idOf).error);
  assert.ok(readScenarioBox('outcomes', 'a\nb\nc\nd\ne\nf\ng', idOf).error);
  assert.ok(isEditablePath(written, 'outcomes') && isEditablePath(written, 'load'));
  assert.ok(!isEditablePath(written, 'level'));
  assert.deepEqual(readScenarioBox('guidelines', '4.11, 2.1\n4.11', idOf), {
    value: ['cpg-4-11', 'cpg-2-1'],
  });
  assert.match(readScenarioBox('guidelines', '2.1, 9.99', idOf).error, /9\.99/);
  assert.ok(readScenarioBox('story', '   ', idOf).error);
  assert.deepEqual(readScenarioBox('patients.0.label', '', idOf), { value: '' });
  assert.deepEqual(readScenarioBox('title', ' Trimmed ', idOf), { value: 'Trimmed' });
});

test('themes come from guideline sections, guideline lists and the rural field', () => {
  const sectionOf = (id) => ({ 'cpg-2-1': 'Respiratory', 'cpg-7-1': 'Paediatrics' })[id];
  assert.deepEqual(scenarioThemes(written, sectionOf), ['Respiratory']);
  const croup = { ...written, guidelines: ['cpg-2-7'], rural: true };
  assert.deepEqual(scenarioThemes(croup, sectionOf), ['Paediatrics', 'Rural']);
  assert.deepEqual(themesInUse([written, croup], sectionOf), [
    'Paediatrics',
    'Respiratory',
    'Rural',
  ]);
  const both = [written, { ...croup, complexity: 3, load: 'delegation' }];
  const any = { complexity: 0, load: '', theme: '' };
  assert.equal(filterScenarios(both, { ...any, complexity: 3 }, sectionOf).length, 1);
  assert.equal(filterScenarios(both, { ...any, load: 'delegation' }, sectionOf).length, 1);
  assert.equal(filterScenarios(both, { ...any, theme: 'Respiratory' }, sectionOf).length, 1);
  assert.equal(
    filterScenarios(both, { ...any, complexity: 2, theme: 'Rural' }, sectionOf).length,
    0,
  );
  assert.equal(filterScenarios(both, any, sectionOf).length, 2);
});

test('runs: newest first, only the latest kept, text cut short, bad text gives none', () => {
  assert.deepEqual(parseScenarioRuns(''), { count: 0, runs: [] });
  assert.deepEqual(parseScenarioRuns('{"runs":"nope"}'), { count: 0, runs: [] });
  let record = parseScenarioRuns('');
  for (let run = 1; run <= SCENARIO_RUNS_KEPT + 1; run += 1) {
    record = withScenarioRun(record, {
      at: run,
      struggled: ['cpg-2-1'],
      ratings: [3, 1],
      plus: 'x'.repeat(2000),
    });
  }
  assert.equal(record.count, SCENARIO_RUNS_KEPT + 1);
  assert.equal(record.runs.length, SCENARIO_RUNS_KEPT);
  assert.equal(record.runs[0].at, SCENARIO_RUNS_KEPT + 1);
  assert.equal(record.runs[0].plus.length, MAX_DEBRIEF_NOTE);
  const read = parseScenarioRuns(JSON.stringify(record));
  assert.equal(read.runs[0].score, 67);
  assert.equal(read.runs[0].delta, '', 'a missing text reads as empty');
});

test('runs saved before ratings keep their note and have no score', () => {
  const old = JSON.stringify({ count: 1, runs: [{ at: 5, struggled: [], note: 'Old note' }] });
  const [run] = parseScenarioRuns(old).runs;
  assert.equal(run.note, 'Old note');
  assert.equal(run.score, null);
  assert.deepEqual(run.ratings, []);
  const record = withScenarioRun(parseScenarioRuns(old), { at: 6, struggled: [], ratings: [2] });
  assert.equal(record.runs[1].note, 'Old note');
  assert.equal(record.runs[0].note, undefined, 'a new run saves no empty note');
});

test('the saved record always fits, dropping the oldest runs if needed', () => {
  let record = parseScenarioRuns('');
  const quotes = '"'.repeat(MAX_DEBRIEF_NOTE); // each one doubles when saved as JSON
  for (let run = 1; run <= SCENARIO_RUNS_KEPT; run += 1) {
    record = withScenarioRun(record, {
      at: run,
      struggled: [],
      ratings: [],
      plus: quotes,
      delta: quotes,
      takeaway: quotes,
    });
  }
  assert.ok(JSON.stringify(record).length <= MAX_SCENARIO_RECORD);
  assert.ok(record.runs.length >= 1 && record.runs[0].at === SCENARIO_RUNS_KEPT);
});

test('scores: rated outcomes as a percentage; blanks and bad values are left out', () => {
  assert.equal(scoreOf([3, 3, 3]), 100);
  assert.equal(scoreOf([0, 3]), 50);
  assert.equal(scoreOf([2, null, 7]), 67);
  assert.equal(scoreOf([null]), null);
  assert.equal(scoreOf([]), null);
  const record = {
    count: 2,
    runs: [
      { at: 2, score: null },
      { at: 1, score: 40 },
    ],
  };
  assert.equal(latestScore(record), 40, 'the latest run with a score');
});

test('progress: run counts and average latest score by complexity and scene load', () => {
  const list = [
    written,
    { ...written, id: 'b', load: 'delegation' },
    { ...written, id: 'c', complexity: 1 },
  ];
  const records = {
    sample: { count: 1, runs: [{ at: 1, score: 80 }] },
    b: { count: 1, runs: [{ at: 1, score: 60 }] },
  };
  const progress = scenarioProgress(list, (s) => records[s.id] || { count: 0, runs: [] });
  const common = progress.complexity.find((row) => row.key === '2');
  assert.deepEqual(common, {
    key: '2',
    name: 'Common presentation',
    total: 2,
    run: 2,
    average: 70,
  });
  const simple = progress.complexity.find((row) => row.key === '1');
  assert.equal(simple.average, null);
  assert.equal(progress.load.find((row) => row.key === 'delegation').average, 60);
});
