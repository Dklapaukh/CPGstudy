/*
 * Behaviour check of the whole app in a simulated browser (jsdom) with a fake backend.
 * Mirrors the behaviour checklist in docs/behaviour-checklist.md.
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { SEARCH_PAUSE_MS, SYNC_DELAY_AFTER_EDIT_MS, DOUBLE_TAP_MS } from '../src/constants.js';

const TRACKER = 'maple-oak-reef-11';
const OTHER_TRACKER = 'other-tracker';
const OLD_MENTOR = 'mentor-secret';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const requests = [];
const stored = {};
// Static files (feature 7): what version.json says, and every other file that was fetched.
const published = JSON.parse(readFileSync('version.json', 'utf8'));
const fileRequests = [];
let fileDownloadsWork = true;
let dom;
let doc;

function fakeBackend(body) {
  requests.push(body);
  const code = String(body.code).trim().toLowerCase();
  if (body.action === 'open' && code === TRACKER) {
    return {
      ok: true,
      role: 'tracker',
      label: 'Sam - 2026',
      data: { ...stored },
    };
  }
  if (body.action === 'open' && code === OTHER_TRACKER) {
    return { ok: true, role: 'tracker', label: 'Kim', data: {} };
  }
  if (body.action === 'open') return { ok: false, error: 'not-found' };
  if (code === OTHER_TRACKER) return { ok: true, label: 'Kim', saved: 0, data: {} };
  if (code !== TRACKER) return { ok: false, error: 'not-found' };
  (body.changes || []).forEach((c) => {
    stored[c.id] = { s: c.s, n: c.n, t: c.t };
  });
  return { ok: true, label: 'Sam - 2026', data: { ...stored } };
}

function fakeFetch(url, options) {
  if (String(url).startsWith('version.json')) {
    return { ok: true, json: async () => ({ ...published }) };
  }
  if (options && options.cache === 'reload') {
    fileRequests.push(url);
    return { ok: fileDownloadsWork };
  }
  return { json: async () => fakeBackend(JSON.parse(options.body)) };
}

const click = (element) => element.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
const $ = (selector) => doc.querySelector(selector);
const $$ = (selector) => [...doc.querySelectorAll(selector)];

before(() => {
  const html = readFileSync('index.html', 'utf8').replace(/<script[^>]*><\/script>/, '');
  dom = new JSDOM(html, {
    url: 'https://example.test/',
    pretendToBeVisual: true,
  });
  doc = dom.window.document;
  dom.window.scrollTo = () => {};
  const realSetInterval = globalThis.setInterval;
  const globals = {
    window: dom.window,
    document: doc,
    localStorage: dom.window.localStorage,
    location: dom.window.location,
    history: dom.window.history,
    Event: dom.window.Event,
    confirm: () => true,
    setInterval: (fn, ms) => realSetInterval(fn, ms).unref(),
    fetch: async (url, options) => fakeFetch(url, options),
  };
  Object.entries(globals).forEach(([key, value]) => {
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  });
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
  });
});

async function signIn(code) {
  $('#passcode-input').value = code;
  click($('#open-button'));
  await sleep(50);
}

test('start-up shows the passcode screen and a wrong passcode shows the message', async () => {
  await import('../src/main.js');
  assert.ok($('#passcode-input'));
  assert.match($('.page-padding b').textContent, /Enter code demo to take a look/);
  await signIn('wrong');
  assert.match($('.warning-message').textContent, /wasn’t recognised/);
  assert.equal($('#passcode-input').value, 'wrong');
});

test('an old mentor passcode is not recognised: there is no mentor screen any more', async () => {
  await signIn(OLD_MENTOR);
  assert.match($('.warning-message').textContent, /wasn’t recognised/);
  assert.ok($('#passcode-input'));
});

test('a tracker passcode shows 14 sections and 180 guidelines with counts', async () => {
  await signIn(TRACKER);
  assert.equal($$('details.section-group').length, 14);
  assert.equal($$('.guideline-row').length, 180);
  assert.match($('.progress-legend').textContent, /0 of 180 complete/);
  assert.equal($('.tracker-label').textContent, 'Sam - 2026');
});

test('the Quiz tab opens the choice of quizzes', async () => {
  assert.equal($('#quiz-choice').hidden, true);
  click($('#quiz-tab'));
  assert.equal($('#quiz-choice').hidden, false);
  assert.equal($('#quiz-tab').getAttribute('aria-expanded'), 'true');
  assert.equal($$('#quiz-choice .quiz-button').length, 5);
  click($('#quiz-tab'));
  assert.equal($('#quiz-choice').hidden, true);
});

test('the Random guideline button opens a guideline', async () => {
  click($('#random-guideline-button'));
  assert.match(dom.window.location.hash, /^#.+/);
  dom.window.location.hash = '';
  await sleep(30);
});

test('filters and search narrow the list', async () => {
  click($$('.filter-chip')[3]);
  assert.match($('.empty-message').textContent, /Nothing matches/);
  click($$('.filter-chip')[0]);
  const search = $('#search-input');
  search.focus();
  search.value = 'Adrenaline ';
  search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.equal($$('.guideline-row').length, 180, 'the list waits until typing has paused');
  await sleep(SEARCH_PAUSE_MS + 50);
  const found = $$('.guideline-row').length;
  assert.ok(found > 0 && found < 180);
  assert.equal(doc.activeElement.id, 'search-input');
  assert.equal($('#search-input').value, 'Adrenaline ', 'the text stays as typed');
  $('#search-input').value = '';
  $('#search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await sleep(SEARCH_PAUSE_MS + 50);
  assert.equal($$('.guideline-row').length, 180);
});

test('opening a guideline shows it, folds headings and handles previous / next', async () => {
  dom.window.location.hash = '#cpg-1-2';
  await sleep(30);
  assert.ok($('.guideline-body'));
  assert.equal($('.neighbour-nav__next') !== null, true);
  assert.match($('.guideline-meta').textContent, /exported 24\.09\.2026/);
  const sections = $$('.heading-section');
  assert.ok(sections.length > 1);
  assert.equal(sections[0].hidden, false);
  assert.equal(sections[1].hidden, true);
  const second = sections[1].previousElementSibling;
  click(second);
  assert.equal(sections[1].hidden, false);
  assert.equal(second.getAttribute('aria-expanded'), 'true');
});

test('the status buttons and notes come after the guideline text, before related guidelines', () => {
  const order = ['.guideline-body', '.status-buttons', '#notes-input', '.related-panel'];
  const elements = order.map((selector) => $(selector));
  elements.forEach((element, i) => assert.ok(element, order[i]));
  for (let i = 1; i < elements.length; i++) {
    const follows = elements[i - 1].compareDocumentPosition(elements[i]);
    assert.ok(
      follows & dom.window.Node.DOCUMENT_POSITION_FOLLOWING,
      `${order[i]} after ${order[i - 1]}`,
    );
  }
});

test('there is no Incomplete button and the guideline shows it is not marked yet', () => {
  assert.equal($$('[data-action="set-status"]').length, 2);
  assert.equal($('[data-status="i"]'), null);
  assert.match($('#marked-line').textContent, /^Not marked yet/);
  assert.match($('.ai-notice').textContent, /made with AI.*official NZCPG app/);
});

test('changing status and notes saves, then shows Saved', async () => {
  click($('.status-button--complete'));
  assert.match($('#marked-line').textContent, /^Marked complete \d{1,2} \w{3} \d{4} · press again/);
  assert.equal($('.status-button--complete').getAttribute('aria-pressed'), 'true');
  assert.equal($('.sync-status').textContent, 'Saving…');
  const notes = $('#notes-input');
  notes.value = 'covered dosing';
  notes.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await sleep(1200);
  assert.equal($('.sync-status').textContent, 'Saved');
  assert.deepEqual(
    { s: stored['cpg-1-2'].s, n: stored['cpg-1-2'].n },
    { s: 'c', n: 'covered dosing' },
  );
  const saved = JSON.parse(dom.window.localStorage.getItem('eas-cpg-tracker-v2'));
  assert.deepEqual(Object.keys(saved).sort(), ['c', 'l', 'p', 's']);
  assert.deepEqual(saved.p, {});
});

test('the comment button opens a panel with a report button, and saving adds a note line', async () => {
  const button = $('.comment-button');
  click(button);
  assert.equal($('#comment-panel').hidden, false);
  assert.equal($('#comment-panel-report').hidden, false, 'reporting is offered with every comment');
  assert.ok($('#comment-panel-point').textContent.length > 0);
  $('#comment-panel-input').value = 'Check dose';
  click($('[data-action="save-comment"]'));
  assert.equal($('#comment-panel').hidden, true);
  assert.match($('#notes-input').value, /^covered dosing\n• .+ — Check dose$/);
  assert.ok($('.has-comment'));
  assert.equal(button.textContent, '✓');
});

test('going back to the list keeps the section state and shows the new count', async () => {
  dom.window.location.hash = '';
  await sleep(30);
  assert.match($('.progress-legend').textContent, /1 of 180 complete/);
  assert.equal($$('.completion-ring').length, 15); // one overall ring and 14 section rings
  assert.match($('.completion-ring--large').getAttribute('aria-label'), /^1 of 180 complete/);
  assert.equal($$('.completion-ring--just-closed').length, 0);
  assert.match($('.guideline-row small').textContent, /has notes|CPG EAS/);
  const marked = $('a[href="#cpg-1-2"] .marked-date');
  assert.ok(marked, 'the marked guideline shows its date');
  assert.match(marked.textContent, /^Marked complete \d{1,2} \w{3} \d{4}$/);
  assert.equal($$('.marked-date').length, 1, 'unmarked guidelines show no date');
  assert.ok(stored['marked-cpg-1-2'], 'the marked date is uploaded as its own entry');
});

test('editing notes or opening a guideline keeps the marked date; pressing again updates it', async () => {
  const { state } = await import('../src/state.js');
  state.entries['marked-cpg-1-2'].n = String(Date.UTC(2026, 0, 5, 0));
  dom.window.location.hash = '#cpg-1-2';
  await sleep(30);
  const notes = $('#notes-input');
  notes.value = 'more notes';
  notes.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.match($('#marked-line').textContent, /^Marked complete 5 Jan 2026/);
  dom.window.location.hash = '';
  await sleep(30);
  assert.match($('a[href="#cpg-1-2"] .marked-date').textContent, /5 Jan 2026$/);
  dom.window.location.hash = '#cpg-1-2';
  await sleep(30);
  click($('.status-button--complete'));
  assert.doesNotMatch($('#marked-line').textContent, /5 Jan 2026/);
  dom.window.location.hash = '';
  await sleep(30);
  assert.doesNotMatch($('a[href="#cpg-1-2"] .marked-date').textContent, /5 Jan 2026/);
});

test('related guidelines can be added to the review queue and are ticked off when marked', async () => {
  dom.window.location.hash = '#cpg-2-1';
  await sleep(30);
  const relatedCount = $$('.related-item').length;
  assert.ok(relatedCount > 0 && relatedCount <= 5);
  click($('.queue-add-button'));
  assert.equal($('.queue-add-button').disabled, true);
  assert.equal(
    $('.queue-panel'),
    null,
    'the Guidelines to learn list is not on the guideline page',
  );
  click($('[data-action="add-all-to-queue"]'));
  dom.window.location.hash = '#queue';
  await sleep(30);
  assert.match($('.queue-panel__progress').textContent, new RegExp(`^0 of ${relatedCount} done`));
  const firstQueuedId = $('.queue-item__link').getAttribute('href').slice(1);
  dom.window.location.hash = `#${firstQueuedId}`;
  await sleep(30);
  click($('[data-action="set-status"][data-status="c"]'));
  dom.window.location.hash = '#queue';
  await sleep(30);
  assert.match($('.queue-panel__progress').textContent, new RegExp(`^1 of ${relatedCount} done`));
  await sleep(1200);
  const savedQueue = JSON.parse(stored['review-queue'].n);
  assert.equal(savedQueue.length, relatedCount);
  assert.equal(savedQueue.filter((queued) => queued.done).length, 1);
});

test('the To learn tab opens the Guidelines to learn screen, where a guideline can be removed', async () => {
  dom.window.location.hash = '';
  await sleep(30);
  const button = $('.queue-button');
  assert.match(button.textContent, /^To learn \(\d\)$/);
  dom.window.location.hash = '#queue';
  await sleep(30);
  const before = $$('.queue-item').length;
  click($('.queue-remove-button'));
  assert.equal($$('.queue-item').length, before - 1);
  dom.window.location.hash = '';
  await sleep(30);
});

test('the Medicines quiz shows a card, its answer, and saves the rating as a quiz entry', async () => {
  // Default: two new medicines a day, Adenosine (8 cards) and Adrenaline (22 cards).
  assert.match($('.quiz-button').textContent, /^Medicines quiz \(30 today\)$/);
  dom.window.location.hash = '#quiz';
  await sleep(30);
  assert.match($('.quiz-counts').textContent, /0 cards due · 2 new medicines \(30 cards\) today/);
  click($('[data-action="quiz-start"]'));
  assert.match($('.quiz-prompt').textContent, /^Adenosine – Indications$/);
  assert.equal($('.quiz-answer'), null, 'the answer is hidden until asked for');
  click($('[data-action="quiz-show-answer"]'));
  assert.ok($('.quiz-answer').textContent.trim().length > 0);
  assert.equal($('.quiz-answer .comment-button'), null, 'answers have no comment buttons');
  assert.equal($$('.rating-button').length, 4);
  click($('[data-rating="good"]'));
  assert.match($('.quiz-left').textContent, /^29 cards left$/);
  await sleep(SYNC_DELAY_AFTER_EDIT_MS + 200);
  assert.ok(stored['quiz-cpg-14-2'], 'the rating is uploaded as the medicine quiz entry');
  click($('[data-action="quiz-end"]'));
  // Adenosine was started today, so its 7 other cards stay without using a place.
  assert.match($('.quiz-counts').textContent, /1 new medicine \(29 cards\) today/);
  const select = $('#quiz-new-medicines');
  select.value = '3';
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.match($('.quiz-counts').textContent, /2 new medicines \(38 cards\) today/);
  assert.equal($('#quiz-reviews').value, '30', 'review limit defaults to 30');
  dom.window.location.hash = '';
  await sleep(30);
});

test('Practise one medicine goes through its cards without changing the schedule', async () => {
  dom.window.location.hash = '#quiz';
  await sleep(30);
  const counts = $('.quiz-counts').textContent;
  const select = $('#quiz-practice-medicine');
  const adrenaline = [...select.options].find((option) => /^Adrenaline \(/.test(option.text));
  assert.match(adrenaline.text, /^Adrenaline \(22 cards\)$/);
  select.value = adrenaline.value;
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  click($('[data-action="quiz-practise"]'));
  assert.match($('.quiz-left').textContent, /^Practice · 22 cards left$/);
  assert.match($('.quiz-prompt').textContent, /^Adrenaline – Indications$/);
  click($('[data-action="quiz-show-answer"]'));
  assert.equal($$('.rating-button').length, 2);
  click($('[data-action="quiz-practice-answer"][data-rating="again"]'));
  assert.match($('.quiz-left').textContent, /22 cards left/, 'Again keeps the card');
  click($('[data-action="quiz-show-answer"]'));
  click($('[data-action="quiz-practice-answer"][data-rating="good"]'));
  assert.match($('.quiz-left').textContent, /21 cards left/);
  assert.match($('.quiz-end-button').textContent, /End practice/);
  click($('[data-action="quiz-end"]'));
  assert.equal($('.quiz-counts').textContent, counts, 'daily study unchanged');
  assert.equal($('#quiz-practice-medicine').value, adrenaline.value, 'choice kept');
  await sleep(SYNC_DELAY_AFTER_EDIT_MS + 200);
  assert.equal(stored['quiz-cpg-14-3'], undefined, 'practice answers are not uploaded');
  dom.window.location.hash = '';
  await sleep(30);
});

test('Practice level limits the quiz to the medicines of one ATP and is saved', async () => {
  dom.window.location.hash = '#quiz';
  await sleep(30);
  const level = $('#quiz-practice-level');
  assert.deepEqual(
    [...level.options].map((option) => option.text),
    ['All levels', 'EMT', 'Paramedic', 'ICP', 'CCP'],
  );
  assert.equal(level.value, '', 'all levels by default');
  const medicineNames = () => [...$('#quiz-practice-medicine').options].map((o) => o.text);
  const allCount = medicineNames().length;
  level.value = 'EMT';
  level.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  const emtNames = medicineNames();
  assert.ok(emtNames.length < allCount);
  assert.ok(
    emtNames.some((name) => /^Aspirin /.test(name)),
    'EMT medicines stay',
  );
  assert.ok(!emtNames.some((name) => /^(Adenosine|Fentanyl) /.test(name)), 'others hidden');
  // Feature 11: only the doses an EMT may give; lines for higher levels are greyed with a label.
  assert.ok(emtNames.includes('Adrenaline (13 cards)'), 'the 9 IV-only dose cards are dropped');
  const practice = $('#quiz-practice-medicine');
  practice.value = [...practice.options].find((o) => /^Adrenaline /.test(o.text)).value;
  practice.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  click($('[data-action="quiz-practise"]'));
  while (!/Asthma/.test($('.quiz-prompt').textContent)) {
    click($('[data-action="quiz-show-answer"]'));
    click($('[data-action="quiz-practice-answer"][data-rating="good"]'));
  }
  click($('[data-action="quiz-show-answer"]'));
  assert.equal($('.other-level-label').textContent, 'ICP and CCP');
  assert.equal($$('.other-level-label').length, 1, 'one label for the run of greyed lines');
  assert.equal($$('.other-level-line').length, 6, 'the IV lines');
  assert.equal($$('.quiz-answer .bullet-row').length, 8, 'no line is removed');
  click($('[data-action="quiz-end"]'));
  await sleep(SYNC_DELAY_AFTER_EDIT_MS + 200);
  assert.equal(JSON.parse(stored['quiz-settings'].n).practiceLevel, 'EMT', 'saved to the tracker');
  const reset = $('#quiz-practice-level');
  reset.value = '';
  reset.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.equal(medicineNames().length, allCount);
  dom.window.location.hash = '';
  await sleep(30);
});

/** Plays the current ordering round perfectly with the buttons: distractors aside, then arrows. */
function playRoundPerfectly(step) {
  step.cards.forEach((card, index) => {
    if (card.isDistractor) click($(`[data-action="guideline-quiz-discard"][data-card="${index}"]`));
  });
  const used = new Set();
  step.real.forEach((action, target) => {
    const index = step.cards.findIndex(
      (card, i) => !card.isDistractor && !used.has(i) && card.text === action.text,
    );
    used.add(index);
    const positionOf = () =>
      $$('[data-drop-list="placed"] > .order-card').findIndex(
        (item) => Number(item.dataset.card) === index,
      );
    while (positionOf() > target)
      click($(`[data-action="guideline-quiz-up"][data-card="${index}"]`));
  });
}

test('the Guideline quiz orders cards with arrows, marks them, and saves the best and last score', async () => {
  const { state } = await import('../src/state.js');
  const { reportContext } = await import('../src/report.js');
  dom.window.location.hash = '#guideline-quiz';
  await sleep(30);
  const select = $('#guideline-quiz-choice');
  const vt = [...select.options].find((option) =>
    /^3\.8 Ventricular Tachycardia/.test(option.text),
  );
  select.value = vt.value;
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  click($('[data-action="guideline-quiz-start"]'));
  assert.match($('.quiz-prompt').textContent, /Put the actions in order/);
  const first = $$('[data-drop-list="placed"] > .order-card');
  assert.equal(
    first.length,
    state.guidelineQuiz.steps[0].cards.length,
    'every card starts in the order',
  );
  assert.ok(
    first[0].querySelector('[data-action="guideline-quiz-up"]').disabled,
    'no up at the top',
  );
  assert.ok(first[0].querySelector('.order-grip'), 'each card has a grip to drag');
  // Down then up puts a card back; a card put aside can be put back.
  const index = Number(first[0].dataset.card);
  click($(`[data-action="guideline-quiz-down"][data-card="${index}"]`));
  assert.equal(Number($$('[data-drop-list="placed"] > .order-card')[1].dataset.card), index);
  click($(`[data-action="guideline-quiz-up"][data-card="${index}"]`));
  click($(`[data-action="guideline-quiz-discard"][data-card="${index}"]`));
  assert.equal($$('[data-drop-list="discarded"] > .order-card').length, 1);
  click($(`[data-action="guideline-quiz-return"][data-card="${index}"]`));
  assert.equal($$('[data-drop-list="discarded"] > .order-card').length, 0);
  assert.match(reportContext().lines.join('\n'), /Ordering round/, 'a report names the round');
  while (state.guidelineQuiz && !state.guidelineQuiz.finished) {
    const quiz = state.guidelineQuiz;
    const step = quiz.steps[quiz.index];
    if (step.kind === 'order') {
      playRoundPerfectly(step);
      click($('[data-action="guideline-quiz-check"]'));
      assert.match($('.quiz-counts').textContent, /^(\d+) of \1 right$/);
      assert.ok($('.order-answers'), 'the guideline order is shown after Check');
    } else {
      assert.match(reportContext().lines.join('\n'), /Answer given by the app: /);
      click(
        $(
          `[data-action="guideline-quiz-pick"][data-choice="${step.choices.indexOf(step.answer)}"]`,
        ),
      );
      assert.equal($('.quiz-counts').textContent, 'Right');
    }
    click($('[data-action="guideline-quiz-next"]'));
  }
  assert.match($('.quiz-finished').textContent, /\(100%\)$/);
  assert.equal(
    $('.streak-celebration__number--new').textContent,
    '1',
    'the first quiz lights the streak',
  );
  click($('.streak-celebration'));
  assert.ok($('.streak-celebration'), 'a tap beside the button does not close the celebration');
  click($('.streak-celebration__button'));
  assert.equal($('.streak-celebration'), null, 'Continue closes the celebration');
  await sleep(SYNC_DELAY_AFTER_EDIT_MS + 200);
  const note = JSON.parse(stored['quiz-order-cpg-3-8'].n);
  assert.equal(note.best, 100);
  assert.equal(note.last, 100, 'the most recent score is saved too');
  click($('[data-action="guideline-quiz-end"]'));
  assert.match($('#guideline-quiz-choice').selectedOptions[0].text, /best 100%$/);
  click($('[data-action="guideline-quiz-start"]'));
  assert.match(
    $('.guideline-quiz-screen .quiz-totals').textContent,
    /^Best: 100% \(.+\) · Most recent: 100% \(.+\)$/,
    'starting a play shows the best and the most recent score',
  );
  click($('[data-action="guideline-quiz-end"]'));
  dom.window.location.hash = '';
  await sleep(30);
  assert.ok($('a[href="#guideline-quiz"]'), 'the list screen has the Guideline quiz button');
  assert.equal($('.streak-button--active').textContent.trim(), '1', 'the top bar shows the streak');
  assert.match(
    $('a[href="#cpg-3-8"] .row-quiz-score').textContent,
    /100%$/,
    'the list row shows the most recent quiz score',
  );
});

test('the Quiz pill opens the guideline quiz and finishing returns to the same place', async () => {
  const { state } = await import('../src/state.js');
  dom.window.location.hash = '#cpg-3-8';
  await sleep(30);
  assert.equal($$('.status-buttons > button').length, 3, 'Review, Complete and Quiz');
  // Unfold the second heading and scroll, then open the quiz from the pill.
  click($$('.heading-section')[1].previousElementSibling);
  let scrolledTo = null;
  dom.window.scrollTo = (x, y) => {
    scrolledTo = y;
  };
  Object.defineProperty(dom.window, 'scrollY', { value: 420, configurable: true });
  click($('[data-action="quiz-this-guideline"]'));
  await sleep(30);
  assert.equal(dom.window.location.hash, '#guideline-quiz');
  assert.match($('.quiz-left').textContent, /^Ventricular Tachycardia · step 1/);
  assert.equal($('.back-link').getAttribute('href'), '#cpg-3-8');
  while (!state.guidelineQuiz.finished) {
    const step = state.guidelineQuiz.steps[state.guidelineQuiz.index];
    if (step.kind === 'order') {
      playRoundPerfectly(step);
      click($('[data-action="guideline-quiz-check"]'));
    } else {
      const right = step.choices.indexOf(step.answer);
      click($(`[data-action="guideline-quiz-pick"][data-choice="${right}"]`));
    }
    click($('[data-action="guideline-quiz-next"]'));
  }
  assert.equal($('.score-ring').getAttribute('aria-label'), 'Score 100%');
  assert.equal($('.streak-celebration'), null, 'only the first quiz of the day celebrates');
  assert.equal($('.score-ring').style.getPropertyValue('--score-target'), '100');
  const back = $('a.quiz-start-button');
  assert.equal(back.getAttribute('href'), '#cpg-3-8');
  dom.window.location.hash = back.getAttribute('href');
  await sleep(30);
  assert.ok($('.guideline-body'), 'back on the guideline');
  assert.equal($$('.heading-section')[1].hidden, false, 'the unfolded heading stays unfolded');
  assert.equal(scrolledTo, 420, 'scrolled back to where the student was');
  assert.equal(state.guidelineQuiz, null);
  assert.equal(state.guidelineQuizReturn, null);
  dom.window.scrollTo = () => {};
  Object.defineProperty(dom.window, 'scrollY', { value: 0, configurable: true });
  dom.window.location.hash = '';
  await sleep(30);
});

test('guidelines without a guideline quiz have no Quiz pill', async () => {
  dom.window.location.hash = '#cpg-1-2';
  await sleep(30);
  assert.equal($('[data-action="quiz-this-guideline"]'), null);
  dom.window.location.hash = '';
  await sleep(30);
});

test('the Medicine test asks tick-all and one-of-four questions and gives a score', async () => {
  dom.window.location.hash = '#medicine-test';
  await sleep(30);
  click($('[data-action="test-start"]'));
  const total = Number($('.quiz-left').textContent.match(/of (\d+)/)[1]);
  for (let i = 0; i < total; i++) {
    if ($('[data-action="test-tick"]')) {
      click($('[data-action="test-tick"]'));
      assert.equal($('[data-action="test-tick"]').getAttribute('aria-pressed'), 'true');
      click($('[data-action="test-check"]'));
    } else {
      click($('[data-action="test-pick"]'));
    }
    assert.match($('.quiz-counts').textContent, /^(Right|Not quite)$/);
    click($('[data-action="test-next"]'));
  }
  assert.match($('.quiz-finished').textContent, new RegExp(`: \\d+ of ${total} \\(\\d+%\\)$`));
  assert.match($('.quiz-totals').textContent, /^Best: \d+% .* · new best$/, 'the best is saved');
  click($('[data-action="test-end"]'));
  assert.ok($('#medicine-test-choice'));
  assert.match($('#medicine-test-choice').selectedOptions[0].textContent, / · best \d+%$/);
  const level = $('#quiz-practice-level');
  assert.ok(level, 'the practice level can be chosen on the test screen');
  level.value = [...level.options].at(-1).value;
  level.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.ok($('.medicine-test-screen'), 'the test screen is redrawn, not the Medicines quiz');
  assert.equal($('#quiz-practice-level').value, level.value);
  $('#quiz-practice-level').value = '';
  $('#quiz-practice-level').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  dom.window.location.hash = '';
  await sleep(30);
});

test('Pick the guideline puts each piece in a box, takes one back and marks the round', async () => {
  dom.window.location.hash = '#pick-guideline';
  await sleep(30);
  click($('[data-action="sort-start"][data-count="2"]'));
  assert.equal($$('.sort-header__name').length, 2, 'both guidelines are named in the header');
  const total = Number($('.quiz-left').textContent.match(/of (\d+)/)[1]);
  click($('[data-action="sort-place"][data-side="0"]'));
  assert.equal($$('.sort-piece--placed').length, 1);
  click($('[data-action="sort-take-back"]'));
  assert.equal($$('.sort-piece--placed').length, 0, 'a piece can be taken back');
  for (let i = 0; i < total; i++) click($('[data-action="sort-place"][data-side="1"]'));
  assert.equal($('[data-action="sort-place"]'), null);
  click($('[data-action="sort-check"]'));
  assert.match($('.quiz-finished').textContent, new RegExp(`^\\d+ of ${total} right$`));
  assert.equal($$('.sort-piece--right, .sort-piece--wrong').length, total);
  dom.window.location.hash = '';
  await sleep(30);
});

test('Pick the guideline compares three as rows, and the first can be changed', async () => {
  dom.window.location.hash = '#pick-guideline';
  await sleep(30);
  click($('[data-action="sort-end"]')); // the round marked in the test before is still shown
  click($('[data-action="sort-start"][data-count="3"]'));
  assert.equal($$('.sort-header__name').length, 3);
  assert.ok($('.sort-boxes--rows'), 'three guidelines are rows');
  const picker = $('#sort-first-choice');
  const other = [...picker.options].find((option) => !option.selected);
  picker.value = other.value;
  picker.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.equal($('#sort-first-choice').value, other.value, 'the round starts with the one picked');
  assert.equal($$('.sort-header__name').length, 3, 'still three');
  dom.window.location.hash = '';
  await sleep(30);
});

test('Complete guidelines are due for review the set number of days after they were marked', async () => {
  const { dueForReviewIds } = await import('../src/settingsState.js');
  const day = 24 * 60 * 60 * 1000;
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const entries = {
    a: { s: 'c', t: 1 },
    'marked-a': { s: 'i', n: String(10 * day) },
    b: { s: 'c', t: 1 },
    'marked-b': { s: 'i', n: String(15 * day) },
    c: { s: 'v', t: 1 },
    'marked-c': { s: 'i', n: String(day) },
  };
  assert.deepEqual(dueForReviewIds(list, entries, 7, 17 * day), ['a']);
  assert.deepEqual(dueForReviewIds(list, entries, 0, 100 * day), [], '0 days is off');
});

test('the Settings screen turns on dark mode and sets the review days with the wheel', async () => {
  dom.window.location.hash = '#settings';
  await sleep(30);
  const darkSwitch = $('#dark-mode-switch');
  darkSwitch.checked = true;
  darkSwitch.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.equal(dom.window.document.documentElement.dataset.theme, 'dark');
  const wheel = $('#review-days-wheel');
  assert.equal(wheel.getAttribute('aria-valuenow'), '0');
  const press = (key) =>
    wheel.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true }));
  press('ArrowDown');
  press('ArrowDown');
  assert.equal(wheel.getAttribute('aria-valuetext'), '2 days');
  await sleep(300);
  const savedSession = JSON.parse(dom.window.localStorage.getItem('eas-cpg-tracker-v2'));
  assert.equal(JSON.parse(savedSession.s['app-settings'].n).reviewAfterDays, 2);
  press('Home');
  await sleep(300);
  assert.equal(wheel.getAttribute('aria-valuetext'), 'Off');
  darkSwitch.checked = false;
  darkSwitch.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  dom.window.location.hash = '';
  await sleep(30);
  assert.ok($('a.settings-button[href="#settings"]'), 'the list header has the Settings button');
});

test('the Data tab of Settings shows the streak and study stats', async () => {
  dom.window.location.hash = '#stats';
  await sleep(30);
  assert.equal($('.settings-tab[aria-current="page"]').textContent, 'Data');
  assert.equal($('.stats-streak__count').textContent, '1 day');
  assert.equal($$('.activity__day--done').length, 1, "today's quiz day is filled in");
  assert.ok($$('.stat-tile__label').some((label) => label.textContent === 'Perfect scores'));
  click($('.settings-tab[href="#settings"]'));
  dom.window.location.hash = '#settings';
  await sleep(30);
  assert.ok($('#review-days-wheel'), 'the General tab has the settings');
  dom.window.location.hash = '';
  await sleep(30);
});

test('on the demo tracker a double tap on the rat switches the streak off and on', async () => {
  const { state } = await import('../src/state.js');
  const { renderList } = await import('../src/views/listView.js');
  const realLabel = state.label;
  state.label = ' Demo ';
  renderList();
  click($('button.streak-button'));
  click($('button.streak-button'));
  assert.equal($('.streak-button--active'), null, 'the first double tap makes the rat sad');
  assert.equal($('.streak-button').textContent.trim(), '0');
  click($('button.streak-button'));
  click($('button.streak-button'));
  assert.equal($('.streak-celebration__number--new').textContent, '1', 'the second powers up');
  click($('.streak-celebration__button'));
  click($('button.streak-button'));
  await sleep(DOUBLE_TAP_MS + 50);
  assert.equal(dom.window.location.hash, '#stats', 'a single tap still opens the Data tab');
  state.label = realLabel;
  dom.window.location.hash = '';
  await sleep(30);
  assert.ok($('a.streak-button'), 'other trackers keep the plain link');
});

test('the report button shows on every screen and describes what is on it', async () => {
  const { reportContext } = await import('../src/report.js');
  assert.equal($('#report-footer').hidden, false);
  assert.equal($('#report-footer').textContent.trim(), 'Report a mistake or request');
  assert.doesNotMatch(doc.documentElement.innerHTML, /klapaukh@/, 'no whole address in the page');
  assert.deepEqual(reportContext().lines, ['Screen: Guideline list']);
  dom.window.location.hash = '#cpg-3-8';
  await sleep(30);
  assert.equal(reportContext().title, 'CPG EAS 3.8 Ventricular Tachycardia');
  dom.window.location.hash = '';
  await sleep(30);
});

async function checkAgain() {
  const { state } = await import('../src/state.js');
  state.lastUpdateCheckAt = 0;
  doc.dispatchEvent(new dom.window.Event('visibilitychange'));
  await sleep(30);
}

test('the list footer shows the export date, the last check and the study-aid notice', () => {
  const footer = $('.app-footer').textContent;
  assert.match(footer, /Guidelines exported 24\.09\.2026/);
  assert.doesNotMatch($('.update-checked-time').textContent, /not yet/);
  assert.match(footer, /Study aid only/);
  assert.equal($('#update-banner').hidden, true);
});

test('newer guidelines show the banner; Update now downloads every file, then reloads', async () => {
  published.guidelinesExportedOn = '01.01.2099';
  await checkAgain();
  assert.equal($('#update-banner').hidden, false);
  assert.match($('#update-banner').textContent, /A new version of the guidelines is available/);
  fileDownloadsWork = false;
  click($('[data-action="apply-update"]'));
  await sleep(30);
  assert.match($('#update-banner').textContent, /Couldn’t download the update/);
  fileDownloadsWork = true;
  const realLocation = globalThis.location;
  let reloads = 0;
  globalThis.location = { reload: () => reloads++ };
  click($('[data-action="apply-update"]'));
  await sleep(30);
  globalThis.location = realLocation;
  assert.equal(reloads, 1);
  assert.ok(published.files.every((path) => fileRequests.includes(path)));
  published.guidelinesExportedOn = '24.09.2026';
  await checkAgain();
  assert.equal($('#update-banner').hidden, true);
});

test('a changed guideline is tagged Updated until it is opened', async () => {
  const { state } = await import('../src/state.js');
  state.updatedGuidelineIds.add('cpg-2-1');
  dom.window.location.hash = '#queue';
  await sleep(30);
  dom.window.location.hash = '';
  await sleep(30);
  assert.equal($$('.updated-tag').length, 1);
  dom.window.location.hash = '#cpg-2-1';
  await sleep(30);
  dom.window.location.hash = '';
  await sleep(30);
  assert.equal($$('.updated-tag').length, 0);
});

test('Switch tracker has a back link to the open tracker, which stays saved until replaced', async () => {
  dom.window.location.hash = '';
  await sleep(30);
  assert.equal($('[data-action="switch-tracker"]'), null, 'Switch tracker is not on the list');
  assert.match($('.home-header h1').textContent, /^Clinical Practice GuidelinesStudy Version$/);
  assert.ok($('.home-card + h1 + .filter-chips'), 'the title sits just above the filter pills');
  dom.window.location.hash = '#settings';
  await sleep(30);
  click($('[data-action="switch-tracker"]'));
  assert.ok($('#passcode-input'));
  assert.match($('[data-action="back-to-tracker"]').textContent, /Back to Sam - 2026/);
  assert.notEqual(dom.window.localStorage.getItem('eas-cpg-tracker-v2'), null);
  click($('[data-action="back-to-tracker"]'));
  assert.ok($('.home-header'), 'back on the list');
  dom.window.location.hash = '#settings';
  await sleep(30);
  click($('[data-action="switch-tracker"]'));
  await signIn('not-a-code');
  assert.ok($('.warning-message'));
  assert.ok($('[data-action="back-to-tracker"]'), 'a wrong passcode keeps the back link');
  await signIn(OTHER_TRACKER);
  assert.match($('.tracker-label').textContent, /Kim/);
  const saved = JSON.parse(dom.window.localStorage.getItem('eas-cpg-tracker-v2'));
  assert.equal(saved.c, OTHER_TRACKER, 'the new tracker replaced the old one on this phone');
  dom.window.location.hash = '#settings';
  await sleep(30);
  click($('[data-action="switch-tracker"]'));
  assert.match($('[data-action="back-to-tracker"]').textContent, /Back to Kim/);
  await signIn(TRACKER); // back to Sam's tracker for the tests that follow
});

test('Scenarios open from the Quiz choice; a guideline opened from one links back to it', async () => {
  dom.window.location.hash = '';
  await sleep(30);
  assert.ok($('#quiz-choice a[href="#scenarios"]'), 'Scenarios is in the Quiz choice');
  dom.window.location.hash = '#scenarios';
  await sleep(30);
  const allRows = $$('.scenario-row').length;
  assert.ok(allRows >= 40);
  assert.equal($('.scenario-group-title').textContent, 'Common presentation');
  assert.ok(!$('.scenario-progress'), 'no progress until something is run');
  click($('[data-action="scenario-complexity"][data-value="3"]'));
  click($('[data-action="scenario-load"][data-value="delegation"]'));
  assert.deepEqual(
    $$('.scenario-group-title').map((title) => title.textContent),
    ['Complex or atypical'],
  );
  assert.ok($$('.scenario-row small').every((meta) => /Delegation/.test(meta.textContent)));
  assert.deepEqual(
    $$('.scenario-level-chips').map((row) => row.querySelectorAll('.filter-chip').length),
    [4, 4],
    'complexity and scene load each have All and three chips on one row',
  );
  const themeChoice = $('#scenario-theme-choice');
  themeChoice.value = 'Obstetrics';
  themeChoice.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  const rows = $$('.scenario-row b').map((title) => title.textContent);
  assert.ok(rows.includes('Birth in the bathroom') && !rows.includes('Café anaphylaxis'));
  click($('[data-action="scenario-complexity"][data-value=""]'));
  click($('[data-action="scenario-load"][data-value=""]'));
  $('#scenario-theme-choice').value = '';
  $('#scenario-theme-choice').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.equal($$('.scenario-row').length, allRows, 'All shows every scenario again');
  dom.window.location.hash = '#scenario-long-lie';
  await sleep(30);
  assert.equal($('.scenario-title').textContent, 'Long lie');
  const heads = $$('.scenario-vitals th').map((cell) => cell.textContent);
  assert.deepEqual(heads, ['GCS', 'RR', 'SpO₂', 'HR', 'BP', 'Temp', 'BGL', 'Pain']);
  assert.equal($$('.scenario-vitals tbody td')[4].textContent, '168/92');
  assert.equal($$('.scenario-guideline').length, 4);
  assert.equal($('.scenario-guideline').getAttribute('href'), '#cpg-13-3');
  // A "Suits …" pill follows when editors have set the levels (content/scenario-edits.js).
  assert.match(
    $('.scenario-tags').textContent.trim().replace(/\s+/g, ' '),
    /^Common presentation Single patient( Suits .+)?$/,
  );
  assert.equal($$('.scenario-outcomes li').length, 3, 'the intended outcomes are in the intention');
  const facts = $('.scenario-give-if-asked').closest('details');
  assert.ok(!facts.open, 'the give-if-asked facts are folded for the mentor');
  assert.match(facts.textContent, /Student: give freely/);
  assert.equal($$('.scenario-give-if-asked li').length, 3);
  click($('[data-action="scenario-finish"]'));
  assert.equal($$('.scenario-guide li').length, 4, 'the PEARLS guide has four steps');
  assert.equal($$('.scenario-outcome').length, 3, 'one rating row per outcome');
  $('input[name="rating-0"][value="3"]').checked = true;
  $('input[name="rating-1"][value="1"]').checked = true; // the third is left blank
  $$('input[name="struggled"]')[0].checked = true;
  $('#scenario-debrief-delta').value = 'Slow to check for a pressure injury';
  $('#scenario-debrief-takeaway').value = 'Ask why they fell first';
  const { state } = await import('../src/state.js');
  delete state.entries['study-streak']; // so the run is today's first activity
  click($('[data-action="scenario-finish-save"]'));
  assert.ok($('.streak-celebration'), 'a scenario run lights the streak, like a quiz');
  click($('.streak-celebration__button'));
  assert.match($('#scenario-queue-message').textContent, /^Run saved\. Score 67%\./);
  assert.ok(!$('#scenario-debrief-delta'), 'the form closes');
  const debrief = $('.scenario-screen').textContent;
  assert.match(debrief, /Slow to check for a pressure injury/);
  assert.match(debrief, /Ask why they fell first/);
  assert.match(debrief, /Score: 67% \(/);
  assert.match(debrief, /Independent/);
  dom.window.location.hash = '#scenarios';
  await sleep(30);
  assert.match($('.scenario-run').textContent, /· 67%$/, 'the list shows the run and its score');
  const progress = $$('.scenario-progress tr').map((row) =>
    [...row.children].map((cell) => cell.textContent.trim()).join(' | '),
  );
  assert.ok(progress.includes('Common presentation | 1 of 23 | 67%'), progress.join(' / '));
  dom.window.location.hash = '#scenario-long-lie';
  await sleep(30);
  dom.window.location.hash = '#cpg-13-3';
  await sleep(30);
  assert.equal($('.back-link').textContent, '‹ Back to scenario: Long lie');
  assert.equal($('.back-link').getAttribute('href'), '#scenario-long-lie');
  dom.window.location.hash = '#cpg-1-2'; // not one of the scenario's guidelines
  await sleep(30);
  assert.equal($('.back-link').textContent, '‹ All guidelines');
  dom.window.location.hash = '#cpg-13-3';
  await sleep(30);
  assert.equal($('.back-link').textContent, '‹ All guidelines', 'the link back is forgotten');
  dom.window.location.hash = '#scenario-transmission-gully-crash';
  await sleep(30);
  assert.equal($$('.scenario-patient').length, 3, 'each patient of a multi-patient scenario');
  dom.window.location.hash = '';
  await sleep(30);
});
