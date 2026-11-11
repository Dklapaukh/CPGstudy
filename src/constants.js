/*
 * Named constants for the app. Depends on nothing.
 * Status codes, wire field names and the backend address are shared with backend/Code.gs.
 * Entry fields (kept short because they are stored on phones and in the Sheet): s = status code,
 * n = note text, t = time of last edit in milliseconds.
 */
export const STORAGE_KEY = 'eas-cpg-tracker-v2';
export const BACKEND_URL =
  'https://script.google.com/macros/s/AKfycbzbScTinBe66s-qwNsUVVLRc5BtH2yIDJwXnAlfDX6Ah2hcMHoy7hrsmVepqiUL5HXfEw/exec';

export const REQUEST_TIMEOUT_MS = 20000;
export const SYNC_DELAY_AFTER_EDIT_MS = 900;
export const SYNC_DELAY_MORE_PENDING_MS = 500;
export const SYNC_DELAY_AFTER_FAILURE_MS = 10000;
export const BACKGROUND_SYNC_INTERVAL_MS = 30000;
export const COMMENT_CONFIRMATION_MS = 1500;
export const COMMENT_SNIPPET_LENGTH = 70;
export const DEFAULT_HEADER_COLOUR = '#00693C';

export const STATUS = { INCOMPLETE: 'i', REVIEW: 'v', COMPLETE: 'c' };
export const FILTER = { ALL: 'all', INCOMPLETE: 'inc', REVIEW: 'rev', COMPLETE: 'done' };
export const SCREEN = { LOGIN: 'login', MENTOR: 'mentor', TRACKER: 'tracker' };

// First item of each content block in the guideline data.
export const BLOCK = {
  HEADING: 'h',
  PARAGRAPH: 'p',
  BULLET: 'b',
  KEY: 'k',
  BOX: 'box',
  TABLE: 'tbl',
};

export const MESSAGES = {
  NO_SIGNAL: 'Couldn’t reach the server. Check your signal and try again.',
  CODE_NOT_RECOGNISED: 'That passcode wasn’t recognised',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
  NOT_A_MENTOR_CODE: 'That passcode isn’t a mentor passcode.',
  LABEL_NEEDED: 'Please type a label first, for example Sam - 2026.',
  IS_A_MENTOR_CODE: 'That is a mentor passcode. Please type a tracker passcode.',
  UNSENT_CHANGES:
    'Some changes haven’t uploaded yet. If you switch now they will be lost. Switch anyway?',
  STORAGE_BLOCKED:
    'This browser is blocking saved data, so changes can’t be kept on this phone while offline.',
  COPY_FALLBACK: 'Press and hold the code to copy it',
  SAVE_FAILED: 'Could not save on this browser',
};
