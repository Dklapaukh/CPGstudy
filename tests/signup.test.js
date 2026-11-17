/*
 * A first visit opens the demo tracker, whose Make an account button makes a new account and
 * opens it. Runs the whole app in a simulated browser (jsdom) with a fake backend.
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { SIGNED_IN_BEFORE_KEY } from '../src/constants.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const requests = [];
let dom;
let doc;

/** Knows the demo tracker and makes one account on "signup". */
function fakeBackend(body) {
  requests.push(body);
  if (body.action === 'demo') return { ok: true, code: 'demo-code', label: 'Demo', data: {} };
  if (body.action === 'signup') return { ok: true, code: 'river-moss-tui-7', label: body.name };
  return { ok: true, label: 'x', saved: 0, data: {} };
}

const click = (element) => element.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
const $ = (selector) => doc.querySelector(selector);

before(() => {
  const html = readFileSync('index.html', 'utf8').replace(/<script[^>]*><\/script>/, '');
  dom = new JSDOM(html, { url: 'https://example.test/', pretendToBeVisual: true });
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
    fetch: async (url, options) =>
      String(url).startsWith('version.json')
        ? { ok: true, json: async () => JSON.parse(readFileSync('version.json', 'utf8')) }
        : { json: async () => fakeBackend(JSON.parse(options.body)) },
  };
  Object.entries(globals).forEach(([key, value]) => {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  });
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
  });
});

test('a first visit opens the demo tracker with a Make an account button', async () => {
  await import('../src/main.js');
  await sleep(50);
  assert.ok(requests.some((body) => body.action === 'demo'));
  assert.ok($('.guideline-row'), 'the guideline list of the demo is showing');
  assert.ok($('.demo-banner [data-action="show-signup"]'));
  assert.equal(localStorage.getItem(SIGNED_IN_BEFORE_KEY), null);
});

test('Make an account asks for a name, shows a passcode, then opens the new account', async () => {
  click($('.demo-banner [data-action="show-signup"]'));
  assert.ok($('#signup-name'));
  assert.equal($('#signup-website').value, '', 'the bot trap starts empty');

  click($('#signup-button'));
  assert.match($('.warning-message').textContent, /type your name/);

  await sleep(20);
  $('#signup-name').value = 'Alex';
  click($('#signup-button'));
  await sleep(50);
  const signup = requests.find((body) => body.action === 'signup');
  assert.equal(signup.name, 'Alex');
  assert.equal(signup.website, '');
  assert.ok(signup.formMs >= 20, 'the time the form was open is sent');
  assert.equal($('#new-passcode').textContent, 'river-moss-tui-7');
  assert.equal(localStorage.getItem(SIGNED_IN_BEFORE_KEY), '1');

  click($('[data-action="open-signup-tracker"]'));
  await sleep(50);
  assert.ok($('.guideline-row'));
  assert.equal($('.demo-banner'), null, 'the banner is only on the demo');
  assert.match($('.tracker-label').textContent, /Alex/);
});
