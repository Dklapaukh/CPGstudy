/*
 * Prints one guideline as readable text, so a session never has to open content/guidelines.js
 * (about 1.3 MB, one very long line per guideline). Changes nothing. Depends on
 * content/guidelines.js and scripts/lookupText.js.
 *
 * Usage (npm run guideline -- …):
 *   <number or id>                  the whole guideline, e.g. 9.4 or cpg-9-4
 *   <number> --heading <text>       only the part under the first heading containing <text>
 *   <number> --headings             the guideline's headings
 *   --find <phrase>                 the guidelines containing <phrase>, with a snippet
 *   --list                          every guideline's number and title
 */
import { guidelineData } from '../content/guidelines.js';
import { plainText } from '../src/quizDoses.js';
import {
  allGuidelines,
  findGuideline,
  guidelineHeadings,
  guidelineText,
  headingPart,
  searchGuidelines,
} from './lookupText.js';

const USAGE =
  'Usage: npm run guideline -- <number> [--heading <text> | --headings] | --find <phrase> | --list';

/** The value after a flag in the arguments, or undefined. */
const flagValue = (args, flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);

/** The lines for --find: one per guideline that contains the phrase. */
const findLines = (phrase) =>
  searchGuidelines(guidelineData, phrase).map(
    (hit) => `${hit.n} ${hit.title} (${hit.matches}×): ${hit.snippet}`,
  );

/** The text for one guideline, the whole of it or one heading's part or its headings. */
function oneGuidelineText(args) {
  const item = findGuideline(guidelineData, args[0]);
  if (!item) return `No guideline ${args[0]}. Try --find or --list.`;
  if (args.includes('--headings')) return guidelineHeadings(item).join('\n');
  const heading = flagValue(args, '--heading');
  if (!heading) return guidelineText(item);
  const part = headingPart(item.b, heading);
  if (!part.length)
    return `No heading containing "${heading}". Headings:\n${guidelineHeadings(item).join('\n')}`;
  return guidelineText(item, part);
}

/** What to print for the given command-line arguments. */
function output(args) {
  if (args.includes('--list')) {
    return allGuidelines(guidelineData)
      .map((item) => `${item.n} ${plainText(item.t)}`)
      .join('\n');
  }
  const phrase = flagValue(args, '--find');
  if (phrase) return findLines(phrase).join('\n') || `Nothing contains "${phrase}".`;
  return args[0] ? oneGuidelineText(args) : USAGE;
}

console.log(output(process.argv.slice(2)));
