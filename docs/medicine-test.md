# Medicine test

- Quiz tab, "Medicine test" (`#medicine-test`, `src/medicineTest.js`): one medicine's cards
  (at the practice level chosen on its screen, the same setting as the Medicines quiz's) as
  questions, in card order, one per card that can
  be asked (about 390 of 415 cards; Adrenaline 22).
- Indications, Contraindications, Cautions and Common adverse effects: "tick all that apply",
  5 points, 1 to 3 of them the medicine's own top-level points (random), the rest other
  medicines' points for the same topic that are unlike any of its own (60% word rule, as red
  flags) and name no medicine. Right only if exactly the right points are ticked.
- Each dose card, Usual onset and Usual duration: one of its lines (not one greyed for another
  level) with its first dose (else first number) blanked; one right and three wrong values,
  made as the guideline quiz's number questions (Decision Z14).
- Mechanism of action: its first sentence against three other medicines' first sentences, each
  medicine's own names put as "It".
- Options over 140 characters are not used. Finishing counts the streak day and saves the
  score as the best for that medicine and practice level if it beats or equals the saved one
  (`medicine-test-<medicine id>`); the medicine picker shows "best n%" at the chosen level and
  the end shows the best with its date ("new best" when it is). The editor page does not show
  these questions.
