/*
 * Add a job page (submit.html), markup only: the form and the thank-you box. Every value
 * comes from the page's state, so drawing again never loses what was typed.
 * The hidden "website" box is a bot trap: people never see it, form-filling bots fill it in.
 * Depends on logic.js, constants.js, scenarioSubmission.js, guidelines.js,
 * staffPage.js and the app's templates.
 */
import { escapeHtml } from '../logic.js';
import { SCENARIO_VITALS, SUBMISSION_LIMITS } from '../constants.js';
import {
  JOB_FIELDS,
  PATIENT_FIELDS,
  TREATMENT_FIELD,
  FOLLOW_UP_FIELD,
  INTENTION_FIELD,
  NAME_FIELD,
  guidelineChoiceText,
  guidelineMatches,
} from '../scenarioSubmission.js';
import { guidelines, guidelineById } from '../guidelines.js';
import { warningHtml, noteHtml } from '../staffPage.js';
import { coverHtml } from '../views/templates.js';

// A small button inside the form (add, remove), labelled for screen readers.
const smallButton = (action, label, data = '', ariaLabel = label) =>
  `<button class="submit-small-button" type="button" data-action="${action}"${data}
    aria-label="${escapeHtml(ariaLabel)}">${label}</button>`;

/**
 * One labelled box: a line, or a text area when `field.lines` > 1. `name` is its form name.
 * With `isLabelHidden` the label is for screen readers only (a card title already says it).
 */
function boxHtml(field, name, value, isLabelHidden = false) {
  const id = `submit-${name}`;
  const hint = field.hint ? ` placeholder="${escapeHtml(field.hint)}"` : '';
  const box =
    field.lines > 1
      ? `<textarea class="text-input" id="${id}" name="${name}" rows="${field.lines}"
          maxlength="${field.max}"${hint}>${escapeHtml(value)}</textarea>`
      : `<input class="text-input" id="${id}" name="${name}" type="text" maxlength="${field.max}"
          value="${escapeHtml(value)}"${hint}>`;
  const needed = field.required ? ' <span class="submit-required">(needed)</span>' : '';
  const labelClass = isLabelHidden ? 'visually-hidden' : 'submit-label';
  return `<label class="${labelClass}" for="${id}">${escapeHtml(field.label)}${needed}</label>${box}`;
}

/** The opening: title, suburb, dispatch notes, history and assessment. */
function jobHtml(job) {
  const boxes = JOB_FIELDS.map((field) => boxHtml(field, field.key, job[field.key])).join('');
  return `<section class="submit-card" aria-labelledby="submit-job-title">
    <h2 class="submit-card__title" id="submit-job-title">The job</h2>${boxes}</section>`;
}

// The phone keypad each vital opens: whole numbers, or numbers with a decimal point.
const DECIMAL_VITALS = ['temp', 'bgl'];
const keypadOf = (key) => (DECIMAL_VITALS.includes(key) ? 'decimal' : 'numeric');

/** One vital: its label above a number box; `keypad` is the phone pad it opens. */
const vitalHtml = (id, name, label, value, keypad) =>
  `<label class="submit-vital" for="${id}"><span>${escapeHtml(label)}</span>
    <input class="text-input" id="${id}" name="${name}" type="text" inputmode="${keypad}"
      maxlength="20" value="${escapeHtml(value)}"></label>`;

/** BP as two vitals, systolic and diastolic, since the number pad has no "/". */
function bpHtml(id, name, value) {
  const [systolic = '', diastolic = ''] = String(value).split('/');
  return (
    vitalHtml(`${id}-sys`, `${name}-sys`, 'BP sys', systolic.trim(), 'numeric') +
    vitalHtml(`${id}-dia`, `${name}-dia`, 'BP dia', diastolic.trim(), 'numeric')
  );
}

/** One set of vitals: its note, then the vitals in a grid (BP as two). Later sets can be removed. */
function vitalSetHtml(set, patientIndex, setIndex) {
  const prefix = `vitals-${patientIndex}-${setIndex}`;
  const remove = setIndex
    ? smallButton(
        'remove-vitals',
        'Remove',
        ` data-patient="${patientIndex}" data-index="${setIndex}"`,
        `Remove vitals set ${setIndex + 1}`,
      )
    : '';
  const vitals = SCENARIO_VITALS.map(([key, label]) => {
    const id = `submit-${prefix}-${key}`;
    const name = `${prefix}-${key}`;
    const value = set.vitals[key];
    return key === 'bp'
      ? bpHtml(id, name, value)
      : vitalHtml(id, name, label, value, keypadOf(key));
  }).join('');
  const hint = setIndex ? 'e.g. 5 min after GTN 400 mcg' : 'e.g. On arrival';
  return `<div class="submit-vital-set">
    <div class="submit-card__head"><p class="submit-label">Vitals ${setIndex + 1}</p>${remove}</div>
    <label class="visually-hidden" for="submit-${prefix}-note">Note for vitals ${setIndex + 1}</label>
    <input class="text-input" id="submit-${prefix}-note" name="${prefix}-note" type="text"
      maxlength="80" placeholder="Note: ${hint}" value="${escapeHtml(set.note)}">
    <div class="submit-vitals">${vitals}</div></div>`;
}

/** One patient: label (when several), background, vitals sets, then treatment and response. */
function patientHtml(patient, index, count) {
  const title = count > 1 ? `Patient ${index + 1}` : 'Patient';
  const remove =
    count > 1
      ? smallButton('remove-patient', 'Remove', ` data-index="${index}"`, `Remove ${title}`)
      : '';
  const label =
    count > 1
      ? boxHtml(
          { label: 'Label', hint: 'e.g. Driver, 40s', max: 40, lines: 1 },
          `patient-${index}-label`,
          patient.label,
        )
      : '';
  const background = PATIENT_FIELDS.map((field) =>
    boxHtml(field, `patient-${index}-${field.key}`, patient[field.key]),
  ).join('');
  const sets = patient.vitalSets
    .map((set, setIndex) => vitalSetHtml(set, index, setIndex))
    .join('');
  const addSet =
    patient.vitalSets.length < SUBMISSION_LIMITS.VITAL_SETS
      ? `<button class="button button--secondary" type="button" data-action="add-vitals"
          data-patient="${index}">Add another set of vitals</button>`
      : '';
  return `<section class="submit-card" aria-label="${title}">
    <div class="submit-card__head"><h2 class="submit-card__title">${title}</h2>${remove}</div>
    ${label}${background}${sets}${addSet}
    ${boxHtml(TREATMENT_FIELD, `patient-${index}-treatment`, patient.treatment)}</section>`;
}

/** The guidelines a search recommends, not yet chosen, as buttons that add them. */
export function guidelineSuggestionsHtml(text, chosen) {
  return guidelineMatches(
    text,
    guidelines.filter((guideline) => !chosen.includes(guideline.id)),
  )
    .map(
      (
        guideline,
      ) => `<li><button class="submit-suggestion" type="button" data-action="pick-guideline"
        data-id="${escapeHtml(guideline.id)}"><b>${escapeHtml(guideline.n)}</b>
        ${escapeHtml(guideline.t)}</button></li>`,
    )
    .join('');
}

/** The chosen guidelines, then a search box that recommends real ones to add. */
function guidelinesHtml(state) {
  const chosen = state.job.guidelines
    .map(guidelineById)
    .filter(Boolean)
    .map(
      (guideline) => `<li class="submit-guideline"><span><b>${escapeHtml(guideline.n)}</b>
        ${escapeHtml(guideline.t)}</span>${smallButton(
          'remove-guideline',
          'Remove',
          ` data-id="${escapeHtml(guideline.id)}"`,
          `Remove ${guidelineChoiceText(guideline)}`,
        )}</li>`,
    )
    .join('');
  const full = state.job.guidelines.length >= SUBMISSION_LIMITS.GUIDELINES;
  const search = full
    ? ''
    : `<label class="visually-hidden" for="submit-guideline">Search the guidelines</label>
      <input class="text-input" id="submit-guideline" type="search" enterkeyhint="search"
        placeholder="Search by number or name, e.g. 1.17 or chest pain"
        value="${escapeHtml(state.guidelineText)}" autocomplete="off"
        aria-controls="submit-guideline-results">
      <ul class="submit-suggestions" id="submit-guideline-results" aria-live="polite">${guidelineSuggestionsHtml(
        state.guidelineText,
        state.job.guidelines,
      )}</ul>
      ${state.guidelineError ? `<p class="submit-error" role="alert">${escapeHtml(state.guidelineError)}</p>` : ''}`;
  return `<section class="submit-card" aria-labelledby="submit-guidelines-title">
    <h2 class="submit-card__title" id="submit-guidelines-title">Guidelines used
      <span class="submit-required">(at least one)</span></h2>
    ${noteHtml('Only guidelines in the app can be added, so each one links to it.')}
    ${chosen ? `<ul class="submit-guidelines">${chosen}</ul>` : ''}${search}</section>`;
}

/** One photo: the preview as it will be sent, its caption and Remove. */
function photoHtml(photo, index) {
  return `<div class="submit-photo">
    <img class="submit-photo__image" src="${photo.previewUrl}" alt="Photo ${index + 1} as it will be sent">
    <label class="submit-label" for="submit-caption-${index}">Caption</label>
    <input class="text-input" id="submit-caption-${index}" name="caption-${index}" type="text"
      maxlength="${SUBMISSION_LIMITS.CAPTION}" placeholder="e.g. 12-lead on arrival"
      value="${escapeHtml(photo.caption)}">
    ${smallButton('remove-photo', 'Remove photo', ` data-index="${index}"`, `Remove photo ${index + 1}`)}</div>`;
}

/** The photos and the Add a photo button (a label for the hidden file box before it), until full. */
function photosHtml(photos, isReading) {
  const add =
    photos.length >= SUBMISSION_LIMITS.IMAGES
      ? noteHtml('That’s the most photos one job can have.')
      : `<input class="submit-file-input" id="submit-photo-input" type="file" accept="image/*"
          multiple data-action="add-photos">
        <label class="button button--secondary submit-add-photo" for="submit-photo-input">
          ${isReading ? 'Reading the photo…' : 'Take or add a photo'}</label>`;
  return `<section class="submit-card" aria-labelledby="submit-photos-title">
    <h2 class="submit-card__title" id="submit-photos-title">Photos (optional)</h2>
    ${noteHtml(`ECGs, rhythm strips or the monitor. Photograph straight on and fill the frame with the
      trace, leaving out the printed name and NHI. Check each preview: nothing that names the
      patient should show.`)}
    ${photos.map(photoHtml).join('')}${add}</section>`;
}

/** Follow up: one box under its card title. */
function followUpHtml(job) {
  return `<section class="submit-card" aria-labelledby="submit-follow-up-title">
    <h2 class="submit-card__title" id="submit-follow-up-title">Follow up</h2>
    ${boxHtml(FOLLOW_UP_FIELD, FOLLOW_UP_FIELD.key, job.followUp, true)}</section>`;
}

/** The learning points: one box under its card title. */
function learningHtml(job) {
  return `<section class="submit-card" aria-labelledby="submit-learning-title">
    <h2 class="submit-card__title" id="submit-learning-title">Learning points
      <span class="submit-required">(needed)</span></h2>
    ${boxHtml(INTENTION_FIELD, INTENTION_FIELD.key, job.intention, true)}</section>`;
}

/** The warnings about identifying details, asking to fix them or send again. */
function identifierWarningsHtml(warnings) {
  if (!warnings.length) return '';
  const items = warnings.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
  return `<div class="warning-message" role="alert">These look like they could identify the
    patient:<ul>${items}</ul>Remove them, or press Send again if they don’t.</div>`;
}

/** The last card: name, the bot trap, the declaration, messages and Send. */
function sendHtml(state) {
  return `<section class="submit-card">${boxHtml(NAME_FIELD, NAME_FIELD.key, state.job.name)}
    <label class="signup-trap" aria-hidden="true">Website
      <input name="website" type="text" tabindex="-1" autocomplete="off"></label>
    <label class="submit-check"><input type="checkbox" name="confirmed"${state.confirmed ? ' checked' : ''}>
      <span>I’ve removed everything that could identify the patient, in the text and the photos.</span></label>
    ${identifierWarningsHtml(state.warnings)}${warningHtml(state.message)}
    <button class="button" type="button" data-action="send"${state.isSending ? ' disabled' : ''}>
      ${state.isSending ? 'Sending…' : 'Send'}</button></section>`;
}

/** The whole form, in the order a job is told: opening, patients, guidelines, photos, learning. */
function formHtml(state) {
  const { job } = state;
  const patients = job.patients
    .map((patient, index) => patientHtml(patient, index, job.patients.length))
    .join('');
  const addPatient =
    job.patients.length < SUBMISSION_LIMITS.PATIENTS
      ? `<button class="button button--secondary" type="button" data-action="add-patient">
          Add another patient</button>`
      : '';
  return `<p class="subtitle">Send a job you went to, so others can learn from it and mentors can
      use it as an idea for a scenario. An editor checks it before it’s added to Anonymised jobs. No sign-in is needed.
      <b>Leave out anything that could identify the patient:</b> names, NHI, addresses, dates
      of birth and the date of the job. Age and sex are fine.</p>
    ${jobHtml(job)}${patients}${addPatient}${guidelinesHtml(state)}${followUpHtml(job)}
    ${photosHtml(state.photos, state.isReading)}${learningHtml(job)}${sendHtml(state)}`;
}

/** The thank-you box after a job is sent. */
function sentHtml() {
  return `<div class="success-box"><b>Thanks, the job was sent</b>
    <p class="subtitle">An editor will check it. Once approved, it’s added to Anonymised jobs.</p>
    <button class="button" type="button" data-action="start-again">Send another job</button>
    <a class="button button--secondary submit-link-button" href="index.html#jobs">
      Back to Anonymised jobs</a></div>`;
}

/** Draws the page into `app`. */
export function renderSubmitPage(app, state) {
  app.innerHTML = `<a class="back-link" href="index.html#jobs">‹ Anonymised jobs</a>
    ${coverHtml({ subtitleHtml: 'Add a job' })}
    <form class="page-padding submit-form" novalidate>
    ${state.sentId ? sentHtml() : formHtml(state)}</form>`;
}
