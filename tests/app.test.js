/*
 * Behaviour check of the whole app in a simulated browser (jsdom) with a fake backend.
 * Mirrors the behaviour checklist in README.md.
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const TRACKER = 'maple-oak-reef-11';
const MENTOR = 'mentor-secret';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const requests = [];
const stored = {};
let dom;
let doc;

function fakeBackend(body) {
  requests.push(body);
  const code = String(body.code).trim().toLowerCase();
  if (body.action === 'open' && code === TRACKER) {
    return { ok: true, role: 'tracker', label: 'Sam - 2026', data: { ...stored } };
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

const click = (element) => element.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
const $ = (selector) => doc.querySelector(selector);
const $$ = (selector) => [...doc.querySelectorAll(selector)];

before(() => {
  const html = readFileSync('index.html', 'utf8').replace(/<script[^>]*><\/script>/, '');
  dom = new JSDOM(html, { url: 'https://example.test/', pretendToBeVisual: true });
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
    fetch: async (url, options) => ({ json: async () => fakeBackend(JSON.parse(options.body)) }),
  };
  Object.entries(globals).forEach(([key, value]) => {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
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

test('filters and search narrow the list', async () => {
  click($$('.filter-chip')[3]);
  assert.match($('.empty-message').textContent, /Nothing matches/);
  click($$('.filter-chip')[0]);
  const search = $('#search-input');
  search.value = 'adrenaline';
  search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  const found = $$('.guideline-row').length;
  assert.ok(found > 0 && found < 180);
  assert.equal(doc.activeElement.id, 'search-input');
  $('#search-input').value = '';
  $('#search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
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

test('changing status and notes saves, then shows Saved', async () => {
  click($('.status-button--complete'));
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
  assert.match($('.guideline-row small').textContent, /has notes|CPG EAS/);
});

test('switching tracker signs out and clears the saved tracker', async () => {
  click($('[data-action="switch-tracker"]'));
  assert.ok($('#passcode-input'));
  assert.equal(dom.window.localStorage.getItem('eas-cpg-tracker-v2'), null);
});
