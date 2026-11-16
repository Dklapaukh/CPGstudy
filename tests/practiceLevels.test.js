// Tests for the practice levels (ATP) of each medicine, read from guideline 1.1
// (src/practiceLevels.js), on small made-up tables and on the real content.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guidelineData } from '../content/guidelines.js';
import {
  practiceLevelOverrides,
  practiceLevelLineOverrides,
} from '../content/practice-level-overrides.js';
import {
  rowMedicineName,
  readPracticeLevelTable,
  rowsForMedicine,
  medicinePracticeLevels,
  ANY_ROUTE,
  textRoutes,
  rowGrant,
  medicineGrants,
  rsiLevels,
  answerLineRoutes,
  cardIndication,
  meetsLimit,
  cardForLevel,
  cardsForLevel,
  levelsLabel,
} from '../src/practiceLevels.js';
import { buildQuizCards } from '../src/quizCards.js';
import { blockText } from '../src/quizDoses.js';
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

/* ---------- Feature 11: routes and indication limits ---------- */

test('textRoutes finds route words; abbreviations only in capitals; an infusion is IV', () => {
  assert.deepEqual(textRoutes('0.625 mg IV/IM for an adult, once only.'), ['iv', 'im']);
  assert.deepEqual(textRoutes('Administer 5 mg of nebulised adrenaline'), ['nebulised']);
  assert.deepEqual(textRoutes('Administer as an infusion. Start at 2 drops/second'), ['iv']);
  assert.deepEqual(textRoutes('Place 1 mg in a bag; so it goes in.'), [], '"in" is not IN');
  assert.deepEqual(textRoutes('Inter-hospital transfer for SCR'), [], 'SCR is not SC');
});

test('rowGrant reads the routes and the "(… only)" limits of a 1.1 row', () => {
  assert.deepEqual(rowGrant('Adrenaline IN, IM, nebulised and topical'), {
    routes: ['in', 'im', 'nebulised', 'topical'],
    limits: [],
  });
  assert.deepEqual(rowGrant('Adrenaline (all routes)'), { routes: ANY_ROUTE, limits: [] });
  assert.deepEqual(rowGrant('Amiodarone IV (cardiac arrest only)'), {
    routes: ['iv'],
    limits: ['cardiac arrest'],
  });
  assert.deepEqual(
    rowGrant(
      'Midazolam IM (seizures, acute behavioural disturbance and care during last days of life only)',
    ).limits,
    ['seizures', 'acute behavioural disturbance', 'care during last days of life'],
  );
});

const bullet = (text, level) => ['b', text, level, '#000'];

test('answerLineRoutes gives a line with no route the route of the line it belongs to', () => {
  const routes = answerLineRoutes([
    bullet('Administer adrenaline if the patient is showing signs:', 1),
    bullet('Administer 0.5 mg IM for an adult.', 2),
    bullet('Administer adrenaline IV:', 1),
    ['p', 'Adrenaline for an adult:', 1],
    bullet('Place 1 mg of adrenaline into a 1 litre bag:', 2),
    bullet('Start at 2 drops/second, or', 3),
    bullet('If not responding, escalate the dose:', 1),
  ]);
  assert.deepEqual(routes[0], ['im'], 'from the lines under it');
  assert.deepEqual(routes[3], ['iv'], 'no line above or under names a route: the line before');
  assert.deepEqual(routes[4], ['iv'], 'from the line it sits under');
  assert.deepEqual(routes[5], ['iv']);
  assert.deepEqual(routes[6], ['iv'], 'from the line before');
  assert.deepEqual(answerLineRoutes([bullet('300 mg.', 1)]), [[]], 'no route words at all');
});

test('cardIndication is the middle of the prompt, or the first answer line', () => {
  const answerBlocks = [bullet('For significant movement during CPR administer 1 mg/kg.', 1)];
  assert.equal(
    cardIndication({ prompt: 'Adrenaline – Cardiac Arrest – Dose', answerBlocks }),
    'Cardiac Arrest',
  );
  assert.match(cardIndication({ prompt: 'Ketamine – Other dose', answerBlocks }), /movement/);
});

test('meetsLimit needs most of the words of the limit', () => {
  assert.ok(meetsLimit('Care During the Last Days of Life', 'care during last days of life'));
  assert.ok(meetsLimit('For analgesia', 'analgesia'));
  assert.ok(!meetsLimit('Tachydysrhythmia in an adult', 'cardiac arrest'));
  assert.ok(!meetsLimit('Cardiac arrest', ''), 'an empty limit is met by nothing');
});

test('levelsLabel joins levels with commas and "and"', () => {
  assert.equal(levelsLabel(['CCP']), 'CCP');
  assert.equal(levelsLabel(['ICP', 'CCP']), 'ICP and CCP');
  assert.equal(levelsLabel(['Paramedic', 'ICP', 'CCP']), 'Paramedic, ICP and CCP');
});

test('cardForLevel uses a line override and drops a route the table never names', () => {
  const grantsByMedicine = {
    m: { EMT: [{ routes: ['sc'], limits: [] }], ICP: [{ routes: ['sc', 'im'], limits: [] }] },
  };
  const card = {
    id: 'm|dose-1',
    medicineId: 'm',
    isDose: true,
    prompt: 'Medicine – Dose',
    answerBlocks: [bullet('5 mg SC.', 1), bullet('5 mg IM.', 1), bullet('1 mg IV.', 1)],
  };
  const access = { grantsByMedicine, rsiLevels: ['ICP'], lineOverrides: {} };
  const emtCard = cardForLevel(card, 'EMT', access);
  assert.deepEqual(emtCard.otherLevelLines, [null, ['ICP'], null], 'IV is unknown: not hidden');
  assert.equal(emtCard.id, card.id, 'same id, so the same schedule');
  assert.equal(cardForLevel(card, 'ICP', access), card, 'every line allowed: the card itself');
  access.lineOverrides = { 'm|dose-1': [{ lineStart: '1 mg IV', levels: ['ICP'] }] };
  assert.deepEqual(cardForLevel(card, 'EMT', access).otherLevelLines, [null, ['ICP'], ['ICP']]);
  assert.equal(cardForLevel({ ...card, isRsi: true }, 'EMT', access), null, 'RSI: ICP only here');
});

// The real content: the six medicines of plan 8.6 and the two hand-made line corrections.
const realCards = buildQuizCards(guidelineData.sections, QUIZ_SECTION_NAME);
const realAccess = {
  grantsByMedicine: medicineGrants(medicines, atpTable, practiceLevelOverrides),
  rsiLevels: rsiLevels(atpTable),
  lineOverrides: practiceLevelLineOverrides,
};
const promptsFor = (level, medicineName) =>
  cardsForLevel(realCards, level, realAccess)
    .filter((card) => card.isDose && card.prompt.startsWith(`${medicineName} – `))
    .map((card) => card.prompt.split(' – ')[1]);
const cardFor = (level, prompt) =>
  cardsForLevel(realCards, level, realAccess).find((card) => card.prompt === prompt);
const greyedTexts = (card) =>
  card.answerBlocks.filter((block, index) => card.otherLevelLines[index]).map(blockText);

test('real 1.1 table: grants per level for Adrenaline and Midazolam; RSI is CCP only', () => {
  const adrenaline = realAccess.grantsByMedicine['cpg-14-3'];
  assert.deepEqual(adrenaline.EMT, [{ routes: ['in', 'im', 'nebulised', 'topical'], limits: [] }]);
  assert.deepEqual(adrenaline.Paramedic[1], { routes: ['iv'], limits: ['cardiac arrest'] });
  assert.equal(adrenaline.ICP[2].routes, ANY_ROUTE);
  const midazolam = realAccess.grantsByMedicine['cpg-14-31'];
  assert.deepEqual(midazolam.EMT, []);
  assert.deepEqual(midazolam.Paramedic[1].limits, ['seizures', 'care during last days of life']);
  assert.deepEqual(realAccess.rsiLevels, ['CCP']);
});

test('real cards: an EMT studies only the adrenaline doses an EMT may give', () => {
  assert.deepEqual(promptsFor('EMT', 'Adrenaline'), [
    'Exacerbation of Asthma',
    'Stridor',
    'Bleeding following Trauma',
    'Inter-hospital Transfer for SCR (Stroke Clot Retrieval)',
    'Anaphylaxis',
    'Epistaxis',
  ]);
  const asthma = cardFor('EMT', 'Adrenaline – Exacerbation of Asthma – Dose');
  const levelsOfLines = asthma.otherLevelLines.map((levels) => levels && levels.join(' '));
  const icpOnly = 'ICP CCP';
  assert.deepEqual(levelsOfLines, [null, null, ...Array(6).fill(icpOnly), null]);
  const anaphylaxis = cardFor('EMT', 'Adrenaline – Anaphylaxis – Dose');
  assert.match(greyedTexts(anaphylaxis)[0], /^Administer adrenaline IV if/, 'line override');
  assert.equal(promptsFor('ICP', 'Adrenaline').length, 15, 'every card for an ICP');
});

test('real cards: Paramedic limits for Adrenaline, Amiodarone, Ketamine and Midazolam', () => {
  assert.ok(promptsFor('Paramedic', 'Adrenaline').includes('Cardiac Arrest'));
  assert.ok(!promptsFor('EMT', 'Adrenaline').includes('Cardiac Arrest'));
  assert.ok(!promptsFor('Paramedic', 'Adrenaline').includes('Bradycardia'));
  assert.deepEqual(promptsFor('Paramedic', 'Amiodarone'), ['Cardiac arrest']);
  assert.deepEqual(promptsFor('Paramedic', 'Ketamine'), ['For analgesia']);
  assert.deepEqual(promptsFor('Paramedic', 'Midazolam'), [
    'Care During the Last Days of Life',
    'Seizures',
    'Acute Behavioural Disturbance',
  ]);
  const disturbance = cardFor('Paramedic', 'Midazolam – Acute Behavioural Disturbance – Dose');
  assert.equal(greyedTexts(disturbance).length, 3, 'the IV lines: IV is not for this indication');
  assert.ok(greyedTexts(disturbance).every((text) => !/\bIM\b/.test(text)));
});

test('real cards: Ondansetron IV greyed for an EMT; RSI rows for a CCP only; topics whole', () => {
  const ondansetron = cardFor('EMT', 'Ondansetron – Dose');
  assert.deepEqual(
    ondansetron.otherLevelLines.map((levels) => Boolean(levels)),
    [true, false, false, true],
  );
  assert.equal(cardFor('Paramedic', 'Ondansetron – Dose').otherLevelLines, undefined);
  const rsiPrompts = (level) =>
    cardsForLevel(realCards, level, realAccess).filter((card) => card.isRsi).length;
  assert.equal(rsiPrompts('ICP'), 0);
  assert.equal(rsiPrompts('CCP'), realCards.filter((card) => card.isRsi).length);
  const topicCount = (cards) => cards.filter((card) => !card.isDose).length;
  const emtMedicines = medicines.filter((medicine) => levelsOf(medicine.t).includes('EMT'));
  const emtTopicCards = realCards.filter(
    (card) => !card.isDose && emtMedicines.some((medicine) => medicine.id === card.medicineId),
  );
  assert.equal(topicCount(cardsForLevel(realCards, 'EMT', realAccess)), emtTopicCards.length);
  assert.equal(cardsForLevel(realCards, 'CCP', realAccess).length, realCards.length);
});

test('every line override names a real card and a real line of it', () => {
  for (const [cardId, entries] of Object.entries(practiceLevelLineOverrides)) {
    const card = realCards.find((candidate) => candidate.id === cardId);
    assert.ok(card, `override card "${cardId}" not found`);
    for (const entry of entries) {
      assert.ok(
        card.answerBlocks.some((block) => blockText(block).startsWith(entry.lineStart)),
        `override line "${entry.lineStart}" not in ${cardId}`,
      );
      assert.ok(entry.levels.every((level) => atpTable.levels.includes(level)));
    }
  }
});
