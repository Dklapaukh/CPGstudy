/*
 * Manager page (manager.html): sign in with a manager passcode, then a team table and a
 * page per person. One state object, one way to draw: every change calls render().
 * The backend's "stats" reply holds numbers only (no notes, comments or tracker passcodes); the
 * guideline names and totals come from the same content files as the study app.
 * Depends on staffPage.js, theme.js, constants.js, guidelines.js, guidelineQuizRounds.js,
 * quizCards.js, quizSchedule.js and the other files of this folder.
 */
import { askBackend, refusalMessage, SIGN_OUT_MESSAGES, tabPasscode } from '../staffPage.js';
import { applyTheme } from '../theme.js';
import { sections } from '../guidelines.js';
import { quizGuidelines } from '../guidelineQuizRounds.js';
import { buildQuizCards } from '../quizCards.js';
import { dayNumber } from '../quizSchedule.js';
import { QUIZ_SECTION_NAME } from '../constants.js';
import {
  historyFor,
  statusCounts,
  sectionCounts,
  quizRows,
  flashcardTotals,
  teamRow,
  generalStats,
  weeklySeries,
  earliestTime,
  dateInputValue,
  parseDateInput,
} from './stats.js';
import { signInHtml, teamHtml, personHtml, overTimeHtml } from './view.js';

// The passcode is kept for this browser tab only. Separate from the study app's saved data on
// purpose.
const passcodeStore = tabPasscode('eas-cpg-manager-v1');
const PERSON_HASH_PREFIX = '#person-';
const DEFAULT_RANGE_WEEKS = 12;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const app = document.getElementById('manager-app');
const state = {
  passcode: '',
  message: '',
  isLoading: false,
  viewer: null, // { name, role } once signed in; the screens also get the message
  trackers: [],
  history: [],
  range: recentRange(),
};
let cachedContent = null;

/** The last DEFAULT_RANGE_WEEKS weeks as date-box text: { from, to }. */
function recentRange() {
  const now = Date.now();
  return {
    from: dateInputValue(now - DEFAULT_RANGE_WEEKS * WEEK_MS),
    to: dateInputValue(now),
  };
}

/** What the page needs from the guideline content, built once: lists of ids and totals. */
function content() {
  if (cachedContent) return cachedContent;
  const studySections = sections.filter((section) => section.name !== QUIZ_SECTION_NAME);
  const medicines = sections.find((section) => section.name === QUIZ_SECTION_NAME);
  cachedContent = {
    studySections,
    studyGuidelines: studySections.flatMap((section) => section.items),
    medicines: medicines ? medicines.items : [],
    quizzed: quizGuidelines(sections).map(({ id, number, title }) => ({ id, number, title })),
    totalCards: buildQuizCards(sections, QUIZ_SECTION_NAME).length,
  };
  return cachedContent;
}

/** Asks the backend for the viewer's numbers and draws them, or shows why it could not. */
async function loadStats(passcode) {
  state.isLoading = true;
  state.message = '';
  render();
  const reply = await askBackend({ action: 'stats', code: passcode });
  state.isLoading = false;
  if (reply.ok) {
    state.passcode = passcode;
    state.viewer = { name: reply.name, role: reply.role };
    state.trackers = reply.trackers || [];
    state.history = reply.history || [];
    passcodeStore.save(passcode);
  } else {
    // A refused passcode signs out; a lost signal keeps the numbers already on the screen.
    if (SIGN_OUT_MESSAGES[reply.error]) signOut();
    state.message = refusalMessage(reply.error);
  }
  render();
}

/** Forgets the passcode and every number, and goes back to the sign-in screen's address. */
function signOut() {
  state.passcode = '';
  state.viewer = null;
  state.trackers = [];
  state.history = [];
  state.message = '';
  passcodeStore.save('');
}

/** The tracker number in the address ("#person-2"), or null on the team screen. */
function personIndex() {
  if (!location.hash.startsWith(PERSON_HASH_PREFIX)) return null;
  const index = Number(location.hash.slice(PERSON_HASH_PREFIX.length));
  return Number.isInteger(index) && state.trackers[index] ? index : null;
}

/** The charts for one tracker, or for everyone when `trackerIndex` is null. */
function overTime(trackerIndex, subject) {
  const rows = historyFor(state.history, trackerIndex);
  const from = parseDateInput(state.range.from);
  const to = parseDateInput(state.range.to, true);
  const weeks = from === null || to === null ? [] : weeklySeries(rows, from, to);
  return overTimeHtml(state.range, weeks, subject);
}

/** Everything the person screen shows for one tracker. */
function personSummary(index) {
  const tracker = state.trackers[index];
  const { studySections, studyGuidelines, medicines, quizzed, totalCards } = content();
  const rows = historyFor(state.history, index);
  const today = dayNumber(Date.now(), new Date().getTimezoneOffset());
  return {
    label: tracker.label,
    overall: statusCounts(studyGuidelines, tracker.statuses),
    sections: sectionCounts(studySections, tracker.statuses),
    quizRows: quizRows(quizzed, tracker.quizzes, rows),
    quizzesTotal: quizzed.length,
    medicines: statusCounts(medicines, tracker.statuses),
    flashcards: flashcardTotals(tracker.flashcards, totalCards, today),
    general: generalStats(tracker, rows, Date.now()),
  };
}

/** Draws the screen for the current state and address. */
function render() {
  if (!state.viewer) {
    app.innerHTML = signInHtml(state.message, state.isLoading);
    return;
  }
  const viewer = { ...state.viewer, message: state.message };
  const index = personIndex();
  if (index !== null) {
    const person = personSummary(index);
    app.innerHTML = personHtml(viewer, person, overTime(index, person.label));
    return;
  }
  const rows = state.trackers
    .map((tracker, trackerIndex) => ({ ...teamRow(tracker, content()), index: trackerIndex }))
    .sort((a, b) => a.label.localeCompare(b.label));
  app.innerHTML = teamHtml(viewer, rows, overTime(null, 'whole team'));
}

/** Signs in with what is typed in the passcode box. */
function submitPasscode() {
  const passcode = document.getElementById('manager-passcode').value.trim();
  if (passcode) loadStats(passcode);
}

const ACTIONS = {
  'sign-in': submitPasscode,
  'sign-out': () => {
    signOut();
    render();
  },
  refresh: () => loadStats(state.passcode),
  'range-recent': () => {
    state.range = recentRange();
    render();
  },
  'range-all': () => {
    const rows = historyFor(state.history, personIndex());
    state.range = {
      from: dateInputValue(earliestTime(rows, Date.now())),
      to: dateInputValue(Date.now()),
    };
    render();
  },
};

app.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (button && ACTIONS[button.dataset.action]) ACTIONS[button.dataset.action]();
});
app.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.id === 'manager-passcode') submitPasscode();
});
app.addEventListener('change', (event) => {
  if (event.target.id !== 'range-from' && event.target.id !== 'range-to') return;
  state.range = {
    from: document.getElementById('range-from').value,
    to: document.getElementById('range-to').value,
  };
  render();
});
window.addEventListener('hashchange', () => {
  render();
  window.scrollTo(0, 0);
});

applyTheme();
render();
if (passcodeStore.load()) loadStats(passcodeStore.load());
