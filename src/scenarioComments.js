/*
 * Editors' in-line comments on parts of a scenario (story, vitals, background, intention,
 * debrief points, guidelines), made on the editor page while reviewing (decision 24 Nov 2026,
 * SC-J). Each part has short questions to prompt the comment. Pure logic: takes and returns
 * data; touches no page, storage or network. Tested in tests/scenarioComments.test.js.
 *
 * One editor's comments on one scenario are saved in the Sheet's Edits tab, one row, under
 * COMMENT_EDIT_PREFIX + scenario id + '|' + the editor's name made safe (as reviews are), so
 * several editors never overwrite each other and no backend change is needed. Its shape:
 *   { kind: 'scenario-comments', scenario, reviewer, at (milliseconds),
 *     comments: { <part>: text }, addGuidelines: [guideline ids] }
 * The daily copy writes them into content/scenario-reviews.yaml beside the reviews.
 * Depends on scenarioReviews.js.
 */
import { reviewerPart } from './scenarioReviews.js';

export const COMMENT_EDIT_PREFIX = 'scenario-notes|';
export const COMMENT_EDIT_KIND = 'scenario-comments';
export const MAX_COMMENT = 600;
// The most guidelines one editor can suggest adding to a scenario.
export const MAX_ADDED_GUIDELINES = 6;

// What each part is called and the questions shown when its comment box opens. A patient's
// parts are 'patients.<index>.<kind>'; the kind picks the questions.
export const COMMENT_PARTS = {
  story: {
    name: 'Story',
    questions: [
      'Is this how a job like this comes in here?',
      'Is there enough to start on, without giving the answer away?',
    ],
  },
  vitals: {
    name: 'Vitals',
    questions: [
      'Do the vitals fit the story, the age and how unwell they are?',
      'Is any value unlikely, or anything missing a crew would measure?',
    ],
  },
  background: {
    name: 'Patient background',
    questions: [
      'Do the medicines match the history?',
      'Does a medicine or allergy change the treatment, and is that meant?',
    ],
  },
  next: {
    name: 'What happened next',
    questions: ['Does the response fit the treatment given?'],
  },
  giveIfAsked: {
    name: 'Give if asked',
    questions: [
      'Would any of it give the answer away if it were in the story?',
      'Is anything the learner should find out missing?',
    ],
  },
  variations: {
    name: 'Ways to vary it',
    questions: [
      'Is each change safe and right for the levels it names?',
      'Does it change one thing (the diagnosis, a second problem, severity, escalation or scene)?',
    ],
  },
  photos: { name: 'ECGs and photos', questions: ['Do the ECGs and photos fit the story?'] },
  intention: {
    name: 'Intention',
    questions: ['Is it one clear thing to practise?', 'Does it suit the levels ticked?'],
  },
  outcomes: {
    name: 'Debrief points',
    questions: [
      'Can a mentor see each one happen in a run?',
      'Is anything important missing?',
      'Is any above the scope of practice of the levels ticked?',
    ],
  },
  guidelines: {
    name: 'Guidelines',
    questions: ['Are these the right guidelines?', 'Is one missing? Add its CPG number below.'],
  },
};
const PART_PATTERN =
  /^(story|giveIfAsked|photos|intention|outcomes|variations|guidelines|patients\.\d\.(vitals|background|next))$/;

/** The kind of a part: 'vitals' for 'patients.1.vitals', or the part itself. */
export const partKind = (part) => String(part).split('.').at(-1);

/** Whether a part names something that can be commented on. */
export const isCommentPart = (part) => PART_PATTERN.test(String(part));

/** A part's name on the page and in the record: "Patient 2: Vitals" when there are several. */
export function partName(part, patientCount = 1) {
  const name = COMMENT_PARTS[partKind(part)]?.name || part;
  const index = String(part).split('.')[1];
  return part.startsWith('patients.') && patientCount > 1
    ? `Patient ${Number(index) + 1}: ${name}`
    : name;
}

/** The questions shown when a part's comment box opens ([] for none). */
export const questionsOf = (part) => COMMENT_PARTS[partKind(part)]?.questions || [];

/** The Edits-tab id of one editor's comments on one scenario. */
export const commentEditId = (scenarioId, reviewerName) =>
  `${COMMENT_EDIT_PREFIX}${scenarioId}|${reviewerPart(reviewerName)}`;

/** Whether an Edits-tab id holds comments. */
export const isCommentEditId = (id) => String(id).startsWith(COMMENT_EDIT_PREFIX);

/** The comments with only known parts, each trimmed and cut to MAX_COMMENT; empty ones go. */
function tidyComments(comments) {
  const entries = Object.entries(comments && typeof comments === 'object' ? comments : {})
    .filter(([part, text]) => isCommentPart(part) && typeof text === 'string' && text.trim())
    .map(([part, text]) => [part, text.trim().slice(0, MAX_COMMENT)])
    .sort(([first], [second]) => first.localeCompare(second));
  return Object.fromEntries(entries);
}

/**
 * Comments with only the keys they may have, each checked, or null when they are not comments
 * or hold nothing. `isGuidelineId` says whether a suggested guideline exists.
 */
export function cleanComments(saved, isGuidelineId) {
  if (saved?.kind !== COMMENT_EDIT_KIND || typeof saved.scenario !== 'string') return null;
  if (typeof saved.reviewer !== 'string' || !Number.isFinite(saved.at)) return null;
  const comments = tidyComments(saved.comments);
  const addGuidelines = [
    ...new Set(
      (Array.isArray(saved.addGuidelines) ? saved.addGuidelines : []).filter(isGuidelineId),
    ),
  ].slice(0, MAX_ADDED_GUIDELINES);
  if (!Object.keys(comments).length && !addGuidelines.length) return null;
  const { scenario, reviewer, at } = saved;
  return { kind: COMMENT_EDIT_KIND, scenario, reviewer, at, comments, addGuidelines };
}

/**
 * Suggested guidelines typed as CPG numbers ("4.11, 1.17"), checked against the app's list:
 * { value: [ids] } ([] when empty), or { error } naming any number that isn't a guideline,
 * or any already in the scenario.
 */
export function readSuggestedGuidelines(text, guidelineIdOfNumber, scenarioGuidelines = []) {
  const numbers = String(text)
    .split(/[\s,;]+/)
    .filter(Boolean);
  const unknown = numbers.filter((number) => !guidelineIdOfNumber(number));
  if (unknown.length) return { error: `No guideline numbered ${unknown.join(', ')}.` };
  const ids = [...new Set(numbers.map(guidelineIdOfNumber))];
  const already = numbers.filter((number) =>
    scenarioGuidelines.includes(guidelineIdOfNumber(number)),
  );
  if (already.length) return { error: `Already in this scenario: ${already.join(', ')}.` };
  if (ids.length > MAX_ADDED_GUIDELINES) {
    return { error: `Suggest at most ${MAX_ADDED_GUIDELINES} guidelines.` };
  }
  return { value: ids };
}

/**
 * This editor's comments with one part's comment changed (and, for the guidelines part, the
 * guidelines to add): the edit to save, or null when nothing is left (the row is removed).
 * `saved` is their comments so far, or null.
 */
export function commentsWith(saved, change) {
  const { scenarioId, reviewer, at, part, text, addGuidelines } = change;
  const comments = { ...(saved?.comments || {}), [part]: text };
  const edit = {
    kind: COMMENT_EDIT_KIND,
    scenario: scenarioId,
    reviewer,
    at,
    comments: tidyComments(comments),
    addGuidelines: addGuidelines ?? saved?.addGuidelines ?? [],
  };
  return Object.keys(edit.comments).length || edit.addGuidelines.length ? edit : null;
}

/** Every editor's comments among the edits, each checked, oldest first. */
export const allComments = (edits, isGuidelineId) =>
  Object.keys(edits)
    .filter(isCommentEditId)
    .map((id) => cleanComments(edits[id], isGuidelineId))
    .filter(Boolean)
    .sort((first, second) => first.at - second.at);
