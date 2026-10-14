# AI Development Handoff

This file is the shared, repository-tracked handoff between Codex and Claude
Code. Both agents must read it before development and update it before pausing
or finishing.

## Current objective

- Keep the simplified public-site CMS for every tenant except GAKUORI, and show
  GAKUORI the retained detailed/legacy CMS.

## Status

- Implemented and locally verified; ready to commit and deploy.

## Completed changes

- In `frontend/src/app/admin/public-page/page.tsx`, tenant code `18285255`
  (GAKUORI) now receives the detailed legacy customizer.
- GAKUORI can edit Q&A blocks and change the font sizes for the title,
  subtitle, body/description, and individual content blocks.
- Other tenants continue to receive the current simplified CMS unchanged.
- The simplified editor is hidden for GAKUORI, rather than showing both CMS
  versions together.

## Verification

- `cd frontend; npm run build` passed.
- The first build attempt had a transient Windows build-worker exit during
  static generation; an immediate clean rerun completed successfully.

## Next action

- Commit the GAKUORI CMS file and this handoff, push `main`, and verify the
  Vercel production deployment.

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

- BELL approval mode is deployed in `c68d553`; handoff deployment update is
  `f609131`.
- BELL gender-ratio auto mode is deployed in `5998508`.

## Session log

- 2026-10-14 (Codex): Enabled the retained detailed CMS only for GAKUORI while
  preserving the simplified CMS for all other tenants.
- 2026-10-12 (Codex): Implemented but did not commit staff-view approval,
  cancellation, and bulk-cancellation controls.
