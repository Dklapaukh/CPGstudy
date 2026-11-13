/*
 * The one state object and saving it on the phone.
 * Screens are drawn from this state. Depends on constants.js.
 * Saved format {c, l, s, p} is unchanged so people stay signed in after the refactor.
 */
import { STORAGE_KEY, SCREEN, FILTER } from './constants.js';

export const state = {
  screen: SCREEN.LOGIN,
  passcode: '', // tracker passcode
  label: '', // tracker label
  mentorPasscode: '',
  mentorContext: { name: '', created: null }, // what the mentor screen is showing
  entries: {}, // guideline id -> { s, n, t }, the merged view of this tracker
  pendingChanges: {}, // guideline id -> { s, n, t }, edits not yet uploaded
  syncInProgress: false,
  lastSyncFailed: false,
  storageBlocked: false,
  syncTimer: 0,
  searchTimer: 0,
  filter: FILTER.ALL,
  searchText: '',
  listScrollY: 0,
  openSections: {}, // section name -> true while open
  currentGuideline: null,
  // Medicines quiz session { queue: [card ids], revealed, answered }, or null. Memory only; the
  // card schedules themselves are entries (see quizState.js).
  quiz: null,
  practiceChoice: '', // the medicine chosen in the quiz's "Practise one medicine" list
  // Guideline quiz play { guidelineId, steps, index, score, placed, discarded, marked, picked },
  // or null. Memory only; the best scores are entries (see guidelineQuizState.js).
  guidelineQuiz: null,
  guidelineQuizChoice: '', // the guideline chosen on the guideline quiz screen
  // Feature 7, kept on this phone only (see updateState.js), never sent to the backend.
  updateAvailable: false,
  updateInProgress: false,
  updateFailed: false,
  updateCheckInProgress: false,
  lastUpdateCheckAt: 0, // time of the last successful check, in milliseconds
  updatedGuidelineIds: new Set(), // guidelines whose text changed in the last content update
};

/** Saves the signed-in tracker on this phone so it works offline. */
export function saveSession() {
  try {
    const saved = {
      c: state.passcode,
      l: state.label,
      s: state.entries,
      p: state.pendingChanges,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    state.storageBlocked = false;
  } catch {
    state.storageBlocked = true;
  }
}

/** Restores a saved tracker, if any, into the state. */
export function restoreSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.c) {
      state.passcode = saved.c;
      state.label = saved.l || '';
      state.entries = saved.s || {};
      state.pendingChanges = saved.p || {};
      state.screen = SCREEN.TRACKER;
    }
  } catch {
    // Blocked or corrupt storage: starting at the passcode screen is the safe fallback.
  }
}

/** Forgets the saved tracker. */
export function clearSavedSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Blocked storage: there is nothing saved to remove.
  }
}
