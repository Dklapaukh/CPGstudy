/*
 * Named constants for the app. Depends on nothing.
 * Status codes, wire field names and the backend address are shared with backend/Code.gs.
 * Entry fields (kept short because they are stored on phones and in the Sheet): s = status code,
 * n = note text, t = time of last edit in milliseconds.
 */
export const STORAGE_KEY = 'eas-cpg-tracker-v2';
export const BACKEND_URL =
  'https://script.google.com/macros/s/AKfycbxbWfT-QHIqOAYU2DykLE_rVss4ewVKoWLpKW6j-I_U9heUYyvJ-l71j4oVwduKS4zVVA/exec';

export const REQUEST_TIMEOUT_MS = 20000;
export const SYNC_DELAY_AFTER_EDIT_MS = 900;
export const SYNC_DELAY_MORE_PENDING_MS = 500;
export const SYNC_DELAY_AFTER_FAILURE_MS = 10000;
export const BACKGROUND_SYNC_INTERVAL_MS = 30000;
export const COMMENT_CONFIRMATION_MS = 1500;
export const COMMENT_SNIPPET_LENGTH = 70;
export const DEFAULT_HEADER_COLOUR = '#00693C';

export const STATUS = { INCOMPLETE: 'i', REVIEW: 'v', COMPLETE: 'c' };
export const FILTER = {
  ALL: 'all',
  INCOMPLETE: 'inc',
  REVIEW: 'rev',
  COMPLETE: 'done',
};
// How much more likely a guideline is to be suggested, by status: Incomplete first, then
// Needs review, then Complete. Higher number means more likely.
export const SUGGESTION_WEIGHT = {
  [STATUS.INCOMPLETE]: 6,
  [STATUS.REVIEW]: 3,
  [STATUS.COMPLETE]: 1,
};

// The review queue is saved as one extra entry in the tracker's data, so it needs no backend
// change: its note holds the queue as JSON and its status is always Incomplete.
export const QUEUE_ENTRY_ID = 'review-queue';
export const MAX_QUEUE_SIZE = 5;
export const RELATED_LIST_SIZE = 5;
export const QUEUE_HASH = 'queue';
// Why a guideline is related, by the reason code stored in content/related.js.
export const RELATED_REASON_TEXT = {
  mentions: 'Mentioned in this guideline',
  'mentioned-by': 'Mentions this guideline',
  'shared-medicines': 'Uses some of the same medicines',
  'next-to': 'Next to this guideline in the numbering',
  'same-section': 'Same section',
  chosen: 'Recommended pairing',
};

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
