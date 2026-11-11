/*
 * All clicks, typing and key presses. Listeners are attached once to the app container and
 * find the button or box by its data-action or id, so redrawing a screen never re-attaches them.
 */
import { state } from './state.js';
import { sendRequest } from './api.js';
import { showLogin, showMentor, beginTrackerSession, signOut, route } from './navigation.js';
import { renderList } from './views/listView.js';
import {
  recordEdit,
  showSelectedStatus,
  updateCommentHighlights,
  toggleHeading,
} from './views/detailView.js';
import { refreshQueueViews, shownRelatedIds } from './views/queueView.js';
import { getQueue, saveQueue, tickOffQueuedGuideline } from './queueState.js';
import { addToQueue, removeFromQueue } from './queue.js';
import { makeSnippet, appendComment } from './comments.js';
import { getStatus } from './logic.js';
import { applyUpdate } from './updateState.js';
import { MESSAGES, STATUS, COMMENT_CONFIRMATION_MS } from './constants.js';

const app = document.getElementById('app');
const byId = (id) => document.getElementById(id);

/* ---------- Passcode screen ---------- */

async function submitPasscode() {
  const code = byId('passcode-input').value.trim();
  if (!code) return;
  const button = byId('open-button');
  button.disabled = true;
  button.textContent = 'Checking…';
  try {
    const reply = await sendRequest({ action: 'open', code });
    if (reply && reply.ok && reply.role === 'tracker') {
      beginTrackerSession(code, reply.label, reply.data);
    } else if (reply && reply.ok && reply.role === 'mentor') {
      state.mentorPasscode = code;
      showMentor({ name: reply.name });
    } else {
      const failed = reply && reply.error && reply.error !== 'not-found';
      showLogin(failed ? MESSAGES.GENERIC_ERROR : MESSAGES.CODE_NOT_RECOGNISED, code);
    }
  } catch {
    showLogin(MESSAGES.NO_SIGNAL, code);
  }
}

/* ---------- Mentor screen ---------- */

async function createTracker() {
  const { name, created } = state.mentorContext;
  const label = byId('label-input').value.trim();
  if (!label) {
    showMentor({ name, created, message: MESSAGES.LABEL_NEEDED });
    return;
  }
  const button = byId('create-button');
  button.disabled = true;
  button.textContent = 'Creating…';
  const showAgain = (message) =>
    showMentor({
      name,
      created,
      message,
      labelValue: label,
      openValue: byId('open-code-input').value,
    });
  try {
    const reply = await sendRequest({
      action: 'create',
      code: state.mentorPasscode,
      label,
    });
    if (reply && reply.ok) {
      showMentor({
        name,
        created: { code: reply.code, label: reply.label || label },
      });
    } else {
      showAgain(
        reply && reply.error === 'not-mentor' ? MESSAGES.NOT_A_MENTOR_CODE : MESSAGES.GENERIC_ERROR,
      );
    }
  } catch {
    showAgain(MESSAGES.NO_SIGNAL);
  }
}

async function openTrackerFromMentor(code) {
  const { name, created } = state.mentorContext;
  try {
    const reply = await sendRequest({ action: 'open', code });
    if (reply && reply.ok && reply.role === 'tracker') {
      beginTrackerSession(code, reply.label, reply.data);
    } else if (reply && reply.ok && reply.role === 'mentor') {
      showMentor({ name, created, message: MESSAGES.IS_A_MENTOR_CODE });
    } else {
      showMentor({ name, created, message: MESSAGES.CODE_NOT_RECOGNISED });
    }
  } catch {
    showMentor({ name, created, message: MESSAGES.NO_SIGNAL });
  }
}

function openExistingTracker() {
  const code = byId('open-code-input').value.trim();
  if (!code) return;
  const button = byId('open-existing-button');
  button.disabled = true;
  button.textContent = 'Checking…';
  openTrackerFromMentor(code);
}

function copyPasscode() {
  const text = state.mentorContext.created.code;
  const button = byId('copy-button');
  const showCopied = () => {
    button.textContent = 'Copied';
  };
  const copyWithSelection = () => {
    const box = document.createElement('textarea');
    box.value = text;
    document.body.appendChild(box);
    box.select();
    try {
      document.execCommand('copy');
      showCopied();
    } catch {
      button.textContent = MESSAGES.COPY_FALLBACK;
    }
    document.body.removeChild(box);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(showCopied, copyWithSelection);
  } else {
    copyWithSelection();
  }
}

/* ---------- Guideline list and guideline page ---------- */

function changeStatus(button) {
  const notes = byId('notes-input');
  const status = button.dataset.status;
  recordEdit(status, notes.value);
  showSelectedStatus(status);
  if (status !== STATUS.INCOMPLETE) tickOffQueuedGuideline(state.currentGuideline.id);
  refreshQueueViews();
  if (status !== STATUS.INCOMPLETE && !notes.value) notes.focus();
}

/* ---------- Review queue ---------- */

function changeQueue(newQueue) {
  saveQueue(newQueue);
  refreshQueueViews();
}

const addGuidelineToQueue = (button) => changeQueue(addToQueue(getQueue(), [button.dataset.id]));
const addAllRelatedToQueue = () => changeQueue(addToQueue(getQueue(), shownRelatedIds()));
const removeGuidelineFromQueue = (button) =>
  changeQueue(removeFromQueue(getQueue(), button.dataset.id));

function addComment(button) {
  const notes = byId('notes-input');
  if (!notes) return;
  const pointText = button.parentNode.querySelector('span');
  const snippet = makeSnippet(pointText ? pointText.textContent : '');
  const answer = window.prompt(`Your comment on:\n${snippet}`, '');
  if (answer === null || !answer.trim()) return;
  notes.value = appendComment(notes.value, snippet, answer.trim());
  notes.dispatchEvent(new Event('input', { bubbles: true }));
  button.textContent = '✓';
  setTimeout(() => {
    button.textContent = '💬';
  }, COMMENT_CONFIRMATION_MS);
}

function changeSearchText(input) {
  state.searchText = input.value.trim().toLowerCase();
  const caret = input.selectionStart;
  renderList();
  const newInput = byId('search-input');
  newInput.focus();
  try {
    newInput.setSelectionRange(caret, caret);
  } catch {
    // Some input types refuse a caret position. The caret then stays at the end.
  }
}

/* ---------- Listeners ---------- */

const clickActions = {
  'submit-passcode': submitPasscode,
  'mentor-sign-out': () => showLogin(),
  'create-tracker': createTracker,
  'open-created-tracker': () => openTrackerFromMentor(state.mentorContext.created.code),
  'open-existing-tracker': openExistingTracker,
  'copy-passcode': copyPasscode,
  'switch-tracker': () => signOut(),
  'set-filter': (element) => {
    state.filter = element.dataset.filter;
    renderList();
  },
  'set-status': changeStatus,
  'add-to-queue': addGuidelineToQueue,
  'add-all-to-queue': addAllRelatedToQueue,
  'remove-from-queue': removeGuidelineFromQueue,
  comment: addComment,
  'toggle-heading': toggleHeading,
};

/** Attaches every listener for the app container. Called once at start-up. */
export function attachEventListeners() {
  app.addEventListener('click', (event) => {
    const element = event.target.closest('[data-action]');
    if (element && clickActions[element.dataset.action])
      clickActions[element.dataset.action](element);
  });

  app.addEventListener('input', (event) => {
    if (event.target.id === 'search-input') changeSearchText(event.target);
    if (event.target.id === 'notes-input') {
      recordEdit(getStatus(state.entries, state.currentGuideline.id), event.target.value);
      updateCommentHighlights();
    }
  });

  app.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.id === 'passcode-input') submitPasscode();
    if (event.key === 'Enter' && event.target.id === 'open-code-input') openExistingTracker();
    const heading = event.target.closest && event.target.closest('[data-action="toggle-heading"]');
    if (heading && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      toggleHeading(heading);
    }
  });

  // The toggle event does not bubble, so it is caught on the way down (capture).
  app.addEventListener(
    'toggle',
    (event) => {
      if (event.target.matches('details.section-group')) {
        state.openSections[event.target.dataset.section] = event.target.open;
      }
    },
    true,
  );

  window.addEventListener('hashchange', route);

  // The update banner sits outside the app container (see views/updateView.js).
  byId('update-banner').addEventListener('click', (event) => {
    if (event.target.closest('[data-action="apply-update"]')) applyUpdate();
  });
}
