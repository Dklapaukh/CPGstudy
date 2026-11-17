/*
 * All clicks, typing and key presses. Listeners are attached once to the app container and
 * find the button or box by its data-action or id, so redrawing a screen never re-attaches them.
 */
import { showPendingCelebration, demoStreakTap } from './views/streakView.js';
import {
  currentStreak,
  streakDays,
  todayNumber,
  recordQuizFinished,
  forgetTodayForDemo,
} from './streakState.js';
import { state, markSignedInBefore } from './state.js';
import { sendRequest } from './api.js';
import {
  showLogin,
  showMentor,
  showSignup,
  beginTrackerSession,
  returnToTracker,
  leaveOpenTracker,
  route,
} from './navigation.js';
import { renderList } from './views/listView.js';
import {
  recordEdit,
  showSelectedStatus,
  updateCommentHighlights,
  commentPointTexts,
  toggleHeading,
  currentGuidelinePlace,
} from './views/detailView.js';
import { refreshQueueViews, shownRelatedIds } from './views/queueView.js';
import { getQueue, saveQueue, tickOffQueuedGuideline } from './queueState.js';
import { saveMarkedTime } from './markedState.js';
import { addToQueue, removeFromQueue } from './queue.js';
import { makeSnippet, appendComment } from './comments.js';
import { getStatus } from './logic.js';
import { applyUpdate } from './updateState.js';
import {
  startSession,
  endSession,
  rateCurrentCard,
  saveQuizSetting,
  startPractice,
  answerPracticeCard,
} from './quizState.js';
import { renderQuizScreen } from './views/quizView.js';
import {
  startGuidelineQuiz,
  moveCardTo,
  moveCardBy,
  discardCard,
  returnCard,
  checkRound,
  pickChoice,
  nextStep,
  endGuidelineQuiz,
  quizzedGuidelines,
} from './guidelineQuizState.js';
import { renderGuidelineQuizScreen } from './views/guidelineQuizView.js';
import { canReport, openReport } from './report.js';
import { startCardDrag } from './views/dragCards.js';
import { openCommentPanel } from './views/commentPanel.js';
import {
  MESSAGES,
  STATUS,
  COMMENT_CONFIRMATION_MS,
  SEARCH_PAUSE_MS,
  GUIDELINE_QUIZ_HASH,
} from './constants.js';

const app = document.getElementById('app');
const byId = (id) => document.getElementById(id);

/* ---------- Passcode screen ---------- */

/** The message for a sign-in that the backend refused, from the error code in its reply. */
function signInErrorMessage(reply) {
  const error = reply && reply.error;
  if (error === 'placeholder-passcode') return MESSAGES.PLACEHOLDER_PASSCODE;
  if (error && error !== 'not-found') return MESSAGES.GENERIC_ERROR;
  return MESSAGES.CODE_NOT_RECOGNISED;
}

/** Opens the tracker or mentor screen for the typed passcode, or says why it cannot. */
async function submitPasscode() {
  const code = byId('passcode-input').value.trim();
  if (!code) return;
  const button = byId('open-button');
  button.disabled = true;
  button.textContent = 'Checking…';
  try {
    const reply = await sendRequest({ action: 'open', code });
    const accepted = reply && reply.ok && (reply.role === 'tracker' || reply.role === 'mentor');
    // The tracker still open behind Switch tracker is only left once the new passcode works.
    if (accepted && !leaveOpenTracker()) {
      showLogin('', code);
    } else if (accepted && reply.role === 'tracker') {
      beginTrackerSession(code, reply.label, reply.data);
    } else if (accepted) {
      state.mentorPasscode = code;
      markSignedInBefore();
      showMentor({ name: reply.name });
    } else {
      showLogin(signInErrorMessage(reply), code);
    }
  } catch {
    showLogin(MESSAGES.NO_SIGNAL, code);
  }
}

/* ---------- Mentor screen ---------- */

/** Creates a tracker with the typed name for the signed-in mentor, then shows its passcode. */
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

/** Opens a tracker by passcode from the mentor screen; a mentor passcode is refused there. */
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

/** Opens the tracker whose passcode is typed on the mentor screen. */
function openExistingTracker() {
  const code = byId('open-code-input').value.trim();
  if (!code) return;
  const button = byId('open-existing-button');
  button.disabled = true;
  button.textContent = 'Checking…';
  openTrackerFromMentor(code);
}

/* ---------- Make an account ---------- */

/** The message for a sign-up that the backend refused, from the error code in its reply. */
function signupErrorMessage(reply) {
  const error = reply && reply.error;
  if (error === 'no-name') return MESSAGES.NAME_NEEDED;
  if (error === 'too-fast') return MESSAGES.SIGNUP_TOO_FAST;
  if (error === 'busy') return MESSAGES.SIGNUP_BUSY;
  return MESSAGES.GENERIC_ERROR;
}

/** Sends the typed name (and the bot checks) to make an account, then shows its passcode. */
async function submitSignup() {
  const name = byId('signup-name').value.trim();
  if (!name) {
    showSignup({ message: MESSAGES.NAME_NEEDED });
    return;
  }
  const button = byId('signup-button');
  button.disabled = true;
  button.textContent = 'Making your account…';
  const shownAt = state.signupContext.shownAt;
  try {
    const reply = await sendRequest({
      action: 'signup',
      name,
      website: byId('signup-website').value,
      formMs: Date.now() - shownAt,
    });
    if (reply && reply.ok) {
      markSignedInBefore();
      showSignup({ created: { code: reply.code, label: reply.label || name } });
    } else {
      showSignup({ message: signupErrorMessage(reply), nameValue: name });
    }
  } catch {
    showSignup({ message: MESSAGES.NO_SIGNAL, nameValue: name });
  }
  // A refused form keeps its first drawing time, so pressing again soon after is not "too fast".
  if (!state.signupContext.created) state.signupContext.shownAt = shownAt;
}

/** Opens the account just made, leaving the demo (or other tracker) behind it. */
function openSignupTracker() {
  const { created } = state.signupContext;
  if (!created || !leaveOpenTracker()) return;
  beginTrackerSession(created.code, created.label, {});
}

/** Back from Make an account: to the tracker behind it, or else the passcode screen. */
function leaveSignup() {
  if (state.passcode) returnToTracker();
  else showLogin();
}

/** Copies the passcode on show (new tracker or new account), falling back to a selection. */
function copyPasscode() {
  const text = byId('new-passcode').textContent.trim();
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

/** Review or Complete was pressed: records the status and, every time, the date it was marked. */
function changeStatus(button) {
  const notes = byId('notes-input');
  const status = button.dataset.status;
  recordEdit(status, notes.value);
  if (status !== STATUS.INCOMPLETE) saveMarkedTime(state.currentGuideline.id, Date.now());
  showSelectedStatus(status);
  if (status !== STATUS.INCOMPLETE) tickOffQueuedGuideline(state.currentGuideline.id);
  refreshQueueViews();
  if (status !== STATUS.INCOMPLETE && !notes.value) notes.focus();
}

/* ---------- Review queue ---------- */

/** Saves a new review queue and redraws the parts of the screen that show it. */
function changeQueue(newQueue) {
  saveQueue(newQueue);
  refreshQueueViews();
}

const addGuidelineToQueue = (button) => changeQueue(addToQueue(getQueue(), [button.dataset.id]));
const addAllRelatedToQueue = () => changeQueue(addToQueue(getQueue(), shownRelatedIds()));
const removeGuidelineFromQueue = (button) =>
  changeQueue(removeFromQueue(getQueue(), button.dataset.id));

/**
 * Opens the comment panel for the point beside the tapped 💬 button. Saving adds the comment to
 * the notes; the panel also offers "Report a mistake in this point".
 */
function addComment(button) {
  if (!byId('notes-input')) return;
  const pointText = button.parentNode.querySelector('span');
  const text = pointText ? pointText.textContent.replace(/\s+/g, ' ').trim() : '';
  openCommentPanel({
    snippet: makeSnippet(text, commentPointTexts()),
    pointText: text,
    onSave: (comment) => saveComment(button, comment),
    returnFocusTo: button,
  });
}

/** Adds a comment from the panel to the notes and shows a tick on the point's button. */
function saveComment(button, comment) {
  const notes = byId('notes-input');
  if (!notes) return; // the person has left the guideline
  const pointText = button.parentNode.querySelector('span');
  const snippet = makeSnippet(pointText ? pointText.textContent : '', commentPointTexts());
  notes.value = appendComment(notes.value, snippet, comment);
  notes.dispatchEvent(new Event('input', { bubbles: true }));
  button.textContent = '✓';
  setTimeout(() => {
    button.textContent = '💬';
  }, COMMENT_CONFIRMATION_MS);
}

/** Redraws the list for the search text, keeping the caret where the person is typing. */
function redrawListForSearch() {
  const input = byId('search-input');
  if (!input) return; // the person has left the list screen
  const hadFocus = document.activeElement === input;
  const caret = input.selectionStart;
  renderList();
  if (!hadFocus) return;
  const newInput = byId('search-input');
  newInput.focus();
  try {
    newInput.setSelectionRange(caret, caret);
  } catch {
    // Some input types refuse a caret position. The caret then stays at the end.
  }
}

/**
 * Records the search text as typed and redraws the list once typing has paused, so that the
 * list is not rebuilt for every keystroke.
 */
function changeSearchText(input) {
  state.searchText = input.value;
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(redrawListForSearch, SEARCH_PAUSE_MS);
}

/* ---------- Medicines quiz ---------- */

/** Runs a change to the quiz session, then redraws the quiz screen. */
const changeQuiz = (change) => (element) => {
  change(element);
  renderQuizScreen();
  showPendingCelebration();
};
/** Turns the Medicines quiz card over to show its answer. */
const showQuizAnswer = () => {
  if (state.quiz) state.quiz.revealed = true;
};

/* ---------- Guideline quiz ---------- */

/**
 * Runs a change to the guideline quiz, then redraws it. `toTop` scrolls to the top for a new
 * step; moving a card keeps the scroll position so the list does not jump under the finger.
 */
const changeGuidelineQuiz =
  (change, toTop = false) =>
  (element) => {
    change(element);
    const scrollY = window.scrollY;
    renderGuidelineQuizScreen();
    window.scrollTo(0, toTop ? 0 : scrollY);
    showPendingCelebration();
  };
const cardIndexOf = (button) => Number(button.dataset.card);

/** Starts the guideline chosen in the dropdown. */
function startChosenGuidelineQuiz() {
  const select = byId('guideline-quiz-choice');
  if (!select) return;
  state.guidelineQuizChoice = select.value;
  startGuidelineQuiz(select.value);
}

/** Starts a guideline picked at random, and selects it in the dropdown for next time. */
function startRandomGuidelineQuiz() {
  const all = quizzedGuidelines();
  const picked = all[Math.floor(Math.random() * all.length)];
  state.guidelineQuizChoice = picked.id;
  startGuidelineQuiz(picked.id);
}

/**
 * The Quiz pill on a guideline: remembers where the student is on the page, starts that
 * guideline's quiz and opens the quiz screen. Coming back is handled by route().
 */
function quizOpenGuideline() {
  if (!state.currentGuideline) return;
  state.guidelineQuizReturn = currentGuidelinePlace();
  state.guidelineQuizChoice = state.currentGuideline.id;
  startGuidelineQuiz(state.currentGuideline.id);
  location.hash = GUIDELINE_QUIZ_HASH;
}

/* ---------- Demo streak ---------- */

/**
 * Demo tracker, double tap on the rat: switches today's streak off (sad rat) or back on, which
 * plays the power-up as a finished quiz would. Lets the owner show the celebration on demand.
 */
function toggleDemoStreak() {
  if (currentStreak(streakDays(), todayNumber()).isActive) {
    forgetTodayForDemo();
    renderList();
    return;
  }
  recordQuizFinished();
  renderList();
  showPendingCelebration();
}

/* ---------- Listeners ---------- */

const clickActions = {
  'submit-passcode': submitPasscode,
  'mentor-sign-out': () => showLogin(),
  'create-tracker': createTracker,
  'open-created-tracker': () => openTrackerFromMentor(state.mentorContext.created.code),
  'open-existing-tracker': openExistingTracker,
  'copy-passcode': copyPasscode,
  'switch-tracker': () => showLogin(),
  'show-signup': () => showSignup(),
  'submit-signup': submitSignup,
  'open-signup-tracker': openSignupTracker,
  'signup-back': leaveSignup,
  'streak-demo-tap': () => demoStreakTap(toggleDemoStreak),
  'back-to-tracker': returnToTracker,
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
  'quiz-start': changeQuiz(startSession),
  'quiz-show-answer': changeQuiz(showQuizAnswer),
  'quiz-rate': changeQuiz((button) => rateCurrentCard(button.dataset.rating)),
  'quiz-end': changeQuiz(endSession),
  'quiz-practise': changeQuiz(() => {
    const select = byId('quiz-practice-medicine');
    if (select) startPractice(select.value);
  }),
  'quiz-practice-answer': changeQuiz((button) => answerPracticeCard(button.dataset.rating)),
  'quiz-this-guideline': quizOpenGuideline,
  'guideline-quiz-start': changeGuidelineQuiz(startChosenGuidelineQuiz, true),
  'guideline-quiz-random': changeGuidelineQuiz(startRandomGuidelineQuiz, true),
  'guideline-quiz-up': changeGuidelineQuiz((button) => moveCardBy(cardIndexOf(button), -1)),
  'guideline-quiz-down': changeGuidelineQuiz((button) => moveCardBy(cardIndexOf(button), 1)),
  'guideline-quiz-discard': changeGuidelineQuiz((button) => discardCard(cardIndexOf(button))),
  'guideline-quiz-return': changeGuidelineQuiz((button) => returnCard(cardIndexOf(button))),
  'guideline-quiz-check': changeGuidelineQuiz(checkRound),
  'guideline-quiz-pick': changeGuidelineQuiz((button) => pickChoice(Number(button.dataset.choice))),
  'guideline-quiz-next': changeGuidelineQuiz(nextStep, true),
  'guideline-quiz-again': changeGuidelineQuiz(
    () => startGuidelineQuiz(state.guidelineQuiz.guidelineId),
    true,
  ),
  'guideline-quiz-end': changeGuidelineQuiz(endGuidelineQuiz, true),
};

/** Typing in the search box or in the notes. */
function handleInput(event) {
  if (event.target.id === 'search-input') changeSearchText(event.target);
  if (event.target.id === 'notes-input') {
    recordEdit(getStatus(state.entries, state.currentGuideline.id), event.target.value);
    updateCommentHighlights();
  }
}

/** A quiz setting or a picker changed. */
function handleChange(event) {
  if (event.target.dataset.setting) {
    saveQuizSetting(event.target.dataset.setting, event.target.value);
    renderQuizScreen();
  }
  // Remembered so a redraw (for example after a sync) keeps the medicine chosen.
  if (event.target.id === 'quiz-practice-medicine') state.practiceChoice = event.target.value;
  if (event.target.id === 'guideline-quiz-choice') state.guidelineQuizChoice = event.target.value;
}

/** Enter in a passcode or name box, and Enter or Space on a folding heading. */
function handleKeydown(event) {
  if (event.key === 'Enter' && event.target.id === 'passcode-input') submitPasscode();
  if (event.key === 'Enter' && event.target.id === 'open-code-input') openExistingTracker();
  if (event.key === 'Enter' && event.target.id === 'signup-name') submitSignup();
  const heading = event.target.closest && event.target.closest('[data-action="toggle-heading"]');
  if (heading && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    toggleHeading(heading);
  }
}

/** Attaches every listener for the app container. Called once at start-up. */
export function attachEventListeners() {
  app.addEventListener('click', (event) => {
    const element = event.target.closest('[data-action]');
    if (element && clickActions[element.dataset.action])
      clickActions[element.dataset.action](element);
  });

  // Dragging a guideline quiz card by its grip (the arrows do the same without dragging).
  app.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.order-grip')) return;
    startCardDrag(event, (cardIndex, listName, position) =>
      changeGuidelineQuiz(() => moveCardTo(cardIndex, listName, position))(),
    );
  });

  app.addEventListener('input', handleInput);
  app.addEventListener('change', handleChange);
  app.addEventListener('keydown', handleKeydown);

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

  const reportFooter = byId('report-footer');
  reportFooter.hidden = !canReport();
  reportFooter.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="report"]')) openReport();
  });
}
