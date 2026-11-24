# Streak and Data tab

## Study streak

- A **study day** is a local day on which at least one Quiz-tab activity was finished: a
  Medicines quiz session or Practise one medicine run, a guideline quiz play, a Pick the
  guideline round (Check), a Medicine test, or a scenario run (Save the run). Ending early
  counts nothing. `recordQuizFinished` in `src/streakState.js` is called by each one.
- The days are saved as one extra entry, `study-streak` (note = `{ "days": [day numbers] }`, the
  last 750 kept), merged like any other entry, so two phones on one tracker share the streak.
- The **streak** is the number of days in a row ending today. Until something is finished
  today, a streak that ended yesterday still shows and can be kept going; a day missed sets it
  back to 0.
- **Top bar:** the rat and the day count, sad until today's activity is done, powered up once
  it is. It opens the Data tab.
- **Celebration:** the first activity of the day shows a full-screen power-up with the count
  ticking over, until Continue.
- **Demo tracker:** a double tap on the rat switches today's streak off and on, to show the
  celebration (owner, 17 Nov 2026). One tap opens the Data tab as usual.

## Data tab (Settings, `#stats`)

Read only, drawn from what is already saved (`src/views/dataView.js`):

- **Streak:** the current streak, longest streak and number of study days; a grid of the last 12
  weeks; a light-hearted rank by study days: Lab rat (0), Maze runner (3), Street rat (10),
  Sewer sergeant (25), Pack leader (50), Rat king (100), with the days to the next.
- **Guidelines:** complete out of 180, guideline quizzes played, perfect scores, average best
  score.
- **Medicines:** cards learnt (interval above 0) and locked in (next review 21 or more days
  away).

## Decisions

- ST-D (owner, 17 Nov 2026): the power-up stays until Continue; no timeout.
- ST-E (owner, 17 Nov 2026): the rat is drawn from the owner's reference photo (inspiration, not
  a copy): dark fur, mint-framed shield sunglasses, aura, no gold hair.
- ST-F (owner; Claude chose the reset): on `demo`, a double tap takes today off and back on;
  earlier days are kept.
- ST-G (owner, 17 Nov 2026): top-bar rat side on with kit (`ratSvg`); power-up uses the hype rat
  (`hypeRatSvg`); both in `src/views/ratDrawings.js`.
- ST-H (owner, 18 Nov 2026): power-up moves like a super-Saiyan charge (no hair), burst at 2 s,
  plain CSS keyframes.
- ST-I (owner, 19 Nov 2026): any finished Quiz-tab activity counts, scenario runs included.
