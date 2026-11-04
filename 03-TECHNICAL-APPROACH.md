# 03 — Technical approach

## Recommended initial architecture
- Responsive web app / PWA, usable on phones, tablets and desktops; GitHub Pages is a possible static host.
- TypeScript with strict type checking, small feature modules, ESLint, Prettier and automated tests.
- Supabase is the preferred managed backend for authentication, PostgreSQL storage and synchronisation, subject to approval and verification at build time.
- Server-enforced Row Level Security (RLS) for mentor-assigned mentees and own-record access; do not rely on hiding interface elements.
- No custom login server, real-time multi-editor architecture or unnecessary microservices.

## Cross-device and resilience
Cloud sync is required for first functional release. Autosave drafts; explicitly design and test behaviour during lost connectivity, retries and duplicate submissions. Full offline editing/synchronisation is optional and should be deferred if complex; online-only is acceptable for pilot. Do not claim offline reliability until implemented and tested. Provide backup/export/restore procedures.

## Setup for a non-technical owner
Produce a separate click-by-click Supabase guide at build time: where to sign up, what buttons to click, where to put safe configuration values, how to create/invite accounts, how to test access and sync, and what errors mean. Explain jargon and why each step matters. Never place privileged secret/service-role keys in browser code.

## Security, privacy and governance
- Mentee records and performance feedback are personal staff information. Confirm workplace policy, lawful basis/consent as appropriate, retention/deletion, access revocation, backups, hosting/data-region requirements and breach handling before real use.
- No patient names, NHI, DOB, addresses or other identifying case details; free-text can still identify patients. Provide warnings and review/redaction before export.
- Protect against unauthorised access using RLS and automated negative tests with two distinct mentee accounts.
- Verify provider limits, pricing, inactivity behaviour, backup availability and email-invitation constraints at implementation; free-tier suitability is an estimate, not a guarantee.
- Distinguish editable drafts from finalised observation records; precise permissions to be agreed.

## UI and accessibility
- Live capture: large touch targets, minimal taps/typing, readable hierarchy, obvious current section and save/sync state.
- Framework editor: nested rearrangement, accessible move controls, simple preview.
- Debrief: chronological and section views; historical lists may scroll. Avoid unnecessary scrolling of active high-priority controls.
- Distinguish observation from judgement, and event time from entry time.

## Sharing
Prefer native Web Share API when supported, with downloadable text/printable report and copy fallback. `mailto:` may open a composer but does not reliably attach files or confirm sending. Never auto-email without user action.

## Engineering principle
Document reasons for architectural and security decisions, keep modules small, use migrations and tests, and produce a complete handover suitable for an independent human programmer. See document 07.

## Deliberate simplicity
Do not add a scoring engine, reflection editor, or elaborate offline conflict-resolution system. Implement a small checklist completion event with at most one active timestamp per item per job and optional note; corrections retain audit history. Include clear connection/saved/unsaved feedback and explicit export of debrief notes for reflections written elsewhere. Mentee consent is planned; keep basic security and data handling controls without adding a formal governance approval workflow.

## Benchmark implementation (confirmed)
Store benchmark definitions separately from job events, with stable event references and versions. Support creation both before and after the relevant jobs. Compute results from retained timestamps, including past jobs, without modifying event records; exclude missing pairs and show denominators.

## Scaling mentors without scaling infrastructure
One static front-end and one Supabase project should serve multiple isolated mentor–mentee groups. Never hard-code a universal mentor ID or assign a global mentor role that can read all mentees. Store and enforce relationships using database constraints and Row Level Security. Keep invitation and assignment flows minimal and secure; verify the invited person's identity before linking records. Avoid custom servers and per-mentor deployments. Free-tier feasibility depends on current provider limits and actual usage; check during implementation. Prefer a pilot invitation process over open registration until its security and abuse controls are designed.

## Visual design instruction
Build **Your School of Paramedicine** as a clean, professional, intuitive app reminiscent of software from roughly 2018–2021. Beyond responsiveness, usability and accessibility, do not mandate an aesthetic system, colour palette or specific UI components.

## Account administration and operational safeguards
- Implement three logical roles: administrator, mentor, mentee. Administrator may also be a mentor, but administrative account management must not bypass record-level RLS. Enforce permissions in Supabase policies and privileged server-side invitation actions; never expose a service-role secret to browser code.
- Support one static site and one Supabase project for multiple isolated mentor groups. Invitations must verify identity and consent/acceptance before linking a mentee; protect against forged, duplicate and expired invitations.
- Before real pilot data, document and test a practical backup **and restore** procedure, stored outside public GitHub. Check current Supabase Free backup availability, inactivity pausing, quotas and email delivery limits rather than assuming these are provided.
- Store UTC timestamps, separate event occurrence from persistence time, and render local timezone consistently. Show explicit saving/saved/failed states. An online-only pilot is acceptable; unsaved entries must not be silently discarded.
- Confirm workplace privacy/consent, retention and incident-response arrangements before live use; use fictional data for development and never include patient-identifying information.
