/*
 * The Data tab of Settings (#stats): a few light study stats, drawn from what is already saved
 * (the streak days, guideline statuses, guideline quiz best scores and Medicines card
 * schedules). Read only. Depends on state.js, guidelines.js, logic.js, streakState.js,
 * guidelineQuizState.js, quizState.js and streakView.js.
 */
import { state } from '../state.js';
import { guidelines } from '../guidelines.js';
import { countStatuses } from '../logic.js';
import {
  currentStreak,
  longestStreak,
  ratRank,
  activityWeeks,
  streakDays,
  todayNumber,
} from '../streakState.js';
import { quizzedGuidelines, bestScore } from '../guidelineQuizState.js';
import { quizCards, allSchedules } from '../quizState.js';
import { ratSvg } from './streakView.js';
import { STATUS } from '../constants.js';

const ACTIVITY_WEEKS = 12;
const LOCKED_IN_DAYS = 21; // a card whose next review is this far off is well known
const PERFECT = 100;

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

const tileHtml = (value, label) =>
  `<div class="stat-tile"><b class="stat-tile__value">${value}</b>
  <span class="stat-tile__label">${label}</span></div>`;

const groupHtml = (title, tiles) =>
  `<section class="settings-group stats-group" aria-label="${title}">
  <h2 class="stats-group__title">${title}</h2><div class="stat-tiles">${tiles.join('')}</div></section>`;

/** The last weeks as small squares, a filled one for each day a quiz was finished. */
function activityHtml(days, today) {
  const columns = activityWeeks(days, today, ACTIVITY_WEEKS).map(
    (week) =>
      `<div class="activity__week">${week
        .map(
          ({ day, done }) =>
            `<span class="activity__day${done ? ' activity__day--done' : ''}${
              day === today ? ' activity__day--today' : ''
            }"></span>`,
        )
        .join('')}</div>`,
  );
  return `<div class="activity" role="img" aria-label="Quiz days over the last ${ACTIVITY_WEEKS}
    weeks">${columns.join('')}</div>`;
}

/** The streak group of the Data tab: streak, longest, quiz days, rank and the 12-week grid. */
function streakGroupHtml() {
  const days = streakDays();
  const today = todayNumber();
  const { count, isActive } = currentStreak(days, today);
  const rank = ratRank(days.length);
  const rankText = rank.next
    ? `${plural(rank.toNext, 'more quiz day')} to ${rank.next}.`
    : 'Top of the pack.';
  return `<section class="settings-group stats-group" aria-label="Streak">
    <div class="stats-streak${isActive ? ' stats-streak--active' : ''}">${ratSvg(isActive)}
    <div><b class="stats-streak__count">${plural(count, 'day')}</b>
    <span class="settings-hint">${
      isActive ? "Today's quiz is done." : 'Finish one quiz today to keep the streak.'
    }</span></div></div>
    <div class="stat-tiles">${tileHtml(longestStreak(days), 'Longest streak')}
    ${tileHtml(days.length, 'Quiz days')}</div>
    <h2 class="stats-group__title">Last ${ACTIVITY_WEEKS} weeks</h2>
    ${activityHtml(days, today)}
    <p class="settings-hint">Rank: <b>${rank.name}</b>. ${rankText}</p></section>`;
}

/**
 * The guideline numbers of the Data tab: complete, quizzes played, perfect
 * scores and average best score.
 */
function guidelineTiles() {
  const complete = countStatuses(guidelines, state.entries)[STATUS.COMPLETE];
  const bests = quizzedGuidelines()
    .map((quizzed) => bestScore(quizzed.id))
    .filter(Boolean)
    .map((saved) => saved.best);
  const average = bests.length
    ? `${Math.round(bests.reduce((sum, best) => sum + best, 0) / bests.length)}%`
    : '–';
  return [
    tileHtml(`${complete}<small>/${guidelines.length}</small>`, 'Guidelines complete'),
    tileHtml(bests.length, 'Guideline quizzes played'),
    tileHtml(bests.filter((best) => best === PERFECT).length, 'Perfect scores'),
    tileHtml(average, 'Average best score'),
  ];
}

/** The Medicines numbers of the Data tab: cards learnt and locked in. */
function medicineTiles() {
  const schedules = Object.values(allSchedules(quizCards()));
  const learnt = schedules.filter((schedule) => schedule.interval > 0).length;
  const lockedIn = schedules.filter((schedule) => schedule.interval >= LOCKED_IN_DAYS).length;
  return [
    tileHtml(learnt, 'Cards learnt'),
    tileHtml(lockedIn, `Locked in (next review ${LOCKED_IN_DAYS}+ days away)`),
  ];
}

/** The Data tab's content. */
export function dataHtml() {
  return `${streakGroupHtml()}
    ${groupHtml('Guidelines', guidelineTiles())}
    ${groupHtml('Medicines', medicineTiles())}`;
}
