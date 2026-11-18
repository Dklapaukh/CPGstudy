/*
 * Add a scenario (submit.html), pure logic: the form's fields, tidying what was typed, what is
 * still missing, a check for anything that looks like it identifies the patient, reading a
 * typed guideline, and turning an approved job into a scenario (as in content/scenarios.js).
 * Used by the form, the editor page and scripts/sync-edits.js.
 * Depends on constants.js and scenarioEdits.js. Tested in tests/scenarioSubmission.test.js.
 */
import { SCENARIO_VITALS, SCENARIO_COMPLEXITY, SUBMISSION_LIMITS } from './constants.js';
import { MAX_OUTCOMES, MAX_OUTCOME_TEXT } from './scenarioEdits.js';

// The opening boxes, in the order shown. `max` is the most characters kept; `lines` > 1 is a
// text area. The suburb is optional: it can be changed or made up to protect the patient.
export const JOB_FIELDS = [
  {
    key: 'title',
    label: 'Short title',
    hint: 'e.g. Fall at the rest home',
    max: 80,
    lines: 1,
    required: true,
  },
  {
    key: 'suburb',
    label: 'Suburb (optional)',
    hint: 'Change it or make one up if it could identify the patient',
    max: 60,
    lines: 1,
  },
  {
    key: 'story',
    label: 'History',
    hint: 'The dispatch and what you found on arrival. Age and sex are fine; no names.',
    max: 2000,
    lines: 5,
    required: true,
  },
];
// The teaching boxes at the end of the form. Debrief points become the intended outcomes.
export const INTENTION_FIELD = {
  key: 'intention',
  label: 'What could it teach?',
  hint: 'e.g. Spotting an inferior STEMI and giving fluids before GTN',
  max: 1000,
  lines: 3,
  required: true,
};
export const NAME_FIELD = {
  key: 'name',
  label: 'Your name (optional)',
  hint: 'So an editor can ask you about it',
  max: 60,
  lines: 1,
};
// One patient's boxes, as in content/scenarios.js, plus what was done after the vitals.
export const PATIENT_FIELDS = [
  { key: 'history', label: 'Medical history', max: 500, lines: 2 },
  { key: 'medications', label: 'Medications', max: 500, lines: 2 },
  { key: 'allergies', label: 'Allergies', max: 200, lines: 1 },
  { key: 'social', label: 'Social history', max: 500, lines: 2 },
];
export const TREATMENT_FIELD = {
  key: 'treatment',
  label: 'Treatment and response',
  hint: 'What was done, how they responded, transport and outcome',
  max: 2000,
  lines: 4,
};
export const SCENE_LOADS = [
  ['single', 'Single patient'],
  ['delegation', 'Delegation (more tasks than one person can do)'],
];
const MAX_LABEL = 40;
const MAX_NOTE = 80;
const MAX_VITAL = 20;
const NOT_GIVEN = 'Not given';
const NO_VITAL = '–';
const NO_SUBURB = 'Wellington region';

// Patterns that suggest the patient could be identified, with what to call each one. They only
// warn: the sender can still send after checking (a "date" may be a drug's expiry, say).
const IDENTIFIER_PATTERNS = [
  {
    name: 'an NHI number',
    pattern: /\b[A-HJ-NP-Z]{3}\d{4}\b|\b[A-HJ-NP-Z]{3}\d{2}[A-HJ-NP-Z]{2}\b/i,
  },
  { name: 'a date', pattern: /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b|\bD\.?O\.?B\b/i },
  { name: 'a phone number', pattern: /(?:\+64|\b0)[2-9][\d -]{6,10}\d\b/ },
  { name: 'an email address', pattern: /\S+@\S+\.\S+/ },
  {
    name: 'a street address',
    pattern:
      /\b\d+[a-z]?\s+(?:[A-Z][a-z]+\s+){1,2}(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Place|Pl|Crescent|Cres|Terrace|Tce|Lane|Way|Grove|Close|Parade|Highway|Hwy)\b/,
  },
  { name: 'a name', pattern: /\b(?:Mr|Mrs|Ms|Miss|Dr)\.?\s+[A-Z][a-z]+/ },
];

/** A set of vitals with every box empty, and its note ("On arrival", "After GTN"). */
export function emptyVitalSet() {
  return { note: '', vitals: Object.fromEntries(SCENARIO_VITALS.map(([key]) => [key, ''])) };
}

/** A patient with every box empty and one set of vitals. */
export function emptyPatient() {
  const patient = Object.fromEntries(PATIENT_FIELDS.map((field) => [field.key, '']));
  return { label: '', ...patient, vitalSets: [emptyVitalSet()], treatment: '' };
}

/** The text trimmed, with runs of spaces and tabs made one space, cut to `max` characters. */
function tidy(value, max) {
  return String(value ?? '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max);
}

/** A list from `raw` (or [] when it isn't one), cut to `most` items. */
const listOf = (raw, most) => (Array.isArray(raw) ? raw.slice(0, most) : []);

/** One set of vitals tidied: its note and every vital, nothing else. */
function tidyVitalSet(set = {}) {
  const vitals = set.vitals || {};
  return {
    note: tidy(set.note, MAX_NOTE),
    vitals: Object.fromEntries(SCENARIO_VITALS.map(([key]) => [key, tidy(vitals[key], MAX_VITAL)])),
  };
}

/** One patient tidied: every box, at least one set of vitals, nothing else. */
function tidyPatient(patient = {}) {
  const sets = listOf(patient.vitalSets, SUBMISSION_LIMITS.VITAL_SETS);
  return {
    label: tidy(patient.label, MAX_LABEL),
    ...Object.fromEntries(
      PATIENT_FIELDS.map((field) => [field.key, tidy(patient[field.key], field.max)]),
    ),
    vitalSets: (sets.length ? sets : [{}]).map(tidyVitalSet),
    treatment: tidy(patient.treatment, TREATMENT_FIELD.max),
  };
}

/**
 * The job as it is sent: the text boxes, `complexity` (1 to 3, or 0 when not chosen), `load`
 * ('single' or 'delegation'; several patients is worked out from the patients), the patients,
 * the guideline ids that `isGuidelineId` accepts (no repeats), and the debrief points, all
 * tidied. Unknown keys are dropped.
 */
export function tidySubmission(raw = {}, isGuidelineId = () => true) {
  const text = [...JOB_FIELDS, INTENTION_FIELD, NAME_FIELD];
  const job = Object.fromEntries(text.map((field) => [field.key, tidy(raw[field.key], field.max)]));
  const complexity = Number(raw.complexity);
  job.complexity = SCENARIO_COMPLEXITY[complexity] ? complexity : 0;
  job.load = raw.load === 'delegation' ? 'delegation' : 'single';
  const patients = listOf(raw.patients, SUBMISSION_LIMITS.PATIENTS);
  job.patients = (patients.length ? patients : [{}]).map(tidyPatient);
  const ids = listOf(raw.guidelines, SUBMISSION_LIMITS.GUIDELINES).map(String);
  job.guidelines = [...new Set(ids)].filter(isGuidelineId);
  job.outcomes = listOf(raw.outcomes, MAX_OUTCOMES)
    .map((point) => tidy(point, MAX_OUTCOME_TEXT))
    .filter(Boolean);
  return job;
}

/** The names of what is still needed before sending, in form order. */
export function missingFields(job) {
  return [
    !job.title && 'a short title',
    !job.story && 'the history',
    !job.complexity && 'the complexity',
    !job.guidelines.length && 'at least one guideline',
    !job.intention && 'what it could teach',
    !job.outcomes.length && 'at least one debrief point',
  ].filter(Boolean);
}

/** Every text box of the job as [label, text], patients numbered when there are several. */
function labelledTexts(job) {
  const texts = [...JOB_FIELDS, INTENTION_FIELD].map((field) => [field.label, job[field.key]]);
  job.patients.forEach((patient, index) => {
    const prefix = job.patients.length > 1 ? `Patient ${index + 1}, ` : '';
    texts.push([`${prefix}Label`, patient.label]);
    [...PATIENT_FIELDS, TREATMENT_FIELD].forEach((field) =>
      texts.push([prefix + field.label, patient[field.key]]),
    );
    patient.vitalSets.forEach((set) => texts.push([`${prefix}Vitals note`, set.note]));
  });
  job.outcomes.forEach((point, index) => texts.push([`Debrief point ${index + 1}`, point]));
  return texts;
}

/**
 * What looks like it identifies the patient, as "Label: an NHI number" lines, one per box and
 * kind, in form order. Empty when nothing looks wrong.
 */
export function identifierWarnings(job) {
  return labelledTexts(job).flatMap(([label, text]) =>
    IDENTIFIER_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(
      ({ name }) => `${label}: ${name}`,
    ),
  );
}

/** How a guideline is offered in the picker: "4.1 Chest Pain". */
export const guidelineChoiceText = (guideline) => `${guideline.n} ${guideline.t}`;

/**
 * The id of the guideline typed or picked: its CPG number ("4.1", "CPG 4.1"), its picker text
 * or its exact title, in any case. '' when it matches none, so only real guidelines are added.
 */
export function guidelineIdFromText(text, guidelines) {
  const typed = tidy(text, 200)
    .toLowerCase()
    .replace(/^(cpg\s*(eas\s*)?)/, '');
  if (!typed) return '';
  const found = guidelines.find(
    (guideline) =>
      guideline.n.toLowerCase() === typed ||
      guidelineChoiceText(guideline).toLowerCase() === typed ||
      guideline.t.toLowerCase() === typed,
  );
  return found ? found.id : '';
}

/** A patient as a scenario has it; the first vitals are `vitals`, later ones `laterVitals`. */
function scenarioPatient(patient, index, count) {
  const background = Object.fromEntries(
    PATIENT_FIELDS.map((field) => [field.key, patient[field.key] || NOT_GIVEN]),
  );
  const filled = (vitals) =>
    Object.fromEntries(SCENARIO_VITALS.map(([key]) => [key, vitals[key] || NO_VITAL]));
  const [first, ...later] = patient.vitalSets;
  return {
    ...(count > 1 ? { label: patient.label || `Patient ${index + 1}` } : {}),
    ...background,
    vitals: filled(first.vitals),
    ...(first.note ? { vitalsNote: first.note } : {}),
    ...(later.length
      ? { laterVitals: later.map((set) => ({ note: set.note, vitals: filled(set.vitals) })) }
      : {}),
    ...(patient.treatment ? { treatment: patient.treatment } : {}),
  };
}

/**
 * The file name of a job's photo once published ("job-abc-1.jpg"), in content/scenario-photos.
 * The editor page and the daily copy both use it, so a scenario's photos match the files.
 */
export const photoName = (jobId, index) =>
  `${String(jobId).replace(/[^a-z0-9-]/g, '')}-${index + 1}.jpg`;

/**
 * A job as a scenario (the fields of content/scenarios.js), with `photos` ([{ src, caption }],
 * from `photos`) and the extras of scenarioEdits.js. Empty boxes get a placeholder, so the
 * scenario screens and checks treat it like a hand-written one. Only guideline ids that
 * `isGuidelineId` accepts are kept.
 */
export function scenarioFromSubmission(job, id, photos = [], isGuidelineId = () => true) {
  const tidied = tidySubmission(job, isGuidelineId);
  const count = tidied.patients.length;
  return {
    id,
    complexity: tidied.complexity || 2,
    load: count > 1 ? 'several' : tidied.load,
    title: tidied.title || 'Submitted job',
    suburb: tidied.suburb || NO_SUBURB,
    story: tidied.story,
    intention: tidied.intention || NOT_GIVEN,
    outcomes: tidied.outcomes,
    guidelines: tidied.guidelines,
    patients: tidied.patients.map((patient, index) => scenarioPatient(patient, index, count)),
    ...(photos.length ? { photos } : {}),
  };
}

/** The width and height that fit `longest` pixels on the longer side, never made bigger. */
export function scaledSize(width, height, longest) {
  const scale = Math.min(1, longest / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** The base64 part of a data: address ("data:image/jpeg;base64,AAAA" gives "AAAA"). */
export function base64OfDataUrl(dataUrl) {
  return String(dataUrl).slice(String(dataUrl).indexOf(',') + 1);
}
