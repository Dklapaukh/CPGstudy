# 01 — Product requirements

## Goal
Develop clinical assessment, decision-making and mentoring skills through collaboratively maintained frameworks, observed jobs, debriefs, exported notes for external reflections, guideline study and trend review.

## A. Personalised School of Paramedicine
- Named for the mentee, e.g. "X's School of Paramedicine".
- Mentor and mentee can develop it together; add/edit/delete/reorder sections, subsections, checklist items and notes.
- Phone and desktop editing; tablet support where practical. Provide easy move controls as well as optional drag-and-drop.
- Version the framework; a completed job retains the exact version used even if the School changes later.
- Example editable hierarchy (illustrative, not a clinical protocol): Primary survey > A > patent, swallowing; B > breathing, adequate; C > perfusing, pulse. Secondary survey > Respiratory/CVS/Abdominal > auscultation, recent illness, SpO2. Diagnostic reasoning > provisional diagnosis, differential diagnoses, plan, escalation triggers. Communication > radio update, status, backup. Recap > primary survey, chief complaint, key findings.

## B. Live job observation
- Phone/tablet-first, fast and touch-friendly; one observer records a job. Either mentor or mentee can be observer, depending on who is leading the case.
- Record observer, observed clinician, job start, time-stamped actions, checklist status, contemporaneous notes and optional performance feedback.
- Each checklist row has a one-tap Complete action that stores one completion timestamp per job, plus a small Add note button for optional free text. No numerical score, quality grade or rubric. Unchecked means not recorded as complete, not failure. Viewing never marks complete.
- Allow late entries and corrections without silently overwriting original timestamps or authorship.
- Viewing an item must never record that it happened. Autosave; protect against network interruptions and lost drafts.
- No simultaneous live editing requirement.

## C. Debrief and sharing for external reflection
- Review each saved job as chronological timeline and as framework sections, on phone/tablet/desktop.
- Add debrief notes, strengths, areas for improvement and agreed actions; preserve provenance of observations versus retrospective comments. Do not implement in-app reflection authoring.
- Export/share a readable, de-identified log using device sharing/email composer when available; offer download/copy fallback. Opening email does not mean it was sent.

## D. Development dashboard
- Job list, dates, observer roles, linked School version, debrief status.
- Completion/observation trends with denominators and missing-data disclosure.
- User-defined benchmarks such as time to primary survey completion; trend average/median only for comparably defined events, with case-context caveats. Do not equate speed with quality.
- Guideline/medicine learning progress and outstanding review queue.

## E. NZCPG learning tracker
- Browse broad categories and guideline titles in the same hierarchy/order as the current official NZCPG website; medicines in a distinct section.
- For every guideline/medicine: exact verified official title and direct link to original CPG; no embedded full guideline text required.
- Each mentee can mark Not reviewed, Completed, or Requires review. Requires review includes a reason; retain history of status changes, dates and discussion notes.
- Record which guidelines were discussed, optionally linked to job or debrief; follow-up review status and reasons must be accessible later.
- Discussed, read, completed learning review, applied during patient care, and demonstrated competence are distinct concepts; do not infer one from another.
- Source categories, titles, links and version/date must be checked against the official NZCPG site at implementation and updated deliberately, not guessed.

## F. Accounts and permissions
- One mentor and fewer than five mentees in pilot, with separate secure logins.
- Mentor views all assigned mentees' records; each mentee views all their own records and no one else's.
- Same authorised data accessible across devices; no manual import/export as primary synchronisation method.
- Viewing permission is confirmed; exact edit/delete rights remain open (see document 04).

## Out of scope unless later approved
Patient-identifiable records, clinical decision support, automated grading, full NZCPG content conversion, simultaneous live multi-user logging, organisational competency sign-off, and wider organisation deployment.

## Recording and offline priority
- Prefer simple, reliable online recording with visible save/sync state. Offline capture is optional only if it can be added without disproportionate complexity. Never silently discard unsaved observations.
- Exports must include timestamps, observer identity, notes and debrief material suitable for writing reflections outside the app.

## Confirmed benchmark flexibility
- Mentor and mentee may choose benchmark definitions prospectively or retrospectively. A newly defined measure can be applied to past jobs where the required events were recorded.
- The app must not alter historical events to calculate a benchmark. Show missing-data exclusions and the number of jobs included.

## Product naming and visual direction (confirmed)
The product is called **Your School of Paramedicine**. Personalised frameworks may still be labelled "[Mentee]'s School of Paramedicine". Design as a clean professional app with the feel of software from around 2018–2021: easy and intuitive, without additional prescriptive aesthetic guidance.

## Multiple mentors — minimum viable support
Use one application and one backend for multiple mentor accounts. Each mentor can invite/manage only their own assigned mentees and see only their assigned mentees' information. Mentees see all their own information. Pilot usage is still one mentor and fewer than five mentees. Do not build an organisation hierarchy, payments, mentor-to-mentor sharing, or real-time co-editing. A mentee has one active mentor for now; reassignment and edit permissions need explicit decisions before those features are implemented.

## Invitation-only accounts and administrator scope
- The initial owner is securely bootstrapped as **Administrator + Mentor**; administrator can also maintain their own mentee group.
- The administrator invites additional mentors by email through a simple Manage Mentors screen. Invited mentors verify their identity and accept before receiving mentor access.
- Each mentor invites mentees by email; each mentee verifies identity and accepts the assignment before access is granted. No public self-registration that grants mentor privileges.
- Administrator manages accounts/invitations only; **administrator status does not grant automatic access to other mentors’ mentees or mentoring records**.
- Both authorised mentor and mentee can edit their shared School and contribute debrief notes. Finalised observations preserve original event history; corrections are audited. No routine delete action in initial UI.
- This is the initial pilot permission policy; reassignment, exceptional recovery access and formal deletion procedures require deliberate design before release.
