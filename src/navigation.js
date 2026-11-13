/*
 * Moves between screens: sign in, sign out, the list and the guideline pages.
 * Depends on state.js, sync.js, guidelines.js and the screen files in views/.
 */
import { state, saveSession, clearSavedSession } from './state.js';
import { guidelines } from './guidelines.js';
import { mergeRemoteEntries } from './logic.js';
import { pendingCount, syncNow } from './sync.js';
import { renderLogin } from './views/loginView.js';
import { renderMentor } from './views/mentorView.js';
import { renderList } from './views/listView.js';
import {
  renderGuidelineDetail,
  refreshDetailFromState,
  restoreGuidelinePlace,
} from './views/detailView.js';
import { renderQueueScreen, refreshQueueViews } from './views/queueView.js';
import { renderQuizScreen } from './views/quizView.js';
import { renderGuidelineQuizScreen } from './views/guidelineQuizView.js';
import { renderSettingsScreen } from './views/settingsView.js';
import { applyAutoReview } from './settingsState.js';
import { markGuidelineSeen } from './updateState.js';
import {
  SCREEN,
  MESSAGES,
  QUEUE_HASH,
  QUIZ_HASH,
  GUIDELINE_QUIZ_HASH,
  SETTINGS_HASH,
} from './constants.js';

const app = document.getElementById('app');

function clearHash() {
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch {
    // Some browsers refuse this (for example a sandboxed page). The address just keeps its #.
  }
}

/**
 * Shows the passcode screen. When a tracker is still open (Switch tracker), it stays loaded and
 * the screen has a back link to it; the tracker is only left once another passcode is accepted.
 */
export function showLogin(message, passcodeValue) {
  state.screen = SCREEN.LOGIN;
  state.mentorPasscode = '';
  renderLogin(message, passcodeValue, state.passcode ? state.label : null);
}

/** Goes back from the Switch tracker screen to the tracker that is still open. */
export function returnToTracker() {
  if (!state.passcode) return;
  state.screen = SCREEN.TRACKER;
  clearHash();
  route();
  syncNow(); // edits made before switching were paused while the passcode screen showed
}

/**
 * Leaves the open tracker before another is opened from the Switch tracker screen. Asks first
 * when edits are still waiting to upload. Returns false when the person chose to stay.
 */
export function leaveOpenTracker() {
  if (!state.passcode) return true;
  if (pendingCount() && !confirm(MESSAGES.UNSENT_CHANGES)) return false;
  clearOpenTracker();
  return true;
}

function clearOpenTracker() {
  clearTimeout(state.syncTimer);
  state.passcode = '';
  state.label = '';
  state.entries = {};
  state.pendingChanges = {};
  state.currentGuideline = null;
  state.quiz = null;
  state.guidelineQuiz = null;
  clearSavedSession();
}

/** Shows the mentor screen. `details` is { name, created, message, labelValue, openValue }. */
export function showMentor(details) {
  state.screen = SCREEN.MENTOR;
  state.mentorContext = {
    name: details.name,
    created: details.created || null,
  };
  renderMentor(details);
}

/**
 * Coming back to the guideline whose Quiz pill opened the quiz: ends the play (a finished one is
 * already saved) and puts the guideline back where the student was. Going anywhere else drops
 * the saved place, so it is never restored later by surprise.
 */
function handleQuizReturn(id) {
  const place = state.guidelineQuizReturn;
  if (!place || id === GUIDELINE_QUIZ_HASH) return;
  state.guidelineQuizReturn = null;
  if (id !== place.guidelineId) return;
  state.guidelineQuiz = null;
  restoreGuidelinePlace(place);
}

/** Shows the list or the guideline named in the web address. */
export function route() {
  if (state.screen !== SCREEN.TRACKER) return;
  applyAutoReview(); // Complete guidelines past the "mark for review after" days
  const id = location.hash.slice(1);
  const index = guidelines.findIndex((guideline) => guideline.id === id);
  if (index >= 0) {
    // Remember where the list was scrolled to, so Back returns to the same place.
    if (!app.querySelector('.guideline-body')) state.listScrollY = window.scrollY;
    markGuidelineSeen(id); // the "Updated" tag lasts until the guideline is opened (feature 7)
    renderGuidelineDetail(index);
    handleQuizReturn(id);
  } else if (id === QUEUE_HASH) {
    if (app.querySelector('.guideline-row')) state.listScrollY = window.scrollY;
    renderQueueScreen();
  } else if (id === QUIZ_HASH) {
    if (app.querySelector('.guideline-row')) state.listScrollY = window.scrollY;
    renderQuizScreen();
  } else if (id === SETTINGS_HASH) {
    if (app.querySelector('.guideline-row')) state.listScrollY = window.scrollY;
    renderSettingsScreen();
  } else if (id === GUIDELINE_QUIZ_HASH) {
    if (app.querySelector('.guideline-row')) state.listScrollY = window.scrollY;
    renderGuidelineQuizScreen();
    window.scrollTo(0, 0);
  } else {
    renderList();
    window.scrollTo(0, state.listScrollY);
  }
  if (index < 0) handleQuizReturn(id);
}

/** Opens a tracker after the passcode was accepted. */
export function beginTrackerSession(passcode, label, remoteEntries) {
  state.passcode = passcode;
  state.label = label || '';
  state.entries = mergeRemoteEntries({}, remoteEntries || {}).entries;
  state.quiz = null;
  state.guidelineQuiz = null;
  state.pendingChanges = {};
  saveSession();
  state.mentorPasscode = '';
  state.screen = SCREEN.TRACKER;
  state.syncInProgress = false;
  state.lastSyncFailed = false;
  clearHash();
  route();
  syncNow();
}

/** Leaves the tracker. Asks first when edits are still waiting to upload (unless forced). */
export function signOut(message) {
  if (!message && pendingCount() && !confirm(MESSAGES.UNSENT_CHANGES)) return;
  clearOpenTracker();
  clearHash();
  showLogin(message);
}

/** Redraws after new data arrived, without losing typing, focus or scroll position. */
export function refreshScreen() {
  if (state.screen !== SCREEN.TRACKER) return;
  const scrollY = window.scrollY;
  applyAutoReview(); // new data may hold a newer setting or an older Complete
  if (app.querySelector('.settings-screen')) {
    // Nothing to redraw: redrawing would move the wheel while it is being turned.
  } else if (state.currentGuideline && app.querySelector('.guideline-body')) {
    refreshDetailFromState();
  } else if (app.querySelector('.queue-screen')) {
    refreshQueueViews();
  } else if (app.querySelector('.guideline-quiz-screen')) {
    // Only the picker is redrawn (best scores may have arrived): a play is never interrupted.
    if (!state.guidelineQuiz) renderGuidelineQuizScreen();
  } else if (app.querySelector('.quiz-screen')) {
    // Only the overview is redrawn: redrawing a card would hide an answer being read.
    if (!state.quiz || state.quiz.queue.length === 0) renderQuizScreen();
  } else if (!(document.activeElement && document.activeElement.id === 'search-input')) {
    renderList();
    window.scrollTo(0, scrollY);
  }
}
