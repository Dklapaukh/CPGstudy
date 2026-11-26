// Tests for the Add a scenario form's pure logic (src/scenarioSubmission.js) and the daily copy
// of approved jobs' photos (photosToPublish in scripts/sync-edits.js), and a job turned into a new
// scenario on the editor page (scenarioEdits.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  emptyPatient,
  tidySubmission,
  missingFields,
  identifierWarnings,
  guidelineIdFromText,
  guidelineMatches,
  scenarioFromSubmission,
  photoName,
  scaledSize,
  base64OfDataUrl,
} from '../src/scenarioSubmission.js';
import { guidelines } from '../src/guidelines.js';
import { photosToPublish } from '../scripts/sync-edits.js';
import { scenarioEdits } from '../content/scenario-edits.js';
import { scenarioDraftOf, readNewScenario, cleanAddedScenario } from '../src/scenarioEdits.js';

const realId = guidelines[0].id;
const isRealId = (id) => guidelines.some((guideline) => guideline.id === id);

/** A complete job, as the form sends it, with `changes` on top. */
const fullJob = (changes = {}) => ({
  title: 'Chest pain',
  story: 'A 58-year-old man with chest pain.',
  complexity: 2,
  intention: 'Spot a STEMI',
  guidelines: [realId],
  outcomes: ['Does a 12-lead within 10 minutes'],
  patients: [emptyPatient()],
  ...changes,
});

test('tidySubmission: trims, cuts to length and keeps only known keys and values', () => {
  const job = tidySubmission(
    {
      title: '  Chest   pain ',
      story: 'x'.repeat(2500),
      complexity: '9',
      load: 'several',
      rural: true,
      guidelines: [realId, realId, 'cpg-99-99'],
      outcomes: [' Gives aspirin ', '', 'x'.repeat(300)],
      patients: [
        {
          history: ' AF ',
          name: 'dropped',
          vitalSets: [{ note: ' On arrival ', vitals: { hr: ' 140 ', made: 'up' } }],
        },
      ],
    },
    isRealId,
  );
  assert.equal(job.title, 'Chest pain');
  assert.equal(job.story.length, 900);
  assert.equal(job.complexity, 0);
  assert.equal(job.load, 'single');
  assert.equal('rural' in job, false);
  assert.deepEqual(job.guidelines, [realId]);
  assert.deepEqual(
    job.outcomes.map((point) => point.length),
    [13, 200],
  );
  const [patient] = job.patients;
  assert.equal(patient.history, 'AF');
  assert.equal('name' in patient, false);
  assert.deepEqual(patient.vitalSets[0].note, 'On arrival');
  assert.equal(patient.vitalSets[0].vitals.hr, '140');
  assert.equal('made' in patient.vitalSets[0].vitals, false);
  assert.equal(tidySubmission({ complexity: '3', load: 'delegation' }).complexity, 3);
  assert.equal(tidySubmission({ load: 'delegation' }).load, 'delegation');
});

test('tidySubmission: a job always has a patient, and a patient a full set of vitals', () => {
  const job = tidySubmission({ patients: [{ vitalSets: [] }] });
  assert.equal(job.patients.length, 1);
  assert.equal(job.patients[0].vitalSets.length, 1);
  assert.deepEqual(Object.keys(job.patients[0].vitalSets[0].vitals), [
    'gcs',
    'rr',
    'spo2',
    'hr',
    'bp',
    'temp',
    'bgl',
    'pain',
  ]);
});

test('missingFields: title, history, a guideline and the learning points; editors set the rest', () => {
  assert.deepEqual(missingFields(tidySubmission({})), [
    'a short title',
    'the history',
    'at least one guideline',
    'the learning points',
  ]);
  const { complexity, outcomes, ...withoutEditorFields } = fullJob();
  assert.ok(complexity && outcomes);
  assert.deepEqual(missingFields(tidySubmission(withoutEditorFields)), []);
});

test('scenarioFromSubmission: dispatch notes, history, assessment and follow up make the story; no outcomes get a placeholder', () => {
  const scenario = scenarioFromSubmission(
    fullJob({
      dispatch: 'Chest pain, 58M',
      assessment: 'Inferior STEMI',
      followUp: 'Stented in the cath lab',
      outcomes: [],
    }),
    'job-3',
  );
  assert.equal(
    scenario.story,
    'Dispatch: Chest pain, 58M\n\nA 58-year-old man with chest pain.\n\nAssessment: Inferior STEMI\n\nFollow up: Stented in the cath lab',
  );
  assert.deepEqual(scenario.outcomes, ['Not given']);
  assert.equal(scenarioFromSubmission(fullJob(), 'job-4').story, fullJob().story);
});

test('guidelineMatches: numbers starting with the search first, then every word in the name', () => {
  const [first] = guidelines;
  assert.equal(guidelineMatches(first.n, guidelines)[0].id, first.id);
  assert.equal(guidelineMatches(`CPG ${first.n}`, guidelines)[0].id, first.id);
  const word = first.t.split(' ')[0].toLowerCase();
  assert.ok(guidelineMatches(word, guidelines).some((each) => each.id === first.id));
  assert.ok(guidelineMatches('a', guidelines).length <= 6);
  assert.deepEqual(guidelineMatches('  ', guidelines), []);
  assert.deepEqual(guidelineMatches('zzqx', guidelines), []);
});

test('identifierWarnings: NHI, dates, phones, emails, streets and titled names, in any box', () => {
  const job = tidySubmission({
    story: 'Mrs Smith, NHI ABC1234, at 12 Rata Street, called 021 555 1234 on 3/11/2026.',
    outcomes: ['Emails gp@clinic.nz'],
    patients: [
      { social: 'Lives alone' },
      { treatment: 'New NHI ZZZ00AA', vitalSets: [{ note: 'DOB 1950' }] },
    ],
  });
  assert.deepEqual(identifierWarnings(job), [
    'History: an NHI number',
    'History: a date',
    'History: a phone number',
    'History: a street address',
    'History: a name',
    'Patient 2, Treatment and response: an NHI number',
    'Patient 2, Vitals note: a date',
    'Debrief point 1: an email address',
  ]);
});

test('identifierWarnings: ordinary clinical text is not flagged', () => {
  const job = tidySubmission({
    suburb: 'Lower Hutt',
    story: '72-year-old man, BP 160/95, SpO2 94%, GCS 14, 12-lead shows STE in II, III, aVF.',
    patients: [
      {
        medications: 'Metoprolol 47.5 mg, dabigatran 110 mg',
        treatment: 'Aspirin 300 mg, GTN 400 mcg, 2 x 18G IV. Transport 25 min to Hutt Hospital.',
        vitalSets: [{ note: '5 min after GTN', vitals: { bp: '90/60' } }],
      },
    ],
  });
  assert.deepEqual(identifierWarnings(job), []);
});

test('guidelineIdFromText: a CPG number, the picker text or the title; nothing else', () => {
  const [first] = guidelines;
  assert.equal(guidelineIdFromText(first.n, guidelines), first.id);
  assert.equal(guidelineIdFromText(` CPG ${first.n} `, guidelines), first.id);
  assert.equal(guidelineIdFromText(`${first.n} ${first.t}`.toUpperCase(), guidelines), first.id);
  assert.equal(guidelineIdFromText(first.t, guidelines), first.id);
  assert.equal(guidelineIdFromText('99.99', guidelines), '');
  assert.equal(guidelineIdFromText('', guidelines), '');
});

test('scenarioFromSubmission: a scenario like a hand-written one, with later vitals and photos', () => {
  const patient = {
    ...emptyPatient(),
    history: 'AF',
    vitalSets: [
      { note: 'On arrival', vitals: { hr: '140' } },
      { note: 'After fluids', vitals: { hr: '110' } },
    ],
    treatment: '500 mL saline',
  };
  const photos = [{ src: 'content/scenario-photos/job-1-1.jpg', caption: '12-lead' }];
  const scenario = scenarioFromSubmission(fullJob({ patients: [patient] }), 'job-1', photos);
  assert.equal(scenario.load, 'single');
  assert.equal(scenario.suburb, 'Wellington region');
  assert.equal(scenario.patients[0].medications, 'Not given');
  assert.equal(scenario.patients[0].vitals.hr, '140');
  assert.equal(scenario.patients[0].vitals.bp, '–');
  assert.equal(scenario.patients[0].vitalsNote, 'On arrival');
  assert.deepEqual(
    scenario.patients[0].laterVitals.map((set) => set.note),
    ['After fluids'],
  );
  assert.equal(scenario.patients[0].treatment, '500 mL saline');
  assert.deepEqual(scenario.photos, photos);
  const two = scenarioFromSubmission(fullJob({ patients: [patient, emptyPatient()] }), 'job-2');
  assert.equal(two.load, 'several');
  assert.deepEqual(
    two.patients.map((each) => each.label),
    ['Patient 1', 'Patient 2'],
  );
  assert.equal('photos' in two, false);
});

test('a job becomes a whole new scenario through the editor form, extras and photos kept', () => {
  const patient = {
    ...emptyPatient(),
    vitalSets: [
      { note: 'On arrival', vitals: { hr: '140' } },
      { note: 'After fluids', vitals: { hr: '110' } },
    ],
    treatment: '500 mL saline',
  };
  const photos = [{ src: `content/scenario-photos/${photoName('job-x', 0)}`, caption: 'ECG' }];
  const scenario = scenarioFromSubmission(fullJob({ patients: [patient] }), 'job', photos);
  const numberOf = (id) => guidelines.find((guideline) => guideline.id === id).n;
  const idOf = (number) => guidelines.find((guideline) => guideline.n === number)?.id;
  const draft = scenarioDraftOf(scenario, numberOf);
  assert.equal(draft.guidelines, guidelines[0].n);
  draft.patients[0].laterVitals[0].note = 'After 500 mL';
  draft.photos[0].caption = '12-lead';
  const read = readNewScenario(draft, ['chest-pain'], idOf);
  assert.equal(read.value.id, 'chest-pain-2');
  const [read0] = read.value.patients;
  assert.equal(read0.vitalsNote, 'On arrival');
  assert.deepEqual(read0.laterVitals[0].note, 'After 500 mL');
  assert.equal(read0.laterVitals[0].vitals.hr, '110');
  assert.equal(read0.treatment, '500 mL saline');
  assert.deepEqual(read.value.photos, [{ src: photos[0].src, caption: '12-lead' }]);

  draft.patients[0].laterVitals[0].vitals.bp = '';
  assert.equal(readNewScenario(draft, [], idOf).path, 'patients.0.laterVitals.0.vitals.bp');
});

test('cleanAddedScenario: only photos the daily copy publishes, and well-formed extras', () => {
  const scenario = scenarioFromSubmission(fullJob(), 'job', []);
  const clean = (changes) => cleanAddedScenario({ ...scenario, ...changes }, 'x', () => true);
  assert.ok(clean({}));
  assert.equal('photos' in clean({}), false);
  assert.ok(clean({ photos: [{ src: 'content/scenario-photos/job-1-1.jpg', caption: '' }] }));
  assert.equal(clean({ photos: [{ src: 'https://example.com/x.jpg' }] }), null);
  assert.equal(clean({ photos: [{ src: 'content/scenario-photos/../x.jpg' }] }), null);
  const withLater = (laterVitals) =>
    clean({ patients: [{ ...scenario.patients[0], laterVitals }] });
  assert.equal(
    withLater([{ note: 'x', vitals: { hr: '1' } }]),
    null,
    'every later vital is needed',
  );
  assert.equal(withLater('not a list'), null);
});

test('photosToPublish: only photos a new scenario shows, named by job and number', () => {
  const edits = {
    'scenario|chest-pain': {
      kind: 'scenario',
      added: { photos: [{ src: 'content/scenario-photos/job-1-2.jpg', caption: '' }] },
    },
    'scenario|other': { kind: 'scenario', fields: {} },
  };
  const submissions = [
    { id: 'job-1', photos: [{ data: 'AAAA' }, { data: 'QUJD' }] },
    { id: 'job-2', photos: [{ data: 'AAAA' }] },
  ];
  assert.deepEqual(photosToPublish(submissions, edits), [{ name: 'job-1-2.jpg', data: 'QUJD' }]);
  assert.equal(photoName('job/../x', 0), 'jobx-1.jpg');
});

test('every photo a published new scenario shows is in the repository', () => {
  Object.values(scenarioEdits).forEach((edit) =>
    (edit.added?.photos || []).forEach((photo) => assert.ok(existsSync(photo.src), photo.src)),
  );
});

test('scaledSize: fits the longest side and never makes a photo bigger', () => {
  assert.deepEqual(scaledSize(4000, 3000, 1600), { width: 1600, height: 1200 });
  assert.deepEqual(scaledSize(3000, 4000, 1600), { width: 1200, height: 1600 });
  assert.deepEqual(scaledSize(800, 600, 1600), { width: 800, height: 600 });
});

test('base64OfDataUrl: the part after the comma', () => {
  assert.equal(base64OfDataUrl('data:image/jpeg;base64,QUJD'), 'QUJD');
});

test('the story parts at their longest fit a scenario story', () => {
  const long = (max) => 'x'.repeat(max);
  const job = fullJob({
    dispatch: long(2000),
    story: long(2000),
    assessment: long(2000),
    followUp: long(2000),
  });
  assert.ok(scenarioFromSubmission(job, 'job-5').story.length <= 2000);
});
