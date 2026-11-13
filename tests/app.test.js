/*
 * Behaviour check of the whole app in a simulated browser (jsdom) with a fake backend.
 * Mirrors the behaviour checklist in README.md.
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { SEARCH_PAUSE_MS, SYNC_DELAY_AFTER_EDIT_MS } from '../src/constants.js';

const TRACKER = 'maple-oak-reef-11';
const MENTOR = 'mentor-secret';
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
  if (body.action === 'open' && code === MENTOR) return { ok: true, role: 'mentor', name: 'Mia' };
  if (body.action === 'open') return { ok: false, error: 'not-found' };
  if (body.action === 'create') return { ok: true, code: 'new-code-1', label: body.label };
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
  dom.window.prompt = () => 'Check dose';
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
  await signIn('wrong');
  assert.match($('.warning-message').textContent, /wasn’t recognised/);
  assert.equal($('#passcode-input').value, 'wrong');
});

test('a mentor passcode opens the mentor screen and can create a tracker', async () => {
  await signIn(MENTOR);
  assert.match($('.cover small').textContent, /Mentor screen · Mia/);
  $('#label-input').value = 'Alex - 2026';
  click($('#create-button'));
  await sleep(50);
  assert.equal($('#new-passcode').textContent, 'new-code-1');
  click($('[data-action="mentor-sign-out"]'));
  assert.ok($('#passcode-input'));
});

test('a tracker passcode shows 14 sections and 180 guidelines with counts', async () => {
  await signIn(TRACKER);
  assert.equal($$('details.section-group').length, 14);
  assert.equal($$('.guideline-row').length, 180);
  assert.match($('.progress-legend').textContent, /0 of 180 complete/);
  assert.equal($('.tracker-label').textContent, 'Sam - 2026');
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

test('the comment button adds a line to the notes and highlights the point', async () => {
  const button = $('.comment-button');
  click(button);
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
  assert.equal($('.queue-panel'), null);
  click($('.queue-add-button'));
  assert.match($('.queue-panel__progress').textContent, /^0 of 1 done/);
  assert.equal($('.queue-add-button').disabled, true);
  click($('[data-action="add-all-to-queue"]'));
  assert.match($('.queue-panel__progress').textContent, new RegExp(`^0 of ${relatedCount} done`));
  const firstQueuedId = $('.queue-item__link').getAttribute('href').slice(1);
  dom.window.location.hash = `#${firstQueuedId}`;
  await sleep(30);
  click($('[data-action="set-status"][data-status="c"]'));
  assert.match($('.queue-panel__progress').textContent, new RegExp(`^1 of ${relatedCount} done`));
  await sleep(1200);
  const savedQueue = JSON.parse(stored['review-queue'].n);
  assert.equal(savedQueue.length, relatedCount);
  assert.equal(savedQueue.filter((queued) => queued.done).length, 1);
});

test('the list screen opens the Review queue screen, where a guideline can be removed', async () => {
  dom.window.location.hash = '';
  await sleep(30);
  const button = $('.queue-button');
  assert.match(button.textContent, /^Review queue \(\d\)$/);
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

/** Plays the current ordering round perfectly: the actions in order, the distractors aside. */
function playRoundPerfectly(step) {
  const used = new Set();
  for (const action of step.real) {
    const index = step.cards.findIndex(
      (card, i) => !card.isDistractor && !used.has(i) && card.text === action.text,
    );
    used.add(index);
    click($(`[data-action="guideline-quiz-place"][data-card="${index}"]`));
  }
  step.cards.forEach((card, index) => {
    if (card.isDistractor) click($(`[data-action="guideline-quiz-discard"][data-card="${index}"]`));
  });
}

test('the Guideline quiz orders cards, marks them, and saves the best score', async () => {
  const { state } = await import('../src/state.js');
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
  assert.ok($('[data-action="guideline-quiz-check"]').disabled, 'Check waits for every card');
  // Place one card and take it back.
  click($('[data-action="guideline-quiz-place"]'));
  assert.equal(
    $$('.order-list:not(.order-list--pool) [data-action="guideline-quiz-return"]').length,
    1,
  );
  click($('[data-action="guideline-quiz-return"]'));
  while (state.guidelineQuiz && !state.guidelineQuiz.finished) {
    const quiz = state.guidelineQuiz;
    const step = quiz.steps[quiz.index];
    if (step.kind === 'order') {
      playRoundPerfectly(step);
      click($('[data-action="guideline-quiz-check"]'));
      assert.match($('.quiz-counts').textContent, /^(\d+) of \1 right$/);
      assert.ok($('.order-answers'), 'the guideline order is shown after Check');
    } else {
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
  await sleep(SYNC_DELAY_AFTER_EDIT_MS + 200);
  assert.equal(JSON.parse(stored['quiz-order-cpg-3-8'].n).best, 100);
  click($('[data-action="guideline-quiz-end"]'));
  assert.match($('#guideline-quiz-choice').selectedOptions[0].text, /best 100%$/);
  dom.window.location.hash = '';
  await sleep(30);
  assert.ok($('a[href="#guideline-quiz"]'), 'the list screen has the Guideline quiz button');
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
  click($('[data-action="switch-tracker"]'));
  assert.ok($('#passcode-input'));
  assert.match($('[data-action="back-to-tracker"]').textContent, /Back to Sam - 2026/);
  assert.notEqual(dom.window.localStorage.getItem('eas-cpg-tracker-v2'), null);
  click($('[data-action="back-to-tracker"]'));
  assert.ok($('[data-action="switch-tracker"]'), 'back on the list');
  click($('[data-action="switch-tracker"]'));
  await signIn('not-a-code');
  assert.ok($('.warning-message'));
  assert.ok($('[data-action="back-to-tracker"]'), 'a wrong passcode keeps the back link');
  await signIn(MENTOR);
  assert.match(doc.body.textContent, /Mentor screen/);
  assert.equal(dom.window.localStorage.getItem('eas-cpg-tracker-v2'), null);
  click($('[data-action="mentor-sign-out"]'));
  assert.equal($('[data-action="back-to-tracker"]'), null, 'no back link once signed out');
});
