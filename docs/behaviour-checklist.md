# Behaviour checklist

The same result is expected before and after any tidy-up. Automated in `tests/app.test.js`
unless marked "by hand".

- Sign in with a tracker passcode; a wrong (or old mentor) passcode shows the message.
- A first visit opens the demo with Make an account; signing up shows the passcode and opens
  the new tracker (`tests/signup.test.js`).
- List shows 14 sections and 180 guidelines with correct counts; sections stay as left (by hand).
- Filters (All, Incomplete, Needs review, Complete) and search.
- Opening a guideline shows all content; headings fold and unfold; previous and next (by hand).
- Changing status and notes saves, showing "Saving…" then "Saved".
- Review or Complete sets the marked date on the list row; opening or editing notes does not.
- The made-with-AI, study-only notice shows on the passcode, list and guideline screens.
- The report button is under every screen and the page holds no whole email address.
- Manager page (`tests/manager.test.js`, `tests/backend.test.js`): a wrong passcode shows the
  message; a manager sees only assigned trackers; the reply holds
  no notes or passcodes; a person page shows every part; the date range redraws the charts;
  sign out clears the numbers. With the real Sheet: by hand.
- Two phones on one passcode show the same data after a sync (by hand).
- Offline: changes are kept and sent when signal returns (by hand).
- Related guidelines (at most 5) show under a guideline; Add to queue, Add all to queue, ticking
  off and emptying work; the header has a "To learn (n)" tab.
- Settings: dark mode; the review-after-days wheel saves `app-settings` and is applied when a
  screen is drawn or new data arrives; Switch tracker.
- Comment button adds to the notes and highlights the point.
- A later date in `version.json` shows the banner; "Update now" downloads every file and
  reloads (a failed download shows a message and does not reload); a changed guideline is
  tagged "Updated" until opened; the list footer shows the export date, last check and notice.
- Medicines quiz: Start shows a card; Show answer reveals it; a rating saves the quiz entry; the
  new-medicines setting changes the count; Practice level EMT hides Adenosine and Fentanyl from
  the practice list and shows Adrenaline's asthma dose with its IV lines greyed under "ICP and
  CCP". The overview shows "X of Y mastered". Layout on a phone (by hand).
- Guideline quiz: cards move with the arrows and to and from "Not in this guideline"; dragging
  by the grip on a phone (by hand); a perfect play scores 100% and saves `quiz-order-<id>`; the
  picker shows the best score, a new play shows best and most recent, the list row the most
  recent; the Quiz pill opens the quiz and "Back to the guideline" returns to the same place;
  guidelines with no quiz have no pill. Layout on a phone (by hand).
- Pick the guideline: Two or Three guidelines; all are named at the top (rows for three); a
  piece can be placed, dragged onto a guideline and taken back; the first name's picker starts
  a round with the one picked; Check marks every piece and gives "n of N right".
- Medicine test: the practice level can be changed on its screen; tick questions toggle and
  Check; choice questions mark at once; the end shows the score and the best, and the picker
  shows "best n%". The passcode screen says "Enter code demo to take a look".
