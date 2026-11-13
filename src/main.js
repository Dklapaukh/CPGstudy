/*
 * Start-up: restores a saved tracker, connects the parts and starts background syncing and the
 * checks for new guidelines (feature 7).
 * Depends on every other file in src/.
 */
import { state, restoreSession } from './state.js';
import { setSyncHandlers, syncNow, updateSyncStatus } from './sync.js';
import { attachEventListeners } from './events.js';
import { route, showLogin, signOut, refreshScreen } from './navigation.js';
import { recordLoadedContent, checkForUpdate } from './updateState.js';
import { applyTheme } from './settingsState.js';
import { SCREEN, BACKGROUND_SYNC_INTERVAL_MS } from './constants.js';

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
  } else {
    showLogin();
  }
  checkForUpdate();
}

startApp();
