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
// Set once someone opens a tracker other than the demo on this phone.
// Until then the app opens on the demo tracker instead of the passcode screen.
export const SIGNED_IN_BEFORE_KEY = 'eas-cpg-signed-in-v1';
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

// Where "Report a mistake or request" emails go, as [name, domain]. The repository and the site
// are public, so the address is never written whole: it is joined with "@" only when the report
// button is tapped, so it is in neither the source nor the page for address-harvesting robots
// to find. Set to [] to hide the report button.
export const FEEDBACK_ADDRESS_PARTS = ['danya.klapaukh', 'gmail.com'];
export const RELATED_LIST_SIZE = 5;
export const QUEUE_HASH = 'queue';
// Why a guideline is related, by the reason code stored in content/related.js.
export const RELATED_REASON_TEXT = {
  differential: 'Named in the differential diagnosis',
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

export const SCREEN = { LOGIN: 'login', TRACKER: 'tracker' };

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
  // The backend address answered "stats" with "bad-action": it still runs the code from before
  // the manager view, so no passcode can work until it is redeployed (README, "Manager view").
  OLD_BACKEND:
    'The app’s backend address is still running an older version of the backend, so no passcode can work yet. In Apps Script press Deploy, Manage deployments, the pencil, Version: New version, Deploy. Then try again.',
  UNSENT_CHANGES:
    'Some changes haven’t uploaded yet. If you switch now they will be lost. Switch anyway?',
  STORAGE_BLOCKED:
    'This browser is blocking saved data, so changes can’t be kept on this phone while offline.',
  COPY_FALLBACK: 'Press and hold the code to copy it',
  NAME_NEEDED: 'Please type your name first.',
  SIGNUP_TOO_FAST: 'That was very quick. Please wait a moment and press Make my account again.',
  SIGNUP_BUSY: 'Lots of accounts were made in the last hour. Please try again later.',
  DEMO_BANNER:
    'You’re trying the demo, which anyone can use. Make your own account to keep your progress.',
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
// Guideline 1.1, whose table lists the medicines of each practice level (ATP). The quiz can be
// limited to one level; '' (the default) means every medicine.
export const ATP_GUIDELINE_ID = 'cpg-1-1';
export const ALL_PRACTICE_LEVELS = '';
// Daily limits, set on the quiz screen (Decisions Z6 and Z7). New cards come a whole medicine
// at a time; reviews are cards already studied that are due again.
export const QUIZ_NEW_MEDICINES_PER_DAY = { MIN: 1, MAX: 10, STEP: 1, DEFAULT: 2 };
export const QUIZ_REVIEWS_PER_DAY = { MIN: 10, MAX: 200, STEP: 10, DEFAULT: 30 };
// A card rated Again comes back after this many other cards in the same session.
export const QUIZ_AGAIN_GAP = 3;
// A card counts as mastered once its interval reaches this many days (gamification, 18 Nov 2026).
export const QUIZ_MASTERED_INTERVAL_DAYS = 21;
export const RATING = { AGAIN: 'again', HARD: 'hard', GOOD: 'good', EASY: 'easy' };

// Guideline quiz (feature 9): put a guideline's actions in order, then number and
// course-of-treatment questions. The best and most recent score per guideline are saved, as one
// extra entry (GUIDELINE_QUIZ_ENTRY_PREFIX + guideline id), so it needs no backend change.
export const GUIDELINE_QUIZ_HASH = 'guideline-quiz';
export const GUIDELINE_QUIZ_ENTRY_PREFIX = 'quiz-order-';
// "Pick the guideline" quiz: sort pieces of two related guidelines into their boxes. Nothing
// is saved but the streak day.
export const SORT_QUIZ_HASH = 'pick-guideline';
// Medicine test: every topic of one medicine as multiple-choice questions. The best score per
// medicine and practice level is saved (MT-F) as one extra entry (MEDICINE_TEST_ENTRY_PREFIX +
// medicine id), so it needs no backend change; the prefix is not one the backend reads.
export const MEDICINE_TEST_HASH = 'medicine-test';
export const MEDICINE_TEST_ENTRY_PREFIX = 'medicine-test-';
// Scenarios (Quiz > Scenarios): openings for mentors to run, from content/scenarios.js with the
// editors' changes (content/scenario-edits.js). The list is #scenarios and one scenario is
// #scenario-<id>. Finishing one saves its run and debrief (decision 18 Nov 2026, C3) as one extra
// entry (SCENARIO_RUN_ENTRY_PREFIX + scenario id, note = JSON), so it needs no backend change.
export const SCENARIOS_HASH = 'scenarios';
export const SCENARIO_RUN_ENTRY_PREFIX = 'scenario-run-';
// Only the latest runs are kept, and each debrief note is cut to this length, so the entry's
// note stays well under the backend's 5000 characters.
export const SCENARIO_RUNS_KEPT = 3;
export const MAX_DEBRIEF_NOTE = 1000;
// The list's theme dropdown (decision 18 Nov 2026, A1), in this order. A scenario has a theme when
// one of its guidelines is in the named sections or list; Rural is set by hand in the content.
export const SCENARIO_THEMES = [
  { name: 'Paediatrics', sections: ['Paediatrics'], guidelines: ['cpg-2-7', 'cpg-2-9'] },
  { name: 'Obstetrics', sections: ['Pregnancy and Birth'] },
  { name: 'Mental health', sections: ['Mental Health'], guidelines: ['cpg-5-1'] },
  { name: 'Respiratory', sections: ['Respiratory'] },
  { name: 'Cardiac', sections: ['Cardiac'] },
  { name: 'Trauma', sections: ['Trauma'] },
  { name: 'Toxicology', guidelines: ['cpg-5-4', 'cpg-5-5', 'cpg-5-6', 'cpg-5-7'] },
  { name: 'Elderly', guidelines: ['cpg-12-9'] },
  { name: 'Rural', rural: true },
];
export const SCENARIO_HASH_PREFIX = 'scenario-';
export const SCENARIO_LEVELS = {
  1: 'Assessment structure',
  2: 'Common presentations',
  3: 'Added complexity',
  4: 'Delegation',
  5: 'Several patients',
};
// The vitals row, in this order.
export const SCENARIO_VITALS = [
  ['gcs', 'GCS'],
  ['rr', 'RR'],
  ['spo2', 'SpO₂'],
  ['hr', 'HR'],
  ['bp', 'BP'],
  ['temp', 'Temp'],
  ['bgl', 'BGL'],
  ['pain', 'Pain'],
];

// Settings screen. Dark mode belongs to this phone (saved in localStorage under THEME_STORAGE_KEY).
// "Mark for review N days after Complete" belongs to the tracker, so every phone using it shares it:
// one extra entry (APP_SETTINGS_ENTRY_ID, note = JSON), so it needs no backend change. 0 is off.
export const SETTINGS_HASH = 'settings';
export const STATS_HASH = 'stats'; // the Data tab of Settings
export const THEME_STORAGE_KEY = 'eas-cpg-theme-v1';
export const APP_SETTINGS_ENTRY_ID = 'app-settings';
export const REVIEW_AFTER_DAYS = { MIN: 0, MAX: 180, DEFAULT: 0 };

// Study streak (feature 14): the days a quiz was finished, one extra entry (note = JSON), so it
// needs no backend change. About two years of days are kept, far below the note limit.
export const STREAK_ENTRY_ID = 'study-streak';
export const STREAK_DAYS_KEPT = 750;
// The tracker label used for demonstrations: a double tap on its rat switches today's streak
// off and on (owner, 17 Nov 2026). Compared without case or surrounding spaces.
export const DEMO_TRACKER_LABEL = 'demo';
// Two taps closer together than this are a double tap; a single tap waits this long.
export const DOUBLE_TAP_MS = 300;
