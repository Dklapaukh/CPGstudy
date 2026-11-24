# Medicines quiz

- Cards are built from the guidelines each time the app starts (`src/quizCards.js`), so a
  content update changes them with no extra step. Each medicine (section "Medicines", any
  guideline with an Indications heading) gets one card for each of Indications,
  Contraindications, Cautions, Common adverse effects, Usual onset of effect, Usual duration of
  effect and Mechanism of action, plus adult dosage cards written "Medicine – Indication –
  Dose": one per labelled dose in its own Dosage section (unlabelled steps stay together) and
  one per row of the CPG 9.3 adult RSI table that names it.
- A medicine whose Dosage section is missing or says "See the individual guideline"
  (Adrenaline, Midazolam, Morphine) gets one card per guideline that gives it an adult dose
  (`src/quizDoses.js`); guidelines with identical instructions share a card. A labelled pointer
  to a named guideline ("IV for sedation post intubation: see the ‘post intubation’ guideline")
  gets that guideline's doses. A dose belongs to the nearest medicine named in its line.
- Paediatric doses are never tested. The Paediatrics section, Croup and Bronchiolitis
  (`CHILD_ONLY_GUIDELINE_TITLES`) are not searched, and lines or sentences that name a child and
  not an adult are removed with the lines indented under them.
- Ratings: Again (back in a few cards), Hard, Good, Easy; intervals follow SM-2 (constants at
  the top of `src/quizSchedule.js`). New medicines per day: 1 to 10, default 2; each brings all
  of its cards. Review cards per day: 10 to 200, default 30; a card rated Again today always
  comes back.
- The overview shows "X of Y mastered": cards whose interval is 21 days or more
  (`QUIZ_MASTERED_INTERVAL_DAYS`), out of the cards of the chosen practice level.
- "Practise one medicine" goes through every card of a chosen medicine. Nothing is saved and the
  schedule does not change.
- Practice level (ATP): All levels (default), EMT, Paramedic, ICP or CCP. A level limits daily
  study, the card totals and the practice list to the medicines that ATP may give by any route,
  read from the table in CPG 1.1 (`src/practiceLevels.js`). A row of that table belongs to a
  medicine when every word of its name (the words before the first route or bracket, e.g.
  "Magnesium IV") is in the medicine's title. Exceptions are in
  `content/practice-level-overrides.js` (Glucose Gel, the two GTN guidelines); a test fails if a
  medicine matches no row and has no override. Schedules of hidden medicines are kept.
- With a level chosen, dose cards are also filtered by route and indication (Z18 to
  Z22 below). Each 1.1 row gives its level a set of routes ("IN, IM, nebulised and topical"; "(all routes)") and,
  from an "(… only)" bracket, a limit on indications ("cardiac arrest only"). An answer line's
  routes are the route words in it (IM, IV, IN, IO, SC, PO, SL, MDI in capitals; nebulised,
  topical, inhaled; an infusion is IV); a line with none takes those of the line it sits under,
  otherwise of the lines under it, otherwise of the line before. A card's indication is the
  middle of its prompt. A line a higher level may give is greyed under a label naming the levels
  ("ICP and CCP"); a card with no line for the level is dropped, as are the CPG 9.3 RSI rows
  below CCP. Topic cards stay whole. A line with two routes counts for a level that has either,
  and a route 1.1 never names for the medicine hides nothing.
- `node scripts/practice-level-review.js` prints, per level, every card dropped and every line
  greyed. Run it after each PDF update; fix a wrong line in `practiceLevelLineOverrides`
  (`content/practice-level-overrides.js`: card id, start of the line, levels), not in code.
- A card keeps its schedule while its key stays the same (topic name, dose label, first
  guideline number of an indication card, or RSI row). A dose label reworded in a PDF update
  starts that card again as new.
- If medicine names in the guidelines change, check `TABLE_NAME_OVERRIDES` in
  `src/quizCards.js`.

## Decisions

- E: progress saved through the backend, one entry per medicine. Z1: Again, Hard, Good, Easy
  (SM-2). Z4: medicines only. No paediatric doses anywhere.
- Z6: 10 to 200 reviews a day, default 30. Z7: 1 to 10 new medicines a day, default 2.
- Z8 to Z10: Adrenaline, Midazolam, Morphine get one adult-dose card per guideline that doses
  them; guidelines with identical instructions share a card.
- Z11: Morphine 14.32 is cut short in St John's PDF; wait for St John to fix it.
- Z17 (owner, 16 Nov 2026): the quiz can be limited to one practice level from the CPG 1.1 table.
- Z18 (owner): higher-level lines are greyed under a label, so the learner sees what backup gives.
- Z19 (owner): the bracketed limits in CPG 1.1 apply ("cardiac arrest only" and so on).
- Z20 (owner): limits come from CPG 1.1 only, not a medicine's own "Authorised practice levels".
- Z21 (owner): no Adrenaline, Midazolam or Morphine indication card is removed from the quiz.
- Z22: how a line gets its level (above); wrong cases fixed per line in
  `content/practice-level-overrides.js`.
- GM-A (owner, 18 Nov 2026): mastered = interval of at least 21 days.
