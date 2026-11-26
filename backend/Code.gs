/*
 * CPG study app: shared data service (Google Apps Script).
 * Tabs used in the Sheet: Trackers, Data, Managers, Assignments, History, Editors, Edits,
 * Submissions. (An
 * old Mentors tab is no longer read and can be deleted.) Run setup()
 * once, and again after pasting a version that adds tabs (it never changes existing rows).
 * Needs the V8 runtime (Project Settings, "Enable Chrome V8 runtime").
 * The status codes and entry fields (s, n, t) match src/constants.js in the app.
 * Each sent job gets its own subfolder of a Drive folder (SUBMISSION_FOLDER_NAME) holding its
 * photos, its data (job.json as sent, approved.json once approved) and a Google Doc to read it
 * by, so the Sheet keeps only pointers and no box is limited by a cell's 50,000 characters. The
 * first run of the version that added the Doc (27 Nov 2026) asks the owner to allow Google Docs
 * access as well as Drive.
 */

const WORDS =
  'amber,anchor,apple,arrow,badge,beach,berry,bridge,cedar,cloud,comet,coral,daisy,delta,eagle,' +
  'ember,fern,field,flint,forest,frost,garden,glade,harbor,hazel,heron,island,ivory,jade,kiwi,' +
  'lake,lemon,maple,marsh,meadow,mist,moss,north,oak,ocean,olive,otter,pearl,pine,plum,quartz,' +
  'raven,reef,river,sage,shore,silver,slate,spring,stone,summer,tide,tui,valley,willow,wind,winter';
const WORD_LIST = WORDS.split(',');

const MAX_NOTE_LENGTH = 5000;
const LOCK_WAIT_MS = 20000;
const WRONG_PASSCODE_DELAY_MS = 1500;
// A phone's clock may be a little fast. Edit times further ahead than this are cut back, so a
// wrong clock cannot beat every later edit from other devices.
const MAX_CLOCK_AHEAD_MS = 5 * 60 * 1000;

// Shown when the web app address is opened in a browser, so the owner can check that a redeploy
// reached the address the app uses. Change it whenever the requests the backend accepts change.
const BACKEND_VERSION = 'version with job folders in Drive (27 Nov 2026)';

// The tracker with this label (any case) opens for first-time visitors (action "demo").
const DEMO_LABEL = 'demo';
// Self sign-up (action "signup"). Bots are kept out three ways: a hidden box that people never
// see but form-filling bots fill in, a form that must have been open a few seconds, and a cap on
// sign-ups per hour. The owner is emailed about every sign-up; if the email fails, no account is
// made, so the owner always hears about each one.
const SIGNUP_CREATED_BY = 'Signed up in the app';
const SIGNUP_MIN_FORM_MS = 3000;
const SIGNUP_MAX_PER_HOUR = 20;
const SIGNUP_COUNT_KEY = 'signups-';
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_HOUR_S = 60 * 60;
const MAX_NAME_LENGTH = 60;

// Jobs sent from the Add a scenario form (submit.html, action "scenario-submit"), with no
// sign-in. Bots are kept out as at sign-up: the hidden box, a form open at least
// SUBMIT_MIN_FORM_MS, and an hourly cap. The job is kept as JSON in the Submissions tab and the
// photos (JPEG, made smaller on the phone) go in a private Drive folder; the owner is emailed.
// It waits as Pending until an editor approves or rejects it on the editor page; rejecting
// deletes its photos. Approved jobs are read by the daily copy ("approved-scenarios") and so
// published, photos too. The limits match src/constants.js (SUBMISSION_LIMITS).
const SUBMIT_MIN_FORM_MS = 20000;
// A job is kept in Drive, not a cell; this only stops a huge paste or a bot. The app's own box
// limits come to under 100,000 characters for four full patients.
const MAX_SUBMISSION_LENGTH = 150000;
const MAX_SUBMISSION_IMAGES = 4;
const MAX_IMAGE_BASE64_LENGTH = 2000000; // about 1.5 MB of JPEG
const MAX_CAPTION_LENGTH = 120;
const MAX_TITLE_LENGTH = 80;
const SUBMISSIONS_MAX_PER_HOUR = 30;
const SUBMISSION_COUNT_KEY = 'submissions-';
const SUBMISSION_FOLDER_NAME = 'CPG scenario submissions';
const SUBMISSION_FOLDER_PROPERTY = 'submissionFolderId';
// The files in each job's own folder, and how long a job read from Drive is cached.
const JOB_DATA_FILE = 'job.json';
const APPROVED_DATA_FILE = 'approved.json';
const DRIVE_CACHE_KEY = 'drive-';
const DRIVE_CACHE_S = 6 * ONE_HOUR_S; // the longest CacheService keeps anything
const JOB_DOC_PREFIX = 'Job: ';
// The vitals in the order the app shows them (src/constants.js, SCENARIO_VITALS).
const VITAL_NAMES = [
  ['gcs', 'GCS'],
  ['rr', 'RR'],
  ['spo2', 'SpO2'],
  ['hr', 'HR'],
  ['bp', 'BP'],
  ['temp', 'Temp'],
  ['bgl', 'BGL'],
  ['pain', 'Pain'],
];
const SUBMISSION_STATUS = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' };
const SUBMISSION_DECISIONS = { approve: 'Approved', reject: 'Rejected' };
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

const STATUS = { INCOMPLETE: 'i', REVIEW: 'v', COMPLETE: 'c' };

const SHEET = {
  TRACKERS: 'Trackers',
  DATA: 'Data',
  MANAGERS: 'Managers',
  ASSIGNMENTS: 'Assignments',
  HISTORY: 'History',
  EDITORS: 'Editors',
  EDITS: 'Edits',
  SUBMISSIONS: 'Submissions',
};

// Extra entries the app keeps in the Data tab (src/constants.js). The manager page's numbers are
// read from their notes; the notes themselves never leave the Sheet through "stats".
const ENTRY_PREFIX = {
  MARKED: 'marked-',
  GUIDELINE_QUIZ: 'quiz-order-',
  FLASHCARDS: 'quiz-',
  SCENARIO_RUN: 'scenario-run-',
};
// A scenario debrief rates each outcome 0 (Not done) to 3 (Independent), as DEBRIEF_RATING_TOP
// in src/constants.js.
const DEBRIEF_RATING_TOP = 3;
const QUIZ_SETTINGS_ENTRY_ID = 'quiz-settings';
const ROLE = { MANAGER: 'manager' };
// Written in the History tab's Source column for rows made by setup() from older data, so
// quiz attempts are only counted from the day History started.
const BACKFILL_SOURCE = 'back-fill';

// Column numbers (counting from 1) of each tab. Change a column here and nowhere else.
const MANAGER_COLUMN = { NAME: 1, PASSCODE: 2 };
const EDITOR_COLUMN = { NAME: 1, PASSCODE: 2 };
const EDIT_COLUMN = { ID: 1, EDIT: 2, EDITOR: 3, UPDATED: 4 };
const SUBMISSION_COLUMN = {
  ID: 1,
  SENT: 2,
  SENDER: 3,
  TITLE: 4,
  JOB: 5,
  PHOTOS: 6,
  STATUS: 7,
  DECIDED_BY: 8,
  DECIDED: 9,
};
const ASSIGNMENT_COLUMN = { VIEWER: 1, TRACKER: 2 };
const HISTORY_COLUMN = { TRACKER: 1, ENTRY: 2, VALUE: 3, TIME: 4, SOURCE: 5 };
const TRACKER_COLUMN = { LABEL: 1, PASSCODE: 2, CREATED_BY: 3, CREATED: 4 };
const DATA_COLUMN = { KEY: 1, PASSCODE: 2, GUIDELINE: 3, STATUS: 4, NOTE: 5, UPDATED: 6 };

const HEADERS = {
  Trackers: ['Label', 'Passcode', 'Created by', 'Created'],
  Data: ['Key', 'Tracker passcode', 'Guideline', 'Status', 'Note', 'Updated (ms)'],
  Managers: ['Name', 'Passcode'],
  Assignments: ['Viewer name', 'Tracker label'],
  History: ['Tracker passcode', 'Entry', 'Value', 'Time (ms)', 'Source'],
  Editors: ['Name', 'Passcode'],
  Edits: ['Question id', 'Edit (JSON)', 'Editor', 'Updated'],
  Submissions: [
    'Id',
    'Sent',
    'Sent by',
    'Title',
    'Job (JSON)',
    'Photos (JSON)',
    'Status',
    'Decided by',
    'Decided',
  ],
};
// An edited question's id (src/guidelineQuizPlay.js, src/quizCards.js) and the longest edit kept.
const EDIT_ID_PATTERN = /^[\w.|-]{1,120}$/;
const MAX_EDIT_LENGTH = 20000;
// An approved anonymised job ("job|<id>") is kept in its Drive folder, so it may be longer; the
// Edits row holds only a pointer to it.
const JOB_EDIT_PREFIX = 'job|';
const MAX_JOB_EDIT_LENGTH = MAX_SUBMISSION_LENGTH;

/**
 * Run this from the editor: once at the start, and again after pasting a version that adds tabs.
 * It creates any missing tab and fills History from the marked dates and quiz scores already
 * saved (once only). Existing rows are never changed.
 */
function setup() {
  Object.keys(HEADERS).forEach(function (name) {
    getSheet_(name);
  });
  backfillHistory_();
}

/** Lets you open the web app address in a browser to check it is running, and which version. */
function doGet() {
  return ContentService.createTextOutput('CPG tracker service is running, ' + BACKEND_VERSION);
}

/** Receives every request from the app and returns the reply as JSON. */
function doPost(e) {
  let reply;
  try {
    const request = JSON.parse(e.postData.contents);
    const lock = LockService.getScriptLock();
    lock.waitLock(LOCK_WAIT_MS);
    try {
      reply = handleRequest_(request);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error(err); // Details stay in the Apps Script log, not on the phone.
    reply = { ok: false, error: 'server-error' };
  }
  // Slow down wrong guesses. This happens after the lock is released so it never holds up others.
  if (reply.delayBeforeReply) {
    Utilities.sleep(WRONG_PASSCODE_DELAY_MS);
    delete reply.delayBeforeReply;
  }
  return ContentService.createTextOutput(JSON.stringify(reply)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/** `open`: a tracker's passcode opens it with its data; a wrong one is answered slowly. */
function openTracker_(request, code) {
  const tracker = findTracker_(code);
  if (tracker) {
    return { ok: true, role: 'tracker', label: tracker.label, data: readData_(code) };
  }
  return { ok: false, error: 'not-found', delayBeforeReply: true };
}

/** `demo`: the shared demo tracker, with its passcode and data, for trying the app. */
function openDemo_() {
  const demo = findTrackerByLabel_(DEMO_LABEL);
  if (!demo) return { ok: false, error: 'not-found' };
  return { ok: true, code: demo.code, label: demo.label, data: readData_(demo.code) };
}

/** `load`: a tracker's label and data, read again by an app that already has its passcode. */
function loadTracker_(request, code) {
  const tracker = findTracker_(code);
  if (!tracker) return { ok: false, error: 'not-found' };
  return { ok: true, label: tracker.label, data: readData_(code) };
}

/** `save`: writes the app's changes to a tracker and replies with its data as now saved. */
function saveTracker_(request, code) {
  if (!findTracker_(code)) return { ok: false, error: 'not-found' };
  const saved = saveChanges_(code, request.changes || []);
  return { ok: true, saved: saved, data: readData_(code) };
}

/** `stats` (manager page): the stats and history of the trackers a manager's passcode can see. */
function readViewerStats_(request, code) {
  const viewer = findViewer_(code);
  if (!viewer) return { ok: false, error: 'not-found', delayBeforeReply: true };
  const trackers = viewerTrackers_(viewer);
  return {
    ok: true,
    role: viewer.role,
    name: viewer.name,
    trackers: readStats_(trackers),
    history: readHistory_(trackers),
  };
}

/**
 * The editor page (editor.html): sign in, save or remove one question's edit, look at a
 * submitted job's photo, and approve or reject a submitted job. The passcode is checked first.
 */
function editorAction_(request, code) {
  const editor = findPerson_(SHEET.EDITORS, EDITOR_COLUMN, code);
  if (!editor) return { ok: false, error: 'not-found', delayBeforeReply: true };
  return editorRequest_(editor, request);
}

/** `approved-scenarios`, read by the daily copy, which publishes them: approved jobs and photos. */
function readApprovedScenarios_() {
  return { ok: true, submissions: readSubmissions_(SUBMISSION_STATUS.APPROVED, true) };
}

/**
 * The reply function for each action; each takes (request, normalised passcode). The editor
 * actions (EDITOR_ACTIONS) all go through editorAction_.
 */
const REQUEST_HANDLERS = {
  open: openTracker_,
  demo: openDemo_,
  signup: (request) => signUp_(request),
  load: loadTracker_,
  save: saveTracker_,
  stats: readViewerStats_,
  // Read by the daily copy into the repo (scripts/sync-edits.js). Edits are published anyway.
  edits: () => ({ ok: true, edits: readEdits_() }),
  'scenario-submit': (request) => submitScenario_(request),
  'approved-scenarios': readApprovedScenarios_,
};

/**
 * Works out the reply for one request: open, demo, signup, load, save, stats, one of the
 * editor ones, edits, scenario-submit or approved-scenarios; any other action is a bad-action.
 */
function handleRequest_(request) {
  const code = normalise_(request.code);
  const action = request.action;
  if (EDITOR_ACTIONS.indexOf(action) >= 0) return editorAction_(request, code);
  // A string and an own key only: ["open"] or "toString" must stay a bad-action, as before.
  const isKnown =
    typeof action === 'string' && Object.prototype.hasOwnProperty.call(REQUEST_HANDLERS, action);
  if (isKnown) {
    return REQUEST_HANDLERS[action](request, code);
  }
  return { ok: false, error: 'bad-action' };
}

/**
 * Makes a tracker for a person signing themselves up, after the bot checks, and emails the owner.
 * `request` is { name, website (the hidden box, empty for people), formMs (time the form was
 * open) }. Replies { ok, code, label }, or { ok: false, error } with one of: no-name, too-fast,
 * busy, bad-signup.
 */
function signUp_(request) {
  if (String(request.website || '')) return { ok: false, error: 'bad-signup' };
  if (!(Number(request.formMs) >= SIGNUP_MIN_FORM_MS)) return { ok: false, error: 'too-fast' };
  const name = String(request.name || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
  // A name needs a letter, and "demo" would turn the new account into a second demo.
  if (!/\p{L}/u.test(name) || normalise_(name) === DEMO_LABEL) {
    return { ok: false, error: 'no-name' };
  }

  const cache = CacheService.getScriptCache();
  const countKey = SIGNUP_COUNT_KEY + Math.floor(Date.now() / ONE_HOUR_MS);
  const count = Number(cache.get(countKey)) || 0;
  if (count >= SIGNUP_MAX_PER_HOUR) return { ok: false, error: 'busy' };

  // The email goes first: if it fails (for example before the owner allowed email), the request
  // fails and no account is made.
  MailApp.sendEmail(
    Session.getEffectiveUser().getEmail(),
    'CPG study app: new account for ' + name,
    name +
      ' made an account in the CPG study app on ' +
      new Date().toString() +
      '.\n\nIts row is in the Trackers tab of the Sheet (Created by: ' +
      SIGNUP_CREATED_BY +
      '). Delete that row to remove the account.',
  );
  const code = newPasscode_();
  getSheet_(SHEET.TRACKERS).appendRow([name, code, SIGNUP_CREATED_BY, new Date().toISOString()]);
  cache.put(countKey, String(count + 1), ONE_HOUR_S);
  return { ok: true, code: code, label: name };
}

const EDITOR_ACTIONS = ['editor-open', 'edit-save', 'submission-photo', 'submission-decide'];

/** The reply to an editor's request (see EDITOR_ACTIONS); the passcode is already checked. */
function editorRequest_(editor, request) {
  const action = request.action;
  if (action === 'edit-save' && !saveEdit_(editor.name, request.id, request.edit)) {
    return { ok: false, error: 'bad-edit' };
  }
  if (action === 'submission-photo') {
    const data = submissionPhoto_(request.id, request.index);
    return data ? { ok: true, name: editor.name, data: data } : { ok: false, error: 'gone' };
  }
  if (action === 'submission-decide' && !decideSubmission_(editor.name, request)) {
    return { ok: false, error: 'gone' };
  }
  return {
    ok: true,
    name: editor.name,
    edits: readEdits_(),
    submissions: readSubmissions_(SUBMISSION_STATUS.PENDING, false),
  };
}

/**
 * Keeps one job sent from the Add a scenario form, after the bot checks: photos to Drive, one
 * Pending row, and an email to the owner. `request` is { submission (object), images:
 * [{ data (base64 JPEG), caption }], website (the hidden box), formMs (time the form was open) }.
 * Replies { ok, id }, or { ok: false, error }: bad-submission, too-fast or busy.
 */
function submitScenario_(request) {
  if (String(request.website || '')) return { ok: false, error: 'bad-submission' };
  if (!(Number(request.formMs) >= SUBMIT_MIN_FORM_MS)) return { ok: false, error: 'too-fast' };
  const submission = request.submission;
  const images = Array.isArray(request.images) ? request.images : [];
  const text = JSON.stringify(submission || null);
  const isObject = submission && typeof submission === 'object' && !Array.isArray(submission);
  if (
    !isObject ||
    !String(submission.story || '').trim() ||
    text.length > MAX_SUBMISSION_LENGTH ||
    images.length > MAX_SUBMISSION_IMAGES ||
    !images.every(isGoodImage_)
  ) {
    return { ok: false, error: 'bad-submission' };
  }

  const cache = CacheService.getScriptCache();
  const countKey = SUBMISSION_COUNT_KEY + Math.floor(Date.now() / ONE_HOUR_MS);
  const count = Number(cache.get(countKey)) || 0;
  if (count >= SUBMISSIONS_MAX_PER_HOUR) return { ok: false, error: 'busy' };

  // The time, plus a random part so two jobs in the same millisecond still differ.
  const id = 'job-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  const title = String(submission.title || 'Untitled').slice(0, MAX_TITLE_LENGTH);
  const sender =
    String(submission.name || '')
      .trim()
      .slice(0, MAX_NAME_LENGTH) || 'Anonymous';
  const folder = makeJobFolder_(id, title);
  const photos = images.map(function (image, index) {
    return saveSubmissionPhoto_(folder, id, index, image);
  });
  const pointer = { folder: folder.getId(), drive: writeFolderFile_(folder, JOB_DATA_FILE, text) };
  pointer.doc = writeJobDoc_(folder, '', submission, []);
  const row = [id, new Date().toISOString(), sender, title, JSON.stringify(pointer)];
  row.push(JSON.stringify(photos));
  getSheet_(SHEET.SUBMISSIONS).appendRow(row.concat([SUBMISSION_STATUS.PENDING, '', '']));
  cache.put(countKey, String(count + 1), ONE_HOUR_S);
  emailSubmission_(sender, title, photos.length);
  return { ok: true, id: id };
}

/**
 * The submissions with this status, oldest first, as { id, sent, sender, job, photos:
 * [{ caption }] }; with `withPhotoData`, each photo also has its base64 `data`.
 */
function readSubmissions_(status, withPhotoData) {
  const rows = getSheet_(SHEET.SUBMISSIONS).getDataRange().getValues();
  const found = [];
  for (let i = 1; i < rows.length; i++) {
    if (cell_(rows[i], SUBMISSION_COLUMN.STATUS) !== status) continue;
    try {
      const photos = JSON.parse(cell_(rows[i], SUBMISSION_COLUMN.PHOTOS) || '[]');
      found.push({
        id: String(cell_(rows[i], SUBMISSION_COLUMN.ID)),
        sent: String(cell_(rows[i], SUBMISSION_COLUMN.SENT)),
        sender: String(cell_(rows[i], SUBMISSION_COLUMN.SENDER)),
        job: jobOfCell_(cell_(rows[i], SUBMISSION_COLUMN.JOB)),
        photos: photos.map(function (photo) {
          const shown = { caption: photo.caption };
          if (withPhotoData) shown.data = photoData_(photo.file);
          return shown;
        }),
      });
    } catch {
      console.error('Submissions row ' + (i + 1) + ' is not JSON'); // left for the owner to fix
    }
  }
  return found;
}

/** The row number (counting from 1) and photos of the submission with this id, or null. */
function findSubmission_(id) {
  if (!String(id || '')) return null;
  const found = getSheet_(SHEET.SUBMISSIONS)
    .getRange('A:A')
    .createTextFinder(String(id))
    .matchEntireCell(true)
    .findNext();
  if (!found) return null;
  const row = found.getRow();
  const values = getSheet_(SHEET.SUBMISSIONS)
    .getRange(row, 1, 1, SUBMISSION_COLUMN.DECIDED)
    .getValues()[0];
  return {
    row: row,
    status: cell_(values, SUBMISSION_COLUMN.STATUS),
    title: String(cell_(values, SUBMISSION_COLUMN.TITLE) || 'Untitled'),
    photos: JSON.parse(cell_(values, SUBMISSION_COLUMN.PHOTOS) || '[]'),
    pointer: pointerOfCell_(cell_(values, SUBMISSION_COLUMN.JOB)),
  };
}

/**
 * Where a job is kept: { folder, drive (its data file), doc } for a job sent from 27 Nov 2026,
 * whose cell holds only this pointer; null for an older job kept whole in the cell.
 */
function pointerOfCell_(text) {
  return pointerOf_(safeJson_(text));
}

/** The value when it is a pointer to a job in Drive ({ folder, drive, doc }), else null. */
function pointerOf_(value) {
  return value && typeof value.drive === 'string' && typeof value.folder === 'string'
    ? value
    : null;
}

/** The job a Submissions cell holds, read from Drive when the cell is a pointer. */
function jobOfCell_(text) {
  const pointer = pointerOfCell_(text);
  return pointer ? readDriveJson_(pointer.drive) : JSON.parse(text);
}

/** A Drive file's JSON, cached for a while, since the editor page reads every job at once. */
function readDriveJson_(fileId) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(DRIVE_CACHE_KEY + fileId);
  if (cached) return JSON.parse(cached);
  const text = DriveApp.getFileById(fileId).getBlob().getDataAsString();
  try {
    cache.put(DRIVE_CACHE_KEY + fileId, text, DRIVE_CACHE_S);
  } catch {
    // Over CacheService's 100 KB a value: read from Drive each time instead.
  }
  return JSON.parse(text);
}

/** A job's own subfolder of the submissions folder: "2026-11-27 Fall at home (job-abc)". */
function makeJobFolder_(id, title) {
  const name = new Date().toISOString().slice(0, 10) + ' ' + title + ' (' + id + ')';
  return submissionFolder_().createFolder(name);
}

/** Writes JSON text to the folder's file of this name, replacing it; returns its Drive id. */
function writeFolderFile_(folder, name, text) {
  const found = folder.getFilesByName(name);
  if (found.hasNext()) {
    const file = found.next();
    file.setContent(text);
    CacheService.getScriptCache().remove(DRIVE_CACHE_KEY + file.getId());
    return file.getId();
  }
  return folder.createFile(name, text, 'application/json').getId();
}

/**
 * Writes the job's Google Doc in its folder, laid out like the form, making it when `docId` is
 * ''. `job` is as sent or as approved (a scenario); `lessons` are an approved job's. Returns the
 * Doc's id. The data file is what counts, so a failed Doc is only logged.
 */
function writeJobDoc_(folder, docId, job, lessons) {
  try {
    let doc;
    if (docId) {
      doc = DocumentApp.openById(docId);
      doc.getBody().clear();
    } else {
      doc = DocumentApp.create(JOB_DOC_PREFIX + String(job.title || 'Untitled'));
      DriveApp.getFileById(doc.getId()).moveTo(folder);
    }
    const body = doc.getBody();
    jobDocLines_(job, lessons).forEach(function (line) {
      const paragraph = body.appendParagraph(line[1]);
      if (line[0]) paragraph.setHeading(DocumentApp.ParagraphHeading[line[0]]);
    });
    doc.saveAndClose();
    return doc.getId();
  } catch (err) {
    console.error(err);
    return docId || '';
  }
}

/** The Doc's paragraphs as [heading kind or '', text], in the form's order; empty boxes left out. */
function jobDocLines_(job, lessons) {
  const lines = [['TITLE', String(job.title || 'Untitled')]];
  const add = function (label, text) {
    if (!String(text || '').trim() || text === 'Not given') return;
    lines.push(['HEADING2', label], ['', String(text)]);
  };
  if (job.suburb) lines.push(['', String(job.suburb)]);
  add('Dispatch notes', job.dispatch);
  // An approved job's story already starts with its dispatch notes.
  add(job.dispatch === undefined ? 'Dispatch notes and history' : 'History', job.story);
  const patients = Array.isArray(job.patients) ? job.patients : [];
  patients.forEach(function (patient, index) {
    const label = patient.label ? ': ' + patient.label : '';
    lines.push(['HEADING1', patients.length > 1 ? 'Patient ' + (index + 1) + label : 'Patient']);
    add('Medical history', patient.history);
    add('Medications', patient.medications);
    add('Allergies', patient.allergies);
    add('Social history', patient.social);
    vitalSetsOf_(patient).forEach(function (set, setIndex) {
      add('Vitals ' + (setIndex + 1) + (set.note ? ': ' + set.note : ''), vitalsText_(set.vitals));
    });
    add('Assessment', patient.assessment);
    add('Treatment and response', patient.treatment);
    add('Follow up', patient.followUp);
  });
  add('Guidelines used', (job.guidelines || []).map(guidelineNumber_).join(', '));
  add('Learning points', job.intention);
  add('Lessons learnt', (lessons || []).join('\n'));
  return lines;
}

/** A patient's vitals sets: as sent (vitalSets), or as approved (vitals, then laterVitals). */
function vitalSetsOf_(patient) {
  if (Array.isArray(patient.vitalSets)) return patient.vitalSets;
  const first = { note: patient.vitalsNote || '', vitals: patient.vitals || {} };
  return [first].concat(Array.isArray(patient.laterVitals) ? patient.laterVitals : []);
}

/** "GCS 15, HR 48, BP 88/54": the vitals that were measured. */
function vitalsText_(vitals) {
  return VITAL_NAMES.filter(function (pair) {
    const value = String((vitals || {})[pair[0]] || '').trim();
    return value && value !== '–';
  })
    .map(function (pair) {
      return pair[1] + ' ' + String(vitals[pair[0]]).trim();
    })
    .join(', ');
}

/** A guideline's CPG number from its id: "cpg-3-2" is "3.2". */
function guidelineNumber_(id) {
  return String(id).replace(/^cpg-/, '').replace(/-/g, '.');
}

/** One photo of a submission as base64, for the editor page; '' when there is none. */
function submissionPhoto_(id, index) {
  const submission = findSubmission_(id);
  const photo = submission && submission.photos[Number(index)];
  return photo ? photoData_(photo.file) : '';
}

/** A Drive file's contents as base64. */
function photoData_(fileId) {
  return Utilities.base64Encode(DriveApp.getFileById(fileId).getBlob().getBytes());
}

/**
 * Approves or rejects a Pending submission (`request` is { id, decision: approve or reject }),
 * noting who and when. Rejecting deletes its photos. False when there is no such Pending job.
 */
function decideSubmission_(editorName, request) {
  const status = SUBMISSION_DECISIONS[request.decision];
  const submission = findSubmission_(request.id);
  if (!status || !submission || submission.status !== SUBMISSION_STATUS.PENDING) return false;
  if (status === SUBMISSION_STATUS.REJECTED && submission.pointer) {
    DriveApp.getFolderById(submission.pointer.folder).setTrashed(true); // its photos, data and Doc
  } else if (status === SUBMISSION_STATUS.REJECTED) {
    submission.photos.forEach(function (photo) {
      DriveApp.getFileById(photo.file).setTrashed(true);
    });
  }
  getSheet_(SHEET.SUBMISSIONS)
    .getRange(submission.row, SUBMISSION_COLUMN.STATUS, 1, 3)
    .setValues([[status, editorName, new Date().toISOString()]]);
  return true;
}

/** True for a photo the form could have sent: base64 JPEG data and a short caption. */
function isGoodImage_(image) {
  if (!image || typeof image !== 'object') return false;
  const data = String(image.data || '');
  return (
    data.length > 0 &&
    data.length <= MAX_IMAGE_BASE64_LENGTH &&
    BASE64_PATTERN.test(data) &&
    String(image.caption || '').length <= MAX_CAPTION_LENGTH
  );
}

/** Saves one photo in the job's folder; returns { file (its Drive id), caption }. */
function saveSubmissionPhoto_(folder, id, index, image) {
  const name = id + '-' + (index + 1) + '.jpg';
  const blob = Utilities.newBlob(Utilities.base64Decode(image.data), 'image/jpeg', name);
  const file = folder.createFile(blob);
  const caption = String(image.caption || '').trim();
  file.setDescription(caption);
  return { file: file.getId(), caption: caption };
}

/** The private Drive folder for photos, made on first use; its id is kept in script properties. */
function submissionFolder_() {
  const properties = PropertiesService.getScriptProperties();
  const folderId = properties.getProperty(SUBMISSION_FOLDER_PROPERTY);
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch {
      console.error('Submission folder gone, making a new one'); // the owner deleted it
    }
  }
  const folder = DriveApp.createFolder(SUBMISSION_FOLDER_NAME);
  properties.setProperty(SUBMISSION_FOLDER_PROPERTY, folder.getId());
  return folder;
}

/** Tells the owner a job arrived. The row is already saved, so a failed email is only logged. */
function emailSubmission_(sender, title, photoCount) {
  try {
    MailApp.sendEmail(
      Session.getEffectiveUser().getEmail(),
      'CPG study app: new scenario job, ' + title,
      sender +
        ' sent a job for the scenario bank (' +
        photoCount +
        ' photo' +
        (photoCount === 1 ? '' : 's') +
        ').\n\nIt waits for an editor to approve or reject it on the editor page.',
    );
  } catch (err) {
    console.error(err);
  }
}

/** The first tracker with this label (any case), as { label, code }, or null. */
function findTrackerByLabel_(label) {
  const rows = getSheet_(SHEET.TRACKERS).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (normalise_(cell_(rows[i], TRACKER_COLUMN.LABEL)) === label) {
      return {
        label: String(cell_(rows[i], TRACKER_COLUMN.LABEL)),
        code: normalise_(cell_(rows[i], TRACKER_COLUMN.PASSCODE)),
      };
    }
  }
  return null;
}

/**
 * Every edit in the Edits tab as { question id: edit }, an approved job's read from its Drive
 * folder. Rows that are not JSON, or whose Drive file is gone, are skipped.
 */
function readEdits_() {
  const rows = getSheet_(SHEET.EDITS).getDataRange().getValues();
  const edits = {};
  for (let i = 1; i < rows.length; i++) {
    try {
      const edit = JSON.parse(cell_(rows[i], EDIT_COLUMN.EDIT));
      const pointer = edit && pointerOf_(edit.job);
      if (pointer) edit.job = readDriveJson_(pointer.drive);
      edits[String(cell_(rows[i], EDIT_COLUMN.ID))] = edit;
    } catch {
      console.error('Edits row ' + (i + 1) + ' is not JSON'); // left for the owner to fix
    }
  }
  return edits;
}

/**
 * Saves one question's edit (an object), or removes it when `edit` is null. Returns false for a
 * bad id or an edit too long to keep. One row per question id.
 */
function saveEdit_(editorName, id, edit) {
  const questionId = String(id || '');
  const fullText = edit === null ? '' : JSON.stringify(edit);
  const isObject = edit === null || (typeof edit === 'object' && !Array.isArray(edit));
  const isJob =
    questionId.indexOf(JOB_EDIT_PREFIX) === 0 &&
    isObject &&
    edit !== null &&
    Boolean(edit.job) &&
    typeof edit.job === 'object';
  const maxLength = isJob ? MAX_JOB_EDIT_LENGTH : MAX_EDIT_LENGTH;
  if (!EDIT_ID_PATTERN.test(questionId) || !isObject || fullText.length > maxLength) return false;
  const sheet = getSheet_(SHEET.EDITS);
  const found = sheet.getRange('A:A').createTextFinder(questionId).matchEntireCell(true).findNext();
  if (edit === null) {
    if (found) sheet.deleteRow(found.getRow());
    return true;
  }
  const oldText = found ? sheet.getRange(found.getRow(), EDIT_COLUMN.EDIT).getValues()[0][0] : '';
  const kept = isJob
    ? jobEditToKeep_(questionId.slice(JOB_EDIT_PREFIX.length), edit, oldText)
    : edit;
  const text = JSON.stringify(kept);
  if (text.length > MAX_EDIT_LENGTH) return false;
  const row = [questionId, text, editorName, new Date().toISOString()];
  if (found) sheet.getRange(found.getRow(), 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
  return true;
}

/**
 * An approved job's edit as the Edits row keeps it: the job itself goes to approved.json in the
 * job's Drive folder (its Doc rewritten to match), and the row keeps { folder, drive, doc } in
 * its place. The folder is the one the job was sent with, or, for a job sent before folders
 * (27 Nov 2026), one made the first time it is saved. `oldText` is the row's edit before.
 */
function jobEditToKeep_(jobId, edit, oldText) {
  const old = pointerOf_((safeJson_(oldText) || {}).job);
  const submission = old ? null : findSubmission_(jobId);
  const sent = submission && submission.pointer;
  const folder =
    old || sent
      ? DriveApp.getFolderById((old || sent).folder)
      : makeJobFolder_(jobId, String(edit.job.title || 'Untitled').slice(0, MAX_TITLE_LENGTH));
  const drive = writeFolderFile_(folder, APPROVED_DATA_FILE, JSON.stringify(edit.job));
  const doc = writeJobDoc_(folder, (old || sent || {}).doc || '', edit.job, edit.lessons);
  const kept = {};
  Object.keys(edit).forEach(function (key) {
    kept[key] = edit[key];
  });
  kept.job = { folder: folder.getId(), drive: drive, doc: doc };
  return kept;
}

/** Parsed JSON, or null when the text is not JSON. */
function safeJson_(text) {
  try {
    return JSON.parse(text || 'null');
  } catch {
    return null;
  }
}

/** Lower-case, trimmed text, so passcodes are not case sensitive. */
function normalise_(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/** Returns the tab with this name, creating it (with its header row) if missing. */
function getSheet_(name) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.appendRow(HEADERS[name]);
    sheet.setFrozenRows(1);
    // Plain text, so notes are never treated as formulas.
    sheet.getRange('A:E').setNumberFormat('@');
  }
  return sheet;
}

/** Reads a cell from a row of sheet values; `column` counts from 1. */
function cell_(row, column) {
  return row[column - 1];
}

/** The tracker with this passcode, as { label }, or null. Row 1 holds the headings. */
function findTracker_(code) {
  if (!code) return null;
  const rows = getSheet_(SHEET.TRACKERS).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (normalise_(cell_(rows[i], TRACKER_COLUMN.PASSCODE)) === code) {
      return { label: String(cell_(rows[i], TRACKER_COLUMN.LABEL)) };
    }
  }
  return null;
}

/** The manager with this passcode, as { name }, or null. */
function findManager_(code) {
  return findPerson_(SHEET.MANAGERS, MANAGER_COLUMN, code);
}

/** The person with this passcode in a name-and-passcode tab, as { name }, or null. */
function findPerson_(sheetName, columns, code) {
  if (!code) return null;
  const rows = getSheet_(sheetName).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (normalise_(cell_(rows[i], columns.PASSCODE)) === code) {
      return { name: String(cell_(rows[i], columns.NAME)) };
    }
  }
  return null;
}

/** Who may see the manager page with this passcode: { role, name }, or null. */
function findViewer_(code) {
  const manager = findManager_(code);
  return manager ? { role: ROLE.MANAGER, name: manager.name } : null;
}

/**
 * The trackers a viewer may see, as [{ label, code }]: those named beside the viewer's name in
 * the Assignments tab. Names and labels are matched
 * ignoring capitals and outer spaces. The code is used here only and is never sent to the app.
 */
function viewerTrackers_(viewer) {
  const viewerName = normalise_(viewer.name);
  const assignedLabels = {};
  const assignments = getSheet_(SHEET.ASSIGNMENTS).getDataRange().getValues();
  for (let i = 1; i < assignments.length; i++) {
    if (normalise_(cell_(assignments[i], ASSIGNMENT_COLUMN.VIEWER)) === viewerName) {
      assignedLabels[normalise_(cell_(assignments[i], ASSIGNMENT_COLUMN.TRACKER))] = true;
    }
  }
  const trackers = [];
  const rows = getSheet_(SHEET.TRACKERS).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const label = String(cell_(rows[i], TRACKER_COLUMN.LABEL));
    const isAssigned = assignedLabels[normalise_(label)] === true;
    const trackerCode = normalise_(cell_(rows[i], TRACKER_COLUMN.PASSCODE));
    if (trackerCode && isAssigned) trackers.push({ label: label, code: trackerCode });
  }
  return trackers;
}

/** Position of each tracker in `trackers`, by passcode, so replies can name it by number. */
function trackerIndexes_(trackers) {
  const indexes = {};
  trackers.forEach(function (tracker, index) {
    indexes[tracker.code] = index;
  });
  return indexes;
}

/**
 * Numbers for the manager page, one object per tracker in the same order as `trackers`:
 * { label, lastActive, statuses, marked, quizzes, flashcards, scenarios }. No notes, comments or
 * passcodes.
 */
function readStats_(trackers) {
  const indexes = trackerIndexes_(trackers);
  const stats = trackers.map(function (tracker) {
    return {
      label: tracker.label,
      lastActive: 0,
      statuses: {},
      marked: {},
      quizzes: {},
      flashcards: {},
      scenarios: {},
    };
  });
  const rows = getSheet_(SHEET.DATA).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const index = indexes[normalise_(cell_(rows[i], DATA_COLUMN.PASSCODE))];
    if (index !== undefined) addEntryToStats_(stats[index], rows[i]);
  }
  return stats;
}

/** Adds one Data row to a tracker's stats. A note is only ever read for the numbers inside it. */
function addEntryToStats_(stats, row) {
  const id = String(cell_(row, DATA_COLUMN.GUIDELINE));
  const status = String(cell_(row, DATA_COLUMN.STATUS));
  const note = String(cell_(row, DATA_COLUMN.NOTE));
  stats.lastActive = Math.max(stats.lastActive, Number(cell_(row, DATA_COLUMN.UPDATED)) || 0);
  if (id.indexOf(ENTRY_PREFIX.MARKED) === 0) {
    const markedAt = Number(note);
    if (markedAt > 0) stats.marked[id.slice(ENTRY_PREFIX.MARKED.length)] = markedAt;
  } else if (id.indexOf(ENTRY_PREFIX.GUIDELINE_QUIZ) === 0) {
    const score = quizScore_(note);
    if (score) stats.quizzes[id.slice(ENTRY_PREFIX.GUIDELINE_QUIZ.length)] = score;
  } else if (id.indexOf(ENTRY_PREFIX.SCENARIO_RUN) === 0) {
    const record = scenarioRecord_(note);
    if (record.runs.length) stats.scenarios[id.slice(ENTRY_PREFIX.SCENARIO_RUN.length)] = record;
  } else if (id.indexOf(ENTRY_PREFIX.FLASHCARDS) === 0) {
    const cards = id === QUIZ_SETTINGS_ENTRY_ID ? [] : flashcardNumbers_(note);
    if (cards.length) stats.flashcards[id.slice(ENTRY_PREFIX.FLASHCARDS.length)] = cards;
  } else if (status === STATUS.REVIEW || status === STATUS.COMPLETE) {
    stats.statuses[id] = status; // a guideline; one not listed is Incomplete
  }
}

/**
 * The scores in a guideline quiz note: { best, at, last, lastAt } (percents and milliseconds), or
 * null when the note holds none. Older notes have only the best score, which then stands in for
 * the most recent, as in the app (src/guidelineQuizState.js).
 */
function quizScore_(note) {
  let saved;
  try {
    saved = JSON.parse(note);
  } catch {
    return null; // a note edited by hand: no score, as the app treats it
  }
  if (!saved || !isFinite(saved.best) || typeof saved.best !== 'number') return null;
  const hasLast = typeof saved.last === 'number' && isFinite(saved.last);
  return {
    best: saved.best,
    at: Number(saved.at) || 0,
    last: hasLast ? saved.last : saved.best,
    lastAt: Number(hasLast ? saved.lastAt : saved.at) || 0,
  };
}

/**
 * The numbers in a scenario's record (src/scenarioLogic.js): { count, runs }, runs newest first
 * as { at, rated, ratings, struggled }; `rated` is 'competencies' for a run rated on the six
 * competencies (SC-R) and 'outcomes' for an older one. The debrief texts (Went well, To work on, take-away, note) are
 * left out. A rating that is not 0 to DEBRIEF_RATING_TOP is null. Bad data gives no runs.
 */
function scenarioRecord_(note) {
  let saved;
  try {
    saved = JSON.parse(note);
  } catch {
    return { count: 0, runs: [] }; // a damaged note: no runs, as the app treats it
  }
  const runs = [];
  (saved && Array.isArray(saved.runs) ? saved.runs : []).forEach(function (run) {
    if (!run || !isFinite(run.at) || typeof run.at !== 'number') return;
    runs.push({
      at: run.at,
      rated: run.rated === 'competencies' ? 'competencies' : 'outcomes',
      ratings: (Array.isArray(run.ratings) ? run.ratings : []).map(function (rating) {
        const isRating =
          rating === Math.floor(rating) && rating >= 0 && rating <= DEBRIEF_RATING_TOP;
        return typeof rating === 'number' && isRating ? rating : null;
      }),
      struggled: (Array.isArray(run.struggled) ? run.struggled : []).filter(function (id) {
        return typeof id === 'string';
      }),
    });
  });
  const savedCount = saved && saved.count;
  const hasCount = typeof savedCount === 'number' && savedCount === Math.floor(savedCount);
  return { count: hasCount ? Math.max(savedCount, runs.length) : runs.length, runs: runs };
}

/**
 * A run's score: its ratings as a percentage of the most possible, counting only the outcomes
 * rated (scoreOf in src/scenarioLogic.js). '' when nothing was rated.
 */
function scenarioScore_(ratings) {
  const rated = ratings.filter(function (rating) {
    return rating !== null;
  });
  if (!rated.length) return '';
  const points = rated.reduce(function (sum, rating) {
    return sum + rating;
  }, 0);
  return Math.round((points / (rated.length * DEBRIEF_RATING_TOP)) * 100);
}

/**
 * The flashcards in a medicine's quiz note, as [[due day, interval in days], …]. The app stores
 * each card as six numbers, due and interval first (src/quizSchedule.js). Bad data gives [].
 */
function flashcardNumbers_(note) {
  let stored;
  try {
    stored = JSON.parse(note);
  } catch {
    return []; // a damaged note: no cards, as the app treats it
  }
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return [];
  const cards = [];
  Object.keys(stored).forEach(function (key) {
    const values = stored[key];
    const isValid = Array.isArray(values) && values.length === 6 && values.every(isFinite);
    if (isValid) cards.push([Number(values[0]), Number(values[1])]);
  });
  return cards;
}

/**
 * The History rows of these trackers, as [tracker number, entry id, value, time, back-filled
 * (1 or 0)]. The value is a status code, a percent for a guideline quiz score, or a percent or
 * null for a scenario run (null: no outcome was rated).
 */
function readHistory_(trackers) {
  const indexes = trackerIndexes_(trackers);
  const history = [];
  const rows = getSheet_(SHEET.HISTORY).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const index = indexes[normalise_(cell_(rows[i], HISTORY_COLUMN.TRACKER))];
    if (index === undefined) continue;
    const id = String(cell_(rows[i], HISTORY_COLUMN.ENTRY));
    const value = cell_(rows[i], HISTORY_COLUMN.VALUE);
    const isQuiz = id.indexOf(ENTRY_PREFIX.GUIDELINE_QUIZ) === 0;
    const isScenario = id.indexOf(ENTRY_PREFIX.SCENARIO_RUN) === 0;
    let shown = String(value);
    if (isQuiz) shown = Number(value);
    if (isScenario) shown = value === '' ? null : Number(value);
    history.push([
      index,
      id,
      shown,
      Number(cell_(rows[i], HISTORY_COLUMN.TIME)) || 0,
      String(cell_(rows[i], HISTORY_COLUMN.SOURCE)) === BACKFILL_SOURCE ? 1 : 0,
    ]);
  }
  return history;
}

/**
 * The History rows one saved change causes: one when the status changed, one when a guideline
 * quiz was played (its "most recent" time moved), and one per new scenario run (with its score).
 * Notes are never copied into History.
 */
function historyRows_(code, clean, oldStatus, oldNote) {
  const rows = [];
  // An empty or unknown status cell counts as Incomplete, as it does in the app.
  const wasMarked = oldStatus === STATUS.REVIEW || oldStatus === STATUS.COMPLETE;
  const statusBefore = wasMarked ? oldStatus : STATUS.INCOMPLETE;
  if (clean.status !== statusBefore) {
    rows.push([code, clean.id, clean.status, clean.updated, '']);
  }
  if (clean.id.indexOf(ENTRY_PREFIX.GUIDELINE_QUIZ) === 0) {
    const score = quizScore_(clean.note);
    const oldScore = quizScore_(oldNote);
    if (score && score.lastAt > 0 && (!oldScore || oldScore.lastAt !== score.lastAt)) {
      rows.push([code, clean.id, score.last, score.lastAt, '']);
    }
  }
  if (clean.id.indexOf(ENTRY_PREFIX.SCENARIO_RUN) === 0) {
    // Runs newer than the newest one already saved; several if the phone was offline for a while.
    const lastSavedAt = Math.max.apply(
      null,
      [0].concat(
        scenarioRecord_(oldNote).runs.map(function (run) {
          return run.at;
        }),
      ),
    );
    scenarioRecord_(clean.note)
      .runs.filter(function (run) {
        return run.at > lastSavedAt;
      })
      .reverse()
      .forEach(function (run) {
        rows.push([code, clean.id, scenarioScore_(run.ratings), run.at, '']);
      });
  }
  return rows;
}

/** Adds rows to the end of the History tab in one write. */
function appendHistory_(rows) {
  if (rows.length === 0) return;
  const sheet = getSheet_(SHEET.HISTORY);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

/**
 * Fills an empty History tab from what the Data tab already holds: for each "marked-" date the
 * guideline's present status at that date, and for each guideline quiz its best and most recent
 * scores. It does nothing once History holds a back-filled row, and it only adds dates earlier
 * than the first row already there (saves log themselves from then on), so no event is in twice.
 */
function backfillHistory_() {
  const existing = getSheet_(SHEET.HISTORY).getDataRange().getValues();
  let firstLoggedTime = Infinity;
  for (let i = 1; i < existing.length; i++) {
    if (String(cell_(existing[i], HISTORY_COLUMN.SOURCE)) === BACKFILL_SOURCE) return;
    firstLoggedTime = Math.min(
      firstLoggedTime,
      Number(cell_(existing[i], HISTORY_COLUMN.TIME)) || 0,
    );
  }
  const rows = getSheet_(SHEET.DATA).getDataRange().getValues();
  const statusByKey = {};
  for (let i = 1; i < rows.length; i++) {
    statusByKey[String(cell_(rows[i], DATA_COLUMN.KEY))] = String(
      cell_(rows[i], DATA_COLUMN.STATUS),
    );
  }
  const history = [];
  for (let i = 1; i < rows.length; i++) {
    const code = normalise_(cell_(rows[i], DATA_COLUMN.PASSCODE));
    const id = String(cell_(rows[i], DATA_COLUMN.GUIDELINE));
    const note = String(cell_(rows[i], DATA_COLUMN.NOTE));
    if (id.indexOf(ENTRY_PREFIX.MARKED) === 0) {
      const guidelineId = id.slice(ENTRY_PREFIX.MARKED.length);
      const status = statusByKey[code + '|' + guidelineId];
      const isMarked = status === STATUS.REVIEW || status === STATUS.COMPLETE;
      if (isMarked && Number(note) > 0) {
        history.push([code, guidelineId, status, Number(note), BACKFILL_SOURCE]);
      }
    } else if (id.indexOf(ENTRY_PREFIX.GUIDELINE_QUIZ) === 0) {
      const score = quizScore_(note);
      if (score && score.at > 0) history.push([code, id, score.best, score.at, BACKFILL_SOURCE]);
      if (score && score.lastAt > 0 && score.lastAt !== score.at) {
        history.push([code, id, score.last, score.lastAt, BACKFILL_SOURCE]);
      }
    }
  }
  appendHistory_(
    history.filter(function (row) {
      return row[HISTORY_COLUMN.TIME - 1] < firstLoggedTime;
    }),
  );
}

/** Returns this tracker's entries as { guidelineId: { s, n, t } }. */
function readData_(code) {
  const rows = getSheet_(SHEET.DATA).getDataRange().getValues();
  const entries = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (normalise_(cell_(row, DATA_COLUMN.PASSCODE)) === code) {
      entries[String(cell_(row, DATA_COLUMN.GUIDELINE))] = {
        s: String(cell_(row, DATA_COLUMN.STATUS)),
        n: String(cell_(row, DATA_COLUMN.NOTE)),
        t: Number(cell_(row, DATA_COLUMN.UPDATED)) || 0,
      };
    }
  }
  return entries;
}

/** Cleans one change from the app: valid id, known status, limited note, limited time. */
function cleanChange_(change) {
  const id = String(change.id || '');
  if (!/^[\w.-]{1,40}$/.test(id)) return null;
  const isKnownStatus = change.s === STATUS.COMPLETE || change.s === STATUS.REVIEW;
  const now = Date.now();
  return {
    id: id,
    status: isKnownStatus ? change.s : STATUS.INCOMPLETE,
    note: String(change.n || '').slice(0, MAX_NOTE_LENGTH),
    updated: Math.min(Number(change.t) || now, now + MAX_CLOCK_AHEAD_MS),
  };
}

/**
 * Saves each change {id, s, n, t}. The newest change (largest t) wins. Returns how many saved.
 * Every saved change that moves a status or records a quiz score also adds a History row.
 */
function saveChanges_(code, changes) {
  const sheet = getSheet_(SHEET.DATA);
  const history = [];
  let saved = 0;
  changes.forEach(function (change) {
    const clean = cleanChange_(change);
    if (!clean) return;
    const key = code + '|' + clean.id;
    const found = sheet.getRange('A:A').createTextFinder(key).matchEntireCell(true).findNext();
    if (!found) {
      sheet.appendRow([key, code, clean.id, clean.status, clean.note, clean.updated]);
      historyRows_(code, clean, STATUS.INCOMPLETE, '').forEach(function (row) {
        history.push(row);
      });
      saved++;
      return;
    }
    // Status, note and time are next to each other, so one read and one write cover them.
    const cells = sheet.getRange(found.getRow(), DATA_COLUMN.STATUS, 1, 3);
    const old = cells.getValues()[0];
    if (clean.updated >= (Number(old[2]) || 0)) {
      cells.setValues([[clean.status, clean.note, clean.updated]]);
      historyRows_(code, clean, String(old[0]), String(old[1])).forEach(function (row) {
        history.push(row);
      });
      saved++;
    }
  });
  appendHistory_(history);
  return saved;
}

/** Makes a new tracker passcode such as "maple-otter-tide-42" that is not already in use. */
function newPasscode_() {
  let code;
  do {
    code =
      pickWord_() +
      '-' +
      pickWord_() +
      '-' +
      pickWord_() +
      '-' +
      (10 + Math.floor(Math.random() * 90));
  } while (findTracker_(code) || findManager_(code));
  return code;
}

/** One random word from WORD_LIST, for new passcodes. */
function pickWord_() {
  return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
}
