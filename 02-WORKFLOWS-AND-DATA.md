# 02 — Workflows and data model

## Workflows
1. **Create School:** select mentee > create/edit nested assessment structure > rearrange > save/publish version > preview observation checklist.
2. **Observe job:** choose mentee, observer and observed clinician > start job/time zero > tap observed items and timestamp > add optional notes > autosave > finish/finalise.
3. **Debrief:** open job on any authorised device > review timeline/section view > add feedback and learning goals > link NZCPGs discussed > flag further review with reasons > export/share.
4. **External reflection:** mentee accesses own log and debrief > exports or shares them to write a reflection outside the app.
5. **Guideline study:** browse categories/medicines > open official CPG link > record discussion and status > if Requires review, enter reason > later revisit and retain history.
6. **Monitor progress:** mentor selects assigned mentee or mentee views own dashboard > compare comparable jobs/benchmarks > inspect underlying evidence and unresolved CPG reviews.

## Core data entities (conceptual, not final SQL)
- `users`: authentication identity and secure role assignment.
- `mentor_assignments`: which mentor may access which mentee; server-enforced.
- `schools`, `school_versions`, `school_items`: stable item IDs, hierarchy, display order, notes, immutable historical snapshots.
- `jobs`: mentee, observer, observed clinician, School version, time zero, state, non-identifying case context.
- `observation_events`: item ID, event time, entry time, author, completed timestamp (nullable), optional note, correction metadata.
- `debriefs`, `learning_actions`: retrospective notes and ownership/visibility rules. No in-app reflections table or editor.
- `guideline_catalogue`: source ID, category, order, type guideline/medicine, official title, verified official URL, source version/date, active/retired mapping.
- `guideline_discussions`: mentee, guideline ID, discussion date, optional job/debrief link, author and note.
- `guideline_review_history`: mentee, guideline ID, status, reason when Requires review, author, timestamp; current state derived or consistently stored.
- `benchmark_definitions`, `benchmark_results`: explicit start/end rules, units, versions, missing-data flags.

## Key integrity rules
- Every live job has exactly one designated observer who authors the live log; observer role may change between jobs.
- A mentee observing a mentor can record the mentor's actions and practise giving feedback; assessment of mentoring skill must be distinguishable from assessment of clinical actions.
- Only an explicit recording action creates an event. Corrections are auditable.
- Historical job snapshots remain interpretable when the School is edited.
- Preserve stable NZCPG identifiers/mappings across catalogue updates; never erase prior review history because a title changes.
- Separate `not observed`, `not applicable`, `not completed`, and `not yet recorded`; do not treat unknowns as failures.
- Track time zero, actual event time and entry time separately; calculate elapsed time only where timestamps and definitions are valid.
- Keep patient-identifying information out of logs; warn about accidental disclosure in free text.

## Trend interpretation
- Completion rates must specify numerator, denominator and missing/not-applicable handling.
- Primary-survey time requires a mentee-agreed definition of when it begins and what counts as completion; changing definitions creates a new benchmark version.
- Show counts and case mix alongside averages/medians. Avoid staff ranking or treating shorter time as automatically better.

## Export
Human-readable de-identified summary plus structured backup where appropriate; include event times, authorship, framework version, CPG discussion/review status and corrections as relevant. Sharing via device email is user-controlled, not automatic.

## Live checklist interaction
Each framework row is displayed with its title, a compact Complete button, completion time if recorded, and a small note button. Marking Complete stores the observed event time; do not record completion on page view. Keep event time distinct from database save time. If the device is offline and reliable queued saves are not implemented, warn clearly and prevent false confirmation of a saved event.

## Benchmark explanation
A benchmark is a configurable elapsed-time measure between two named events recorded in a job. Example: patient contact to primary survey completed. Only calculate when both timestamps exist; show the number of qualifying jobs, not a clinical pass/fail judgement.

## Prospective and retrospective benchmarks (confirmed)
- Mentor and mentee may create a benchmark before any jobs or after jobs have already been logged.
- Benchmark definitions reference stable recorded event identifiers and explicit start/end semantics; never rewrite source observation timestamps to calculate a benchmark.
- Recalculate qualifying historical jobs when a new benchmark is created; exclude jobs without both required events, and show the qualifying-job count.
- Keep benchmark definition versions so changes do not silently rewrite the interpretation of earlier reports.
- Each checklist item can have **at most one active completion timestamp per job**. A correction preserves the previous value, reason/author and correction time in an audit trail.

## Multiple independent mentors: data and permissions
- Model users and mentor-to-mentee assignments as data, not as a single hard-coded administrator account.
- Scope **every** school, job, observation, debrief, guideline status, benchmark and export to its owning mentee. Authorisation must check the signed-in user's identity and the current assignment in the database (Supabase RLS), including joins, updates and exports.
- Each mentor sees only assigned mentees. Each mentee sees only their own records. A mentor must not be able to add an arbitrary existing mentee by supplying an email or ID; invitation/acceptance and verified assignment are required.
- Initially allow one active mentor assignment per mentee. Record assignment creation/revocation and plan safe reassignment without losing the mentee's historical data. Do not give the app owner blanket visibility into unrelated mentors' records.
- Security tests must use **two mentors and at least two mentees in different groups**, plus a mentee attempting to access another mentee's records; test both reads and writes.

## Invitation, finalisation and event-time rules
- Initial administrator setup uses a privileged, documented bootstrap operation, never client-side role self-promotion.
- Administrator invites mentor → verified mentor accepts → mentor invites mentee → verified mentee accepts → server creates scoped assignment. Invitations must expire, be single-use or otherwise replay-safe, and be revocable; do not trust an email address alone as authorisation.
- Record each job event with original occurrence time (UTC), server receipt/save time, author and audit history for corrections. Display times in the viewer’s local timezone; retain original recorded timestamps for retrospective benchmarks.
- A finalised job is read-only as to original observations; permitted corrections append audit information rather than silently overwriting history. Both parties may add attributed debrief notes. Do not expose everyday deletion of finalised records.
- Never show a successful save until confirmed by server. On failed connectivity, clearly mark unsaved actions; no claim of offline capture unless tested.
