// Tests for editors' changes to quiz questions: the pure logic (src/questionEdits.js), edits in
// both quizzes, the daily copy (scripts/sync-edits.js) and the editor page (editor.html).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { guidelineData } from '../content/guidelines.js';
import { relatedLinks } from '../content/related.js';
import { buildQuizCards } from '../src/quizCards.js';
import { guidelineQuestions, buildPlay, playContext } from '../src/guidelineQuizPlay.js';
import {
  applyCardEdits,
  cardQuestion,
  textToBlocks,
  blocksToText,
  snapshot,
  reviewState,
  seededRandom,
  editFromValues,
  REVIEW,
} from '../src/questionEdits.js';
import {
  questionPreview,
  perfectRound,
  boxValues,
  boxText,
  shownWrong,
} from '../src/editor/questions.js';
import { cleanEdits } from '../scripts/sync-edits.js';

const sections = guidelineData.sections;
const cards = buildQuizCards(sections, 'Medicines');
const context = playContext(sections, relatedLinks);
const vt = context.quizzed.find((quizzed) => quizzed.number === '3.8');
const vtQuestions = guidelineQuestions(vt, context);
const fixedRandom = () => 0.3;

/* ---------- Pure logic ---------- */

test('answers turn into editable text and back, keeping bullets and their levels', () => {
  const text = 'Adult:\n- 300 mg IV\n  - repeat once <if needed> & safe';
  const blocks = textToBlocks(text);
  assert.deepEqual(blocks, [
    ['p', 'Adult:'],
    ['b', '300 mg IV', 1],
    ['b', 'repeat once &lt;if needed> &amp; safe', 2],
  ]);
  assert.equal(blocksToText(blocks), text);
});

test('every question id is unique, and the same when built again', () => {
  const ids = context.quizzed.flatMap((quizzed) =>
    guidelineQuestions(quizzed, context).map((question) => question.id),
  );
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(
    guidelineQuestions(vt, playContext(sections, relatedLinks)).map((question) => question.id),
    vtQuestions.map((question) => question.id),
  );
});

test('a changed dose keeps its question id, so the edit is found for review', () => {
  const number = vtQuestions.find((question) => question.kind === 'number');
  const edit = { answer: '1 mg', kind: 'number', was: snapshot(number) };
  assert.equal(reviewState(number, edit), REVIEW.NONE);
  const changedLine = { ...number, line: number.line.replace(/\d+/, '999'), answer: '999 mg' };
  assert.equal(reviewState(changedLine, edit), REVIEW.CHANGED);
  assert.equal(reviewState(null, edit), REVIEW.GONE);
});

/* ---------- Edits in the quizzes ---------- */

test('medicines cards: an edit changes the prompt and answer; "off" leaves the card out', () => {
  const [first, second] = cards;
  const edits = {
    [first.id]: { prompt: 'New question', answer: '- New answer', kind: 'card', was: {} },
    [second.id]: { off: true, kind: 'card', was: {} },
  };
  const edited = applyCardEdits(cards, edits);
  assert.equal(edited.length, cards.length - 1);
  assert.equal(edited[0].prompt, 'New question');
  assert.deepEqual(edited[0].answerBlocks, [['b', 'New answer', 1]]);
  assert.equal(edited[0].id, first.id, 'the id stays, so the schedule is kept');
  assert.equal(cardQuestion(first).answer, blocksToText(first.answerBlocks));
});

test('guideline quiz: chosen wrong answers and steps are used; "off" drops a round', () => {
  const [round, secondRound] = vtQuestions.filter((question) => question.kind === 'order');
  const edits = {
    [round.id]: { steps: ['Do A', 'Do B'], wrong: ['Give aspirin'], kind: 'order', was: {} },
    [secondRound.id]: { off: true, kind: 'order', was: {} },
  };
  const steps = buildPlay(vt, context, fixedRandom, edits);
  const orders = steps.filter((step) => step.kind === 'order');
  assert.equal(orders.length, vt.rounds.length - 1);
  assert.deepEqual(
    orders[0].real.map((card) => card.text),
    ['Do A', 'Do B'],
  );
  assert.deepEqual(
    orders[0].cards.filter((card) => card.isDistractor).map((card) => card.text),
    ['Give aspirin'],
  );
});

test('guideline quiz: a choice question uses the editor’s right and wrong answers', () => {
  const situation = vtQuestions.find((question) => question.kind === 'situation');
  const edits = { [situation.id]: { answer: 'Right', wrong: ['W1', 'W2'], kind: 'situation' } };
  // Every situation question but this one is turned off, so this one is always asked.
  vtQuestions
    .filter((question) => question.kind === 'situation' && question !== situation)
    .forEach((question) => (edits[question.id] = { off: true, kind: 'situation' }));
  const step = buildPlay(vt, context, fixedRandom, edits).find((s) => s.type === 'situation');
  assert.equal(step.answer, 'Right');
  assert.deepEqual([...step.choices].sort(), ['Right', 'W1', 'W2']);
});

/* ---------- Changing one text in place ---------- */

/** A question as the editor page holds it, with no edit: built, live and its preview. */
const plainItem = (question) => ({
  question,
  live: question,
  preview: questionPreview(question.id, question),
});

test('an edit keeps only the fields that differ; none differing means no edit', () => {
  const card = cardQuestion(cards[0]);
  assert.equal(editFromValues(card, { prompt: card.prompt, answer: card.answer }, false), null);
  const edit = editFromValues(card, { prompt: 'New?', answer: card.answer }, false);
  assert.deepEqual(edit, { prompt: 'New?', kind: 'card', was: snapshot(card) });
  const off = editFromValues(card, { prompt: card.prompt, answer: card.answer }, true);
  assert.equal(off.off, true);
});

test('in place: one step changes or, emptied, goes; the other fields stay as built', () => {
  const round = vtQuestions.find((question) => question.kind === 'order');
  const item = plainItem(round);
  assert.equal(boxText(item, 'steps', 1), round.steps[1]);
  const changed = boxValues(item, 'steps', 1, '  New step ');
  assert.equal(changed.steps[1], 'New step');
  assert.equal(changed.steps.length, round.steps.length);
  assert.equal(changed.title, round.title);
  assert.deepEqual(changed.wrong, [], 'random wrong cards stay random');
  assert.equal(boxValues(item, 'steps', 1, ' ').steps.length, round.steps.length - 1);
  const edit = editFromValues(round, changed, false);
  assert.deepEqual(Object.keys(edit).sort(), ['kind', 'steps', 'was']);
});

test('in place: changing a random wrong answer keeps the others shown', () => {
  const situation = vtQuestions.find((question) => question.kind === 'situation');
  const item = plainItem(situation);
  const shown = shownWrong(item.preview);
  assert.ok(shown.length > 0);
  assert.equal(boxText(item, 'wrong', 0), shown[0]);
  assert.deepEqual(boxValues(item, 'wrong', 0, 'Made up').wrong, ['Made up', ...shown.slice(1)]);
  assert.equal(boxValues(item, 'answer', 0, '').answer, situation.answer, 'a question needs one');
});

/* ---------- The daily copy ---------- */

test('a seeded random gives the same numbers for the same text, between 0 and 1', () => {
  const first = seededRandom('cpg-3-8|order|x');
  const again = seededRandom('cpg-3-8|order|x');
  const numbers = Array.from({ length: 50 }, first);
  assert.deepEqual(Array.from({ length: 50 }, again), numbers);
  assert.ok(numbers.every((number) => number >= 0 && number < 1));
  assert.notDeepEqual(Array.from({ length: 50 }, seededRandom('other')), numbers);
});

test('previews: each question as learners see it, the same every time', () => {
  const round = vtQuestions.find((question) => question.kind === 'order');
  const preview = questionPreview(round.id, round);
  assert.equal(preview.kind, 'order');
  assert.equal(preview.round.marked.score, preview.step.cards.length, 'marked all right');
  assert.deepEqual(questionPreview(round.id, round), preview, 'seeded by the question id');
  const choice = vtQuestions.find((question) => question.kind === 'number');
  const choicePreview = questionPreview(choice.id, { ...choice, answer: '7 mg', wrong: ['1 mg'] });
  assert.equal(choicePreview.kind, 'choice');
  assert.deepEqual([...choicePreview.step.choices].sort(), ['1 mg', '7 mg']);
  const card = cards[0];
  const edited = { ...cardQuestion(card), prompt: 'New?', answer: '- one\n- two' };
  assert.deepEqual(
    questionPreview(card.id, edited).card.answerBlocks,
    textToBlocks('- one\n- two'),
  );
  assert.deepEqual(
    questionPreview(card.id, cardQuestion(card)).card.answerBlocks,
    card.answerBlocks,
  );
});

test('a perfect round places the real cards in order and sets the distractors aside', () => {
  const real = [{ text: 'A' }, { text: 'B' }];
  const fake = { text: 'X', isDistractor: true };
  const round = perfectRound({ real, cards: [real[1], fake, real[0]] });
  assert.deepEqual(round.placed, [2, 0]);
  assert.deepEqual(round.discarded, [1]);
  assert.equal(round.marked.score, 3);
});

test('the daily copy keeps known edits only, sorted, with only the keys the app reads', () => {
  const cleaned = cleanEdits({
    'b|x': { kind: 'card', prompt: 'P', extra: 'dropped', was: { prompt: 'Q' } },
    'a|y': { kind: 'unknown', prompt: 'P' },
    'a|z': { kind: 'order', off: true, was: {} },
  });
  assert.deepEqual(Object.keys(cleaned), ['a|z', 'b|x']);
  assert.deepEqual(cleaned['b|x'], { kind: 'card', prompt: 'P', was: { prompt: 'Q' } });
});

/* ---------- The editor page ---------- */

let dom;
let doc;
const sheetEdits = {};
const $ = (selector) => doc.querySelector(selector);
const click = (element) => element.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

before(() => {
  const html = readFileSync('editor.html', 'utf8').replace(/<script[^>]*><\/script>/, '');
  dom = new JSDOM(html, { url: 'https://example.test/editor.html', pretendToBeVisual: true });
  doc = dom.window.document;
  dom.window.scrollTo = () => {};
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const globals = {
    window: dom.window,
    document: doc,
    localStorage: dom.window.localStorage,
    sessionStorage: dom.window.sessionStorage,
    location: dom.window.location,
    fetch: async (url, options) => {
      const body = JSON.parse(options.body);
      if (body.code !== 'editor-1')
        return { json: async () => ({ ok: false, error: 'not-found' }) };
      if (body.action === 'edit-save') {
        if (body.edit === null) delete sheetEdits[body.id];
        else sheetEdits[body.id] = body.edit;
      }
      return { json: async () => ({ ok: true, name: 'Eve', edits: { ...sheetEdits } }) };
    },
  };
  Object.entries(globals).forEach(([key, value]) => {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  });
});

test('page: sign in, find a guideline, edit a card, and undo the edit', async () => {
  await import('../src/editor/main.js');
  $('#editor-passcode').value = 'nope';
  click($('[data-action="sign-in"]'));
  await sleep(20);
  assert.match($('.warning-message').textContent, /wasn’t recognised/);
  $('#editor-passcode').value = 'editor-1';
  click($('[data-action="sign-in"]'));
  await sleep(20);
  const search = $('#editor-search');
  search.value = 'amiodarone';
  search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  const links = doc.querySelectorAll('#editor-rows a');
  assert.equal(links.length, 1);
  dom.window.location.hash = links[0].getAttribute('href');
  await sleep(20);
  const card = cards.find((candidate) => candidate.medicineId === 'cpg-14-4');
  click($(`[data-action="open"][data-id="${card.id}"]`));
  $('[data-field="prompt"]').value = 'Amiodarone in arrest: dose?';
  click($('[data-action="save"]'));
  await sleep(20);
  assert.deepEqual(sheetEdits[card.id], {
    prompt: 'Amiodarone in arrest: dose?',
    kind: 'card',
    was: snapshot(cardQuestion(card)),
  });
  assert.match($('.editor-question').textContent, /Edited\s*Not in the app yet/);
  const preview = doc.getElementById(`q-${card.id}`).querySelector('.editor-preview');
  assert.equal(preview.querySelector('.quiz-prompt').textContent, 'Amiodarone in arrest: dose?');
  assert.ok(preview.querySelector('.quiz-answer'), 'the card is shown turned over');
  click($(`[data-action="remove"][data-id="${card.id}"]`));
  await sleep(20);
  assert.deepEqual(sheetEdits, {});
});

test('page: an edit whose question changed is listed, and "Keep the edit" accepts the change', async () => {
  const round = vtQuestions.find((question) => question.kind === 'order');
  sheetEdits[round.id] = { wrong: ['W'], kind: 'order', was: { ...snapshot(round), title: 'Old' } };
  dom.window.location.hash = '';
  click($('[data-action="refresh"]'));
  await sleep(20);
  assert.match($('main').textContent, /Needs review \(1\)/);
  dom.window.location.hash = '#g-cpg-3-8';
  await sleep(20);
  assert.match(
    $('.editor-review').textContent,
    /When edited.*Learners see now.*Now in the guideline/s,
  );
  click($('[data-action="keep"]'));
  await sleep(20);
  assert.deepEqual(sheetEdits[round.id].was, snapshot(round));
  assert.equal($('.editor-review'), null);
});

test('page: tapping a text opens a box in its place; saving edits only that text', async () => {
  const card = cards.find((candidate) => candidate.medicineId === 'cpg-14-4');
  dom.window.location.hash = '#g-cpg-14-4';
  await sleep(20);
  const question = () => doc.getElementById(`q-${card.id}`);
  click(question().querySelector('[data-edit-field="answer"]'));
  assert.equal($('#box-text').value, cardQuestion(card).answer);
  assert.equal(question().querySelector('.quiz-answer'), null, 'the box replaces the answer');
  click($('.editor-inline [data-action="close"]'));
  assert.equal($('#box-text'), null);
  click(question().querySelector('[data-edit-field="prompt"]'));
  $('#box-text').value = 'Changed in place?';
  click($('[data-action="box-save"]'));
  await sleep(20);
  assert.deepEqual(sheetEdits[card.id], {
    prompt: 'Changed in place?',
    kind: 'card',
    was: snapshot(cardQuestion(card)),
  });
  assert.equal(question().querySelector('.quiz-prompt').textContent, 'Changed in place?');
  delete sheetEdits[card.id];
});

test('page: a marked choice can be tapped to change it on the editor page', async () => {
  dom.window.location.hash = '#g-cpg-3-8';
  await sleep(20);
  const choice = $('.choice-button[data-edit-field="wrong"]');
  assert.equal(choice.disabled, false);
  click(choice);
  assert.ok($('.editor-inline #box-text'));
});
