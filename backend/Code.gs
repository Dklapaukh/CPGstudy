/*
 * CPG Mentoring Tracker: shared data service (Google Apps Script).
 * Tabs used in the Sheet: Mentors, Trackers, Data, Managers, Assignments, History, Editors,
 * Edits. Run setup()
 * once, and again after pasting a version that adds tabs (it never changes existing rows).
 * Needs the V8 runtime (Project Settings, "Enable Chrome V8 runtime").
 * The status codes and entry fields (s, n, t) match src/constants.js in the app.
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
// setup() writes this passcode for the first mentor. It is public (it is in this file), so it is
// refused until it has been changed in the Mentors tab (review item C4).
const PLACEHOLDER_MENTOR_PASSCODE = 'change-this-to-a-long-passcode';
// A phone's clock may be a little fast. Edit times further ahead than this are cut back, so a
// wrong clock cannot beat every later edit from other devices.
const MAX_CLOCK_AHEAD_MS = 5 * 60 * 1000;

// Shown when the web app address is opened in a browser, so the owner can check that a redeploy
// reached the address the app uses. Change it whenever the requests the backend accepts change.
const BACKEND_VERSION = 'version with self sign-up and the demo (18 Nov 2026)';

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

const STATUS = { INCOMPLETE: 'i', REVIEW: 'v', COMPLETE: 'c' };

const SHEET = {
  MENTORS: 'Mentors',
  TRACKERS: 'Trackers',
  DATA: 'Data',
  MANAGERS: 'Managers',
  ASSIGNMENTS: 'Assignments',
  HISTORY: 'History',
  EDITORS: 'Editors',
  EDITS: 'Edits',
};

// Extra entries the app keeps in the Data tab (src/constants.js). The manager page's numbers are
// read from their notes; the notes themselves never leave the Sheet through "stats".
const ENTRY_PREFIX = { MARKED: 'marked-', GUIDELINE_QUIZ: 'quiz-order-', FLASHCARDS: 'quiz-' };
const QUIZ_SETTINGS_ENTRY_ID = 'quiz-settings';
const ROLE = { MENTOR: 'mentor', MANAGER: 'manager' };
// Written in the History tab's Source column for rows made by setup() from older data, so
// quiz attempts are only counted from the day History started.
const BACKFILL_SOURCE = 'back-fill';

// Column numbers (counting from 1) of each tab. Change a column here and nowhere else.
const MENTOR_COLUMN = { NAME: 1, PASSCODE: 2 };
const MANAGER_COLUMN = { NAME: 1, PASSCODE: 2 };
const EDITOR_COLUMN = { NAME: 1, PASSCODE: 2 };
const EDIT_COLUMN = { ID: 1, EDIT: 2, EDITOR: 3, UPDATED: 4 };
const ASSIGNMENT_COLUMN = { VIEWER: 1, TRACKER: 2 };
const HISTORY_COLUMN = { TRACKER: 1, ENTRY: 2, VALUE: 3, TIME: 4, SOURCE: 5 };
const TRACKER_COLUMN = { LABEL: 1, PASSCODE: 2, CREATED_BY: 3, CREATED: 4 };
const DATA_COLUMN = { KEY: 1, PASSCODE: 2, GUIDELINE: 3, STATUS: 4, NOTE: 5, UPDATED: 6 };

const HEADERS = {
  Mentors: ['Name', 'Passcode'],
  Trackers: ['Label', 'Passcode', 'Created by', 'Created'],
  Data: ['Key', 'Tracker passcode', 'Guideline', 'Status', 'Note', 'Updated (ms)'],
  Managers: ['Name', 'Passcode'],
  Assignments: ['Viewer name', 'Tracker label'],
  History: ['Tracker passcode', 'Entry', 'Value', 'Time (ms)', 'Source'],
  Editors: ['Name', 'Passcode'],
  Edits: ['Question id', 'Edit (JSON)', 'Editor', 'Updated'],
};
// An edited question's id (src/guidelineQuizPlay.js, src/quizCards.js) and the longest edit kept.
const EDIT_ID_PATTERN = /^[\w.|\-]{1,120}$/;
const MAX_EDIT_LENGTH = 20000;

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
  const mentors = getSheet_(SHEET.MENTORS);
  if (mentors.getLastRow() < 2) {
    mentors.appendRow(['Your name', PLACEHOLDER_MENTOR_PASSCODE]);
  }
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

/**
 * Works out the reply for one request: open, demo, signup, load, save, create, stats or one of
 * the edits ones.
 */
function handleRequest_(request) {
  const code = normalise_(request.code);
  const action = request.action;

  if (code === PLACEHOLDER_MENTOR_PASSCODE) return { ok: false, error: 'placeholder-passcode' };

  if (action === 'open') {
    const tracker = findTracker_(code);
    if (tracker) {
      return { ok: true, role: 'tracker', label: tracker.label, data: readData_(code) };
    }
    const mentor = findMentor_(code);
    if (mentor) return { ok: true, role: 'mentor', name: mentor.name };
    return { ok: false, error: 'not-found', delayBeforeReply: true };
  }

  if (action === 'demo') {
    const demo = findTrackerByLabel_(DEMO_LABEL);
    if (!demo) return { ok: false, error: 'not-found' };
    return { ok: true, code: demo.code, label: demo.label, data: readData_(demo.code) };
  }

  if (action === 'signup') return signUp_(request);

  if (action === 'load') {
    const tracker = findTracker_(code);
    if (!tracker) return { ok: false, error: 'not-found' };
    return { ok: true, label: tracker.label, data: readData_(code) };
  }

  if (action === 'save') {
    if (!findTracker_(code)) return { ok: false, error: 'not-found' };
    const saved = saveChanges_(code, request.changes || []);
    return { ok: true, saved: saved, data: readData_(code) };
  }

  if (action === 'create') {
    const mentor = findMentor_(code);
    if (!mentor) return { ok: false, error: 'not-mentor', delayBeforeReply: true };
    const label = String(request.label || '').trim().slice(0, 60);
    if (!label) return { ok: false, error: 'no-label' };
    const newCode = newPasscode_();
    getSheet_(SHEET.TRACKERS).appendRow([label, newCode, mentor.name, new Date().toISOString()]);
    return { ok: true, code: newCode, label: label };
  }

  if (action === 'stats') {
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

  // The editor page (editor.html): sign in, and save or remove one question's edit.
  if (action === 'editor-open' || action === 'edit-save') {
    const editor = findPerson_(SHEET.EDITORS, EDITOR_COLUMN, code);
    if (!editor) return { ok: false, error: 'not-found', delayBeforeReply: true };
    if (action === 'edit-save' && !saveEdit_(editor.name, request.id, request.edit)) {
      return { ok: false, error: 'bad-edit' };
    }
    return { ok: true, name: editor.name, edits: readEdits_() };
  }

  // Read by the daily copy into the repo (scripts/sync-edits.js). Edits are published anyway.
  if (action === 'edits') return { ok: true, edits: readEdits_() };

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

/** Every edit in the Edits tab as { question id: edit }. Rows that are not JSON are skipped. */
function readEdits_() {
  const rows = getSheet_(SHEET.EDITS).getDataRange().getValues();
  const edits = {};
  for (let i = 1; i < rows.length; i++) {
    try {
      edits[String(cell_(rows[i], EDIT_COLUMN.ID))] = JSON.parse(cell_(rows[i], EDIT_COLUMN.EDIT));
    } catch (err) {
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
  const text = edit === null ? '' : JSON.stringify(edit);
  const isObject = edit === null || (typeof edit === 'object' && !Array.isArray(edit));
  if (!EDIT_ID_PATTERN.test(questionId) || !isObject || text.length > MAX_EDIT_LENGTH) return false;
  const sheet = getSheet_(SHEET.EDITS);
  const found = sheet
    .getRange('A:A')
    .createTextFinder(questionId)
    .matchEntireCell(true)
    .findNext();
  if (edit === null) {
    if (found) sheet.deleteRow(found.getRow());
    return true;
  }
  const row = [questionId, text, editorName, new Date().toISOString()];
  if (found) sheet.getRange(found.getRow(), 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
  return true;
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

function findMentor_(code) {
  return findPerson_(SHEET.MENTORS, MENTOR_COLUMN, code);
}

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

/** Who may see the manager page with this passcode: { role, name }, or null. Mentors first. */
function findViewer_(code) {
  const mentor = findMentor_(code);
  if (mentor) return { role: ROLE.MENTOR, name: mentor.name };
  const manager = findManager_(code);
  return manager ? { role: ROLE.MANAGER, name: manager.name } : null;
}

/**
 * The trackers a viewer may see, as [{ label, code }]: those named beside the viewer's name in
 * the Assignments tab and, for a mentor, those the mentor created. Names and labels are matched
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
    const isOwn =
      viewer.role === ROLE.MENTOR &&
      normalise_(cell_(rows[i], TRACKER_COLUMN.CREATED_BY)) === viewerName;
    const trackerCode = normalise_(cell_(rows[i], TRACKER_COLUMN.PASSCODE));
    if (trackerCode && (isAssigned || isOwn)) trackers.push({ label: label, code: trackerCode });
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
 * { label, lastActive, statuses, marked, quizzes, flashcards }. No notes, comments or passcodes.
 */
function readStats_(trackers) {
  const indexes = trackerIndexes_(trackers);
  const stats = trackers.map(function (tracker) {
    return { label: tracker.label, lastActive: 0, statuses: {}, marked: {}, quizzes: {}, flashcards: {} };
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
  } catch (err) {
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
 * The flashcards in a medicine's quiz note, as [[due day, interval in days], …]. The app stores
 * each card as six numbers, due and interval first (src/quizSchedule.js). Bad data gives [].
 */
function flashcardNumbers_(note) {
  let stored;
  try {
    stored = JSON.parse(note);
  } catch (err) {
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
 * (1 or 0)]. The value is a status code, or a percent for a guideline quiz score.
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
    history.push([
      index,
      id,
      isQuiz ? Number(value) : String(value),
      Number(cell_(rows[i], HISTORY_COLUMN.TIME)) || 0,
      String(cell_(rows[i], HISTORY_COLUMN.SOURCE)) === BACKFILL_SOURCE ? 1 : 0,
    ]);
  }
  return history;
}

/**
 * The History rows one saved change causes: one when the status changed, one when a guideline
 * quiz was played (its "most recent" time moved). Notes are never copied into History.
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
    firstLoggedTime = Math.min(firstLoggedTime, Number(cell_(existing[i], HISTORY_COLUMN.TIME)) || 0);
  }
  const rows = getSheet_(SHEET.DATA).getDataRange().getValues();
  const statusByKey = {};
  for (let i = 1; i < rows.length; i++) {
    statusByKey[String(cell_(rows[i], DATA_COLUMN.KEY))] = String(cell_(rows[i], DATA_COLUMN.STATUS));
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
  if (!/^[\w.\-]{1,40}$/.test(id)) return null;
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
    const found = sheet
      .getRange('A:A')
      .createTextFinder(key)
      .matchEntireCell(true)
      .findNext();
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
    code = pickWord_() + '-' + pickWord_() + '-' + pickWord_() + '-' + (10 + Math.floor(Math.random() * 90));
  } while (findTracker_(code) || findMentor_(code) || findManager_(code));
  return code;
}

function pickWord_() {
  return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
}
