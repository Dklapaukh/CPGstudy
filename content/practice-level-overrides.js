/*
 * Hand-edited exceptions for linking each medicine guideline to its rows in the table of
 * guideline 1.1 (src/practiceLevels.js). Each key is a medicine guideline id; the value is the
 * list of 1.1 row names to use instead of matching by name. [] means the medicine is not in the
 * table, so it counts for every practice level.
 */
export const practiceLevelOverrides = {
  // Glucose gel: "All personnel. ATP is not required"; matching would wrongly pick "Glucose IV".
  'cpg-14-16': [],
  // The two GTN guidelines both match both GTN rows by name; pick each one's route.
  'cpg-14-50': ['Glyceryl trinitrate IV'],
  'cpg-14-17': ['Glyceryl trinitrate SL'],
};

/*
 * Hand-edited corrections to the practice levels of single answer lines of dose cards (feature
 * 11, plan 8.6), for lines the route and indication rules get wrong. Each key is a card id
 * (medicine guideline id + '|' + card key); each entry gives the start of a line's text and the
 * levels that may give that line. lineStart '' means every line of the card. Check the result
 * with `node scripts/practice-level-review.js`; a test fails if an entry matches no line.
 */
export const practiceLevelLineOverrides = {
  // Names IM only to say when IV starts; the two-route rule would show it to EMTs as theirs.
  'cpg-14-3|dose-cpg-12-12': [
    {
      lineStart: 'Administer adrenaline IV if the patient is deteriorating',
      levels: ['ICP', 'CCP'],
    },
  ],
  // About adding an IV dose to an IM dose, so not for a level with IM only.
  'cpg-14-35|dose-1': [
    { lineStart: 'One IV dose may be administered', levels: ['Paramedic', 'ICP', 'CCP'] },
  ],
};
