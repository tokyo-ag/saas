# AI Development Handoff

This file is the shared, repository-tracked handoff between Codex and Claude
Code. Both agents must read it before development and update it before pausing
or finishing.

## Current objective

- Integrate Claude's `improve-event-date-display` branch into the latest
  `main` without losing the newer public event-page behavior.

## Status

- Merge conflict resolved locally and verification completed. The merge commit
  still needs to be created and pushed to `main`.

## Completed changes

- Updated local `main` from `d6ddabb` to `d8280ef` before integration.
- Resolved the event-page conflict by retaining current gender-capacity and
  LIFF behavior while applying the branch's split date/time presentation.
- Removed the obsolete single-string date formatter from this page.

## Verification

- `cd frontend; npm run lint` passed with 0 errors and 52 existing warnings.
- `cd frontend; npm run build` passed.
- `cd frontend; npm run test:prod` passed 12 of 13 checks. The deployed legacy
  LIFF schedule currently returns HTTP 200 instead of the expected permanent
  redirect; this is unrelated to the event-date presentation change.
- GitHub status `Vercel – comiu` succeeded and
  `https://comiu.link/admin/public-page` returned HTTP 200.

## Next action

- Commit the resolved merge and this handoff, push `main`, then confirm the
  Vercel deployment status.

## Existing unrelated uncommitted work

- Preserve the in-progress staff-page reservation controls in:
  - `backend/src/public/public.controller.ts`
  - `backend/src/public/public.controller.spec.ts`
  - `backend/src/reservations/reservations.service.ts`
  - `backend/src/reservations/reservations.service.spec.ts`
  - `frontend/src/app/staff/[token]/events/[eventId]/page.tsx`
  - `frontend/src/lib/api.ts`
- That work adds individual/bulk staff cancellation controls but has not been
  committed or deployed. Do not include or discard it without resuming that
  objective explicitly.

## Prior deployed state

- GAKUORI's retained detailed CMS is deployed in `f727ea2`.
- BELL approval mode is deployed in `c68d553`; handoff deployment update is
  `f609131`.
- BELL gender-ratio auto mode is deployed in `5998508`.

## Session log

- 2026-10-20 (Codex): Integrated the event-date display branch onto current
  `main`, preserving newer public event-page behavior; lint and build passed.
- 2026-10-14 (Codex): Enabled the retained detailed CMS only for GAKUORI while
  preserving the simplified CMS for all other tenants. Deployed as `f727ea2`.
- 2026-10-12 (Codex): Implemented but did not commit staff-view approval,
  cancellation, and bulk-cancellation controls.
