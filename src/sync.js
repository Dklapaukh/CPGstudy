/*
 * Keeps the phone and the backend in step: queued edits are sent, the newest data comes back.
 * Depends on state.js, api.js, logic.js. Screen actions are supplied by main.js through
 * setSyncHandlers so this file never imports a screen.
 */
import { state, saveSession } from './state.js';
import { sendRequest } from './api.js';
import { mergeRemoteEntries, syncStatusText } from './logic.js';
import {
  SCREEN,
  MESSAGES,
  SYNC_DELAY_AFTER_EDIT_MS,
  SYNC_DELAY_MORE_PENDING_MS,
  SYNC_DELAY_AFTER_FAILURE_MS,
} from './constants.js';

const handlers = { refreshScreen: () => {}, signOut: () => {} };

export function setSyncHandlers(newHandlers) {
  Object.assign(handlers, newHandlers);
}

export function pendingCount() {
  return Object.keys(state.pendingChanges).length;
}

/** Updates every save indicator on the screen. */
export function updateSyncStatus() {
  const text = syncStatusText({
    lastSyncFailed: state.lastSyncFailed,
    isOnline: navigator.onLine,
    pendingCount: pendingCount(),
  });
  document.querySelectorAll('.sync-status').forEach((element) => {
    element.textContent = text;
  });
}

/** Runs a sync after a short pause, replacing any sync already waiting. */
export function scheduleSync(delayMs = SYNC_DELAY_AFTER_EDIT_MS) {
  clearTimeout(state.syncTimer);
  state.syncTimer = setTimeout(syncNow, delayMs);
}

function takePendingChanges() {
  const sentTimestamps = {};
  const changes = Object.keys(state.pendingChanges).map((id) => {
    const { s, n, t } = state.pendingChanges[id];
    sentTimestamps[id] = t;
    return { id, s, n, t };
  });
  return { changes, sentTimestamps };
}

// An edit made while the request was in flight has a newer t, so it stays queued.
function forgetSentChanges(sentTimestamps) {
  Object.keys(sentTimestamps).forEach((id) => {
    const pending = state.pendingChanges[id];
    if (pending && pending.t === sentTimestamps[id]) delete state.pendingChanges[id];
  });
}

/** Sends queued edits (or just asks for the latest data) and merges the reply. */
export async function syncNow() {
  if (state.screen !== SCREEN.TRACKER || !state.passcode || state.syncInProgress) return;
  if (!navigator.onLine) {
    state.lastSyncFailed = true;
    updateSyncStatus();
    return;
  }
  state.syncInProgress = true;
  const { changes, sentTimestamps } = takePendingChanges();
  const code = state.passcode;
  try {
    const request = changes.length ? { action: 'save', code, changes } : { action: 'load', code };
    const response = await sendRequest(request);
    state.syncInProgress = false;
    if (response && !response.ok && response.error === 'not-found') {
      handlers.signOut(MESSAGES.CODE_NOT_RECOGNISED);
      return;
    }
    if (!response || !response.ok) throw new Error('The server did not accept the request');
    forgetSentChanges(sentTimestamps);
    state.lastSyncFailed = false;
    if (response.label) state.label = response.label;
    const merged = mergeRemoteEntries(state.entries, response.data || {});
    state.entries = merged.entries;
    saveSession();
    updateSyncStatus();
    if (merged.changed) handlers.refreshScreen();
    if (pendingCount()) scheduleSync(SYNC_DELAY_MORE_PENDING_MS);
  } catch {
    state.syncInProgress = false;
    state.lastSyncFailed = true;
    updateSyncStatus();
    if (pendingCount()) scheduleSync(SYNC_DELAY_AFTER_FAILURE_MS);
  }
}
