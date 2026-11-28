/*
 * CPG study app: shared data service (Google Apps Script).
 * Tabs used in the Sheet: Trackers, Data, Managers, Assignments, History, Editors, Edits. (An
 * old Mentors tab, and the Submissions tab and "CPG scenario submissions" Drive folder of the
 * removed Add a job form, are no longer read and can be deleted.) Run setup()
 * once, and again after pasting a version that adds tabs (it never changes existing rows).
 * Needs the V8 runtime (Project Settings, "Enable Chrome V8 runtime").
 * The status codes and entry fields (s, n, t) match src/constants.js in the app.
 * Anonymised jobs are kept outside the app (docs/anonymised-jobs.md, AJ-L): this service holds
 * no job data and uses no Drive or Docs access.
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
const BACKEND_VERSION = 'version without Add a job or Drive (28 Nov 2026)';

// The actions that write to the Sheet or the sign-up counter. Only these take the script lock,
// so reads (open, demo, load, stats, edits, the editor page) never queue behind a save. Each
// write is one setValues, so a read never sees half of a row.
const WRITE_ACTIONS = ['save', 'signup', 'edit-save'];

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
};
// An edited question's id (src/guidelineQuizPlay.js, src/quizCards.js) and the longest edit kept.
const EDIT_ID_PATTERN = /^[\w.|-]{1,120}$/;
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
    reply =
      WRITE_ACTIONS.indexOf(request.action) >= 0
        ? withLock_(function () {
            return handleRequest_(request);
          })
        : handleRequest_(request);
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

/** Runs `work` while holding the script lock, so two writes never interleave; returns its result. */
function withLock_(work) {
  const lock = LockService.getScriptLock();
  lock.waitLock(LOCK_WAIT_MS);
  try {
    return work();
  } finally {
    lock.releaseLock();
  }
}

/** The request's `since` (a time in ms): only entries edited after it are sent back. 0 = all. */
function sinceOf_(request) {
  return Math.max(0, Number(request.since) || 0);
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

/**
 * `load`: a tracker's label and data, read again by an app that already has its passcode. With
 * `since`, only the entries edited after it.
 */
function loadTracker_(request, code) {
  const tracker = findTracker_(code);
  if (!tracker) return { ok: false, error: 'not-found' };
  return { ok: true, label: tracker.label, data: readData_(code, sinceOf_(request)) };
}

/**
 * `save`: writes the app's changes to a tracker and replies with its data as now saved (with
 * `since`, only the entries edited after it), from the one read of the Data tab the save made.
 */
function saveTracker_(request, code) {
  if (!findTracker_(code)) return { ok: false, error: 'not-found' };
  const result = saveChanges_(code, Array.isArray(request.changes) ? request.changes : []);
  return {
    ok: true,
    saved: result.saved,
    data: entriesOfRows_(result.rows, code, sinceOf_(request)),
  };
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
 * The editor page (editor.html): sign in, and save or remove one question's or scenario's edit.
 * The passcode is checked first.
 */
function editorAction_(request, code) {
  const editor = findPerson_(SHEET.EDITORS, EDITOR_COLUMN, code);
  if (!editor) return { ok: false, error: 'not-found', delayBeforeReply: true };
  return editorRequest_(editor, request);
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
};

/**
 * Works out the reply for one request: open, demo, signup, load, save, stats, one of the
 * editor ones or edits; any other action is a bad-action.
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

const EDITOR_ACTIONS = ['editor-open', 'edit-save'];

/** The reply to an editor's request (see EDITOR_ACTIONS); the passcode is already checked. */
function editorRequest_(editor, request) {
  const action = request.action;
  if (action === 'edit-save' && !saveEdit_(editor.name, request.id, request.edit)) {
    return { ok: false, error: 'bad-edit' };
  }
  return { ok: true, name: editor.name, edits: readEdits_() };
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
 * Every edit in the Edits tab as { question id: edit }. Rows that are not JSON are skipped.
 */
function readEdits_() {
  const rows = getSheet_(SHEET.EDITS).getDataRange().getValues();
  const edits = {};
  for (let i = 1; i < rows.length; i++) {
    try {
      edits[String(cell_(rows[i], EDIT_COLUMN.ID))] = JSON.parse(cell_(rows[i], EDIT_COLUMN.EDIT));
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
  const text = edit === null ? '' : JSON.stringify(edit);
  const isObject = edit === null || (typeof edit === 'object' && !Array.isArray(edit));
  if (!EDIT_ID_PATTERN.test(questionId) || !isObject || text.length > MAX_EDIT_LENGTH) return false;
  const sheet = getSheet_(SHEET.EDITS);
  const found = sheet.getRange('A:A').createTextFinder(questionId).matchEntireCell(true).findNext();
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

/**
 * Returns this tracker's entries as { guidelineId: { s, n, t } }; with `since` (ms), only those
 * edited after it, so a phone that is up to date gets a small reply.
 */
function readData_(code, since) {
  return entriesOfRows_(getSheet_(SHEET.DATA).getDataRange().getValues(), code, since || 0);
}

/** The entries of one tracker in these Data tab rows (row 1 the headings) with t after `since`. */
function entriesOfRows_(rows, code, since) {
  const entries = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const updated = Number(cell_(row, DATA_COLUMN.UPDATED)) || 0;
    if (updated <= since || normalise_(cell_(row, DATA_COLUMN.PASSCODE)) !== code) continue;
    entries[String(cell_(row, DATA_COLUMN.GUIDELINE))] = {
      s: String(cell_(row, DATA_COLUMN.STATUS)),
      n: String(cell_(row, DATA_COLUMN.NOTE)),
      t: updated,
    };
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
 * Saves each change {id, s, n, t}. The newest change (largest t) wins. The Data tab is read once
 * into a key -> row map and written in a few batches (one per run of neighbouring changed rows,
 * one for all new rows), not one search and one write per change. Returns { saved (how many),
 * rows (the Data tab as now saved) }. Every saved change that moves a status or records a quiz
 * score also adds a History row. Called only under the lock (WRITE_ACTIONS).
 */
function saveChanges_(code, changes) {
  const sheet = getSheet_(SHEET.DATA);
  const batch = {
    rows: sheet.getDataRange().getValues(),
    changedRows: {}, // index in rows -> true, for rows already in the tab
    history: [],
  };
  batch.rowOfKey = dataRowIndexes_(batch.rows);
  batch.firstNewRow = batch.rows.length;
  let saved = 0;
  changes.forEach(function (change) {
    const clean = cleanChange_(change);
    if (clean && applyChange_(batch, code, clean)) saved++;
  });
  writeChangedRows_(sheet, batch.rows, Object.keys(batch.changedRows).map(Number));
  writeNewRows_(sheet, batch.rows.slice(batch.firstNewRow), batch.firstNewRow);
  appendHistory_(batch.history);
  return { saved: saved, rows: batch.rows };
}

/**
 * Puts one cleaned change into the batch's rows unless the row holds a newer edit, noting the
 * row to write and its History rows. Returns true when it was saved.
 */
function applyChange_(batch, code, clean) {
  const key = code + '|' + clean.id;
  let index = batch.rowOfKey[key];
  let oldStatus = STATUS.INCOMPLETE;
  let oldNote = '';
  if (index === undefined) {
    index = batch.rows.push([key, code, clean.id, '', '', 0]) - 1;
    batch.rowOfKey[key] = index;
  } else {
    const row = batch.rows[index];
    if (clean.updated < (Number(cell_(row, DATA_COLUMN.UPDATED)) || 0)) return false;
    oldStatus = String(cell_(row, DATA_COLUMN.STATUS));
    oldNote = String(cell_(row, DATA_COLUMN.NOTE));
  }
  setDataValues_(batch.rows[index], clean);
  if (index < batch.firstNewRow) batch.changedRows[index] = true;
  historyRows_(code, clean, oldStatus, oldNote).forEach(function (row) {
    batch.history.push(row);
  });
  return true;
}

/** Each Data tab key -> its index in `rows` (the first row with that key, as the search found). */
function dataRowIndexes_(rows) {
  const rowOfKey = {};
  for (let i = 1; i < rows.length; i++) {
    const key = String(cell_(rows[i], DATA_COLUMN.KEY));
    if (!(key in rowOfKey)) rowOfKey[key] = i;
  }
  return rowOfKey;
}

/** Puts a cleaned change's status, note and time into one row of sheet values. */
function setDataValues_(row, clean) {
  row[DATA_COLUMN.STATUS - 1] = clean.status;
  row[DATA_COLUMN.NOTE - 1] = clean.note;
  row[DATA_COLUMN.UPDATED - 1] = clean.updated;
}

/**
 * Writes the status, note and time of these changed rows (indexes in `rows`): one setValues for
 * each run of neighbouring rows, since status, note and time sit side by side.
 */
function writeChangedRows_(sheet, rows, indexes) {
  indexes.sort(function (a, b) {
    return a - b;
  });
  let runStart = 0;
  for (let i = 1; i <= indexes.length; i++) {
    if (i < indexes.length && indexes[i] === indexes[i - 1] + 1) continue;
    const first = indexes[runStart];
    const values = rows.slice(first, indexes[i - 1] + 1).map(function (row) {
      return row.slice(DATA_COLUMN.STATUS - 1, DATA_COLUMN.UPDATED);
    });
    if (values.length)
      sheet.getRange(first + 1, DATA_COLUMN.STATUS, values.length, 3).setValues(values);
    runStart = i;
  }
}

/** Adds the new rows below the last row of the tab in one write; `firstIndex` is their index. */
function writeNewRows_(sheet, newRows, firstIndex) {
  if (newRows.length === 0) return;
  sheet.getRange(firstIndex + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
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
