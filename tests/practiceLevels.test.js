// Tests for the practice levels (ATP) of each medicine, read from guideline 1.1
// (src/practiceLevels.js), on small made-up tables and on the real content.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guidelineData } from '../content/guidelines.js';
import { practiceLevelOverrides } from '../content/practice-level-overrides.js';
import {
  rowMedicineName,
  readPracticeLevelTable,
  rowsForMedicine,
  medicinePracticeLevels,
} from '../src/practiceLevels.js';
import { ATP_GUIDELINE_ID, QUIZ_SECTION_NAME } from '../src/constants.js';

const cell = (text) => ({ t: text, bg: null, w: false });
const row = (name, ...ticks) => [cell(name), ...ticks.map((tick) => cell(tick ? '✔' : ''))];

// A made-up 1.1 guideline: the header in the first table, more rows in a second table.
const fakeAtpGuideline = {
  b: [
    ['p', 'Intro', 0],
    [
      'tbl',
      [
        [cell('<b>Skill</b>'), cell('<b>EMT</b>'), cell('<b>Paramedic</b>'), cell('<b>ICP</b>')],
        row('Aspirin PO', 1, 1, 1),
        row('IV cannulation', 0, 1, 1),
      ],
    ],
    ['tbl', [row('Magnesium IV', 0, 0, 1), row('0.9% sodium chloride IV', 0, 1, 1)]],
  ],
};

test('rowMedicineName takes the words before the first route or bracket', () => {
  assert.deepEqual(rowMedicineName('1% lignocaine IO and SC'), ['lignocaine']);
  assert.deepEqual(rowMedicineName('Adrenaline (all routes)'), ['adrenaline']);
  assert.deepEqual(rowMedicineName('8.4 % sodium bicarbonate IV'), ['sodium', 'bicarbonate']);
  assert.deepEqual(rowMedicineName('Salbutamol MDI and nebulised'), ['salbutamol']);
  assert.deepEqual(rowMedicineName('IV cannulation'), [], 'a skill, not a medicine');
});

test('readPracticeLevelTable reads the levels from the header and ticks from every table', () => {
  const table = readPracticeLevelTable(fakeAtpGuideline);
  assert.deepEqual(table.levels, ['EMT', 'Paramedic', 'ICP']);
  assert.equal(table.rows.length, 4);
  assert.deepEqual(table.rows[2], { name: 'Magnesium IV', levels: ['ICP'] });
  assert.deepEqual(readPracticeLevelTable({ b: [] }), { levels: [], rows: [] });
});

test('rowsForMedicine needs every word of the row name in the title', () => {
  const { rows } = readPracticeLevelTable(fakeAtpGuideline);
  const names = (title) => rowsForMedicine(title, rows).map((match) => match.name);
  assert.deepEqual(names('Magnesium Sulphate'), ['Magnesium IV']);
  assert.deepEqual(names('Sodium Bicarbonate 8.4%'), [], 'sodium chloride is not bicarbonate');
  assert.deepEqual(names('Aspirin'), ['Aspirin PO']);
});

test('medicinePracticeLevels joins the levels of all rows; no rows or [] means every level', () => {
  const table = readPracticeLevelTable(fakeAtpGuideline);
  const medicines = [
    { id: 'a', t: 'Aspirin' },
    { id: 'm', t: 'Magnesium Sulphate' },
    { id: 'x', t: 'Unknown Medicine' },
    { id: 'o', t: 'Aspirin' },
  ];
  const levels = medicinePracticeLevels(medicines, table, { o: ['Magnesium IV'] });
  assert.deepEqual(levels, {
    a: ['EMT', 'Paramedic', 'ICP'],
    m: ['ICP'],
    x: ['EMT', 'Paramedic', 'ICP'],
    o: ['ICP'],
  });
});

// The real content: every medicine must be found in the 1.1 table (or be listed in the
// overrides), so the filter never falls back to "every level" without anyone noticing.
const allGuidelines = guidelineData.sections.flatMap((section) => section.items);
const atpTable = readPracticeLevelTable(allGuidelines.find((g) => g.id === ATP_GUIDELINE_ID));
const medicines = guidelineData.sections.find((s) => s.name === QUIZ_SECTION_NAME).items;
const realLevels = medicinePracticeLevels(medicines, atpTable, practiceLevelOverrides);
const levelsOf = (title) => realLevels[medicines.find((medicine) => medicine.t === title).id];

test('the 1.1 table has the four practice levels', () => {
  assert.deepEqual(atpTable.levels, ['EMT', 'Paramedic', 'ICP', 'CCP']);
});

test('every medicine guideline matches a 1.1 row or has an override', () => {
  const overview = medicines[0]; // "Medicines" introduction page, not a medicine
  for (const medicine of medicines.slice(1)) {
    const matched = rowsForMedicine(medicine.t, atpTable.rows).length > 0;
    assert.ok(matched || practiceLevelOverrides[medicine.id], `${medicine.t} not in 1.1`);
  }
  assert.equal(overview.t, 'Medicines');
  for (const name of Object.values(practiceLevelOverrides).flat()) {
    assert.ok(
      atpTable.rows.some((r) => r.name === name),
      `override row "${name}" not in 1.1`,
    );
  }
});

test('real medicines get the lowest level that may give them, and every level above', () => {
  assert.deepEqual(levelsOf('Aspirin'), ['EMT', 'Paramedic', 'ICP', 'CCP']);
  assert.deepEqual(levelsOf('Adrenaline'), ['EMT', 'Paramedic', 'ICP', 'CCP']);
  assert.deepEqual(levelsOf('Fentanyl'), ['Paramedic', 'ICP', 'CCP']);
  assert.deepEqual(levelsOf('Magnesium Sulphate'), ['ICP', 'CCP']);
  assert.deepEqual(levelsOf('Sodium Bicarbonate 8.4%'), ['ICP', 'CCP']);
  assert.deepEqual(levelsOf('Suxamethonium'), ['CCP']);
  assert.deepEqual(levelsOf('GTN (Glyceryl Trinitrate) IV'), ['CCP']);
  assert.deepEqual(levelsOf('GTN (Glyceryl Trinitrate) Spray'), ['EMT', 'Paramedic', 'ICP', 'CCP']);
  assert.deepEqual(levelsOf('Glucose Gel'), ['EMT', 'Paramedic', 'ICP', 'CCP']);
});
