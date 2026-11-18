/*
 * Add a scenario page (submit.html): anyone fills in an anonymised job, adds photos of ECGs and
 * sends it, with no sign-in, to the backend ("scenario-submit"). It waits in the Sheet's
 * Submissions tab until an editor approves it on the editor page.
 * Photos are drawn onto a canvas: made smaller and re-saved as JPEG, which drops their location
 * data. One state object; every change calls render(), after reading what was typed.
 * Depends on staffPage.js, theme.js, constants.js, guidelines.js, scenarioSubmission.js and
 * view.js.
 */
import { askBackend, refusalMessage } from '../staffPage.js';
import { applyTheme } from '../theme.js';
import { SUBMISSION_LIMITS, SCENARIO_VITALS } from '../constants.js';
import { guidelines } from '../guidelines.js';
import {
  JOB_FIELDS,
  PATIENT_FIELDS,
  INTENTION_FIELD,
  NAME_FIELD,
  emptyPatient,
  emptyVitalSet,
  tidySubmission,
  missingFields,
  identifierWarnings,
  guidelineIdFromText,
  scaledSize,
  base64OfDataUrl,
} from '../scenarioSubmission.js';
import { renderSubmitPage } from './view.js';

// A second, lower quality is tried when a photo is still too big for the backend.
const FALLBACK_JPEG_QUALITY = 0.6;
const SUBMIT_MESSAGES = {
  'bad-submission': 'That job couldn’t be sent: a box or photo is too big. Try fewer photos.',
  'too-fast': 'That was very quick. Please check the job and press Send again.',
  busy: 'Lots of jobs were sent in the last hour. Please try again later.',
  'not-confirmed': 'Tick the box to say the job is anonymised first.',
  'photo-failed': 'That photo couldn’t be read. Try taking it again.',
  'no-guideline': 'Pick a guideline from the list (type its number, such as 1.17).',
};
const isGuidelineId = (id) => guidelines.some((guideline) => guideline.id === id);

const app = document.getElementById('submit-app');
const state = {
  job: newJob(),
  guidelineText: '', // the guideline box, kept while drawing again
  guidelineError: '',
  photos: [], // { canvas (made smaller), caption, previewUrl }
  confirmed: false,
  warnings: [], // identifying details found on the last Send
  warnedFor: '', // the job (as JSON) those warnings were shown for, so Send again sends
  message: '',
  openedAt: Date.now(), // the backend refuses forms sent too soon after opening (bots)
  isReading: false,
  isSending: false,
  sentId: '',
};

/** An empty job with one patient and one debrief point box. */
function newJob() {
  return { ...tidySubmission({}), patients: [emptyPatient()], outcomes: [''] };
}

/** Draws the page from the current state. */
function render() {
  renderSubmitPage(app, state);
}

/* ---------- Reading the form into the state ---------- */

/** The value of the form box with this name ('' when it isn't on the page). */
function boxValue(name) {
  const box = app.querySelector(`[name="${name}"]`);
  return box ? box.value : '';
}

/** One patient's boxes as typed. */
function readPatient(patient, index) {
  const read = { label: boxValue(`patient-${index}-label`) };
  PATIENT_FIELDS.forEach((field) => (read[field.key] = boxValue(`patient-${index}-${field.key}`)));
  read.treatment = boxValue(`patient-${index}-treatment`);
  read.vitalSets = patient.vitalSets.map((set, setIndex) => {
    const prefix = `vitals-${index}-${setIndex}`;
    const vitals = Object.fromEntries(
      SCENARIO_VITALS.map(([key]) => [key, boxValue(`${prefix}-${key}`)]),
    );
    return { note: boxValue(`${prefix}-note`), vitals };
  });
  return read;
}

/**
 * Copies everything typed into the state, as typed (not tidied), so drawing again keeps it and
 * a half-typed box isn't changed under the cursor.
 */
function readForm() {
  if (state.sentId) return;
  const { job } = state;
  [...JOB_FIELDS, INTENTION_FIELD, NAME_FIELD].forEach(
    (field) => (job[field.key] = boxValue(field.key)),
  );
  job.complexity = Number(boxValue('complexity'));
  job.load = app.querySelector('[name="load"]:checked')?.value || job.load;
  job.patients = job.patients.map(readPatient);
  job.outcomes = job.outcomes.map((point, index) => boxValue(`outcome-${index}`));
  state.photos.forEach((photo, index) => (photo.caption = boxValue(`caption-${index}`)));
  state.guidelineText = app.querySelector('#submit-guideline')?.value || '';
  state.confirmed = Boolean(app.querySelector('[name="confirmed"]')?.checked);
}

/* ---------- Guidelines ---------- */

/** Adds the guideline typed or picked, if it is one; otherwise says how to pick one. */
function addGuideline() {
  const id = guidelineIdFromText(state.guidelineText, guidelines);
  state.guidelineError = id ? '' : SUBMIT_MESSAGES['no-guideline'];
  if (!id) return;
  if (!state.job.guidelines.includes(id)) state.job.guidelines.push(id);
  state.guidelineText = '';
}

/* ---------- Photos ---------- */

/** Loads a picked file as something a canvas can draw, the right way up. */
async function loadImage(file) {
  if (window.createImageBitmap) return createImageBitmap(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** A canvas with the photo made smaller to the longest side the backend takes. */
function smallerCanvas(image) {
  const size = scaledSize(image.width, image.height, SUBMISSION_LIMITS.IMAGE_LONGEST_SIDE_PX);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.getContext('2d').drawImage(image, 0, 0, size.width, size.height);
  return canvas;
}

const jpegOf = (canvas, quality = SUBMISSION_LIMITS.IMAGE_JPEG_QUALITY) =>
  canvas.toDataURL('image/jpeg', quality);

/** Adds the picked files as photos, up to the most a job can have. */
async function addPhotos(files) {
  const room = SUBMISSION_LIMITS.IMAGES - state.photos.length;
  state.isReading = true;
  state.message = '';
  render();
  try {
    for (const file of [...files].slice(0, room)) {
      const canvas = smallerCanvas(await loadImage(file));
      state.photos.push({ canvas, caption: '', previewUrl: jpegOf(canvas) });
    }
  } catch (error) {
    console.error(error);
    state.message = SUBMIT_MESSAGES['photo-failed'];
  }
  state.isReading = false;
  render();
}

/** The photos as the backend takes them: base64 JPEG and caption. */
function photosToSend() {
  return state.photos.map((photo) => {
    let data = base64OfDataUrl(photo.previewUrl);
    if (data.length > SUBMISSION_LIMITS.IMAGE_BASE64_LENGTH) {
      data = base64OfDataUrl(jpegOf(photo.canvas, FALLBACK_JPEG_QUALITY));
    }
    return { data, caption: photo.caption.trim().slice(0, SUBMISSION_LIMITS.CAPTION) };
  });
}

/* ---------- Sending ---------- */

/** Why the job can't be sent yet, or '' when it can (the identifier check is separate). */
function blockingMessage(job) {
  const missing = missingFields(job);
  if (missing.length) return `Still needed: ${missing.join(', ')}.`;
  if (!state.confirmed) return SUBMIT_MESSAGES['not-confirmed'];
  return '';
}

/** Checks the job, warns once about identifying details, then sends it. */
async function send() {
  const job = tidySubmission(state.job, isGuidelineId);
  state.message = blockingMessage(job);
  const jobText = JSON.stringify(job);
  state.warnings = identifierWarnings(job);
  // The warnings stop one Send that would otherwise go; pressing again with no change sends.
  if (state.message) return render();
  if (state.warnings.length && state.warnedFor !== jobText) {
    state.warnedFor = jobText;
    return render();
  }
  state.isSending = true;
  render();
  const reply = await askBackend({
    action: 'scenario-submit',
    submission: job,
    images: photosToSend(),
    website: boxValue('website'),
    formMs: Date.now() - state.openedAt,
  });
  state.isSending = false;
  if (reply.ok) state.sentId = reply.id;
  else state.message = refusalMessage(reply.error, SUBMIT_MESSAGES);
  render();
}

/** Clears the form for another job. */
function startAgain() {
  Object.assign(state, {
    job: newJob(),
    guidelineText: '',
    guidelineError: '',
    photos: [],
    confirmed: false,
    warnings: [],
    warnedFor: '',
    message: '',
    openedAt: Date.now(),
    sentId: '',
  });
  window.scrollTo(0, 0);
}

/* ---------- Events ---------- */

// Each takes the button's data (index, patient, id) and changes the state; render() follows.
const CLICK_ACTIONS = {
  'add-patient': () => state.job.patients.push(emptyPatient()),
  'remove-patient': ({ index }) => state.job.patients.splice(index, 1),
  'add-vitals': ({ patient }) => state.job.patients[patient].vitalSets.push(emptyVitalSet()),
  'remove-vitals': ({ patient, index }) => state.job.patients[patient].vitalSets.splice(index, 1),
  'add-guideline': addGuideline,
  'remove-guideline': ({ id }) =>
    (state.job.guidelines = state.job.guidelines.filter((each) => each !== id)),
  'remove-photo': ({ index }) => state.photos.splice(index, 1),
  'add-outcome': () => state.job.outcomes.push(''),
  'remove-outcome': ({ index }) => state.job.outcomes.splice(index, 1),
  'start-again': startAgain,
};

app.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  readForm();
  const { action, index, patient, id } = button.dataset;
  if (action === 'send') {
    send();
    return;
  }
  CLICK_ACTIONS[action]?.({ index: Number(index), patient: Number(patient), id });
  render();
  if (action === 'add-guideline') document.getElementById('submit-guideline')?.focus();
});

app.addEventListener('change', (event) => {
  if (event.target.dataset.action === 'add-photos') {
    readForm();
    addPhotos(event.target.files);
  } else if (
    event.target.id === 'submit-guideline' &&
    guidelineIdFromText(event.target.value, guidelines)
  ) {
    // A pick from the list is added at once; half-typed text waits for Add.
    readForm();
    addGuideline();
    render();
  }
});

// Enter in the guideline box adds it; elsewhere it would send the form, which Send does instead.
app.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.target.id !== 'submit-guideline') return;
  event.preventDefault();
  readForm();
  addGuideline();
  render();
  document.getElementById('submit-guideline')?.focus();
});
app.addEventListener('submit', (event) => event.preventDefault());

applyTheme();
render();
