# AI Development Handoff

This file is the shared, repository-tracked handoff between Codex and Claude
Code. Both agents must read it before development and update it before pausing
or finishing.

## Current objective

- Deploy BELL-only approval-based reservations and add total attendance to the
  BELL gender-ratio social-proof text.

## Status

- Implemented, committed as `c68d553`, pushed to `main`, and deployed to
  production.

## Completed changes

- Added `pending_approval` reservation status and
  `Event.bellApprovalRequired`, with migration
  `backend/prisma/migrations/20261012010000_add_bell_approval_mode/migration.sql`.
- Added the BELL-only setting `BELL専用：予約を承認制にする` in
  `frontend/src/components/admin/EventForm.tsx`. Enabling it selects onsite
  payment, enables the roster share link, and does not alter existing bookings.
- New applications become approval-pending. Applicants see the pending state;
  pending applications are excluded from confirmed attendance/capacity counts.
- Added approve/cancel actions to the event admin page and shared roster.
  Approval sends the existing reservation-confirmation LINE message; rejection
  sends a cancellation LINE message to the applicant.
- Approval rechecks ordinary gender/total capacity and the BELL auto-ratio rule
  before confirming. Pending applications may only transition to confirmed or
  cancelled through the status service.
- The BELL social-proof display now has a third line from 20 confirmed attendees:
  `合計N名が参加！`.
- Added approval notification tests in
  `backend/src/reservations/reservations.service.spec.ts` and updated social-proof
  expectations.

## Decisions and constraints

- Approval mode is persisted only for tenant code `11221185` and only supports
  onsite payment.
- The automatically issued roster URL is a bearer-style operational link. Anyone
  possessing it can edit roster notes and approve/cancel pending applications.
- Existing reservations are retained when approval mode is enabled; only later
  applications enter `pending_approval`.
- Confirmed attendance remains `reserved`, `attended`, or `waiting_payment`.
  `pending_approval` does not consume capacity until approval.

## Verification

- `cd backend; npx prisma generate` passed.
- `cd backend; npm test -- --runInBand` passed: 15 suites, 81 tests.
- `cd backend; npm run build` passed.
- `cd frontend; npm run build` passed.
- `git diff --check` passed.

## Next action

- In a BELL event, enable `BELL専用：予約を承認制にする`, submit a test
  application, then confirm approval and rejection from both the admin event
  page and the issued roster share link.

## Blockers and risks

- Approval capacity is checked immediately before the status update but does not
  currently acquire the event row lock used by the LIFF reservation transaction;
  two simultaneous admin approvals near the final slot could race.
- LINE delivery depends on the tenant access token and the applicant still being
  reachable by the LINE bot.
- A separate Railway status context, `zucchini-laughter - saas`, is known to fail
  and is not the service at `comiu.up.railway.app`.

## Deployment verification

- GitHub status `Vercel – comiu`: success.
- GitHub status `gracious-beauty - saas`: success; migration deploy completed.
- `https://comiu.link` returned HTTP 200.
- `https://comiu.up.railway.app/api/public/events` returned HTTP 200.
- Worktree was clean after the feature push. This handoff-only follow-up is
  committed with `[skip ci]` to avoid an unnecessary redeploy.

## Session log

- 2026-10-12 17:32 JST (Codex): Implemented and locally verified BELL approval
  mode plus the total-attendance third social-proof line. Pushed `c68d553`; both
  production deployments succeeded and production endpoints responded.
- 2026-10-12 (Codex): Previously deployed BELL gender-ratio auto mode in
  `5998508`; deployment state was recorded in `fe39342`.
