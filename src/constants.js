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
// The list is redrawn this long after typing in the search box stops (review item R8).
export const SEARCH_PAUSE_MS = 150;
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
// The date a guideline was last marked Review or Complete is one extra entry per guideline
// (MARKED_ENTRY_PREFIX + guideline id, note = time in milliseconds), so it needs no backend change
// and editing the notes never moves it. Opening a guideline changes nothing.
export const MARKED_ENTRY_PREFIX = 'marked-';

// Where "Report a mistake or request" emails go. Leave empty to hide the email links.
export const FEEDBACK_EMAIL = '';
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

// Feature 7, the update prompt. version.json is published next to index.html and names the
// guideline export date and every file of the app (see README, "Publishing an update").
export const VERSION_FILE_URL = 'version.json';
export const UPDATE_STORAGE_KEY = 'eas-cpg-update-v1'; // separate from STORAGE_KEY on purpose
// Opening the app fires both start-up and "pageshow", so checks closer together are skipped.
export const UPDATE_CHECK_MIN_INTERVAL_MS = 60000;

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
  PLACEHOLDER_PASSCODE:
    'That is the placeholder mentor passcode. Change it in the Mentors tab of the Sheet first.',
  NOT_A_MENTOR_CODE: 'That passcode isn’t a mentor passcode.',
  LABEL_NEEDED: 'Please type a label first, for example Sam - 2026.',
  IS_A_MENTOR_CODE: 'That is a mentor passcode. Please type a tracker passcode.',
  UNSENT_CHANGES:
    'Some changes haven’t uploaded yet. If you switch now they will be lost. Switch anyway?',
  STORAGE_BLOCKED:
    'This browser is blocking saved data, so changes can’t be kept on this phone while offline.',
  COPY_FALLBACK: 'Press and hold the code to copy it',
  SAVE_FAILED: 'Could not save on this browser',
  UPDATE_AVAILABLE: 'A new version of the guidelines is available.',
  UPDATE_BUTTON: 'Update now',
  UPDATE_DOWNLOADING: 'Downloading the update…',
  UPDATE_FAILED: 'Couldn’t download the update. Check your signal and try again.',
  UPDATED_TAG: 'Updated',
  STUDY_AID_NOTICE:
    'Study aid only. The guidelines here are an uncontrolled copy; for clinical use refer to ' +
    'the official guidelines.',
  AI_NOTICE:
    'This app was made with AI and may contain mistakes. Use it for study only. For clinical ' +
    'work, always use the official NZCPG app.',
  FEEDBACK_LINK: 'Report a mistake or request',
  MARKED_PREFIX: { [STATUS.REVIEW]: 'Marked for review', [STATUS.COMPLETE]: 'Marked complete' },
};

// Medicines quiz (flashcards with spaced repetition). Progress is stored through the backend as
// one extra entry per medicine (QUIZ_ENTRY_PREFIX + guideline id), so a note stays far below the
// backend's 5000-character limit and two phones only overwrite each other for the same medicine.
export const QUIZ_HASH = 'quiz';
export const QUIZ_ENTRY_PREFIX = 'quiz-';
export const QUIZ_SETTINGS_ENTRY_ID = 'quiz-settings';
export const QUIZ_SECTION_NAME = 'Medicines';
// Daily limits, set on the quiz screen (Decisions Z6 and Z7). New cards come a whole medicine
// at a time; reviews are cards already studied that are due again.
export const QUIZ_NEW_MEDICINES_PER_DAY = { MIN: 1, MAX: 10, STEP: 1, DEFAULT: 2 };
export const QUIZ_REVIEWS_PER_DAY = { MIN: 10, MAX: 200, STEP: 10, DEFAULT: 30 };
// A card rated Again comes back after this many other cards in the same session.
export const QUIZ_AGAIN_GAP = 3;
export const RATING = { AGAIN: 'again', HARD: 'hard', GOOD: 'good', EASY: 'easy' };
