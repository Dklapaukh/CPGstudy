# Scenarios

Quiz > Scenarios (`#scenarios`) lists 40 hand-written openings for a mentor to run
(`content/scenarios.js`), each in the Wellington region, grouped by level: 1 Assessment
structure, 2 Common presentations, 3 Added complexity, 4 Delegation, 5 Several patients. Two
rows of chips filter the list by level and by theme. The themes are Paediatrics, Obstetrics,
Mental health, Respiratory, Cardiac, Trauma, Toxicology, Elderly and Rural. A theme comes from
the sections of a scenario's guidelines (`SCENARIO_THEMES` in `src/constants.js`); Rural comes
from the scenario's `rural` field.

A scenario (`#scenario-<id>`) shows level, title, suburb and story, vitals in one row, the
patient background, the intention (folded) and its guidelines. A guideline opened from it has
"Back to scenario". **Finish scenario** opens the debrief on the learner's phone: tick the
guidelines they struggled with (they go to Guidelines to learn, which holds 5) and write an
optional note (up to 1000 characters). The run is saved in the learner's tracker as one extra
entry (`scenario-run-<id>`) holding the run count and the last 3 runs, so the backend doesn't
change. The list shows "✓ Run <date>", and the scenario shows the last debrief, folded.

## Add a scenario (staff jobs)

The end of the Scenarios list links to `submit.html`, a form anyone can fill in **without
signing in** to send an anonymised job they went to. In order: short title, suburb (optional,
as it can be changed or made up), History, complexity and scene load (Single patient or
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
