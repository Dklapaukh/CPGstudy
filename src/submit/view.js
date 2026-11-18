/*
 * Add a scenario page (submit.html), markup only: the form and the thank-you box. Every value
 * comes from the page's state, so drawing again never loses what was typed.
 * The hidden "website" box is a bot trap: people never see it, form-filling bots fill it in.
 * Depends on logic.js, constants.js, scenarioSubmission.js, scenarioEdits.js, guidelines.js,
 * staffPage.js and the app's templates.
 */
import { escapeHtml } from '../logic.js';
import {
  SCENARIO_COMPLEXITY,
  SCENARIO_VITALS,
  SUBMISSION_LIMITS,
  SCENARIO_LOADS,
} from '../constants.js';
import {
  JOB_FIELDS,
  PATIENT_FIELDS,
  TREATMENT_FIELD,
  INTENTION_FIELD,
  NAME_FIELD,
  SCENE_LOADS,
  guidelineChoiceText,
} from '../scenarioSubmission.js';
import { MAX_OUTCOMES, MAX_OUTCOME_TEXT } from '../scenarioEdits.js';
import { guidelines, guidelineById } from '../guidelines.js';
import { warningHtml, noteHtml } from '../staffPage.js';
import { coverHtml } from '../views/templates.js';

// A small button inside the form (add, remove), labelled for screen readers.
const smallButton = (action, label, data = '', ariaLabel = label) =>
  `<button class="submit-small-button" type="button" data-action="${action}"${data}
    aria-label="${escapeHtml(ariaLabel)}">${label}</button>`;

/** One labelled box: a line, or a text area when `field.lines` > 1. `name` is its form name. */
function boxHtml(field, name, value) {
  const id = `submit-${name}`;
  const hint = field.hint ? ` placeholder="${escapeHtml(field.hint)}"` : '';
  const box =
    field.lines > 1
      ? `<textarea class="text-input" id="${id}" name="${name}" rows="${field.lines}"
          maxlength="${field.max}"${hint}>${escapeHtml(value)}</textarea>`
      : `<input class="text-input" id="${id}" name="${name}" type="text" maxlength="${field.max}"
          value="${escapeHtml(value)}"${hint}>`;
  const needed = field.required ? ' <span class="submit-required">(needed)</span>' : '';
  return `<label class="submit-label" for="${id}">${escapeHtml(field.label)}${needed}</label>${box}`;
}

/** The complexity, with "Choose" first so it is a real choice. */
function complexityHtml(complexity) {
  const options = [['0', 'Choose…'], ...Object.entries(SCENARIO_COMPLEXITY)]
    .map(([value, level]) => {
      const text = value === '0' ? level : level.name;
      const selected = Number(value) === complexity ? ' selected' : '';
      return `<option value="${value}"${selected}>${escapeHtml(text)}</option>`;
    })
    .join('');
  return `<label class="submit-label" for="submit-complexity">Complexity
      <span class="submit-required">(needed)</span></label>
    <select class="text-input" id="submit-complexity" name="complexity">${options}</select>`;
}

/** Scene load: single or delegation; with several patients it is "Several patients". */
function loadHtml(job) {
  if (job.patients.length > 1) {
    return `<p class="submit-label">Scene load</p>${noteHtml(SCENARIO_LOADS.several.name)}`;
  }
  const choices = SCENE_LOADS.map(
    ([value, text]) => `<label class="submit-check"><input type="radio" name="load"
      value="${value}"${job.load === value ? ' checked' : ''}><span>${escapeHtml(text)}</span></label>`,
  ).join('');
  return `<fieldset class="submit-fieldset"><legend class="submit-label">Scene load</legend>
    ${choices}</fieldset>`;
}

/** The opening: title, suburb, history, complexity and scene load. */
function jobHtml(job) {
  const boxes = JOB_FIELDS.map((field) => boxHtml(field, field.key, job[field.key])).join('');
  return `<section class="submit-card" aria-labelledby="submit-job-title">
    <h2 class="submit-card__title" id="submit-job-title">The job</h2>${boxes}
    ${complexityHtml(job.complexity)}${loadHtml(job)}</section>`;
}

/** One set of vitals: its note, then the eight vitals in a grid. Later sets can be removed. */
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
    return `<label class="submit-vital" for="${id}"><span>${escapeHtml(label)}</span>
      <input class="text-input" id="${id}" name="${prefix}-${key}" type="text"
        maxlength="20" value="${escapeHtml(set.vitals[key])}"></label>`;
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

/** The chosen guidelines, then a box that only adds real ones (picked from the list). */
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
  const options = guidelines
    .map((guideline) => `<option value="${escapeHtml(guidelineChoiceText(guideline))}"></option>`)
    .join('');
  const full = state.job.guidelines.length >= SUBMISSION_LIMITS.GUIDELINES;
  const picker = full
    ? ''
    : `<label class="submit-label" for="submit-guideline">Add a guideline</label>
      <div class="submit-row"><input class="text-input" id="submit-guideline" type="text"
        list="submit-guideline-list" placeholder="Type a number or name, e.g. 1.17"
        value="${escapeHtml(state.guidelineText)}" autocomplete="off">
      <button class="submit-small-button" type="button" data-action="add-guideline">Add</button></div>
      <datalist id="submit-guideline-list">${options}</datalist>
      ${state.guidelineError ? `<p class="submit-error" role="alert">${escapeHtml(state.guidelineError)}</p>` : ''}`;
  return `<section class="submit-card" aria-labelledby="submit-guidelines-title">
    <h2 class="submit-card__title" id="submit-guidelines-title">Guidelines
      <span class="submit-required">(at least one)</span></h2>
    ${noteHtml('Only guidelines in the app can be added, so each one links to it.')}
    ${chosen ? `<ul class="submit-guidelines">${chosen}</ul>` : ''}${picker}</section>`;
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

/** What it could teach, then the debrief points (the scenario's intended outcomes). */
function teachingHtml(job) {
  const points = job.outcomes
    .map((point, index) => {
      const id = `submit-outcome-${index}`;
      const remove =
        job.outcomes.length > 1
          ? smallButton(
              'remove-outcome',
              'Remove',
              ` data-index="${index}"`,
              `Remove debrief point ${index + 1}`,
            )
          : '';
      return `<label class="visually-hidden" for="${id}">Debrief point ${index + 1}</label>
        <div class="submit-row"><input class="text-input" id="${id}" name="outcome-${index}"
          type="text" maxlength="${MAX_OUTCOME_TEXT}" value="${escapeHtml(point)}"
          placeholder="e.g. Recognises an inferior STEMI on the 12-lead">${remove}</div>`;
    })
    .join('');
  const add =
    job.outcomes.length < MAX_OUTCOMES
      ? `<button class="button button--secondary" type="button" data-action="add-outcome">
          Add a debrief point</button>`
      : '';
  return `<section class="submit-card" aria-labelledby="submit-teaching-title">
    <h2 class="submit-card__title" id="submit-teaching-title">Teaching</h2>
    ${boxHtml(INTENTION_FIELD, INTENTION_FIELD.key, job.intention)}
    <p class="submit-label">Debrief points <span class="submit-required">(at least one)</span></p>
    ${noteHtml('Short, observable things the learner should do. The mentor rates each one in the debrief.')}
    ${points}${add}</section>`;
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
      ${state.isSending ? 'Sending…' : 'Send for checking'}</button></section>`;
}

/** The whole form, in the order a job is told: opening, patients, guidelines, photos, teaching. */
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
  return `<p class="subtitle">Send a job you went to, and it can become a scenario for others to
      practise. An editor checks it before it’s added. No sign-in is needed.
      <b>Leave out anything that could identify the patient:</b> names, NHI, addresses, dates
      of birth and the date of the job. Age and sex are fine.</p>
    ${jobHtml(job)}${patients}${addPatient}${guidelinesHtml(state)}
    ${photosHtml(state.photos, state.isReading)}${teachingHtml(job)}${sendHtml(state)}`;
}

/** The thank-you box after a job is sent. */
function sentHtml() {
  return `<div class="success-box"><b>Thanks, the job was sent</b>
    <p class="subtitle">An editor will check it. Once approved, it’s added to Scenarios.</p>
    <button class="button" type="button" data-action="start-again">Send another job</button>
    <a class="button button--secondary submit-link-button" href="index.html#scenarios">
      Back to Scenarios</a></div>`;
}

/** Draws the page into `app`. */
export function renderSubmitPage(app, state) {
  app.innerHTML = `<a class="back-link" href="index.html#scenarios">‹ Scenarios</a>
    ${coverHtml({ subtitleHtml: 'Add a scenario' })}
    <form class="page-padding submit-form" novalidate>
    ${state.sentId ? sentHtml() : formHtml(state)}</form>`;
}
