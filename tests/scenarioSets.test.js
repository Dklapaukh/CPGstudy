/*
 * Benchmark and "move on" sets (src/scenarioSets.js, SC-L): the drafted sets follow the owner's
 * table, the editors' change replaces a level's set, and the editor's box is read and checked.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SET_MIX,
  SCENARIO_SETS_EDIT_KIND,
  MAX_SET_SIZE,
  liveSets,
  setsEditWith,
  readSetBox,
  setWarnings,
  cleanSetsEdit,
} from '../src/scenarioSets.js';
import { filterScenarios } from '../src/scenarioLogic.js';
import { scenarioSets } from '../content/scenario-sets.js';
import { scenarios } from '../content/scenarios.js';
import { SCENARIO_LEVELS } from '../src/constants.js';

const byId = Object.fromEntries(scenarios.map((scenario) => [scenario.id, scenario]));
const allIds = scenarios.map((scenario) => scenario.id);

test('each drafted set has the presentation mix of the table, all ticked for its level', () => {
  assert.deepEqual(Object.keys(scenarioSets), Object.keys(SCENARIO_LEVELS));
  Object.entries(scenarioSets).forEach(([level, ids]) => {
    assert.ok(
      ids.every((id) => byId[id]),
      `${level}: every id is a scenario`,
    );
    assert.deepEqual(
      setWarnings(
        level,
        ids.map((id) => byId[id]),
      ),
      [],
      level,
    );
    assert.equal(
      ids.length,
      SET_MIX[level].reduce((sum, count) => sum + count, 0),
    );
  });
});

test('no scenario is in two drafted sets', () => {
  const ids = Object.values(scenarioSets).flat();
  assert.equal(new Set(ids).size, ids.length);
});

test('an editor’s set replaces that level only; scenarios no longer live drop out', () => {
  const edit = setsEditWith(null, 'student', ['long-lie', 'netball-ankle']);
  const live = liveSets(
    scenarioSets,
    edit,
    allIds.filter((id) => id !== 'netball-ankle'),
  );
  assert.deepEqual(live.student, ['long-lie']);
  assert.deepEqual(live.grad, scenarioSets.grad);
  assert.equal(setsEditWith(edit, 'student', null), null, 'back to the draft takes the edit out');
});

test('the box is read in order and refuses unknown ids, repeats and too many', () => {
  assert.deepEqual(readSetBox('long-lie\n netball-ankle, croup-2am', allIds).value, [
    'long-lie',
    'netball-ankle',
    'croup-2am',
  ]);
  assert.ok(readSetBox('long-lie\nno-such', allIds).error.includes('no-such'));
  assert.ok(readSetBox('long-lie\nlong-lie', allIds).error);
  assert.ok(readSetBox(allIds.slice(0, MAX_SET_SIZE + 1).join('\n'), allIds).error);
});

test('the notes name a different mix and a scenario not ticked for the level', () => {
  const warnings = setWarnings('student', [byId['in-the-cells']]);
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /Aims for 5 Common; this set has 1 Undifferentiated/);
  assert.match(warnings[1], /Not ticked for Student: In the cells/);
});

test('the daily copy keeps known levels and scenarios only', () => {
  const edit = { kind: SCENARIO_SETS_EDIT_KIND, sets: { boss: ['x'], grad: ['long-lie', 'no'] } };
  assert.deepEqual(
    cleanSetsEdit(edit, (id) => Boolean(byId[id])),
    {
      kind: SCENARIO_SETS_EDIT_KIND,
      sets: { grad: ['long-lie'] },
    },
  );
  assert.equal(
    cleanSetsEdit({ kind: 'scenario' }, () => true),
    null,
  );
});

test('the Benchmark set filter shows that set in its order, with the other filters', () => {
  const sets = { student: ['stroke-breakfast', 'netball-ankle'] };
  const shown = filterScenarios(scenarios, { set: 'student' }, () => '', sets);
  assert.deepEqual(
    shown.map((scenario) => scenario.id),
    ['stroke-breakfast', 'netball-ankle'],
  );
  assert.equal(filterScenarios(scenarios, { set: 'grad' }, () => '', sets).length, 0);
});
