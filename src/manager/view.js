/*
 * Manager page: markup for its three screens (sign in, team, one person). Each function takes
 * prepared numbers and returns text; main.js puts it on the page and handles the clicks.
 * All names and labels come from the Sheet, so they are escaped before they reach the page.
 * Depends on logic.js, constants.js, staffPage.js and chart.js.
 */
import { warningHtml } from '../staffPage.js';
import { escapeHtml, formatUpdatedDate } from '../logic.js';
import { MESSAGES, SCENARIO_COMPLEXITY, SCENARIO_LOADS } from '../constants.js';
import { chartSvg, CHART_KIND } from './chart.js';

const PERCENT_MAX = 100;
const NO_VALUE = '–';

const dateText = (milliseconds) => (milliseconds > 0 ? formatUpdatedDate(milliseconds) : NO_VALUE);
const percentText = (value) => (value === null ? NO_VALUE : `${value}%`);
// A change in points, signed: "+12", "−5", "0", or a dash when there is none.
const changeText = (value) => {
  if (value === null) return NO_VALUE;
  return value > 0 ? `+${value}` : String(value).replace('-', '−');
};
const shortDate = (milliseconds) =>
  new Date(milliseconds).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
const numberCells = (values) =>
  values.map((value) => `<td class="stats-table__number">${value}</td>`).join('');

/** The green banner at the top of every screen, with optional buttons on the right. */
export function coverHtml(subtitle, buttonsHtml = '', pageName = 'Manager view') {
  return `<header class="cover manager-cover">
    <div class="top-bar"><b class="tracker-label">${escapeHtml(pageName)}</b>
      <div class="top-bar__buttons">${buttonsHtml}</div></div>
    <h1>Emergency Ambulance Service</h1>
    <p>Clinical Practice Guidelines</p>
    <small>${escapeHtml(subtitle)}</small>
  </header>`;
}

const SIGNED_IN_BUTTONS =
  '<button class="switch-button" type="button" data-action="refresh">Refresh</button>' +
  '<button class="switch-button" type="button" data-action="sign-out">Sign out</button>';

/** The sign-in screen, with an optional message. `isLoading` greys the button while waiting. */
export function signInHtml(message, isLoading) {
  return `${coverHtml('Study progress of your team')}
    <main class="page-padding manager-narrow">${warningHtml(message)}
    <p class="subtitle">Type your manager passcode. It isn’t case sensitive.</p>
    <label class="visually-hidden" for="manager-passcode">Passcode</label>
    <input class="text-input" id="manager-passcode" type="password" placeholder="Passcode"
      autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false">
    <button class="button" type="button" data-action="sign-in"${isLoading ? ' disabled' : ''}>
      ${isLoading ? 'Opening…' : 'Open'}</button>
    <p class="ai-notice">${escapeHtml(MESSAGES.AI_NOTICE)}</p></main>`;
}

/** One table. `headings` are text; `rows` are arrays of ready-made cell markup. */
function tableHtml(caption, headings, rows) {
  const body = rows.map((row) => `<tr>${row}</tr>`).join('');
  const head = headings.map((heading) => `<th scope="col">${escapeHtml(heading)}</th>`).join('');
  return `<div class="table-wrap"><table class="stats-table">
    <caption class="visually-hidden">${escapeHtml(caption)}</caption>
    <thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

const weekName = (week) => `Week of ${shortDate(week.weekStart)}`;

/** Chart points, one per week: `valueOf(week)` is the height, `tipOf(week)` the hover text. */
function weeklyPoints(weeks, valueOf, tipOf) {
  return weeks.map((week) => ({
    label: shortDate(week.weekStart),
    value: valueOf(week),
    tip: `${weekName(week)}: ${tipOf(week)}`,
  }));
}

/** The From and To date boxes, with the two quick-range buttons. */
function dateRangeHtml(range) {
  return `<div class="date-range">
      <label class="date-range__field">From
        <input class="date-range__input" type="date" id="range-from" value="${range.from}"></label>
      <label class="date-range__field">To
        <input class="date-range__input" type="date" id="range-to" value="${range.to}"></label>
      <button class="range-button" type="button" data-action="range-recent">Last 12 weeks</button>
      <button class="range-button" type="button" data-action="range-all">All dates</button>
    </div>`;
}

/** The weekly numbers as a table, for screen readers and anyone who wants the figures. */
function weeklyTableHtml(weeks, subject) {
  const rows = weeks.map(
    (week) =>
      `<th scope="row">${escapeHtml(shortDate(week.weekStart))}</th>` +
      numberCells([
        week.completions,
        week.quizCount,
        percentText(week.quizAverage),
        week.scenarioCount,
        percentText(week.scenarioAverage),
      ]),
  );
  const headings = [
    'Week of',
    'Marked complete',
    'Quiz scores saved',
    'Average quiz score',
    'Scenario runs',
    'Average scenario score',
  ];
  return tableHtml(`Completions and quiz scores by week, ${subject}`, headings, rows);
}

/**
 * The date range boxes and the charts with their table. `range` is { from, to } as date-box
 * text; `weeks` is the output of weeklySeries; `subject` names whose numbers they are.
 */
export function overTimeHtml(range, weeks, subject) {
  const completions = weeklyPoints(
    weeks,
    (week) => week.completions,
    (week) => `${week.completions} marked complete`,
  );
  const scores = weeklyPoints(
    weeks,
    (week) => week.quizAverage,
    (week) =>
      week.quizCount === 0
        ? 'no quiz'
        : `average ${week.quizAverage}% over ${week.quizCount} quiz scores`,
  );
  const scenarioScores = weeklyPoints(
    weeks,
    (week) => week.scenarioAverage,
    (week) =>
      week.scenarioAverage === null
        ? 'no rated scenario'
        : `average ${week.scenarioAverage}% over ${week.scenarioCount} scenario runs`,
  );
  const percentChart = (points, title) =>
    chartSvg({ points, kind: CHART_KIND.LINE, title, unit: '%', max: PERCENT_MAX });
  return `<section class="stats-section"><h2 class="section-title">Over time</h2>
    ${dateRangeHtml(range)}
    <h3 class="chart-title">Guidelines marked complete, by week</h3>
    ${chartSvg({
      points: completions,
      kind: CHART_KIND.BARS,
      title: `Guidelines marked complete by week, ${subject}`,
    })}
    <h3 class="chart-title">Average guideline quiz score, by week</h3>
    ${percentChart(scores, `Average guideline quiz score by week, ${subject}`)}
    <h3 class="chart-title">Average scenario score, by week</h3>
    ${percentChart(scenarioScores, `Average scenario score by week, ${subject}`)}
    <p class="stats-note">Weeks start on Monday. A week with no dot had no quiz or no rated
      scenario. Dates before
      the manager view was switched on come from the saved marked dates and best and latest
      quiz scores, so earlier plays in between are not shown.</p>
    <details class="chart-data"><summary>Show these numbers as a table</summary>
    ${weeklyTableHtml(weeks, subject)}</details></section>`;
}

/**
 * The team screen. `viewer` is { name, role, message }; `rows` is one teamRow per tracker with
 * its `index`; `scenarios` is { totals, groups, struggled } for the whole team; `overTime` is
 * ready-made markup for the charts.
 */
export function teamHtml(viewer, rows, scenarios, overTime) {
  const header =
    coverHtml(`Signed in as ${viewer.name}`, SIGNED_IN_BUTTONS) +
    `<div class="page-padding">${warningHtml(viewer.message)}</div>`;
  if (rows.length === 0) {
    return `${header}<main class="page-padding"><p class="subtitle">No trackers are assigned to
      ${escapeHtml(viewer.name)} yet. The admin adds them in the Assignments tab of the Google
      Sheet: your name in the first column and the tracker’s label in the second.</p></main>`;
  }
  const tableRows = rows.map(
    (row) =>
      `<th scope="row"><a class="person-link" href="#person-${row.index}">` +
      `${escapeHtml(row.label)}</a></th>` +
      numberCells([
        row.incomplete,
        row.review,
        row.complete,
        `${row.quizzesDone} of ${row.quizzesTotal}`,
        row.scenariosRun,
        percentText(row.scenarioLatest),
        escapeHtml(dateText(row.lastActive)),
      ]),
  );
  return `${header}<main class="page-padding">
    <h2 class="section-title">Team</h2>
    ${tableHtml(
      'Progress of each person',
      [
        'Person',
        'Incomplete',
        'For review',
        'Complete',
        'Guideline quizzes done',
        'Scenarios run',
        'Scenario score',
        'Last active',
      ],
      tableRows,
    )}
    <p class="stats-note">Guideline counts leave out the Medicines section, which has its own
      numbers on each person’s page. Tap a name for detail. Last active is the last time
      anything was saved on the tracker. Scenario score is the average of each scenario’s
      latest rated run.</p>
    ${teamScenariosHtml(scenarios)}
    ${overTime}</main>`;
}

/** The complexity and scene load table: runs, and average first and latest scores. */
function scenarioGroupsHtml(groups, isTeam) {
  const line = (labels) => (group) =>
    `<th scope="row">${escapeHtml(labels[group.key].name)}</th>` +
    numberCells([
      isTeam ? group.run : `${group.run} of ${group.total}`,
      percentText(group.averageFirst),
      percentText(group.averageLatest),
    ]);
  return tableHtml(
    'Scenario scores by complexity and scene load',
    ['Group', isTeam ? 'Scenario runs by people' : 'Scenarios run', 'First score', 'Latest score'],
    [...groups.complexity.map(line(SCENARIO_COMPLEXITY)), ...groups.load.map(line(SCENARIO_LOADS))],
  );
}

/** Guidelines ticked as struggled. `struggled` is [{ name, times, people }]. */
function struggledHtml(struggled, isTeam) {
  if (!struggled.length) return '<p class="subtitle">No guidelines ticked as struggled yet.</p>';
  const rows = struggled.map(
    (item) =>
      `<th scope="row">${escapeHtml(item.name)}</th>` +
      numberCells(isTeam ? [item.times, item.people] : [item.times]),
  );
  return tableHtml(
    'Guidelines most often struggled with in scenarios',
    isTeam ? ['Guideline', 'Times ticked', 'People'] : ['Guideline', 'Times ticked'],
    rows,
  );
}

/** Scenario tiles: how many were run and how scores moved from first to latest. */
function scenarioTilesHtml(totals, scenariosTotal) {
  return tilesHtml([
    [
      'Scenarios run',
      scenariosTotal ? `${totals.scenariosRun} of ${scenariosTotal}` : totals.scenariosRun,
    ],
    ['Runs recorded', totals.runs],
    ['Average first score', percentText(totals.averageFirst)],
    ['Average latest score', percentText(totals.averageLatest)],
    ['Scores up since first run', totals.improved],
    ['Scores down since first run', totals.declined],
  ]);
}

const SCENARIO_SCORE_NOTE = `A run’s score is its outcome ratings (Not done 0, Talked through 1,
  Prompted 2, Independent 3) as a percentage of the most possible, counting only the outcomes
  rated. First and latest are a scenario’s first and latest rated runs, so the gap between them
  is the trend. Scores compare best when the same mentor rates.`;

/** The Scenarios section of the team screen. */
function teamScenariosHtml({ totals, groups, struggled }) {
  return `<section class="stats-section"><h2 class="section-title">Scenarios</h2>
    ${scenarioTilesHtml(totals, 0)}
    ${scenarioGroupsHtml(groups, true)}
    <h3 class="chart-title">Guidelines most often struggled with</h3>
    ${struggledHtml(struggled, true)}
    <p class="stats-note">${SCENARIO_SCORE_NOTE} Struggled guidelines are counted over each
      person’s last 3 runs of each scenario.</p></section>`;
}

/**
 * The Scenarios section of the person screen. `scenarios` is { totals, groups, rows, struggled,
 * total }; each row also has `struggledNames`.
 */
function personScenariosHtml({ totals, groups, rows, struggled, total }) {
  const scenarioLines = rows.map(
    (row) =>
      `<th scope="row">${escapeHtml(row.title)}</th>` +
      numberCells([
        escapeHtml(SCENARIO_COMPLEXITY[row.complexity]?.short || NO_VALUE),
        escapeHtml(SCENARIO_LOADS[row.load]?.short || NO_VALUE),
        row.runs,
        percentText(row.first),
        percentText(row.latest),
        changeText(row.change),
        escapeHtml(dateText(row.lastAt)),
      ]) +
      `<td>${escapeHtml(row.struggledNames.join(', ') || NO_VALUE)}</td>`,
  );
  const table = rows.length
    ? tableHtml(
        'Scenarios run',
        [
          'Scenario',
          'Complexity',
          'Scene load',
          'Runs',
          'First',
          'Latest',
          'Change',
          'Last run',
          'Struggled last run',
        ],
        scenarioLines,
      )
    : '<p class="subtitle">No scenarios run yet.</p>';
  return `<section class="stats-section"><h2 class="section-title">Scenarios</h2>
    ${scenarioTilesHtml(totals, total)}
    ${scenarioGroupsHtml(groups, false)}
    ${table}
    <h3 class="chart-title">Guidelines struggled with</h3>
    ${struggledHtml(struggled, false)}
    <p class="stats-note">${SCENARIO_SCORE_NOTE} Debrief notes stay on the tracker and are not
      shown here.</p></section>`;
}

/** The guidelines table of the person screen: one line for all sections, then one each. */
function guidelinesHtml(overall, sections) {
  const line = (name, counts) =>
    `<th scope="row">${escapeHtml(name)}</th>` +
    numberCells([counts.incomplete, counts.review, counts.complete, counts.total]);
  return `<section class="stats-section"><h2 class="section-title">Guidelines</h2>
    ${tableHtml(
      'Guidelines by section',
      ['Section', 'Incomplete', 'For review', 'Complete', 'Total'],
      [line('All sections (without Medicines)', overall), ...sections.map((s) => line(s.name, s))],
    )}</section>`;
}

/** The guideline quizzes table of the person screen. `quizzesTotal` is how many quizzes exist. */
function quizzesHtml(quizRows, quizzesTotal) {
  const rows = quizRows.map(
    (row) =>
      `<th scope="row">${escapeHtml(`${row.number} ${row.title}`)}</th>` +
      numberCells([
        `${row.last}%`,
        escapeHtml(dateText(row.lastAt)),
        `${row.best}%`,
        escapeHtml(dateText(row.bestAt)),
        row.attempts,
      ]),
  );
  const table = rows.length
    ? tableHtml(
        'Guideline quizzes completed',
        ['Guideline', 'Most recent', 'On', 'Highest', 'On', 'Plays counted'],
        rows,
      )
    : '';
  return `<section class="stats-section"><h2 class="section-title">Guideline quizzes</h2>
    <p class="subtitle">${quizRows.length} of ${quizzesTotal} quizzes completed.</p>${table}
    <p class="stats-note">Plays are counted only from the day the manager view was switched on.
      Before that the app kept just the best and the most recent score of each quiz.</p>
    </section>`;
}

/** A row of labelled numbers. `tiles` is [[label, value], …]. */
function tilesHtml(tiles) {
  const items = tiles
    .map(
      ([label, value]) =>
        `<div class="stat-tile"><dt class="stat-tile__label">${escapeHtml(label)}</dt>` +
        `<dd class="stat-tile__value">${escapeHtml(String(value))}</dd></div>`,
    )
    .join('');
  return `<dl class="stat-tiles">${items}</dl>`;
}

/**
 * The person screen. `person` is { label, overall, sections, quizRows, quizzesTotal, medicines,
 * flashcards, scenarios, general } from stats.js; `overTime` is ready-made markup for the charts.
 */
export function personHtml(viewer, person, overTime) {
  const { medicines, flashcards, general } = person;
  return `${coverHtml(`Signed in as ${viewer.name}`, SIGNED_IN_BUTTONS)}
    <main class="page-padding">${warningHtml(viewer.message)}
    <a class="back-link" href="#">‹ Team</a>
    <h2 class="person-name">${escapeHtml(person.label)}</h2>
    ${guidelinesHtml(person.overall, person.sections)}
    ${quizzesHtml(person.quizRows, person.quizzesTotal)}
    <section class="stats-section"><h2 class="section-title">Medicines</h2>
      ${tilesHtml([
        ['Medicines incomplete', medicines.incomplete],
        ['Medicines for review', medicines.review],
        ['Medicines complete', medicines.complete],
        ['Flashcards learnt', `${flashcards.learnt} of ${flashcards.total}`],
        ['Flashcards due today', flashcards.due],
      ])}
      <p class="stats-note">A flashcard counts as learnt while its next review is a day or more
        after its last answer (it was answered Hard, Good or Easy). ${flashcards.started}
        flashcards have been started.</p></section>
    ${personScenariosHtml(person.scenarios)}
    <section class="stats-section"><h2 class="section-title">General</h2>
      ${tilesHtml([
        ['Last active', dateText(general.lastActive)],
        ['Marked complete, last 7 days', general.completionsLast7Days],
        ['Marked complete, last 30 days', general.completionsLast30Days],
        ['Average most recent quiz score', percentText(general.averageLatestScore)],
        ['Average highest quiz score', percentText(general.averageBestScore)],
        ['Quiz plays counted', general.quizPlaysRecorded],
      ])}</section>
    ${overTime}</main>`;
}
