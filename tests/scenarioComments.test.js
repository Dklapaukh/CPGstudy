// Tests for editors' in-line comments on scenarios (src/scenarioComments.js) and how the daily
// copy puts them in the reviews' record (src/scenarioReviews.js reviewReport).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  commentEditId,
  isCommentEditId,
  isCommentPart,
  partName,
  questionsOf,
  cleanComments,
  commentsWith,
  readSuggestedGuidelines,
  allComments,
  MAX_COMMENT,
} from '../src/scenarioComments.js';
import { isReviewEditId, reviewReport } from '../src/scenarioReviews.js';
import { scenarioIdOfEdit } from '../src/scenarioEdits.js';
import { cleanEdits, cleanScenarioEdits } from '../scripts/sync-edits.js';

const numbers = { 1.17: 'cpg-1-17', 4.11: 'cpg-4-11', 13.3: 'cpg-13-3' };
const idOfNumber = (number) => numbers[number];
const isGuidelineId = (id) => Object.values(numbers).includes(id);
const change = { scenarioId: 'long-lie', reviewer: 'Eve', at: 1000 };

test('a comments id names the scenario and editor, and is no review or scenario edit', () => {
  const id = commentEditId('long-lie', 'Dr Eve O’Neill');
  assert.equal(id, 'scenario-notes|long-lie|dr-eve-o-neill');
  assert.ok(isCommentEditId(id));
  assert.equal(isReviewEditId(id), false);
  assert.equal(scenarioIdOfEdit(id), '');
  assert.ok(commentEditId('x'.repeat(60), 'y'.repeat(80)).length <= 120);
});

test('each part has a name and questions; patients are numbered only when there are several', () => {
  assert.ok(isCommentPart('patients.1.vitals'));
  assert.equal(isCommentPart('patients.1.hr'), false);
  assert.equal(isCommentPart('title'), false);
  assert.equal(partName('patients.1.vitals', 2), 'Patient 2: Vitals');
  assert.equal(partName('patients.0.vitals', 1), 'Vitals');
  assert.equal(partName('outcomes'), 'Debrief points');
  assert.ok(questionsOf('patients.0.background').length);
  assert.deepEqual(questionsOf('nothing'), []);
});

test('saving a comment keeps the others; emptying them all removes the row', () => {
  const first = commentsWith(null, { ...change, part: 'story', text: '  Too neat. ' });
  assert.deepEqual(first, {
    kind: 'scenario-comments',
    scenario: 'long-lie',
    reviewer: 'Eve',
    at: 1000,
    comments: { story: 'Too neat.' },
    addGuidelines: [],
  });
  const second = commentsWith(first, { ...change, part: 'outcomes', text: 'Add handover' });
  assert.deepEqual(Object.keys(second.comments), ['outcomes', 'story']);
  const long = commentsWith(null, { ...change, part: 'story', text: 'x'.repeat(900) });
  assert.equal(long.comments.story.length, MAX_COMMENT);
  const gone = commentsWith(first, { ...change, part: 'story', text: '' });
  assert.equal(gone, null);
  const withGuidelines = commentsWith(first, {
    ...change,
    part: 'guidelines',
    text: '',
    addGuidelines: ['cpg-1-17'],
  });
  assert.deepEqual(withGuidelines.addGuidelines, ['cpg-1-17']);
  assert.deepEqual(
    commentsWith(withGuidelines, { ...change, part: 'story', text: 'x' }).addGuidelines,
    ['cpg-1-17'],
    'a later comment on another part keeps the suggested guidelines',
  );
});

test('suggested guidelines must be real, new to the scenario and few', () => {
  assert.deepEqual(readSuggestedGuidelines('', idOfNumber), { value: [] });
  assert.deepEqual(readSuggestedGuidelines('4.11, 1.17 4.11', idOfNumber), {
    value: ['cpg-4-11', 'cpg-1-17'],
  });
  assert.match(
    readSuggestedGuidelines('4.11, 99.9', idOfNumber).error,
    /No guideline numbered 99\.9/,
  );
  assert.match(
    readSuggestedGuidelines('13.3', idOfNumber, ['cpg-13-3']).error,
    /Already in this scenario: 13\.3/,
  );
});

test('the daily copy checks comments and keeps them out of question and scenario edits', () => {
  const saved = commentsWith(null, { ...change, part: 'story', text: 'Too neat' });
  const edits = {
    [commentEditId('long-lie', 'Eve')]: {
      ...saved,
      comments: { ...saved.comments, 'patients.0.hr': 'x' },
      addGuidelines: ['cpg-1-17', 'cpg-99'],
    },
    [commentEditId('long-lie', 'Sam')]: { kind: 'scenario-comments' },
  };
  assert.deepEqual(allComments(edits, isGuidelineId), [{ ...saved, addGuidelines: ['cpg-1-17'] }]);
  assert.equal(cleanComments({ ...saved, comments: {} }, isGuidelineId), null);
  assert.deepEqual(cleanEdits(edits), {});
  assert.deepEqual(cleanScenarioEdits(edits), {});
});

test('the record lists each editor’s comments under the scenario, with names in words', () => {
  const saved = {
    ...commentsWith(null, { ...change, part: 'patients.0.vitals', text: 'HR too low' }),
    addGuidelines: ['cpg-1-17'],
  };
  const report = reviewReport(
    [],
    {
      titleOf: () => 'Long lie',
      partNameOf: (id, part) => partName(part, 1),
      numberOf: (id) => Object.keys(numbers).find((number) => numbers[number] === id),
    },
    [saved],
  );
  assert.equal(report.summary.reviews, 0);
  assert.deepEqual(report.scenarios, [
    {
      id: 'long-lie',
      title: 'Long lie',
      reviewers: 0,
      reviews: [],
      comments: [
        {
          reviewer: 'Eve',
          date: '1970-01-01',
          comments: { Vitals: 'HR too low' },
          addGuidelines: ['1.17'],
        },
      ],
    },
  ]);
});
