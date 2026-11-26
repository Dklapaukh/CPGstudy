/*
 * Benchmark and "move on" sets (SC-L, docs/scenario-variations.md): for each learner level
 * (SCENARIO_LEVELS), the scenarios that place a learner at that level and move them on to it, in
 * the order to run them. Claude's draft of 26 Nov 2026, approved by the owner: each set follows
 * the presentation mix in SET_MIX (src/scenarioSets.js), uses only scenarios ticked for that
 * level, and no scenario is in two sets. Editors change a set on the editor page; their change
 * reaches the app through content/scenario-set-edits.js.
 */
export const scenarioSets = {
  student: [
    'netball-ankle',
    'chest-pain-lawns',
    'wheezy-at-school',
    'hypo-building-site',
    'stroke-breakfast',
  ],
  grad: [
    'cafe-anaphylaxis',
    'croup-2am',
    'seizure-coastlands',
    'right-abdo-pain',
    'copd-or-sepsis',
  ],
  supervised: [
    'gym-collapse',
    'generator-garage',
    'not-himself',
    'bus-stop-dizzy',
    'bleeding-nine-weeks',
  ],
  paramedic: [
    'stemi-arrest-tawa',
    'hot-toddler',
    'rash-in-the-hostel',
    'mums-pills',
    'remutaka-motorbike',
  ],
  icp: [
    'in-the-cells',
    'transmission-gully-crash',
    'birth-in-the-bathroom',
    'expressway-crash',
    'after-the-party',
  ],
};
