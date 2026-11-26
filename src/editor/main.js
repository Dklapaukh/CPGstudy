/*
 * Editor page (editor.html): sign in with an editor passcode, find a guideline, and change its
 * quiz questions: wording, right answers, wrong answers, or leave a question out. Scenarios are
 * changed the same way, on the scenario as learners see it (#s-<id>), and can be created
 * (#new-scenario) or deleted for good. Edits are saved to the
 * Sheet's Edits tab straight away and reach the app the next morning, when scripts/sync-edits.js
 * copies them into content/card-edits.js and content/scenario-edits.js.
 * Under each scenario a Review card grades it and sets the levels it suits (scenarioReviews.js);
 * "Save and next" opens the next one this editor hasn't reviewed. Each part of a scenario has a
 * Comment button for in-line comments, saved under the editor's name (scenarioComments.js).
 * A Benchmark sets section lists each learner level's set (SC-L, scenarioSets.js); a set is
 * changed as a list of scenario ids, saved under its own edit id beside the scenario edits.
 * Jobs sent with the Add a job form wait in their own section; one (#j-<id>) is shown as it was
 * sent, to approve or reject. Approving adds it to Anonymised jobs (anonymisedJobs.js), saved
 * under job|<id> and published the next morning; one approved job (#aj-<id>) has its Lessons
 * learnt and Recordings and links changed there, or is removed.
 * One state object, one way to draw: every change calls render().
 * Depends on staffPage.js, theme.js, questionEdits.js, scenarioEdits.js, scenarioSets.js,
 * scenarioReviews.js, anonymisedJobs.js,
 * guidelines.js, content/anonymised-jobs.js,
 * content/card-edits.js, content/scenarios.js, content/scenario-edits.js, content/scenario-sets.js
 * and the other files of
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
  tidyLevels,
} from '../scenarioEdits.js';
import {
  REVIEW_CRITERIA,
  reviewEditId,
  isReviewEditId,
  readReview,
  reviewFormOf,
  nextUnreviewed,
  reviewedCount,
  reviewersOf,
  fullyReviewedCount,
} from '../scenarioReviews.js';
import {
  commentEditId,
  isCommentEditId,
  commentsWith,
  readSuggestedGuidelines,
  partKind,
} from '../scenarioComments.js';
import {
  SCENARIO_SETS_EDIT_ID,
  liveSets,
  setsEditWith,
  readSetBox,
  setWarnings,
} from '../scenarioSets.js';
import { scenarioSets } from '../../content/scenario-sets.js';
import { anonymisedJobs } from '../../content/anonymised-jobs.js';
import {
  jobEditId,
  jobIdOfEdit,
  newJobEntry,
  jobEntryWith,
  liveJobs,
  readLessonsBox,
  readLinksBox,
  linksBoxText,
} from '../anonymisedJobs.js';
import {
  APPROVED_JOB_HASH_PREFIX,
  jobsSectionHtml,
  approvedJobHtml,
  goneJobHtml,
} from './jobsView.js';
import { REVIEW_FORM_ID, reviewProgressHtml } from './reviewView.js';
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
import { SCENARIO_PHOTO_FOLDER, SCENARIO_EDITING_ENABLED } from '../constants.js';
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
  setsSectionHtml,
  scenarioEditorHtml,
  goneScenarioHtml,
  deletedScenarioHtml,
  newScenarioHtml,
  editingPausedHtml,
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
  reviewForm: null, // the open scenario's Review card as ticked so far: { scenarioId, form }
  reviewError: '', // why the review couldn't be saved
  reviewSavedId: '', // the scenario whose review was just saved, for the note by its buttons
  openComment: '', // the scenario part whose comment box is open (scenarioComments.js)
  commentText: '', // what that box holds, kept for any redraw
  commentGuidelines: '', // the guidelines box of the guidelines part, as CPG numbers
  commentError: '', // why the comment couldn't be saved
  openSet: { level: '', text: '', error: '' }, // the benchmark set being changed (SC-L)
  jobForm: null, // the open approved job's boxes as typed: { id, lessons, links, error }
  confirmingRemoveJob: false, // the open approved job's "Yes, remove it" is showing
};

/* ---------- Talking to the backend ---------- */

// Shown when a scenario change is refused while SCENARIO_EDITING_ENABLED is false.
const SCENARIO_EDITING_PAUSED_MESSAGE =
  'Scenario editing is paused until the scenario review is finished. Reviews and comments still save.';

/**
 * True when a request would change a scenario: saving a scenario edit (scenario|<id>) or the
 * benchmark sets. Reviews, comments and anonymised jobs have other ids.
 */
const changesScenario = (body) =>
  body.action === 'edit-save' && (isScenarioEdit(body.id) || body.id === SCENARIO_SETS_EDIT_ID);

/** Sends a request; on success keeps the edits it returns. Returns true when it worked. */
async function request(body) {
  // The one gate for every scenario write while editing is paused, whichever button led here.
  if (!SCENARIO_EDITING_ENABLED && changesScenario(body)) {
    state.message = SCENARIO_EDITING_PAUSED_MESSAGE;
    render();
    return false;
  }
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
// The published file that carries an edit of this id.
const publishedFileOf = (id) => {
  if (jobIdOfEdit(id)) return anonymisedJobs;
  return isScenarioEdit(id) ? scenarioEdits : cardEdits;
};
// True when the daily copy already carries this edit unchanged (nothing left to publish).
const isPublished = (id) =>
  JSON.stringify(publishedFileOf(id)[id]) === JSON.stringify(state.edits[id]);
/** The ids of the quiz question edits: not scenario edits, the sets, reviews or comments. */
const questionEditIds = () =>
  Object.keys(state.edits).filter(
    (id) =>
      !isScenarioEdit(id) &&
      id !== SCENARIO_SETS_EDIT_ID &&
      !isReviewEditId(id) &&
      !isCommentEditId(id),
  );

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

/** The Review card's data for a scenario (see reviewCardHtml): the form, any error, and more. */
function reviewViewFor(scenarioId, live) {
  const saved = state.edits[reviewEditId(scenarioId, state.name)] || null;
  const isOpen = state.reviewForm?.scenarioId === scenarioId;
  return {
    form: isOpen ? state.reviewForm.form : reviewFormOf(saved, live),
    error: isOpen ? state.reviewError : '',
    justSaved: state.reviewSavedId === scenarioId,
    savedAt: saved?.at || 0,
    nextId: nextUnreviewed(scenarioOrder(), state.edits, state.name, scenarioId),
    reviewer: state.name,
  };
}

/** The in-line comments' data for a scenario (see editor/scenarioView.js commentHtml). */
function commentsViewFor(scenarioId, live) {
  return {
    saved: state.edits[commentEditId(scenarioId, state.name)] || null,
    openPart: state.openComment,
    text: state.commentText,
    guidelinesText: state.commentGuidelines,
    error: state.commentError,
    patientCount: live.patients.length,
  };
}

/** Every scenario's id in the order of the first screen's list, for "Save and next". */
const scenarioOrder = () => scenarioRows().map((row) => row.id);

/** The first screen's review line: how many this editor has reviewed, and the next. */
function reviewProgress() {
  const ids = scenarioOrder();
  const nextId = nextUnreviewed(ids, state.edits, state.name);
  const href = nextId ? `${SCENARIO_EDITOR_HASH_PREFIX}${encodeURIComponent(nextId)}` : '';
  const reviewed = reviewedCount(ids, state.edits, state.name);
  return reviewProgressHtml(reviewed, ids.length, href, fullyReviewedCount(ids, state.edits));
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
    .map((view) => ({
      ...view.live,
      badge: badgeOf(view.edit),
      isReviewed: Boolean(state.edits[reviewEditId(view.live.id, state.name)]),
      reviewerCount: reviewersOf(view.live.id, state.edits).length,
    }));
}

/* ---------- Benchmark sets (SC-L) ---------- */

const closedSet = () => ({ level: '', text: '', error: '' });

/** Every level's set as learners will see it, as scenario ids, with the editors' change. */
function setsNow() {
  const ids = scenarioRows().map((row) => row.id);
  return liveSets(scenarioSets, state.edits[SCENARIO_SETS_EDIT_ID], ids);
}

/** The sets for the section: each level's scenarios in order, notes on its mix, if edited. */
function setRows() {
  const byId = Object.fromEntries(scenarioRows().map((row) => [row.id, row]));
  const changed = state.edits[SCENARIO_SETS_EDIT_ID]?.sets || {};
  return Object.entries(setsNow()).map(([level, ids]) => {
    const setScenarios = ids.map((id) => byId[id]);
    return {
      level,
      scenarios: setScenarios,
      warnings: setWarnings(level, setScenarios),
      isEdited: Object.hasOwn(changed, level),
    };
  });
}

/** Saves the open set's box, or shows why its text can't be kept. */
function saveSetBox() {
  const { level } = state.openSet;
  const text = document.getElementById('set-text').value;
  const read = readSetBox(
    text,
    scenarioRows().map((row) => row.id),
  );
  if (read.error) {
    state.openSet = { level, text, error: read.error };
    render();
    return;
  }
  const edit = setsEditWith(state.edits[SCENARIO_SETS_EDIT_ID], level, read.value);
  saveSetsEdit(edit);
}

/** Saves the sets edit (null takes it out) and closes the box when it worked. */
async function saveSetsEdit(edit) {
  if (await request({ action: 'edit-save', id: SCENARIO_SETS_EDIT_ID, edit })) {
    state.openSet = closedSet();
  }
  render();
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

/* ---------- Reviews ---------- */

/** What the Review card on the page holds now: { levels, scores, verdict, problems, note }. */
function reviewFormOnPage() {
  const card = document.getElementById(REVIEW_FORM_ID);
  const checked = (name) =>
    [...card.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
  const scores = {};
  REVIEW_CRITERIA.forEach(({ key }) => {
    const [value] = checked(`score-${key}`);
    if (value) scores[key] = Number(value);
  });
  const note = card.querySelector('#review-note').value;
  const textsOf = (data) =>
    Object.fromEntries(
      [...card.querySelectorAll(`[data-${data}]`)].map((box) => [box.dataset[data], box.value]),
    );
  return {
    levels: checked('levels'),
    scores,
    verdict: checked('verdict')[0] || '',
    problems: checked('problems'),
    note,
    answers: textsOf('answer'),
    otherLevels: card.querySelector('#review-other-levels').value,
  };
}

/**
 * The scenario's edit with the levels ticked in the review: { edit } (undefined when they are
 * unchanged) or { error }.
 */
function levelsEdit(view, levels) {
  const same = JSON.stringify(tidyLevels(view.live.levels)) === JSON.stringify(tidyLevels(levels));
  if (same) return {};
  if (view.edit?.added) return addedScenarioEditWith(view.edit, 'levels', levels, isGuidelineId);
  return { edit: scenarioEditWith(view.written, view.edit, 'levels', levels) };
}

/** Saves the open scenario's review (and its levels, when changed); then the next, if asked. */
async function saveReview(goNext) {
  const scenarioId = currentScenarioId();
  const view = scenarioViewFor(scenarioId);
  const form = reviewFormOnPage();
  state.reviewForm = { scenarioId, form };
  const read = readReview(form, scenarioId, state.name, Date.now());
  // While scenario editing is paused the ticked levels are kept in the review only.
  const levels = read.error || !SCENARIO_EDITING_ENABLED ? {} : levelsEdit(view, form.levels);
  state.reviewError = read.error || levels.error || '';
  state.reviewSavedId = '';
  if (state.reviewError) {
    render();
    return;
  }
  if (
    levels.edit !== undefined &&
    !(await request({ action: 'edit-save', id: view.id, edit: levels.edit }))
  ) {
    return;
  }
  const id = reviewEditId(scenarioId, state.name);
  if (!(await request({ action: 'edit-save', id, edit: read.review }))) {
    // Show why by the buttons, where the editor is looking, not at the top of the page.
    state.reviewError = state.message;
    state.message = '';
    render();
    return;
  }
  state.reviewForm = null;
  state.reviewSavedId = scenarioId;
  const nextId = nextUnreviewed(scenarioOrder(), state.edits, state.name, scenarioId);
  if (goNext && nextId)
    location.hash = `${SCENARIO_EDITOR_HASH_PREFIX}${encodeURIComponent(nextId)}`;
  else render();
}

/* ---------- In-line comments ---------- */

/** Opens one part's comment box with this editor's saved comment in it. */
function openComment(part) {
  const saved = state.edits[commentEditId(currentScenarioId(), state.name)];
  state.openComment = part;
  state.commentText = saved?.comments?.[part] || '';
  state.commentGuidelines = (saved?.addGuidelines || []).map(numberOfGuideline).join(', ');
  state.commentError = '';
  render();
  document.getElementById('comment-text')?.focus();
}

/** Closes the comment box without saving. */
function closeComment() {
  state.openComment = '';
  state.commentError = '';
  render();
}

/**
 * Saves the open comment under this editor's name; for the guidelines part the guidelines to
 * add are checked against the app's list first. Emptying every comment removes the row.
 */
async function saveComment() {
  const scenarioId = currentScenarioId();
  const view = scenarioViewFor(scenarioId);
  const part = state.openComment;
  let addGuidelines;
  if (partKind(part) === 'guidelines') {
    const read = readSuggestedGuidelines(
      state.commentGuidelines,
      guidelineIdOfNumber,
      view.live.guidelines,
    );
    state.commentError = read.error || '';
    if (read.error) {
      render();
      return;
    }
    addGuidelines = read.value;
  }
  const id = commentEditId(scenarioId, state.name);
  const edit = commentsWith(state.edits[id] || null, {
    scenarioId,
    reviewer: state.name,
    at: Date.now(),
    part,
    text: state.commentText,
    addGuidelines,
  });
  if (await request({ action: 'edit-save', id, edit })) closeComment();
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
  const saved = jobId
    ? await saveApprovedJob(read.value, jobId)
    : await saveNewScenario(read.value);
  if (saved) {
    state.draft = emptyScenarioDraft();
    state.draftError = null;
    state.approvingJob = '';
    location.hash = jobId
      ? `${APPROVED_JOB_HASH_PREFIX}${encodeURIComponent(jobId)}`
      : `${SCENARIO_EDITOR_HASH_PREFIX}${encodeURIComponent(read.value.id)}`;
  }
}

/** Saves a whole new scenario as its edit. */
function saveNewScenario(scenario) {
  const id = scenarioEditId(scenario.id);
  return request({ action: 'edit-save', id, edit: { kind: 'scenario', added: scenario } });
}

/**
 * Saves a submitted job, as the form read it, to Anonymised jobs under its own id (AJ-A), then
 * approves it. The entry is saved first, so a job is never approved without it.
 */
async function saveApprovedJob(scenario, jobId) {
  const edit = newJobEntry({ ...scenario, id: jobId }, new Date());
  if (!(await request({ action: 'edit-save', id: jobEditId(jobId), edit }))) return false;
  return request({ action: 'submission-decide', id: jobId, decision: 'approve' });
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

/** Approves a job as it is into Anonymised jobs, or the message says what to fix. */
async function approveAsItIs(jobId) {
  const submission = state.submissions.find((each) => each.id === jobId);
  const draft = scenarioDraftOf(scenarioOfJob(submission), numberOfGuideline);
  const read = readNewScenario(draft, takenScenarioIds(), guidelineIdOfNumber);
  if (read.error) {
    state.message = `Use Edit and approve to fix ${pathName(draft, read.path)}: ${read.error}`;
    render();
    return;
  }
  if (await saveApprovedJob(read.value, jobId)) {
    location.hash = `${APPROVED_JOB_HASH_PREFIX}${encodeURIComponent(jobId)}`;
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

/* ---------- Anonymised jobs (approved) ---------- */

/** The approved jobs, newest first, each marked with whether the app has it as saved. */
const approvedJobRows = () =>
  liveJobs(state.edits).map((job) => ({ ...job, isPublished: isPublished(jobEditId(job.id)) }));

/** The approved job in the address ("#aj-job-abc"), or '' on any other screen. */
function currentApprovedJobId() {
  if (!location.hash.startsWith(APPROVED_JOB_HASH_PREFIX)) return '';
  return decodeURIComponent(location.hash.slice(APPROVED_JOB_HASH_PREFIX.length));
}

/** "26 Nov 2026" from "2026-11-26". */
const dayText = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/**
 * An approved job's screen data (see approvedJobHtml), or null when there is no such job. Its
 * photos show the copy fetched this session until the daily copy has published them.
 */
function approvedJobViewFor(id) {
  const job = approvedJobRows().find((each) => each.id === id);
  if (!job) return null;
  if (state.jobForm?.id !== id) {
    state.jobForm = {
      id,
      lessons: job.lessons.join('\n'),
      links: linksBoxText(job.links),
      error: '',
    };
    state.confirmingRemoveJob = false;
  }
  const photos = (job.photos || []).map((photo) => ({
    ...photo,
    src: state.photoBySrc[photo.src] || photo.src,
  }));
  return {
    job: { ...job, photos },
    dateText: dayText(job.approved),
    lessonsText: state.jobForm.lessons,
    linksText: state.jobForm.links,
    error: state.jobForm.error,
    isConfirmingRemove: state.confirmingRemoveJob,
    isPublished: job.isPublished,
  };
}

/** Saves the open job's Lessons learnt and Recordings and links, or shows what to fix. */
async function saveJobCard() {
  const id = currentApprovedJobId();
  const lessonsText = document.getElementById('job-lessons').value;
  const linksText = document.getElementById('job-links').value;
  state.jobForm = { id, lessons: lessonsText, links: linksText, error: '' };
  const lessons = readLessonsBox(lessonsText);
  const links = readLinksBox(linksText);
  state.jobForm.error = lessons.error || links.error || '';
  if (state.jobForm.error) {
    render();
    return;
  }
  const edit = jobEntryWith(state.edits[jobEditId(id)], lessons.value, links.value);
  // Drawn again from what was saved, so the boxes show the tidied text.
  if (await request({ action: 'edit-save', id: jobEditId(id), edit })) state.jobForm = null;
  render();
}

/** Removes the open job from the app for good, then back to the first screen. */
async function removeJob() {
  state.confirmingRemoveJob = false;
  const id = jobEditId(currentApprovedJobId());
  if (await request({ action: 'edit-save', id, edit: null })) location.hash = '#';
}

/** Draws an approved job's screen if the address names one; true when it drew. */
function renderApprovedJob(viewer) {
  const id = currentApprovedJobId();
  if (!id) return false;
  const view = approvedJobViewFor(id);
  app.innerHTML = view
    ? approvedJobHtml(viewer, view, SIGNED_IN_BUTTONS)
    : goneJobHtml(viewer, SIGNED_IN_BUTTONS);
  return true;
}

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

/** Draws a submitted job's page if the address names one; true when it drew. */
function renderSubmission(viewer) {
  const submissionId = currentSubmissionId();
  if (!submissionId) return false;
  const view = submissionViewFor(submissionId);
  app.innerHTML = view
    ? submissionHtml(viewer, view, SIGNED_IN_BUTTONS)
    : goneSubmissionHtml(viewer, SIGNED_IN_BUTTONS);
  if (view) loadPhotos(view.submission);
  return true;
}

/**
 * Draws the new scenario form filled in from a job if the address asks to edit and approve one;
 * true when it drew. The draft is made from the job only when a different job is opened.
 */
function renderApproval(viewer) {
  const approveId = currentApproveId();
  if (!approveId) return false;
  const submission = state.submissions.find((each) => each.id === approveId);
  if (!submission) {
    app.innerHTML = goneSubmissionHtml(viewer, SIGNED_IN_BUTTONS);
    return true;
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
  return true;
}

/** Draws the blank new scenario form if the address asks for it; true when it drew. */
function renderNewScenario(viewer) {
  if (location.hash !== NEW_SCENARIO_HASH) return false;
  if (!SCENARIO_EDITING_ENABLED) {
    app.innerHTML = editingPausedHtml(viewer, SIGNED_IN_BUTTONS);
    return true;
  }
  // A job's draft is not carried into a blank new scenario.
  if (state.approvingJob) {
    state.draft = emptyScenarioDraft();
    state.approvingJob = '';
  }
  app.innerHTML = newScenarioHtml(viewer, state.draft, state.draftError, SIGNED_IN_BUTTONS);
  return true;
}

/** Draws a scenario's editor, or why it can't be edited, if the address names one; true if drawn. */
function renderScenario(viewer) {
  const scenarioId = currentScenarioId();
  if (!scenarioId) return false;
  const view = scenarioViewFor(scenarioId);
  // Only one scenario's screen has a Review card (the list builds views without one).
  if (view.live) {
    view.review = reviewViewFor(scenarioId, view.live);
    view.comments = commentsViewFor(scenarioId, view.live);
    view.reviewers = reviewersOf(scenarioId, state.edits);
  }
  if (view.edit?.deleted) app.innerHTML = deletedScenarioHtml(viewer, SIGNED_IN_BUTTONS);
  else {
    const draw = view.written ? scenarioEditorHtml : goneScenarioHtml;
    app.innerHTML = draw(viewer, view, SIGNED_IN_BUTTONS);
  }
  return true;
}

/** Draws a guideline's questions if the address names one; true when it drew. */
function renderGuideline(viewer) {
  const guideline = currentGuideline();
  if (!guideline) return false;
  app.innerHTML = guidelineHtml(viewer, guideline, guidelineItems(guideline), state);
  return true;
}

/** Draws the first screen: edits to review, jobs, scenarios and the guideline list. */
function renderHome(viewer) {
  const scenarioSection = scenarioSectionHtml(
    scenarioRows(),
    Boolean(state.openSections.Scenarios),
  );
  const setsSection = setsSectionHtml(
    setRows(),
    state.openSet,
    Boolean(state.openSections['Benchmark sets']),
  );
  const jobsSection = jobsSectionHtml(
    approvedJobRows(),
    Boolean(state.openSections['Anonymised jobs']),
  );
  const sections =
    submissionSectionHtml(state.submissions) +
    jobsSection +
    reviewProgress() +
    scenarioSection +
    setsSection;
  app.innerHTML = homeHtml(viewer, reviewItems(), guidelineRows(), state, sections);
}

// The screens an address can ask for, tried in this order; the first that matches draws.
const ADDRESS_SCREENS = [
  renderSubmission,
  renderApprovedJob,
  renderApproval,
  renderNewScenario,
  renderScenario,
  renderGuideline,
];

/** Draws the screen the state and the address call for. */
function render() {
  if (!state.name) {
    app.innerHTML = signInHtml(state.message, state.isLoading);
    return;
  }
  const viewer = { name: state.name, message: state.message };
  if (ADDRESS_SCREENS.some((drawScreen) => drawScreen(viewer))) return;
  renderHome(viewer);
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
    state.openSet = closedSet();
    state.openId = '';
    state.openBox = null;
    state.openPath = '';
    state.boxError = '';
    render();
  },
  'scenario-box-save': saveScenarioBox,
  'set-open': (level) => {
    state.openSet = { level, text: setsNow()[level].join('\n'), error: '' };
    render();
    document.getElementById('set-text')?.focus();
  },
  'set-save': saveSetBox,
  'set-reset': (level) =>
    saveSetsEdit(setsEditWith(state.edits[SCENARIO_SETS_EDIT_ID], level, null)),
  'review-save': () => saveReview(false),
  'review-save-next': () => saveReview(true),
  'comment-save': saveComment,
  'comment-cancel': closeComment,
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
  'job-save': saveJobCard,
  'job-remove': () => {
    state.confirmingRemoveJob = true;
    render();
  },
  'job-remove-no': () => {
    state.confirmingRemoveJob = false;
    render();
  },
  'job-remove-yes': removeJob,
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
  else if (action === 'comment-open') openComment(button.dataset.part);
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
  } else if (['box-text', 'set-text'].includes(target.id) && event.key === 'Escape') {
    ACTIONS.close();
  } else if (
    target.id === 'set-text' &&
    event.key === 'Enter' &&
    (event.ctrlKey || event.metaKey)
  ) {
    saveSetBox();
  } else if (
    target.id === 'box-text' &&
    event.key === 'Enter' &&
    (event.ctrlKey || event.metaKey)
  ) {
    if (state.openPath) saveScenarioBox();
    else ACTIONS['box-save'](state.openBox.id);
  }
});
// Only the list is redrawn while typing, so the search box keeps its place. The new scenario
// form is not redrawn at all: each box's text is kept in the draft as it is typed.
app.addEventListener('input', (event) => {
  // The comment box is not redrawn while typing; what it holds is kept for any redraw.
  if (event.target.id === 'comment-text') {
    state.commentText = event.target.value;
    return;
  }
  if (event.target.id === 'comment-guidelines') {
    state.commentGuidelines = event.target.value;
    return;
  }
  // The Review card is not redrawn while ticking; what it holds is kept for any redraw.
  if (event.target.closest(`#${REVIEW_FORM_ID}`)) {
    state.reviewForm = { scenarioId: currentScenarioId(), form: reviewFormOnPage() };
    return;
  }
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
  state.confirmingRemoveJob = false;
  state.openSet = closedSet();
  state.reviewForm = null;
  state.reviewError = '';
  state.reviewSavedId = '';
  state.openComment = '';
  state.commentError = '';
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
