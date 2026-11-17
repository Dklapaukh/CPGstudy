/*
 * Editor page (editor.html): sign in with an editor passcode, find a guideline, and change its
 * quiz questions: wording, right answers, wrong answers, or leave a question out. Edits are saved
 * to the Sheet's Edits tab straight away and reach the app the next morning, when
 * scripts/sync-edits.js copies them into content/card-edits.js.
 * One state object, one way to draw: every change calls render().
 * Depends on staffPage.js, theme.js, questionEdits.js, content/card-edits.js and the other files
 * of this folder.
 */
import { askBackend, refusalMessage, tabPasscode } from '../staffPage.js';
import { applyTheme } from '../theme.js';
import {
  EDIT_FIELDS,
  LIST_FIELDS,
  REVIEW,
  snapshot,
  withEdit,
  reviewState,
} from '../questionEdits.js';
import { cardEdits } from '../../content/card-edits.js';
import { questionBank, questionPreview } from './questions.js';
import { signInHtml, homeHtml, guidelineHtml, guidelineRowsHtml } from './view.js';

// The passcode is kept for this browser tab only, as on the manager page.
const passcodeStore = tabPasscode('eas-cpg-editor-v1');
const GUIDELINE_HASH_PREFIX = '#g-';
const EDITOR_MESSAGES = { 'bad-edit': 'That edit couldn’t be saved: it is too long.' };

const app = document.getElementById('editor-app');
const state = {
  passcode: '',
  name: '',
  message: '',
  isLoading: false,
  edits: {}, // the Sheet's edits, by question id
  search: '',
  openSections: {}, // the list's open sections, by name, kept while the page is open
  openId: '', // the question whose form is open
};

/* ---------- Talking to the backend ---------- */

/** Sends a request; on success keeps the edits it returns. Returns true when it worked. */
async function request(body) {
  state.isLoading = true;
  state.message = '';
  render();
  const reply = await askBackend({ ...body, code: state.passcode });
  state.isLoading = false;
  if (reply.ok) {
    state.name = reply.name;
    state.edits = reply.edits || {};
  } else {
    if (reply.error === 'not-found') signOut();
    state.message = refusalMessage(reply.error, EDITOR_MESSAGES);
  }
  render();
  return reply.ok;
}

/** Signs in with a passcode and keeps it for this tab when it works. */
async function signIn(passcode) {
  state.passcode = passcode;
  if (await request({ action: 'editor-open' })) passcodeStore.save(passcode);
}

/** Forgets the passcode, the editor and the edits. */
function signOut() {
  Object.assign(state, { passcode: '', name: '', edits: {}, openId: '' });
  passcodeStore.save('');
}

/** Saves one question's edit, or removes it when `edit` is null. */
async function saveEdit(id, edit) {
  if (await request({ action: 'edit-save', id, edit })) state.openId = '';
  render();
}

/* ---------- What the screens show ---------- */

const guidelineIdOf = (questionId) => questionId.split('|')[0];
const isPublished = (id) => JSON.stringify(cardEdits[id]) === JSON.stringify(state.edits[id]);

/** One question as the screens show it: built, as learners see it, its edit and its state. */
function itemFor(id) {
  const found = questionBank().byId[id];
  const question = found ? found.question : null;
  const edit = state.edits[id];
  return {
    id,
    kind: question ? question.kind : edit.kind,
    guidelineId: guidelineIdOf(id),
    question,
    live: question && edit && !edit.off ? withEdit(question, edit) : question,
    edit,
    review: edit ? reviewState(question, edit) : REVIEW.NONE,
    isPublished: isPublished(id),
  };
}

/** The edits a guideline update changed or removed, for the "Needs review" list. */
function reviewItems() {
  const { byId } = questionBank();
  return Object.keys(state.edits)
    .map(itemFor)
    .filter((item) => item.review)
    .map((item) => {
      const guideline = byId[item.id]?.guideline;
      return { ...item, where: guideline ? guideline.title : item.guidelineId };
    });
}

/** The guideline list, filtered by the search box (number or title). */
function guidelineRows() {
  const words = state.search.toLowerCase().split(/\s+/).filter(Boolean);
  const editCounts = {};
  Object.keys(state.edits).forEach((id) => {
    editCounts[guidelineIdOf(id)] = (editCounts[guidelineIdOf(id)] || 0) + 1;
  });
  return questionBank()
    .list.filter((guideline) => {
      const text = `${guideline.number} ${guideline.title}`.toLowerCase();
      return words.every((word) => text.includes(word));
    })
    .map((guideline) => ({
      ...guideline,
      questionCount: guideline.questions.length,
      editCount: editCounts[guideline.id] || 0,
    }));
}

/** The guideline in the address ("#g-cpg-3-8"), or null on the first screen. */
function currentGuideline() {
  if (!location.hash.startsWith(GUIDELINE_HASH_PREFIX)) return null;
  const id = decodeURIComponent(location.hash.slice(GUIDELINE_HASH_PREFIX.length));
  return questionBank().list.find((guideline) => guideline.id === id) || null;
}

/** A guideline's questions, then any edits of questions it no longer has; each with its preview. */
function guidelineItems(guideline) {
  const ids = guideline.questions.map((question) => question.id);
  const gone = Object.keys(state.edits).filter(
    (id) => guidelineIdOf(id) === guideline.id && !ids.includes(id),
  );
  return [...ids, ...gone].map(itemFor).map((item) => ({
    ...item,
    preview: item.live ? questionPreview(item.id, item.live) : null,
  }));
}

/** Draws the screen the state and the address call for. */
function render() {
  if (!state.name) {
    app.innerHTML = signInHtml(state.message, state.isLoading);
    return;
  }
  const viewer = { name: state.name, message: state.message };
  const guideline = currentGuideline();
  app.innerHTML = guideline
    ? guidelineHtml(viewer, guideline, guidelineItems(guideline), state.openId)
    : homeHtml(viewer, reviewItems(), guidelineRows(), state);
}

/* ---------- Reading the form ---------- */

const linesOf = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * The edit the open form describes: only the fields that differ from the built question, a
 * copy of the built question to check later updates against, and `off` when ticked. Null when
 * nothing differs (the edit is removed).
 */
function editFromForm(question) {
  const edit = {};
  EDIT_FIELDS[question.kind].forEach((name) => {
    const box = app.querySelector(`[data-field="${name}"]`);
    const value = LIST_FIELDS.includes(name) ? linesOf(box.value) : box.value.trim();
    const isEmptyWrong = name === 'wrong' && value.length === 0;
    if (!isEmptyWrong && JSON.stringify(value) !== JSON.stringify(question[name]))
      edit[name] = value;
  });
  if (app.querySelector('#field-off').checked) edit.off = true;
  if (Object.keys(edit).length === 0) return null;
  return { ...edit, kind: question.kind, was: snapshot(question) };
}

/* ---------- Clicks and typing ---------- */

const ACTIONS = {
  'sign-in': () => {
    const passcode = document.getElementById('editor-passcode').value.trim();
    if (passcode) signIn(passcode);
  },
  'sign-out': () => {
    signOut();
    render();
  },
  refresh: () => request({ action: 'editor-open' }),
  open: (id) => {
    state.openId = id;
    render();
    document.getElementById(`q-${id}`)?.scrollIntoView();
  },
  close: () => {
    state.openId = '';
    render();
  },
  save: (id) => saveEdit(id, editFromForm(questionBank().byId[id].question)),
  remove: (id) => saveEdit(id, null),
  // The guideline's new wording is accepted under the edit: the edit stays, checked against it.
  keep: (id) => {
    const { question } = questionBank().byId[id];
    saveEdit(id, { ...state.edits[id], was: snapshot(question) });
  },
};

app.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (button && ACTIONS[button.dataset.action]) ACTIONS[button.dataset.action](button.dataset.id);
});
app.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.id === 'editor-passcode') ACTIONS['sign-in']();
});
// Only the list is redrawn while typing, so the search box keeps its place.
app.addEventListener('input', (event) => {
  if (event.target.id !== 'editor-search') return;
  state.search = event.target.value;
  document.getElementById('editor-rows').innerHTML = guidelineRowsHtml(
    guidelineRows(),
    state.openSections,
    Boolean(state.search.trim()),
  );
});
// A section opened or closed by hand stays so after a redraw. "toggle" does not bubble.
app.addEventListener(
  'toggle',
  (event) => {
    const { section } = event.target.dataset;
    if (section && !state.search.trim()) state.openSections[section] = event.target.open;
  },
  true,
);
window.addEventListener('hashchange', () => {
  state.openId = '';
  render();
  window.scrollTo(0, 0);
});

applyTheme();
render();
if (passcodeStore.load()) signIn(passcodeStore.load());
