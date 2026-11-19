# Guideline quiz

## Guideline quiz

- Opened from the Quiz tab (pick a guideline or Random guideline) or from a guideline's Quiz
  pill. From the pill, "Back to the guideline" returns to the same scroll position and unfolded
  headings. Everything is built from `content/guidelines.js` when a play starts, with no AI.
- Which guidelines: those outside Medicines with a Backup, Referral and transport or Red flags
  heading, or "action list" / "checklist" in the title (85 today).
- Ordering rounds: the top-level bullets from the start of the guideline to the first Backup,
  Referral and transport, Additional information, Red flags, Orange flags or Worsening advice
  heading. Any other heading, or a short unindented "If …" / "When …" line, starts a new
  situation; each situation with 2 or more actions is a round. Two distractors are added:
  actions of other guidelines naming a medicine the round names, then actions of related
  guidelines, never worded the same as this guideline. Cards are moved by dragging the grip
  (`src/views/dragCards.js`) or with the arrows, and to "Not in this guideline" and back.
  Marking: one mark per card in the longest run in the right order, one per distractor put
  aside. Child-only sentences are removed from card text.
- Number questions (up to 3 a play): a value with a unit in an action line is blanked. Wrong
  choices are same-unit values of the same shape from anywhere in the guidelines, nearest first
  (within ten times), otherwise ten times and one tenth; half the time one choice is the right
  number with a wrong unit (`WRONG_UNITS`). Never a value from the same line. Not asked for
  Paediatrics, Croup, Bronchiolitis, child-only lines, lines for ages under 15 or the 0.9% of
  "0.9% sodium chloride". Constants are at the top of `src/guidelineQuizNumbers.js`.
- Course-changing questions (up to 2 of each): which situation an action belongs to; which of
  four is a red flag of this guideline (the wrong ones are red flags of other guidelines sharing
  less than 60% of their words with this guideline's flags, so some may also be true here);
  and "If …, which guideline do you move to?". Conditions inside a sentence are not asked.
- Finishing a play saves its score as the most recent, and as the best if it is. Ending early
  saves nothing. Starting a play shows both; the list row shows the most recent.

## Pick the guideline

- Quiz tab, "Pick the guideline" (`#pick-guideline`, `src/sortQuiz.js`). The start screen offers
  Two guidelines or Three guidelines. The first guideline is picked at random from those that
  can be played (about 110 for two, 106 for three; never a medicine); the others are picked at
  random from its related guidelines, the five listed at the bottom of its page, leaving out
  medicines.
- Tapping the first guideline's name (a native picker over it) starts a round with another
  first guideline. After Check: Another round, or the same first guideline again with new
  partners.
- Pieces: the text under each heading (headings never shown). Left out: lines any other
  guideline of the round also has, lines naming any of their titles, version history entries,
  lines under 20 characters, tables, keys and boxes. A section of at most 3 lines and 220
  characters is shown whole; a longer one gives one top-level paragraph of at most 220
  characters.
- Up to 4 pieces from each of two guidelines, or 3 from each of three (at least 3 each, or other
  partners are tried), shuffled, shown one at a time. Drag the piece onto a guideline (its
  name, button or box; `src/views/sortDrag.js`) or tap its button. Two guidelines sit side by
  side (green, blue); three are rows (green, blue, purple). Tap a placed piece to take it back.
  Check marks each piece, names the right guideline of a wrong one and counts the streak day.
  Nothing else is saved, and the editor page does not show these questions.
