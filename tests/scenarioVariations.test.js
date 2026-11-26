/*
 * Variation cards (src/scenarioVariations.js): a card is checked, written as one line for the
 * editor's box and read back from it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isVariation,
  readVariations,
  variationsText,
  variationHeading,
  MAX_VARIATIONS,
} from '../src/scenarioVariations.js';

const uncertainty = { lever: 'uncertainty', levels: ['paramedic', 'icp'], text: 'It is a PE.' };
const overlapping = {
  lever: 'complexity',
  rung: 'overlapping',
  levels: ['supervised'],
  text: 'She also has heart failure.',
};

test('a card needs a known lever, levels and text; only Complexity has a rung', () => {
  assert.ok(isVariation(uncertainty) && isVariation(overlapping));
  assert.ok(!isVariation({ ...uncertainty, lever: 'luck' }));
  assert.ok(!isVariation({ ...uncertainty, rung: 'overlapping' }), 'a rung on Uncertainty');
  assert.ok(!isVariation({ ...overlapping, rung: 'sideways' }));
  assert.ok(!isVariation({ ...uncertainty, levels: [] }));
  assert.ok(!isVariation({ ...uncertainty, levels: ['boss'] }));
  assert.ok(!isVariation({ ...uncertainty, text: ' ' }));
  assert.ok(!isVariation({ ...uncertainty, text: 'x'.repeat(241) }));
});

test('cards are one line each in the box, and read back the same', () => {
  const text = variationsText([uncertainty, overlapping]);
  assert.equal(
    text,
    'Uncertainty (Paramedic, ICP): It is a PE.\nComplexity, overlapping (Supervised): She also has heart failure.',
  );
  assert.deepEqual(readVariations(text), { value: [uncertainty, overlapping] });
  assert.equal(variationHeading(overlapping), 'Complexity, overlapping');
  assert.equal(variationsText(undefined), '');
});

test('typing: any case, names or short names, levels sorted, bullets and blanks skipped', () => {
  assert.deepEqual(readVariations('- scene load (icp, Graduate paramedic): Add a bystander.\n\n'), {
    value: [{ lever: 'scene', levels: ['grad', 'icp'], text: 'Add a bystander.' }],
  });
  assert.deepEqual(readVariations('  '), { value: [] }, 'empty is no cards');
});

test('a wrong line says what is wrong', () => {
  assert.match(readVariations('Uncertainty: no levels').error, /Lever \(levels\)/);
  assert.match(readVariations('Luck (ICP): x').error, /lever is one of/);
  assert.match(readVariations('Severity, overlapping (ICP): x').error, /Only Complexity/);
  assert.match(readVariations('Severity (Boss): x').error, /levels from/);
  const tooMany = Array(MAX_VARIATIONS + 1)
    .fill('Severity (ICP): x')
    .join('\n');
  assert.match(readVariations(tooMany).error, /cards/);
});
