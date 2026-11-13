/*
 * Guideline quiz (feature 9), pure logic: number questions. A line among a guideline's actions
 * that gives a number with a unit ("Administer 300 mg of amiodarone IV over approximately
 * 30 minutes") becomes a question with that number blanked and four choices.
 * Takes plain text and returns plain objects; randomness comes in as a `random` function.
 *
 * Wrong choices (Decision Z14): other values with the same unit found anywhere in the guidelines
 * first, preferring ones within NEAR_FACTOR of the right value; if there are not enough, ten
 * times and one tenth of it. Some questions (WRONG_UNIT_CHANCE) also offer the right number
 * with a wrong unit, for example 300 mcg for 300 mg. A wrong choice is never a value that also
 * appears in the same line. These rules were made without AI and are to be reviewed: see the
 * README, "Guideline quiz".
 * Depends on nothing.
 */

// Units recognised after a number, longest first so "mg/kg" is not read as "mg".
const UNITS = [
  'drops/second',
  'mg/hour',
  'ml/hour',
  'mcg/kg',
  'mg/kg',
  'ml/kg',
  'micrograms',
  'microgram',
  'litres',
  'litre',
  'joules',
  'minutes',
  'minute',
  'seconds',
  'hours',
  'units',
  'mmHg',
  'mmol',
  'mcg',
  'mg',
  'ml',
  'g',
  '%',
  '°C',
  '/minute',
];
// Units written two ways count as one, so "1 minute" and "2 minutes" share a pool.
const SAME_UNIT = {
  minute: 'minutes',
  microgram: 'micrograms',
  litre: 'litres',
  mcg: 'micrograms',
};
// The wrong units offered for a unit (Decision Z14: "include wrong units sometimes").
export const WRONG_UNITS = {
  mg: ['mcg', 'g'],
  mcg: ['mg'],
  micrograms: ['mg'],
  g: ['mg'],
  'mg/kg': ['mcg/kg', 'ml/kg'],
  'mcg/kg': ['mg/kg'],
  'ml/kg': ['mg/kg'],
  ml: ['litres', 'mg'],
  litres: ['ml'],
  litre: ['ml'],
  minutes: ['seconds', 'hours'],
  minute: ['seconds', 'hours'],
  seconds: ['minutes'],
  hours: ['minutes'],
  mmol: ['mg', 'g'],
  units: ['mg'],
};
export const WRONG_UNIT_CHANCE = 0.5;
// Singular unit words, used for a made-up value of exactly 1 ("1 litre" but "6 litres").
const SINGULAR = { minutes: 'minute', litres: 'litre', micrograms: 'microgram', hours: 'hour' };
const PLURAL = Object.fromEntries(Object.entries(SINGULAR).map(([plural, one]) => [one, plural]));
// Values that are part of a product's name, not a choice made in the guideline, are not asked:
// the 0.9% of "0.9% sodium chloride".
const PRODUCT_NAME_AFTER_PATTERN = /^\s*sodium chloride\b/i;
export const CHOICE_COUNT = 4;
// A value from the guidelines counts as near when it is within this factor of the right one.
const NEAR_FACTOR = 10;
const FALLBACK_FACTORS = [10, 0.1, 100, 0.01];
const SIGNIFICANT_DIGITS = 6;

const NUMBER = '\\d+(?:\\.\\d+)?';
const escapeForPattern = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const UNIT_ALTERNATIVES = UNITS.map(escapeForPattern).join('|');
// A number or a range ("150-200"), then a unit. "/minute" follows the number with no space.
const VALUE_PATTERN = new RegExp(
  `(?<![\\d.:/])(${NUMBER}(?:\\s*-\\s*${NUMBER})?)(\\s*)(${UNIT_ALTERNATIVES})(?![A-Za-z0-9])`,
  'g',
);

/** The unit a value is pooled under: "minute" and "minutes" are the same unit. */
const poolUnit = (unit) => SAME_UNIT[unit] || unit;

/** "150 - 200" written as "150-200", so values compare as text. */
const tidyValue = (value) => value.replace(/\s*-\s*/g, '-');
const isRange = (value) => value.includes('-');

/**
 * Every value with a unit in a plain-text line: [{ value, space, unit, start, end }], where
 * space is what separates number and unit ("" in "0.9%") and start and end are the character
 * positions of the whole "300 mg".
 */
export function valuesInText(text) {
  return [...text.matchAll(VALUE_PATTERN)].map((match) => ({
    value: tidyValue(match[1]),
    space: match[2],
    unit: match[3],
    start: match.index,
    end: match.index + match[0].length,
  }));
}

/** The unit word that fits a made-up value: singular for exactly 1, plural otherwise. */
function unitFor(value, unit) {
  if (value === '1') return SINGULAR[unit] || unit;
  return PLURAL[unit] || unit;
}

/**
 * Every value seen with each unit across the given lines: { unit: Set of values }. Used as
 * the source of realistic wrong numbers.
 */
export function valuePools(lines) {
  const pools = {};
  for (const line of lines) {
    for (const { value, unit } of valuesInText(line)) {
      const key = poolUnit(unit);
      if (!pools[key]) pools[key] = new Set();
      pools[key].add(value);
    }
  }
  return pools;
}

/** A number written without float noise: 0.1 * 3 gives "0.3", not "0.30000000000000004". */
const formatNumber = (number) => String(Number(number.toPrecision(SIGNIFICANT_DIGITS)));

/** A value (single or range) multiplied by a factor, as text. */
const scaledValue = (value, factor) =>
  value
    .split('-')
    .map((part) => formatNumber(Number(part) * factor))
    .join('-');

/** The size of a value, for comparing: the first number of a range. */
const sizeOf = (value) => Number(value.split('-')[0]);

/** True when two values are within NEAR_FACTOR of each other. */
const isNear = (value, other) => {
  const ratio = sizeOf(other) / sizeOf(value);
  return ratio > 0 && ratio <= NEAR_FACTOR && ratio >= 1 / NEAR_FACTOR;
};

/** A shuffled copy of a list (Fisher-Yates). */
function shuffled(items, random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * The wrong numbers for one blanked value, all with the right unit: values from the pool of the
 * same shape (a range for a range), near ones first in random order, then the others, then ten
 * times and one tenth. `avoid` is the values written in the same line.
 */
export function wrongValues(value, unit, pools, avoid, count, random) {
  const pool = [...(pools[poolUnit(unit)] || [])].filter(
    (other) => isRange(other) === isRange(value),
  );
  const near = shuffled(
    pool.filter((other) => isNear(value, other)),
    random,
  );
  const far = shuffled(
    pool.filter((other) => !isNear(value, other)),
    random,
  );
  const fallback = FALLBACK_FACTORS.map((factor) => scaledValue(value, factor));
  const chosen = [];
  for (const candidate of [...near, ...far, ...fallback]) {
    if (chosen.length === count) break;
    if (candidate === value || avoid.includes(candidate) || chosen.includes(candidate)) continue;
    if (sizeOf(candidate) <= 0) continue;
    chosen.push(candidate);
  }
  return chosen;
}

/**
 * One number question for the value at `valueIndex` in a line, or null if no wrong choices can
 * be made. Returns { before, after, answer, choices } where before and after are the text either
 * side of the blank, answer is the right choice ("300 mg") and choices are all four, shuffled.
 */
export function numberQuestion(line, valueIndex, pools, random) {
  const values = valuesInText(line);
  const target = values[valueIndex];
  if (!target) return null;
  const { value, space, unit } = target;
  if (PRODUCT_NAME_AFTER_PATTERN.test(line.slice(target.end))) return null;
  const written = (number, unitText) => `${number}${space}${unitText}`;
  const answer = written(value, unit);
  const avoid = values.map((other) => other.value);
  const wrongUnits = WRONG_UNITS[unit] || [];
  const offerWrongUnit = wrongUnits.length > 0 && random() < WRONG_UNIT_CHANCE;
  const wrongNumberCount = CHOICE_COUNT - 1 - (offerWrongUnit ? 1 : 0);
  const wrong = wrongValues(value, unit, pools, avoid, wrongNumberCount, random).map((number) =>
    written(number, unitFor(number, unit)),
  );
  if (offerWrongUnit) {
    const wrongUnit = wrongUnits[Math.floor(random() * wrongUnits.length)];
    wrong.push(written(value, unitFor(value, wrongUnit)));
  }
  if (wrong.length < CHOICE_COUNT - 1) return null;
  return {
    before: line.slice(0, target.start),
    after: line.slice(target.end),
    answer,
    choices: shuffled([answer, ...wrong], random),
  };
}

/** Every value in the lines as [{ line, valueIndex }], the places a number question can ask. */
export function numberPlaces(lines) {
  return lines.flatMap((line) => valuesInText(line).map((_, valueIndex) => ({ line, valueIndex })));
}
