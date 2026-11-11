// Tests for the content checker (scripts/contentCheck.js, review item R13).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentProblems, isValidBlock } from '../scripts/contentCheck.js';
import { guidelineData } from '../content/guidelines.js';

const GREEN = '#00693C';
const guidelineWith = (blocks) => ({
  sections: [
    { name: 'One', items: [{ id: 'cpg-1-1', n: '1.1', t: 'Title', hc: GREEN, b: blocks }] },
  ],
});

test('the published content has nothing unexpected in it', () => {
  assert.deepEqual(contentProblems(guidelineData), []);
});

test('every kind of block is accepted in its expected shape', () => {
  const blocks = [
    ['h', 'Heading', GREEN],
    ['p', 'Text with <b>bold</b>,<br>a line break, &lt; and &amp;, and 5 > 3', 0],
    ['b', 'Bullet', 2, GREEN],
    ['k', 'I', 'Identify', GREEN],
    ['box', [['p', 'Inside', 0]], GREEN],
    ['tbl', [[{ t: 'Cell', bg: null, w: false }, null]]],
  ];
  assert.deepEqual(contentProblems(guidelineWith(blocks)), []);
});

test('markup other than <b> and <br> is refused wherever it appears', () => {
  assert.equal(isValidBlock(['p', '<script>alert(1)</script>', 0]), false);
  assert.equal(isValidBlock(['p', '<b onclick="x()">text</b>', 0]), false);
  assert.equal(isValidBlock(['p', 'an &quot;entity&quot;', 0]), false);
  assert.equal(isValidBlock(['k', '<i>I</i>', 'Identify', GREEN]), false);
  assert.equal(isValidBlock(['box', [['p', '<img src=x>', 0]], GREEN]), false);
  assert.equal(isValidBlock(['tbl', [[{ t: '<a href="x">link</a>', bg: null, w: false }]]]), false);
});

test('colours, levels and block shapes are checked', () => {
  assert.equal(isValidBlock(['h', 'Heading', 'red;background:url(x)']), false);
  assert.equal(isValidBlock(['p', 'Text', '0"><script>']), false);
  assert.equal(isValidBlock(['b', 'Bullet', 9, GREEN]), false);
  assert.equal(isValidBlock(['tbl', [[{ t: 'Cell', bg: 'blue', w: false }]]]), false);
  assert.equal(isValidBlock(['box', [['h', 'Heading', GREEN]], GREEN]), false);
  assert.equal(isValidBlock(['new', 'Text']), false);
  assert.equal(isValidBlock(['p', 'Text', 0, 'extra']), false);
});

test('problems name the guideline and the block', () => {
  const data = guidelineWith([
    ['p', 'fine', 0],
    ['p', '<u>no</u>', 0],
  ]);
  data.sections[0].items[0].id = 'Bad Id';
  assert.deepEqual(contentProblems(data), ['1.1: id, block 2']);
});
