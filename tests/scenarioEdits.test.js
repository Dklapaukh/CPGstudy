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
  scenarioEditDeleted,
  emptyScenarioDraft,
  emptyPatient,
  newScenarioId,
  readNewScenario,
  cleanAddedScenario,
  addedScenarioEditWith,
  MAX_PATIENTS,
} from '../src/scenarioEdits.js';
import {
  scenarioThemes,
  themesInUse,
  filterScenarios,
  parseScenarioRuns,
  withScenarioRun,
  scoreOf,
  latestLevel,
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
  const caughtUp = { ...written, story: 'Edited story.' };
  assert.deepEqual(
    scenarioPathsToReview(caughtUp, edit),
    [],
    'the file now says what the edit says',
  );
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
  // "Give if asked" facts: one per line like outcomes, but a scenario may have none.
  assert.deepEqual(readScenarioBox('giveIfAsked', '- Missed lunch\n\nType 1', idOf), {
    value: ['Missed lunch', 'Type 1'],
  });
  assert.deepEqual(readScenarioBox('giveIfAsked', '  ', idOf), { value: [] });
  assert.ok(readScenarioBox('giveIfAsked', 'a\nb\nc\nd\ne\nf\ng\nh\ni', idOf).error);
  assert.ok(isEditablePath(written, 'giveIfAsked') && isEditablePath(written, 'variations'));
  assert.deepEqual(readScenarioBox('variations', 'Severity (ICP): Shocked.', idOf), {
    value: [{ lever: 'severity', levels: ['icp'], text: 'Shocked.' }],
  });
  assert.ok(readScenarioBox('variations', 'Severity: no levels', idOf).error);
});

/* ---------- New and deleted scenarios ---------- */

const guidelineIdOfNumber = (number) => ({ 2.1: 'cpg-2-1', 1.16: 'cpg-1-16' })[number];
const isGuidelineId = (id) => ['cpg-2-1', 'cpg-1-16'].includes(id);
const vitalsText = { gcs: '15', rr: '16', spo2: '99%', hr: '80', bp: '120/80' };

/** The new scenario form filled in, with `patients` patients. */
function filledDraft(patients = 1) {
  const patient = (index) => ({
    ...emptyPatient(),
    label: patients > 1 ? `Patient ${index + 1}` : '',
    history: ' Asthma ',
    medications: 'Nil',
    allergies: 'None',
    social: 'Lives alone',
    vitals: { ...vitalsText, temp: '36.8', bgl: '5', pain: '–' },
  });
  return {
    ...emptyScenarioDraft(),
    title: 'Fall at the Kāpiti marae',
    suburb: 'Ōtaki',
    story: 'A story.',
    intention: 'An intention.',
    complexity: '2',
    load: patients > 1 ? 'several' : 'single',
    outcomes: '- Does one thing\nDoes another\n',
    guidelines: '2.1, 1.16',
    patients: Array.from({ length: patients }, (unused, index) => patient(index)),
  };
}

test('a new scenario id comes from its title, safe in an address and never taken', () => {
  assert.equal(newScenarioId('Fall at the Kāpiti marae!', []), 'fall-at-the-kapiti-marae');
  assert.equal(newScenarioId('Long lie', ['long-lie', 'long-lie-2']), 'long-lie-3');
  assert.equal(newScenarioId('???', []), 'scenario');
  assert.ok(newScenarioId('a'.repeat(200), []).length <= 60);
});

test('the new scenario form reads into a whole scenario, or names the box to fix', () => {
  const read = readNewScenario(filledDraft(), ['sample'], guidelineIdOfNumber);
  assert.deepEqual(read.value, {
    id: 'fall-at-the-kapiti-marae',
    complexity: 2,
    load: 'single',
    title: 'Fall at the Kāpiti marae',
    suburb: 'Ōtaki',
    story: 'A story.',
    intention: 'An intention.',
    outcomes: ['Does one thing', 'Does another'],
    guidelines: ['cpg-2-1', 'cpg-1-16'],
    patients: [
      {
        history: 'Asthma',
        medications: 'Nil',
        allergies: 'None',
        social: 'Lives alone',
        vitals: { ...vitalsText, temp: '36.8', bgl: '5', pain: '–' },
      },
    ],
  });
  const noStory = { ...filledDraft(), story: '  ' };
  assert.deepEqual(readNewScenario(noStory, [], guidelineIdOfNumber), {
    path: 'story',
    error: 'This can’t be empty.',
  });
  const noVital = filledDraft();
  noVital.patients[0].vitals.bp = '';
  assert.equal(readNewScenario(noVital, [], guidelineIdOfNumber).path, 'patients.0.vitals.bp');
  const badGuideline = { ...filledDraft(), guidelines: '9.9' };
  assert.match(readNewScenario(badGuideline, [], guidelineIdOfNumber).error, /9\.9/);
});

test('several patients need the several load and a label each; one patient needs neither', () => {
  const two = readNewScenario(filledDraft(2), [], guidelineIdOfNumber).value;
  assert.deepEqual(
    two.patients.map((patient) => patient.label),
    ['Patient 1', 'Patient 2'],
  );
  assert.equal(
    readNewScenario({ ...filledDraft(2), load: 'single' }, [], guidelineIdOfNumber).path,
    'load',
  );
  assert.equal(
    readNewScenario({ ...filledDraft(1), load: 'several' }, [], guidelineIdOfNumber).path,
    'load',
  );
  const unlabelled = filledDraft(2);
  unlabelled.patients[1].label = '';
  assert.equal(readNewScenario(unlabelled, [], guidelineIdOfNumber).path, 'patients.1.label');
  const tooMany = filledDraft(MAX_PATIENTS + 1);
  assert.match(readNewScenario(tooMany, [], guidelineIdOfNumber).error, /patients/);
});

test('a saved new scenario is checked again: unknown keys go, a broken one is refused', () => {
  const scenario = readNewScenario(filledDraft(), [], guidelineIdOfNumber).value;
  const withExtra = { ...scenario, id: 'other', extra: 'dropped', rural: 'no' };
  assert.deepEqual(cleanAddedScenario(withExtra, scenario.id, isGuidelineId), scenario);
  assert.equal(cleanAddedScenario({ ...scenario, complexity: 9 }, 'x', isGuidelineId), null);
  assert.equal(
    cleanAddedScenario({ ...scenario, guidelines: ['cpg-99'] }, 'x', isGuidelineId),
    null,
  );
  assert.equal(cleanAddedScenario({ ...scenario, outcomes: [] }, 'x', isGuidelineId), null);
  const facts = { ...scenario, giveIfAsked: ['Missed lunch'] };
  assert.deepEqual(cleanAddedScenario(facts, scenario.id, isGuidelineId).giveIfAsked, [
    'Missed lunch',
  ]);
  assert.equal(cleanAddedScenario({ ...scenario, giveIfAsked: '' }, 'x', isGuidelineId), null);
  const none = cleanAddedScenario({ ...scenario, giveIfAsked: [] }, scenario.id, isGuidelineId);
  assert.ok(!('giveIfAsked' in none), 'an empty list is left out');
  const card = { lever: 'severity', levels: ['icp'], text: 'Shocked.' };
  const carded = cleanAddedScenario(
    { ...scenario, variations: [card] },
    scenario.id,
    isGuidelineId,
  );
  assert.deepEqual(carded.variations, [card]);
  const broken = { ...scenario, variations: [{ ...card, lever: 'luck' }] };
  assert.equal(cleanAddedScenario(broken, 'x', isGuidelineId), null);
  assert.equal(cleanAddedScenario({ ...scenario, patients: [{}] }, 'x', isGuidelineId), null);
  assert.equal(cleanAddedScenario('not a scenario', 'x', isGuidelineId), null);
});

test('a new scenario is changed in place in its edit, and kept whole', () => {
  const added = readNewScenario(filledDraft(), [], guidelineIdOfNumber).value;
  const edit = { kind: 'scenario', added };
  const changed = addedScenarioEditWith(edit, 'patients.0.vitals.hr', '130', isGuidelineId);
  assert.equal(changed.edit.added.patients[0].vitals.hr, '130');
  assert.equal(edit.added.patients[0].vitals.hr, '80', 'the old edit is untouched');
  assert.equal(changed.edit.fields, undefined, 'a new scenario has nothing to review');
  const broken = addedScenarioEditWith(edit, 'load', 'several', isGuidelineId);
  assert.match(broken.error, /more than one patient/);
  assert.deepEqual(scenarioEditOff(edit, true), { kind: 'scenario', off: true, added });
  assert.deepEqual(scenarioEditOff({ ...edit, off: true }, false), edit);
});

test('learners see new scenarios after the written ones; deleted ones are gone', () => {
  const added = { ...readNewScenario(filledDraft(), [], guidelineIdOfNumber).value, id: 'new-one' };
  const other = { ...written, id: 'other' };
  const edits = {
    'scenario|other': scenarioEditDeleted(),
    'scenario|new-one': { kind: 'scenario', added },
    'scenario|hidden-new': { kind: 'scenario', off: true, added: { ...added, id: 'hidden-new' } },
    // A new one whose id the file has since taken: the file's scenario wins.
    'scenario|sample': { kind: 'scenario', added: { ...added, id: 'sample', title: 'Clash' } },
  };
  assert.deepEqual(
    liveScenarios([written, other], edits).map((scenario) => scenario.title),
    ['Sample', 'Fall at the Kāpiti marae'],
  );
  assert.deepEqual(scenarioEditDeleted(), { kind: 'scenario', deleted: true });
  assert.deepEqual(scenarioPathsToReview(other, scenarioEditDeleted()), []);
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

test('runs: competency-rated runs and the learner level are kept; older runs read as outcomes', () => {
  let record = parseScenarioRuns(
    JSON.stringify({ count: 1, runs: [{ at: 1, struggled: [], ratings: [3] }] }),
  );
  record = withScenarioRun(record, {
    at: 2,
    struggled: [],
    rated: 'competencies',
    ratings: [3, 2, null, null, null, 1],
    level: 'grad',
  });
  const [newer, older] = parseScenarioRuns(JSON.stringify(record)).runs;
  assert.equal(newer.rated, 'competencies');
  assert.equal(newer.level, 'grad');
  assert.equal(newer.score, 67);
  assert.equal(older.rated, 'outcomes', 'a run with no `rated` rated outcomes');
  assert.equal(older.level, '');
  assert.equal(record.runs[1].rated, undefined, 'an outcome run saves no `rated`');
  const bad = parseScenarioRuns(
    JSON.stringify({ runs: [{ at: 3, struggled: [], rated: 'x', level: 'chief' }] }),
  ).runs[0];
  assert.deepEqual([bad.rated, bad.level], ['outcomes', '']);
});

test('latest level: from the newest run that saved one, across scenarios', () => {
  const runs = (list) => ({ count: list.length, runs: list });
  assert.equal(latestLevel([]), '');
  assert.equal(
    latestLevel([
      runs([{ at: 5, level: '' }]),
      runs([
        { at: 4, level: 'paramedic' },
        { at: 1, level: 'student' },
      ]),
    ]),
    'paramedic',
  );
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
  const undifferentiated = progress.complexity.find((row) => row.key === '2');
  assert.deepEqual(undifferentiated, {
    key: '2',
    name: 'Undifferentiated presentation',
    total: 2,
    run: 2,
    average: 70,
  });
  const common = progress.complexity.find((row) => row.key === '1');
  assert.equal(common.average, null);
  assert.equal(progress.load.find((row) => row.key === 'delegation').average, 60);
});
