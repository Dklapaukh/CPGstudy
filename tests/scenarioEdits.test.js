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
} from '../src/scenarioLogic.js';
import { SCENARIO_RUNS_KEPT, MAX_DEBRIEF_NOTE } from '../src/constants.js';

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
  level: 2,
  title: 'Sample',
  suburb: 'Petone',
  story: 'A story.',
  intention: 'An intention.',
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

test('boxes: a level is 1 to 5, guidelines are CPG numbers, text is not empty', () => {
  const ids = { 2.1: 'cpg-2-1', 4.11: 'cpg-4-11' };
  const idOf = (number) => ids[number];
  assert.deepEqual(readScenarioBox('level', ' 4 ', idOf), { value: 4 });
  assert.ok(readScenarioBox('level', '6', idOf).error);
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
  const both = [written, { ...croup, level: 3 }];
  assert.equal(filterScenarios(both, { level: 3, theme: '' }, sectionOf).length, 1);
  assert.equal(filterScenarios(both, { level: 0, theme: 'Respiratory' }, sectionOf).length, 1);
  assert.equal(filterScenarios(both, { level: 2, theme: 'Rural' }, sectionOf).length, 0);
  assert.equal(filterScenarios(both, { level: 0, theme: '' }, sectionOf).length, 2);
});

test('runs: newest first, only the latest kept, notes cut short, bad text gives none', () => {
  assert.deepEqual(parseScenarioRuns(''), { count: 0, runs: [] });
  assert.deepEqual(parseScenarioRuns('{"runs":"nope"}'), { count: 0, runs: [] });
  let record = parseScenarioRuns('');
  for (let run = 1; run <= SCENARIO_RUNS_KEPT + 1; run += 1) {
    record = withScenarioRun(record, { at: run, struggled: ['cpg-2-1'], note: 'x'.repeat(2000) });
  }
  assert.equal(record.count, SCENARIO_RUNS_KEPT + 1);
  assert.equal(record.runs.length, SCENARIO_RUNS_KEPT);
  assert.equal(record.runs[0].at, SCENARIO_RUNS_KEPT + 1);
  assert.equal(record.runs[0].note.length, MAX_DEBRIEF_NOTE);
  assert.deepEqual(parseScenarioRuns(JSON.stringify(record)), record);
});
