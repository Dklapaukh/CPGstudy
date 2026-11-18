/*
 * Editor page (editor.html): sign in with an editor passcode, find a guideline, and change its
 * quiz questions: wording, right answers, wrong answers, or leave a question out. Scenarios are
 * changed the same way, on the scenario as learners see it (#s-<id>), and can be created
 * (#new-scenario) or deleted for good. Edits are saved to the
 * Sheet's Edits tab straight away and reach the app the next morning, when scripts/sync-edits.js
 * copies them into content/card-edits.js and content/scenario-edits.js.
 * Jobs sent with the Add a scenario form wait in their own section; one (#j-<id>) is shown as the
 * scenario it would make, to approve (published the next morning) or reject.
 * One state object, one way to draw: every change calls render().
 * Depends on staffPage.js, theme.js, questionEdits.js, scenarioEdits.js, guidelines.js,
 * content/card-edits.js, content/scenarios.js, content/scenario-edits.js and the other files of
 * this folder.
 */
import { askBackend, refusalMessage, tabPasscode } from '../staffPage.js';
import { applyTheme } from '../theme.js';
import {
  EDIT_FIELDS,
  LIST_FIELDS,
  REVIEW,
  snapshot,
  withEdit,
  reviewState,
  editFromValues,
} from '../questionEdits.js';
import {
  scenarioEditId,
  scenarioIdOfEdit,
  applyScenarioEdit,
  scenarioEditWith,
  scenarioEditOff,
  scenarioPathsToReview,
  keepScenarioPath,
  dropScenarioPath,
  scenarioValue,
  readScenarioBox,
  scenarioEditDeleted,
  emptyScenarioDraft,
  emptyPatient,
  emptyLaterVitals,
  scenarioDraftOf,
  readNewScenario,
  addedScenarioEditWith,
  withScenarioValue,
} from '../scenarioEdits.js';
import { guidelines, guidelineById } from '../guidelines.js';
import { cardEdits } from '../../content/card-edits.js';
import { scenarios } from '../../content/scenarios.js';
import { scenarioEdits } from '../../content/scenario-edits.js';
import { questionBank, questionPreview, boxValues } from './questions.js';
import {
  scenarioFromSubmission,
  tidySubmission,
  identifierWarnings,
  photoName,
} from '../scenarioSubmission.js';
import { SCENARIO_PHOTO_FOLDER } from '../constants.js';
import {
  SUBMISSION_HASH_PREFIX,
  APPROVE_HASH_PREFIX,
  submissionSectionHtml,
  submissionHtml,
  goneSubmissionHtml,
} from './submissionView.js';
import {
  signInHtml,
  homeHtml,
  guidelineHtml,
  guidelineRowsHtml,
  SIGNED_IN_BUTTONS,
} from './view.js';
import {
  SCENARIO_EDITOR_HASH_PREFIX,
  NEW_SCENARIO_HASH,
  scenarioSectionHtml,
  scenarioEditorHtml,
  goneScenarioHtml,
  deletedScenarioHtml,
  newScenarioHtml,
  boxTextOf,
  pathName,
} from './scenarioView.js';

// The passcode is kept for this browser tab only, as on the manager page.
const passcodeStore = tabPasscode('eas-cpg-editor-v1');
const GUIDELINE_HASH_PREFIX = '#g-';
const EDITOR_MESSAGES = {
  'bad-edit': 'That edit couldn’t be saved: it is too long.',
  gone: 'That job was already approved or rejected. Press Refresh for the latest list.',
};

const app = document.getElementById('editor-app');
const state = {
  passcode: '',
  name: '',
  message: '',
  isLoading: false,
  edits: {}, // the Sheet's edits, by question id
  search: '',
  openSections: {}, // the list's open sections, by name, kept while the page is open
  openId: '', // the question whose form is open
  openBox: null, // the one text being changed in place: { id, field, index }
  openPath: '', // the scenario value being changed in place (see scenarioEdits.js)
  boxError: '', // why the scenario box's text couldn't be saved
  isDeleting: false, // the open scenario's "Delete for good?" question is showing
  draft: emptyScenarioDraft(), // the new scenario form's box texts, kept while the page is open
  draftError: null, // the form box that couldn't be kept: { path, error }
  submissions: [], // jobs sent with the Add a scenario form, waiting for approval
  photoData: {}, // their photos by "<job id>|<index>": a data: address, '' loading, null failed
  confirmingReject: '', // the job whose Reject is waiting for "Yes, reject it"
  approvingJob: '', // the submitted job the new scenario form holds, '' for a blank form
  photoBySrc: {}, // fetched photos by the address they will have once published (for previews)
};

/* ---------- Talking to the backend ---------- */

/** Sends a request; on success keeps the edits it returns. Returns true when it worked. */
async function request(body) {
  state.isLoading = true;
  state.message = '';
  render();
  const reply = await askBackend({ ...body, code: state.passcode });
  state.isLoading = false;
  if (reply.ok) {
    state.name = reply.name;
    state.edits = reply.edits || {};
    state.submissions = reply.submissions || [];
  } else {
    if (reply.error === 'not-found') signOut();
    state.message = refusalMessage(reply.error, EDITOR_MESSAGES);
  }
  render();
  return reply.ok;
}

/** Signs in with a passcode and keeps it for this tab when it works. */
async function signIn(passcode) {
  state.passcode = passcode;
  if (await request({ action: 'editor-open' })) passcodeStore.save(passcode);
}

/** Forgets the passcode, the editor and the edits. */
function signOut() {
  Object.assign(state, {
    passcode: '',
    name: '',
    edits: {},
    openId: '',
    openBox: null,
    submissions: [],
    photoData: {},
    photoBySrc: {},
    approvingJob: '',
  });
  passcodeStore.save('');
}

/** Saves one question's edit, or removes it when `edit` is null. */
async function saveEdit(id, edit) {
  if (await request({ action: 'edit-save', id, edit })) {
    state.openId = '';
    state.openBox = null;
    state.openPath = '';
    state.boxError = '';
  }
  render();
}

/* ---------- What the screens show ---------- */

const guidelineIdOf = (questionId) => questionId.split('|')[0];
const isScenarioEdit = (id) => Boolean(scenarioIdOfEdit(id));
// True when the daily copy already carries this edit unchanged (nothing left to publish).
const isPublished = (id) =>
  JSON.stringify((isScenarioEdit(id) ? scenarioEdits : cardEdits)[id]) ===
  JSON.stringify(state.edits[id]);
const questionEditIds = () => Object.keys(state.edits).filter((id) => !isScenarioEdit(id));

/** One question as the screens show it: built, as learners see it, its edit and its state. */
function itemFor(id) {
  const found = questionBank().byId[id];
  const question = found ? found.question : null;
  const edit = state.edits[id];
  return {
    id,
    kind: question ? question.kind : edit.kind,
    guidelineId: guidelineIdOf(id),
    question,
    live: question && edit && !edit.off ? withEdit(question, edit) : question,
    edit,
    review: edit ? reviewState(question, edit) : REVIEW.NONE,
    isPublished: isPublished(id),
  };
}

/** The edits a guideline update changed or removed, for the "Needs review" list. */
function reviewItems() {
  const { byId } = questionBank();
  const questions = questionEditIds()
    .map(itemFor)
    .filter((item) => item.review)
    .map((item) => {
      const guideline = byId[item.id]?.guideline;
      return { ...item, where: guideline ? guideline.title : item.guidelineId };
    });
  return [...questions, ...scenarioReviewItems()];
}

/* ---------- Scenarios ---------- */

const fileScenario = (scenarioId) => scenarios.find((scenario) => scenario.id === scenarioId);
const isGuidelineId = (id) => Boolean(guidelineById(id));

/** The edits of scenarios editors created, not in content/scenarios.js. */
const addedEdits = () =>
  Object.keys(state.edits)
    .filter((id) => state.edits[id].added && !fileScenario(scenarioIdOfEdit(id)))
    .sort()
    .map((id) => state.edits[id]);

/**
 * A scenario's screen data (see scenarioEditorHtml), from its id. A new scenario is "written"
 * as its edit holds it; a deleted one has neither written nor live.
 */
function scenarioViewFor(scenarioId) {
  const id = scenarioEditId(scenarioId);
  const edit = state.edits[id] || null;
  const fromFile = fileScenario(scenarioId);
  const written = edit?.deleted ? null : fromFile || edit?.added || null;
  const edited = written && !edit?.added ? applyScenarioEdit(written, edit) : written;
  // An approved job's photos are only published the next morning; show the fetched ones now.
  const live = edited?.photos
    ? {
        ...edited,
        photos: edited.photos.map((photo) => ({
          ...photo,
          src: state.photoBySrc[photo.src] || photo.src,
        })),
      }
    : edited;
  const openValue = live && state.openPath ? scenarioValue(live, state.openPath) : '';
  return {
    id,
    written,
    live,
    edit,
    isPublished: isPublished(id),
    toReview: edit ? scenarioPathsToReview(written, edit) : [],
    openPath: state.openPath,
    boxText: boxTextOf(openValue, state.openPath),
    boxError: state.boxError,
    isDeleting: state.isDeleting,
  };
}

/** Scenario edits that need review, for the first screen's list. */
function scenarioReviewItems() {
  return Object.keys(state.edits)
    .map(scenarioIdOfEdit)
    .filter((scenarioId) => scenarioId && !state.edits[scenarioEditId(scenarioId)].deleted)
    .map(scenarioViewFor)
    .filter((view) => view.toReview.length)
    .map((view) => ({
      id: view.id,
      href: `${SCENARIO_EDITOR_HASH_PREFIX}${encodeURIComponent(scenarioIdOfEdit(view.id))}`,
      where: view.live ? view.live.title : scenarioIdOfEdit(view.id),
      reviewLabel: view.written ? 'scenario changed' : 'scenario removed',
    }));
}

/** The Scenarios section's rows, by complexity, each with its edit label; deleted ones go. */
function scenarioRows() {
  const badgeOf = (edit) => {
    if (edit?.off) return 'left out';
    if (edit?.added) return 'new';
    return edit ? 'edited' : '';
  };
  return [...scenarios, ...addedEdits().map((edit) => edit.added)]
    .map((scenario) => scenarioViewFor(scenario.id))
    .filter((view) => view.live)
    .sort((first, second) => first.live.complexity - second.live.complexity)
    .map((view) => ({ ...view.live, badge: badgeOf(view.edit) }));
}

/** The scenario in the address ("#s-long-lie"), or '' on any other screen. */
function currentScenarioId() {
  if (!location.hash.startsWith(SCENARIO_EDITOR_HASH_PREFIX)) return '';
  return decodeURIComponent(location.hash.slice(SCENARIO_EDITOR_HASH_PREFIX.length));
}

const guidelineIdOfNumber = (number) => guidelines.find((guideline) => guideline.n === number)?.id;

/** Saves the open scenario box, or shows why its text can't be kept. */
function saveScenarioBox() {
  const view = scenarioViewFor(currentScenarioId());
  const text = document.getElementById('box-text').value;
  const read = readScenarioBox(state.openPath, text, guidelineIdOfNumber);
  if (read.error) {
    state.boxError = read.error;
    render();
    return;
  }
  if (!view.edit?.added) {
    saveEdit(view.id, scenarioEditWith(view.written, view.edit, state.openPath, read.value));
    return;
  }
  // A new scenario has no file version: the value changes in the edit itself, kept whole.
  const changed = addedScenarioEditWith(view.edit, state.openPath, read.value, isGuidelineId);
  if (changed.error) {
    state.boxError = changed.error;
    render();
  } else saveEdit(view.id, changed.edit);
}

/** Deletes the open scenario for good: a new one's edit goes, a file one is marked deleted. */
async function deleteScenario() {
  const view = scenarioViewFor(currentScenarioId());
  state.isDeleting = false;
  if (
    await request({
      action: 'edit-save',
      id: view.id,
      edit: view.edit?.added ? null : scenarioEditDeleted(),
    })
  ) {
    location.hash = '';
  }
}

/* ---------- The new scenario form ---------- */

/** Every scenario id in use, in the file or the Edits tab (deleted ones too), for a new id. */
const takenScenarioIds = () => [
  ...scenarios.map((scenario) => scenario.id),
  ...Object.keys(state.edits).map(scenarioIdOfEdit).filter(Boolean),
];

/** Saves the new scenario form as a new scenario and opens it, or shows the box to fix. */
async function saveDraft() {
  const read = readNewScenario(state.draft, takenScenarioIds(), guidelineIdOfNumber);
  if (read.error) {
    state.draftError = read;
    render();
    document.querySelector(`[data-draft="${read.path}"]`)?.focus();
    return;
  }
  const jobId = state.approvingJob;
  if (await saveNewScenario(read.value, jobId)) {
    state.draft = emptyScenarioDraft();
    state.draftError = null;
    state.approvingJob = '';
    location.hash = `${SCENARIO_EDITOR_HASH_PREFIX}${encodeURIComponent(read.value.id)}`;
  }
}

/**
 * Saves a whole new scenario as its edit and, when it came from a submitted job, approves the
 * job. The scenario is saved first, so a job is never approved without its scenario.
 */
async function saveNewScenario(scenario, jobId) {
  const id = scenarioEditId(scenario.id);
  if (!(await request({ action: 'edit-save', id, edit: { kind: 'scenario', added: scenario } }))) {
    return false;
  }
  return !jobId || request({ action: 'submission-decide', id: jobId, decision: 'approve' });
}

/** Adds later vitals to a patient of the form, or removes a set; other boxes keep their text. */
function changeDraftLaterVitals(index, change) {
  changeDraftPatients((patients) =>
    patients.map((patient, each) =>
      each === index ? { ...patient, laterVitals: change(patient.laterVitals || []) } : patient,
    ),
  );
}

/** Adds a patient to the form, or removes one; the other boxes keep what was typed. */
function changeDraftPatients(change) {
  state.draft = { ...state.draft, patients: change(state.draft.patients) };
  state.draftError = null;
  render();
}

/** Saves a change to the open scenario's edit made by `change(view)`. */
function changeScenarioEdit(change) {
  const view = scenarioViewFor(currentScenarioId());
  saveEdit(view.id, change(view));
}

/* ---------- Submitted jobs ---------- */

const photoKey = (id, index) => `${id}|${index}`;

/** The job in the address ("#j-job-abc"), or '' on any other screen. */
function currentSubmissionId() {
  if (!location.hash.startsWith(SUBMISSION_HASH_PREFIX)) return '';
  return decodeURIComponent(location.hash.slice(SUBMISSION_HASH_PREFIX.length));
}

/** A waiting job's screen data (see submissionHtml), or null when it isn't waiting. */
function submissionViewFor(id) {
  const submission = state.submissions.find((each) => each.id === id);
  if (!submission) return null;
  const photos = submission.photos
    .map((photo, index) => ({ src: state.photoData[photoKey(id, index)], caption: photo.caption }))
    .filter((photo) => photo.src);
  return {
    submission,
    scenario: scenarioFromSubmission(submission.job, id, photos, isGuidelineId),
    warnings: identifierWarnings(tidySubmission(submission.job)),
    photosLoading: submission.photos.some(
      (photo, index) => state.photoData[photoKey(id, index)] === '',
    ),
    isConfirmingReject: state.confirmingReject === id,
  };
}

/** Fetches a job's photos not yet fetched (the Drive copies are private), then draws again. */
async function loadPhotos(submission) {
  const missing = submission.photos
    .map((photo, index) => index)
    .filter((index) => state.photoData[photoKey(submission.id, index)] === undefined);
  if (!missing.length) return;
  missing.forEach((index) => (state.photoData[photoKey(submission.id, index)] = ''));
  for (const index of missing) {
    const reply = await askBackend({
      action: 'submission-photo',
      code: state.passcode,
      id: submission.id,
      index,
    });
    // A photo that can't be fetched stays out of the preview; Refresh tries again.
    if (reply.ok) {
      const dataUrl = `data:image/jpeg;base64,${reply.data}`;
      state.photoData[photoKey(submission.id, index)] = dataUrl;
      state.photoBySrc[publishedSrc(submission.id, index)] = dataUrl;
    } else {
      state.photoData[photoKey(submission.id, index)] = null;
      console.error(`Photo ${index + 1} of ${submission.id}: ${reply.error}`);
    }
  }
  render();
}

/** Rejects a job; back to the first screen when it worked. */
async function reject(id) {
  state.confirmingReject = '';
  if (await request({ action: 'submission-decide', id, decision: 'reject' })) location.hash = '#';
}

const publishedSrc = (jobId, index) => `${SCENARIO_PHOTO_FOLDER}/${photoName(jobId, index)}`;

/** A waiting job as the scenario it would make, its photos at their published addresses. */
function scenarioOfJob(submission) {
  const photos = submission.photos.map((photo, index) => ({
    src: publishedSrc(submission.id, index),
    caption: photo.caption,
  }));
  return scenarioFromSubmission(submission.job, 'job', photos, isGuidelineId);
}

const numberOfGuideline = (id) => guidelineById(id)?.n || id;

/** Approves a job as it is: it becomes a new scenario, or the message says what to fix. */
async function approveAsItIs(jobId) {
  const submission = state.submissions.find((each) => each.id === jobId);
  const draft = scenarioDraftOf(scenarioOfJob(submission), numberOfGuideline);
  const read = readNewScenario(draft, takenScenarioIds(), guidelineIdOfNumber);
  if (read.error) {
    state.message = `Use Edit and approve to fix ${pathName(draft, read.path)}: ${read.error}`;
    render();
    return;
  }
  if (await saveNewScenario(read.value, jobId)) {
    location.hash = `${SCENARIO_EDITOR_HASH_PREFIX}${encodeURIComponent(read.value.id)}`;
  }
}

/** The job whose Edit and approve form the address asks for ("#approve-job-abc"), or ''. */
function currentApproveId() {
  if (!location.hash.startsWith(APPROVE_HASH_PREFIX)) return '';
  return decodeURIComponent(location.hash.slice(APPROVE_HASH_PREFIX.length));
}

/** The form's draft with each photo's preview, once fetched. */
const draftWithPreviews = (draft) => ({
  ...draft,
  photos: (draft.photos || []).map((photo) => ({ ...photo, preview: state.photoBySrc[photo.src] })),
});

/** The guideline list, filtered by the search box (number or title). */
function guidelineRows() {
  const words = state.search.toLowerCase().split(/\s+/).filter(Boolean);
  const editCounts = {};
  questionEditIds().forEach((id) => {
    editCounts[guidelineIdOf(id)] = (editCounts[guidelineIdOf(id)] || 0) + 1;
  });
  return questionBank()
    .list.filter((guideline) => {
      const text = `${guideline.number} ${guideline.title}`.toLowerCase();
      return words.every((word) => text.includes(word));
    })
    .map((guideline) => ({
      ...guideline,
      questionCount: guideline.questions.length,
      editCount: editCounts[guideline.id] || 0,
    }));
}

/** The guideline in the address ("#g-cpg-3-8"), or null on the first screen. */
function currentGuideline() {
  if (!location.hash.startsWith(GUIDELINE_HASH_PREFIX)) return null;
  const id = decodeURIComponent(location.hash.slice(GUIDELINE_HASH_PREFIX.length));
  return questionBank().list.find((guideline) => guideline.id === id) || null;
}

/** A guideline's questions, then any edits of questions it no longer has; each with its preview. */
function guidelineItems(guideline) {
  const ids = guideline.questions.map((question) => question.id);
  const gone = Object.keys(state.edits).filter(
    (id) => guidelineIdOf(id) === guideline.id && !ids.includes(id),
  );
  return [...ids, ...gone].map(itemFor).map((item) => ({
    ...item,
    preview: item.live ? questionPreview(item.id, item.live) : null,
  }));
}

/** Draws the screen the state and the address call for. */
function render() {
  if (!state.name) {
    app.innerHTML = signInHtml(state.message, state.isLoading);
    return;
  }
  const viewer = { name: state.name, message: state.message };
  const submissionId = currentSubmissionId();
  if (submissionId) {
    const view = submissionViewFor(submissionId);
    app.innerHTML = view
      ? submissionHtml(viewer, view, SIGNED_IN_BUTTONS)
      : goneSubmissionHtml(viewer, SIGNED_IN_BUTTONS);
    if (view) loadPhotos(view.submission);
    return;
  }
  const approveId = currentApproveId();
  if (approveId) {
    const submission = state.submissions.find((each) => each.id === approveId);
    if (!submission) {
      app.innerHTML = goneSubmissionHtml(viewer, SIGNED_IN_BUTTONS);
      return;
    }
    if (state.approvingJob !== approveId) {
      state.draft = scenarioDraftOf(scenarioOfJob(submission), numberOfGuideline);
      state.draftError = null;
      state.approvingJob = approveId;
    }
    const draft = draftWithPreviews(state.draft);
    app.innerHTML = newScenarioHtml(viewer, draft, state.draftError, SIGNED_IN_BUTTONS, {
      id: approveId,
    });
    loadPhotos(submission);
    return;
  }
  if (location.hash === NEW_SCENARIO_HASH) {
    // A job's draft is not carried into a blank new scenario.
    if (state.approvingJob) {
      state.draft = emptyScenarioDraft();
      state.approvingJob = '';
    }
    app.innerHTML = newScenarioHtml(viewer, state.draft, state.draftError, SIGNED_IN_BUTTONS);
    return;
  }
  const scenarioId = currentScenarioId();
  if (scenarioId) {
    const view = scenarioViewFor(scenarioId);
    if (view.edit?.deleted) app.innerHTML = deletedScenarioHtml(viewer, SIGNED_IN_BUTTONS);
    else {
      const draw = view.written ? scenarioEditorHtml : goneScenarioHtml;
      app.innerHTML = draw(viewer, view, SIGNED_IN_BUTTONS);
    }
    return;
  }
  const guideline = currentGuideline();
  if (guideline) {
    app.innerHTML = guidelineHtml(viewer, guideline, guidelineItems(guideline), state);
    return;
  }
  const scenarioSection = scenarioSectionHtml(
    scenarioRows(),
    Boolean(state.openSections.Scenarios),
  );
  const sections = submissionSectionHtml(state.submissions) + scenarioSection;
  app.innerHTML = homeHtml(viewer, reviewItems(), guidelineRows(), state, sections);
}

/* ---------- Reading the form ---------- */

// The non-empty, trimmed lines of a text box.
const linesOf = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** The edit the open form describes (see editFromValues); null when nothing differs. */
function editFromForm(question) {
  const values = {};
  EDIT_FIELDS[question.kind].forEach((name) => {
    const box = app.querySelector(`[data-field="${name}"]`);
    values[name] = LIST_FIELDS.includes(name) ? linesOf(box.value) : box.value.trim();
  });
  return editFromValues(question, values, app.querySelector('#field-off').checked);
}

/** The edit made by the text changed in place: that one text, on top of any earlier edit. */
function editFromBox() {
  const { id, field, index } = state.openBox;
  const item = guidelineItems(currentGuideline()).find((each) => each.id === id);
  const text = document.getElementById('box-text').value;
  return editFromValues(item.question, boxValues(item, field, index, text), item.edit?.off);
}

/** Opens one text of a question or value of a scenario for changing in place, with the cursor in it. */
function openBox(target) {
  const { id, editField, editIndex, path } = target.dataset;
  state.openId = '';
  state.boxError = '';
  state.openPath = path || '';
  state.openBox = path ? null : { id, field: editField, index: Number(editIndex) };
  render();
  document.getElementById('box-text')?.focus();
}

/* ---------- Clicks and typing ---------- */

const ACTIONS = {
  'sign-in': () => {
    const passcode = document.getElementById('editor-passcode').value.trim();
    if (passcode) signIn(passcode);
  },
  'sign-out': () => {
    signOut();
    render();
  },
  refresh: () => {
    state.photoData = {};
    request({ action: 'editor-open' });
  },
  open: (id) => {
    state.openId = id;
    state.openBox = null;
    render();
    document.getElementById(`q-${id}`)?.scrollIntoView();
  },
  close: () => {
    state.openId = '';
    state.openBox = null;
    state.openPath = '';
    state.boxError = '';
    render();
  },
  'scenario-box-save': saveScenarioBox,
  'submission-approve': approveAsItIs,
  'submission-edit': (id) => (location.hash = `${APPROVE_HASH_PREFIX}${encodeURIComponent(id)}`),
  'submission-reject': (id) => {
    state.confirmingReject = id;
    render();
  },
  'submission-reject-confirm': reject,
  'submission-reject-cancel': () => {
    state.confirmingReject = '';
    render();
  },
  'scenario-off': () => changeScenarioEdit((view) => scenarioEditOff(view.edit, !view.edit?.off)),
  'scenario-undo': () => changeScenarioEdit(() => null),
  'scenario-delete': () => {
    state.isDeleting = true;
    render();
  },
  'scenario-delete-no': () => {
    state.isDeleting = false;
    render();
  },
  'scenario-delete-yes': deleteScenario,
  'draft-add-patient': () => changeDraftPatients((patients) => [...patients, emptyPatient()]),
  'draft-save': saveDraft,
  'box-save': (id) => saveEdit(id, editFromBox()),
  save: (id) => saveEdit(id, editFromForm(questionBank().byId[id].question)),
  remove: (id) => saveEdit(id, null),
  // The guideline's new wording is accepted under the edit: the edit stays, checked against it.
  keep: (id) => {
    const { question } = questionBank().byId[id];
    saveEdit(id, { ...state.edits[id], was: snapshot(question) });
  },
};

app.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, path } = button.dataset;
  if (action === 'edit-box') openBox(button);
  else if (action === 'scenario-keep') {
    changeScenarioEdit((view) => keepScenarioPath(view.written, view.edit, path));
  } else if (action === 'scenario-drop')
    changeScenarioEdit((view) => dropScenarioPath(view.edit, path));
  else if (action === 'draft-remove-patient') {
    const index = Number(button.dataset.index);
    changeDraftPatients((patients) => patients.filter((patient, each) => each !== index));
  } else if (action === 'draft-add-vitals') {
    changeDraftLaterVitals(Number(button.dataset.index), (sets) => [...sets, emptyLaterVitals()]);
  } else if (action === 'draft-remove-vitals') {
    const set = Number(button.dataset.set);
    changeDraftLaterVitals(Number(button.dataset.index), (sets) =>
      sets.filter((each, index) => index !== set),
    );
  } else if (action === 'draft-remove-photo') {
    const index = Number(button.dataset.index);
    state.draft = { ...state.draft, photos: state.draft.photos.filter((each, i) => i !== index) };
    render();
  } else if (ACTIONS[action]) ACTIONS[action](button.dataset.id);
});
// Keys: Enter signs in or opens a focused box; in a box, Escape cancels and Ctrl+Enter saves.
app.addEventListener('keydown', (event) => {
  const { target } = event;
  if (event.key === 'Enter' && target.id === 'editor-passcode') ACTIONS['sign-in']();
  else if (event.key === 'Enter' && target.dataset.action === 'edit-box') {
    event.preventDefault();
    openBox(target);
  } else if (target.id === 'box-text' && event.key === 'Escape') ACTIONS.close();
  else if (target.id === 'box-text' && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    if (state.openPath) saveScenarioBox();
    else ACTIONS['box-save'](state.openBox.id);
  }
});
// Only the list is redrawn while typing, so the search box keeps its place. The new scenario
// form is not redrawn at all: each box's text is kept in the draft as it is typed.
app.addEventListener('input', (event) => {
  const { draft } = event.target.dataset;
  if (draft) {
    state.draft = withScenarioValue(state.draft, draft, event.target.value);
    return;
  }
  if (event.target.id !== 'editor-search') return;
  state.search = event.target.value;
  document.getElementById('editor-rows').innerHTML = guidelineRowsHtml(
    guidelineRows(),
    state.openSections,
    Boolean(state.search.trim()),
  );
});
// A section opened or closed by hand stays so after a redraw. "toggle" does not bubble.
app.addEventListener(
  'toggle',
  (event) => {
    const { section } = event.target.dataset;
    if (section && !state.search.trim()) state.openSections[section] = event.target.open;
  },
  true,
);
window.addEventListener('hashchange', () => {
  state.isDeleting = false;
  state.openId = '';
  state.openBox = null;
  state.openPath = '';
  state.boxError = '';
  render();
  window.scrollTo(0, 0);
});

applyTheme();
render();
if (passcodeStore.load()) signIn(passcodeStore.load());
