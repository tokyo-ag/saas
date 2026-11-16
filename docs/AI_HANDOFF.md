# AI Development Handoff

This file is the shared, repository-tracked handoff between Codex and Claude
Code. Both agents must read it before development and update it before pausing
or finishing.

## Current objective

- Routine maintenance. All planned features are deployed.

## Status

- Staff-view cancellation controls committed as `ba46791` on 2026-11-12,
  pushed to `main`, Vercel deploying.

## Completed changes (2026-11-17, Claude Code)

### Android login loop fix (commit 765471c)
Root cause: Androidユーザーが予約ページで"ずっとログインできない"状態。3つの原因を修正:
1. `STEP1_REDIRECT_KEY` を `sessionStorage` → `localStorage + 2分TTL` に変更。Android Chrome Custom TabsはバックグラウンドでsessionStorageを消すため、`liff.line.me`へのリダイレクト制限が消えて無限ループになっていた。
2. `liff.init()`タイムアウト 10s → 20s に延長。Android低端末+遅い回線でOAuthコード交換が10秒超えることがあった。
3. `handleLoginRetry()`（エラー画面の再試行ボタン）が`liff-login-tried`フラグを消さずに再リダイレクトしていたため、戻ってくると即エラー表示になっていた。

### Sitemap / SEO fixes
- `NEXT_PUBLIC_SITE_LAST_MODIFIED=2026-11-16` をRailwayにセット済み（ユーザーが設定）
- `/e/bell` → `/e/11221185` 301リダイレクト (commit 1739817)
- `/clubs/bell/bell` → `/clubs/11221185/bell` 301リダイレクト (commit 587d99f)
- 内部向けblog post 3件を`status='draft'`に変更（DBで直接更新済み）

### メディア対応
- LaBOLA ユーザー名 → 放課後ばすけ に変更（画像は要確認）
- Meetup 放課後ばすけアカウント名変更完了、BELLは要ログイン（hCaptchaで自動化不可）
- Meetup は無料プランでは価値なしとユーザー判断

## Completed changes (2026-11-14, Claude Code)

- X profile (@comiu2027) アイコン・bio更新: `_x_profile_setup.cjs` にモバイルUAエミュレーション追加 (mobile UA workaround)。bio「放課後ばすけ」正常反映。アイコン (icon.png) アップロード完了。
- `community_media_rotation_prompt.txt` Xセクション更新: 各サークルのツイートに初心者向け訴求フレーズ（バスケ未経験OK／ラケット無料貸出等）を必須化。情報系ツイート (ranking_incircle / ranking_badminton) にも初心者切り口を追加。

## Completed changes (2026-11-12, Claude Code)

- Added individual reservation status update endpoint and bulk cancel-all
  endpoint to `backend/src/public/public.controller.ts`.
- Added approval/cancel buttons per row and "全員キャンセル" with double-confirm
  guard to `frontend/src/app/staff/[token]/events/[eventId]/page.tsx`.
- Added `updateStaffViewReservationStatus` and `cancelAllStaffViewReservations`
  to `frontend/src/lib/api.ts`.
- All 81 backend tests pass; frontend build succeeded.

## Next action

- Monitor Vercel deployment of `ba46791`.
- Enable jimoty entries in `C:\newprogram\community_media_rotation.json`
  (bell/gakuori/yurubado — set `"enabled": true`). Conditions met as of
  2026-11-04 (credentials saved, posts created). Blocked by auto mode classifier;
  requires user approval or manual edit.
- bell:meetup session expired — user must manually log in on port 19283
  (hCaptcha prevents automation).

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
