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
import { renderGuidelineDetail, refreshDetailFromState } from './views/detailView.js';
import { renderQueueScreen, refreshQueueViews } from './views/queueView.js';
import { SCREEN, MESSAGES, QUEUE_HASH } from './constants.js';

const app = document.getElementById('app');

function clearHash() {
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch {
    // Some browsers refuse this (for example a sandboxed page). The address just keeps its #.
  }
}

/** Shows the passcode screen. */
export function showLogin(message, passcodeValue) {
  state.screen = SCREEN.LOGIN;
  state.mentorPasscode = '';
  renderLogin(message, passcodeValue);
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

/** Shows the list or the guideline named in the web address. */
export function route() {
  if (state.screen !== SCREEN.TRACKER) return;
  const id = location.hash.slice(1);
  const index = guidelines.findIndex((guideline) => guideline.id === id);
  if (index >= 0) {
    // Remember where the list was scrolled to, so Back returns to the same place.
    if (!app.querySelector('.guideline-body')) state.listScrollY = window.scrollY;
    renderGuidelineDetail(index);
  } else if (id === QUEUE_HASH) {
    if (app.querySelector('.guideline-row')) state.listScrollY = window.scrollY;
    renderQueueScreen();
  } else {
    renderList();
    window.scrollTo(0, state.listScrollY);
  }
}

/** Opens a tracker after the passcode was accepted. */
export function beginTrackerSession(passcode, label, remoteEntries) {
  state.passcode = passcode;
  state.label = label || '';
  state.entries = mergeRemoteEntries({}, remoteEntries || {}).entries;
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
  clearTimeout(state.syncTimer);
  state.passcode = '';
  state.label = '';
  state.entries = {};
  state.pendingChanges = {};
  state.currentGuideline = null;
  clearSavedSession();
  clearHash();
  showLogin(message);
}

/** Redraws after new data arrived, without losing typing, focus or scroll position. */
export function refreshScreen() {
  if (state.screen !== SCREEN.TRACKER) return;
  const scrollY = window.scrollY;
  if (state.currentGuideline && app.querySelector('.guideline-body')) {
    refreshDetailFromState();
  } else if (app.querySelector('.queue-screen')) {
    refreshQueueViews();
  } else if (!(document.activeElement && document.activeElement.id === 'search-input')) {
    renderList();
    window.scrollTo(0, scrollY);
  }
}
