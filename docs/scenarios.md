# Scenarios

Quiz > Scenarios (`#scenarios`) lists 40 or more hand-written openings for a mentor to run
(`content/scenarios.js`, plus any added on the editor page), each in the Wellington region.
Each scenario has two tags (decision 19 Nov 2026, SC-E), which replaced the old levels 1 to 5:

- **Presentation** (the scenario level, stored as `complexity`; SC-O, SC-U): 1 Common
  presentation, 2 Undifferentiated presentation (the story fits more than one condition), 3
  Complex or atypical (two problems at once) (`SCENARIO_COMPLEXITY`). The list is grouped by
  it. Severity is separate, so an arrest can be a common presentation.
- **Scene load:** Single patient, Delegation or Several patients (`SCENARIO_LOADS`).

A scenario may also have the **levels it suits** (decision 24 Nov 2026): any of Student,
Graduate paramedic, Supervised paramedic, Paramedic and Intensive care paramedic
(`SCENARIO_LEVELS`, the optional `levels` field). They show as a "Suits …" pill, and once any
scenario has levels a **Suits** dropdown filters the list. Editors set them while reviewing.

Two rows of chips (All plus the three of each) and a theme dropdown filter the list. The themes
are Paediatrics, Obstetrics, Mental health, Respiratory, Cardiac, Trauma, Toxicology, Elderly and
Rural. A theme comes from the sections or guideline numbers of a scenario's guidelines
(`SCENARIO_THEMES` in `src/constants.js`); Rural comes from the scenario's `rural` field. Once
anything has been run, a progress table at the top gives, for each presentation and scene load,
how many have been run and their average latest score.

A scenario (`#scenario-<id>`) shows its tags, title, suburb and story, then, when it has any,
**Give if asked (for the mentor)** (folded; SC-P): the facts the learner should find out by
asking, such as what would give the answer away, under one line on how freely to give them by
level (`GIVE_IF_ASKED_GUIDE`; `giveIfAsked`, at most 8). Then vitals in one row, the
patient background, the intention with its intended outcomes (folded), **Ways to vary it**
(folded; SC-N): the variation cards, each a lever (`SCENARIO_LEVERS`; a Complexity card also has
its rung, `COMPLEXITY_RUNGS`), the levels it suits and one or two lines for the mentor
(`variations`, at most 6, `src/scenarioVariations.js`), and its guidelines. On the editor page
the cards are one box, one card per line: "Complexity, overlapping (Paramedic, ICP): …". A
guideline opened from it has "Back to scenario".

**Finish scenario** opens the debrief on the learner's phone (SC-F), for the mentor to fill in
with the learner:

- a **Debrief guide** (folded): the four PEARLS steps (Eppich and Cheng 2015): Reactions,
  Description, Analysis, Summary;
- the **learner's level** (Student to Intensive care paramedic, or Not said), starting on the
  level saved with this tracker's last run (`level`; `lastLearnerLevel`);
- **What this scenario emphasises**: the scenario's intended outcomes, as a list, not rated;
- a **rating for each of six competencies** (SC-R, `DEBRIEF_COMPETENCIES`, each with a line on
  what to look for): Structured assessment, Problem representation, Differentials, Management to
  the CPG, Escalation and consultation, Handover and communication. Each is rated on how much
  help the learner needed, after the O-SCORE: Not done, Talked through, Prompted, Independent
  (0 to 3, `DEBRIEF_RATINGS`). One that didn't come up is left blank. Runs saved before 26 Nov
  2026 rated each intended outcome instead; a run's `rated` field says which (none means
  outcomes), and their debriefs still show those ratings;
- **Guidelines to learn:** tick the guidelines they struggled with (they go to Guidelines to
  learn, which holds 5);
- three optional notes, each up to 400 characters (`MAX_DEBRIEF_NOTE`): Went well, To work on,
  and the learner's take-away.

**Save the run** gives the score: the ratings as a percentage of the most possible, blanks left
out (`scoreOf` in `src/scenarioLogic.js`; no ratings, no score). Saving also counts today's
streak day (see [Streak and Data tab](streak-and-stats.md)). The run is saved in the learner's
tracker as one extra entry (`scenario-run-<id>`) holding the run count and the last 3 runs, so
the backend doesn't change. The list shows "✓ Run <date> · <score>%", and the scenario shows
its debriefs, folded. A score only compares well when the same mentor rates consistently.

## Reviewing scenarios (editors)

So later scenarios can be written better (decision 24 Nov 2026), editors grade each scenario on
the editor page, on a phone. The first screen says "You have reviewed N of M scenarios" with a
button to the next one. Under each scenario a **Review this scenario** card has:

- **Suits these levels**: tick every level; saving changes the scenario's `levels` too;
- under it, **How could it be changed to suit the levels not ticked?** (`otherLevels`),
  free text up to 600 characters; it is for the review only and changes nothing in the app;
- four grades, each Poor, OK or Good: **Realistic**, **Clinically consistent**, **Clear teaching
  point**, **Right difficulty** (`REVIEW_CRITERIA` in `src/scenarioReviews.js`);
- **Problems**, any of eight one-tap faults such as "Vitals don't fit the story" or "Gives the
  answer away" (`REVIEW_PROBLEMS`), so they can be counted;
- **Overall** (needed): Use as it is, Small changes, Needs rewriting, Take it out;
- **What would make it better**, up to 600 characters;
- a short **Summary** (decision 24 Nov 2026, SC-J): "What does it teach best?", "Anything
  unsafe or wrong?" (`REVIEW_QUESTIONS`), each up to 200 characters.

**In-line comments.** Each part of the scenario on the editor page (story, give if asked, each patient's
vitals, background and what happened next, the photos, the intention, the debrief points and
the guidelines) ends with a **💬 Comment** button. It opens a box showing that part's questions
(`COMMENT_PARTS` in `src/scenarioComments.js`, such as "Do the vitals fit the story, the age and
how unwell they are?") above the comment. The guidelines' box also takes **guidelines to add**
as CPG numbers, each checked against the app's list (not a real number, or one the scenario
already has, is refused). An editor's comments on a scenario are one row in the Edits tab,
`scenario-notes|<scenario id>|<editor>`; emptying them all removes it. Editors see only their
own comments, so each review stays independent.

**Who reviewed.** Every review and comment is saved under the editor's name. The aim is **3
editors per scenario** (`REVIEWS_GOAL`): the scenario screen says "Reviewed by N of 3 editors:
names", each row of the list shows "N/3 editors", and the first screen counts how many
scenarios have 3.

**Save and next** saves and opens the next scenario you haven't reviewed; **Save review**
stays. Each editor has one review per scenario (saving again replaces it), kept in the Edits
tab as `scenario-review|<scenario id>|<editor>`, so no backend change was needed. The daily
copy writes them all to `content/scenario-reviews.yaml`: a summary (verdicts, the average of
each grade, problems by how often, reviews per editor, scenarios with 3 reviews), any older
one-line-per-level notes gathered by level (`levelNotes`), then each scenario's reviews (with
`otherLevels`) and in-line comments. The app never loads it.
**Read it before writing new scenarios**, and fix the scenarios marked Small changes or Needs
rewriting.

The scenario design (three levels, openings, variation cards, competency ratings) is in [Scenario design and variations](scenario-variations.md).

## Add a scenario (staff jobs)

The end of the Scenarios list links to `submit.html`, a form anyone can fill in **without
signing in** to send an anonymised job they went to. In order: short title, suburb (optional,
as it can be changed or made up), History, presentation and scene load (Single patient or
Delegation; Several patients when more than one patient is added); each patient's background,
any number of vitals sets (each with a note such as "On arrival" or "After GTN") and Treatment
and response; the guidelines; up to 4 photos (ECGs, rhythm strips, the monitor); then What
could it teach and the debrief points, which become the scenario's intended outcomes.

- **Guidelines** can only be added from the app's list (number, title or the dropdown), so
  every one links to a real guideline.
- **Anonymity:** the sender ticks that the job is anonymised, and the form warns once about
  anything that looks like an NHI, a date, a phone number, an email, a street address or a
  titled name (`src/scenarioSubmission.js`). Photos are made smaller on the phone (longest
  side 1600 px) and re-saved as JPEG, which drops their location data.
- **Bots:** a hidden box, a form open at least 20 seconds and at most 30 jobs an hour.

The backend (`scenario-submit`) saves the photos in a private Drive folder, "CPG scenario
submissions", adds a **Pending** row to the `Submissions` tab and emails the owner. Editors see
pending jobs at the top of the editor page ("Submitted jobs to check"). One job (`#j-<id>`) is
shown as the scenario it would make, with the photos and any identifier warnings, and three
buttons:

- **Edit and approve** (`#approve-<id>`) opens the new scenario form filled in from the job:
  every box can be changed, later vitals added or removed and photos taken out or recaptioned.
  "Save and approve" saves it as a new scenario (`scenario|<id>` with `added`) and marks the job
  Approved.
- **Approve as it is** does the same without the form (or says which box needs fixing).
- **Reject** asks once more, then marks it Rejected and deletes its photos.

A new scenario may hold what a job adds: per patient a note on the first vitals, later vitals
with notes and the treatment and response, and photos (`src/scenarioEdits.js`). The new
scenario form has these boxes too, all optional. The daily copy (`scripts/sync-edits.js`)
publishes new scenarios as before and fetches approved jobs' photos (`approved-scenarios`),
writing to `content/scenario-photos/` only the photos a new scenario shows, so a photo taken out
before approving is never published. In the app, later vitals and treatment are in a folded
"What happened next (for the mentor)" and photos in a folded "ECGs and photos".

## Decisions

- SC-A (18 Nov 2026): level and theme filters; themes from guideline sections
  (`SCENARIO_THEMES`), Rural from a hand-set field. SC-B: no recommendations for now.
- SC-C: Finish ticks struggled guidelines (to Guidelines to learn) and saves `scenario-run-<id>`
  (run count and last 3 runs) on the learner's tracker.
- SC-E (19 Nov 2026, after a literature review): levels 1 to 5 replaced by complexity and scene
  load. Easy-to-hard is well supported (Issenberg 2005; Cook 2013, effect size 0.68), but old
  levels 4 and 5 added scene load, not clinical difficulty, so that is its own axis (4C/ID).
- SC-F (19 Nov 2026): 3 intended outcomes, PEARLS guide (Eppich and Cheng 2015), O-SCORE-style
  ratings (entrustment anchors are more reliable than norm-based ones), score as above.
- SC-H (owner, 24 Nov 2026): levels a scenario suits; "Supervised paramedic" kept (owner).
- SC-I (Claude, 24 Nov 2026): the Review card as above, one review per editor per scenario.
- SC-J (owner, 24 Nov 2026): in-line comments, editors see only their own, aim 3 editors.
  Order of work: review the scenarios first, then rewrite marked ones and build the generator;
  no learner-facing changes until the review is complete.
- SC-L (owner, 24 Nov 2026; after the rewrites): a benchmark set to place a learner at a level,
  and per-level "move on" series. Not designed yet.
