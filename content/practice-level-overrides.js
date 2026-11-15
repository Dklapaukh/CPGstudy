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
