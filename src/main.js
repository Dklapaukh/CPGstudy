/*
 * Start-up: restores a saved tracker (or opens the demo on a first visit), connects the parts and starts background syncing and the
 * checks for new guidelines (feature 7).
 * Depends on every other file in src/.
 */
import { state, restoreSession, hasSignedInBefore } from './state.js';
import { setSyncHandlers, syncNow, updateSyncStatus } from './sync.js';
import { attachEventListeners } from './events.js';
import { route, showLogin, openDemo, signOut, refreshScreen } from './navigation.js';
import { recordLoadedContent, checkForUpdate } from './updateState.js';
import { applyTheme } from './theme.js';
import { SCREEN, BACKGROUND_SYNC_INTERVAL_MS } from './constants.js';

/** Starts the app: theme, sync, listeners, then the first screen. */
function startApp() {
  applyTheme();
  setSyncHandlers({ refreshScreen, signOut });
  attachEventListeners();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    syncNow();
    checkForUpdate();
  });
  window.addEventListener('pageshow', () => {
    syncNow();
    checkForUpdate();
  });
  window.addEventListener('online', () => {
    state.lastSyncFailed = false;
    syncNow();
  });
  window.addEventListener('offline', updateSyncStatus);
  setInterval(() => {
    if (!document.hidden) syncNow();
  }, BACKGROUND_SYNC_INTERVAL_MS);

  recordLoadedContent();
  restoreSession();
  if (state.screen === SCREEN.TRACKER) {
    route();
    syncNow();
  } else if (hasSignedInBefore()) {
    showLogin();
  } else {
    openDemo(); // first visit: start on the demo tracker, with its Make an account button
  }
  checkForUpdate();
}

startApp();
