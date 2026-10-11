# AI Development Handoff

This file is the shared, repository-tracked handoff between Codex and Claude
Code. Both agents must read it before development and update it before pausing
or finishing.

## Current objective

- Add a BELL-only unlimited-capacity gender-ratio auto mode to event settings.

## Status

- Implemented, committed as `5998508`, and deployed to production from `main`.

## Completed changes

- Added `Event.bellGenderRatioAuto` and migration
  `backend/prisma/migrations/20261012000000_add_bell_gender_ratio_auto/migration.sql`.
- Added the BELL-only (`tenant.code === '11221185'`) option
  `人数制限なし男女比オートモード` in
  `frontend/src/components/admin/EventForm.tsx`.
- From the 20th active reservation onward, male capacity is calculated using
  the BELL operating rule `male limit = female count * 2 + 10`. Female
  reservations remain unlimited and each female reservation adds two male
  slots. Male over-cap reservations are rejected transactionally.
- Public event and LIFF views show male `枠満員` at zero remaining,
  `残りN名` at 1-7, or `募集中` at 8+. Female reservations are unlimited, but
  the UI presents a rolling five-person recruitment goal: `女性残りN名` until
  the next multiple of five, then starts the next five-person goal.
- Added social-proof unit coverage in
  `backend/src/event-social-proof/event-social-proof.service.spec.ts`.

## Decisions and constraints

- The mode has no total capacity limit.
- Enforcement starts when a candidate reservation would bring active attendance
  to 20 or more; active means `reserved`, `attended`, or `waiting_payment`.
- At 20+ attendees, only a male reservation can be blocked, using
  `nextMale > female * 2 + 10`. Female reservations are never blocked by this
  mode.
- The API only persists this mode for BELL; other tenants sending the flag get
  `false`.
- Existing uncommitted `AGENTS.md`, `CLAUDE.md`, and this handoff file predate
  the feature and must be preserved.

## Verification

- `cd backend; npx prisma generate` passed.
- `cd backend; npm test -- --runInBand event-social-proof.service.spec.ts`
  passed: 15 tests.
- `cd backend; npm run build` passed.
- `cd frontend; npm run build` passed.
- `git diff --check` passed.

## Next action

- Have a BELL administrator refresh an event edit page and enable the BELL-only
  auto mode where desired. Existing reservations are retained. For additional
  assurance, smoke-test reservations around the 20-person threshold and the
  10/30, 15/40, and 20/50 female/male boundaries.

## Blockers and risks

- No automated integration test currently exercises the transactional LIFF
  reservation rejection path; the shared ratio helper is unit tested.
- Production backend deployment `gracious-beauty - saas` succeeded at
  `comiu.up.railway.app`; its configured start command runs
  `npx prisma migrate deploy` before starting the app.
- A separate Railway status context, `zucchini-laughter - saas`, failed for the
  same commit. It is not the service serving `comiu.up.railway.app`; investigate
  only if that secondary Railway project is still intended to be active.

## Session log

- 2026-10-12 07:10 JST (Codex): Implemented the initial BELL auto-mode
  foundation; the final rule was refined later in this session.
- 2026-10-12 (Codex): Replaced the provisional 3:2 rule with BELL's empirical
  auto-mode rule: women 10/15/20 allow men 30/40/50 respectively. Female
  bookings are unlimited; male slots expand automatically.
- 2026-10-12 (Codex): Changed activation to 20 total attendees and added rolling
  five-person female recruitment targets. The option is visibly labeled BELL-only.
- 2026-10-12 (Codex): Pushed `5998508` to `main`. Vercel production project
  `comiu` completed successfully, Railway production backend completed
  successfully, and production frontend/backend returned HTTP 200.
