/*
 * CPG Mentoring Tracker: shared data service (Google Apps Script).
 * Tabs used in the Sheet: Mentors, Trackers, Data. Run setup() once.
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

const STATUS = { INCOMPLETE: 'i', REVIEW: 'v', COMPLETE: 'c' };

const SHEET = { MENTORS: 'Mentors', TRACKERS: 'Trackers', DATA: 'Data' };

// Column numbers (counting from 1) of each tab. Change a column here and nowhere else.
const MENTOR_COLUMN = { NAME: 1, PASSCODE: 2 };
const TRACKER_COLUMN = { LABEL: 1, PASSCODE: 2, CREATED_BY: 3, CREATED: 4 };
const DATA_COLUMN = { KEY: 1, PASSCODE: 2, GUIDELINE: 3, STATUS: 4, NOTE: 5, UPDATED: 6 };

const HEADERS = {
  Mentors: ['Name', 'Passcode'],
  Trackers: ['Label', 'Passcode', 'Created by', 'Created'],
  Data: ['Key', 'Tracker passcode', 'Guideline', 'Status', 'Note', 'Updated (ms)'],
};

/** Run this once from the editor. It creates the three tabs. */
function setup() {
  Object.keys(HEADERS).forEach(function (name) {
    getSheet_(name);
  });
  const mentors = getSheet_(SHEET.MENTORS);
  if (mentors.getLastRow() < 2) {
    mentors.appendRow(['Your name', PLACEHOLDER_MENTOR_PASSCODE]);
  }
}

/** Lets you open the web app address in a browser to check it is running. */
function doGet() {
  return ContentService.createTextOutput('CPG tracker service is running');
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

/** Works out the reply for one request: open, load, save or create. */
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

  return { ok: false, error: 'bad-action' };
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
  if (!code) return null;
  const rows = getSheet_(SHEET.MENTORS).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (normalise_(cell_(rows[i], MENTOR_COLUMN.PASSCODE)) === code) {
      return { name: String(cell_(rows[i], MENTOR_COLUMN.NAME)) };
    }
  }
  return null;
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

/** Saves each change {id, s, n, t}. The newest change (largest t) wins. Returns how many saved. */
function saveChanges_(code, changes) {
  const sheet = getSheet_(SHEET.DATA);
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
      saved++;
      return;
    }
    const row = found.getRow();
    const oldUpdated = Number(sheet.getRange(row, DATA_COLUMN.UPDATED).getValue()) || 0;
    if (clean.updated >= oldUpdated) {
      // Status, note and time are next to each other, so one write covers them.
      sheet
        .getRange(row, DATA_COLUMN.STATUS, 1, 3)
        .setValues([[clean.status, clean.note, clean.updated]]);
      saved++;
    }
  });
  return saved;
}

/** Makes a new tracker passcode such as "maple-otter-tide-42" that is not already in use. */
function newPasscode_() {
  let code;
  do {
    code = pickWord_() + '-' + pickWord_() + '-' + pickWord_() + '-' + (10 + Math.floor(Math.random() * 90));
  } while (findTracker_(code) || findMentor_(code));
  return code;
}

function pickWord_() {
  return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
}
