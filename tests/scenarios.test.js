/*
 * Checks the hand-written scenarios in content/scenarios.js: unique ids, a known level, real
 * guidelines, every vital, and a label on each patient when there are several.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenarios } from '../content/scenarios.js';
import { guidelineData } from '../content/guidelines.js';
import { SCENARIO_LEVELS, SCENARIO_VITALS } from '../src/constants.js';

const guidelineIds = new Set(
  Object.values(guidelineData)
    .flat()
    .flatMap((section) => section.items || [])
    .map((item) => item.id),
);
const TEXT_FIELDS = ['title', 'suburb', 'story', 'intention'];
const PATIENT_FIELDS = ['history', 'medications', 'allergies', 'social'];

test('scenario ids are unique and safe in an address', () => {
  const ids = scenarios.map((scenario) => scenario.id);
  assert.equal(new Set(ids).size, ids.length);
  ids.forEach((id) => assert.match(id, /^[a-z0-9-]+$/));
});

test('every scenario has its text, a level and real guidelines', () => {
  scenarios.forEach((scenario) => {
    TEXT_FIELDS.forEach((field) => assert.ok(scenario[field], `${scenario.id} ${field}`));
    assert.ok(SCENARIO_LEVELS[scenario.level], `${scenario.id} level`);
    assert.ok(scenario.guidelines.length > 0);
    scenario.guidelines.forEach((id) => assert.ok(guidelineIds.has(id), `${scenario.id} ${id}`));
  });
});

test('every patient has a background and all eight vitals', () => {
  scenarios.forEach((scenario) => {
    assert.ok(scenario.patients.length > 0);
    scenario.patients.forEach((patient) => {
      PATIENT_FIELDS.forEach((field) => assert.ok(patient[field], `${scenario.id} ${field}`));
      SCENARIO_VITALS.forEach(([key]) => assert.ok(patient.vitals[key], `${scenario.id} ${key}`));
      if (scenario.patients.length > 1) assert.ok(patient.label, `${scenario.id} patient label`);
    });
  });
});
