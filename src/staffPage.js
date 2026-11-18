/*
 * What the manager and editor pages share: the passcode kept for this browser tab, asking the
 * backend with the messages for its refusals, and the warning box that shows them.
 * Depends on api.js, logic.js and constants.js.
 */
import { sendRequest } from './api.js';
import { escapeHtml } from './logic.js';
import { MESSAGES } from './constants.js';

/** A short note under a heading or field; `text` is trusted markup. */
export const noteHtml = (text) => `<p class="editor-note">${text}</p>`;

/** A button that runs `action` when tapped; `data` is extra attribute markup (see dataIdAttr). */
export const actionButtonHtml = (action, label, data = '', style = 'switch-button') =>
  `<button class="${style}" type="button" data-action="${action}"${data}>${label}</button>`;

/** The escaped ` data-id="…"` attribute that tells an action which item it is for. */
export const dataIdAttr = (id) => ` data-id="${escapeHtml(id)}"`;

// Refusals that mean the passcode or the backend is wrong: the page signs out and says why.
export const SIGN_OUT_MESSAGES = {
  'not-found': MESSAGES.CODE_NOT_RECOGNISED,
  'bad-action': MESSAGES.OLD_BACKEND,
};

/**
 * The passcode kept for this browser tab only (sessionStorage under `key`), so a reload stays
 * signed in and closing the tab signs out. Blocked storage: it is typed again after a reload.
 */
export function tabPasscode(key) {
  return {
    load() {
      try {
        return sessionStorage.getItem(key) || '';
      } catch {
        return '';
      }
    },
    /** Keeps the passcode, or forgets it when given ''. */
    save(passcode) {
      try {
        if (passcode) sessionStorage.setItem(key, passcode);
        else sessionStorage.removeItem(key);
      } catch {
        // Blocked storage: signing in still works until the page is reloaded.
      }
    },
  };
}

/** Sends a request; a lost signal or timeout comes back as { ok: false, error: 'no-signal' }. */
export async function askBackend(body) {
  try {
    return await sendRequest(body);
  } catch {
    return { ok: false, error: 'no-signal' };
  }
}

/** The message for a refused reply. `extra` adds page-specific messages by error code. */
export function refusalMessage(error, extra = {}) {
  const fallback = error === 'no-signal' ? MESSAGES.NO_SIGNAL : MESSAGES.GENERIC_ERROR;
  return extra[error] || SIGN_OUT_MESSAGES[error] || fallback;
}

/** The red warning box for a message; nothing when there is no message. */
export const warningHtml = (message) =>
  message ? `<div class="warning-message" role="alert">${escapeHtml(message)}</div>` : '';
