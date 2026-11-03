# 06 — Supabase setup and account tests: specification for the build guide

This document requires a future coding assistant to produce an actual click-by-click guide during implementation. It is **not** a claim that Supabase has been configured. Screens and pricing may change; verify live service at build time.

## Required beginner walkthrough
1. Explain in plain English what Supabase does and why the app needs it.
2. Show how to create a project, select region, protect credentials and locate the project URL and safe publishable key.
3. Explain which keys may appear in browser code and why privileged secret/service-role keys must never do so.
4. Give exact instructions for authentication setup, email verification, invitations, password reset and authorised redirect URLs.
5. Show how to apply and verify versioned database migrations and RLS rules, without requiring the owner to understand SQL beforehand.
6. Explain how the first mentor account is granted its role through a privileged administrator-only step; users must not promote themselves.
7. Walk through inviting fewer than five mentees, assigning them to the mentor, and revoking access later.
8. Walk through deploying the app and testing access from phone, tablet and desktop.
9. Explain backups, restoring data, failed login, unsent invitation, missing records, sync failures and where to seek help.
10. Give a safe, repeatable update process with no accidental deletion of live data.

## Required security tests
- Mentor sees each assigned mentee's data; each mentee sees all their own data.
- Mentee A cannot read or change mentee B's records, even with a copied URL or direct database/API request.
- A mentee cannot assign themselves mentor status or edit protected role/assignment data.
- Signed-out users cannot access private records.
- Live observations are authored by the designated observer only; retrospective comments have explicit author permissions.
- Revoked users lose access; reset/recovery flows do not bypass permissions.
- Tests are repeatable and documented for a future programmer.

## Privacy gate
Before real deployment, confirm employer requirements for staff assessments, hosting location, consent/notice, retention, deletion, backups and prohibition on identifiable patient case data.
