# AI Development Handoff

This file is the shared, repository-tracked handoff between Codex and Claude
Code. Both agents must read it before development and update it before pausing
or finishing.

## Current objective

- FONEのPROプラン課金フローを完成させる。スーパーアドミンで支払いURL発行→FONEに送信→FONE側でカード入力。

## Status

- 課金管理機能を `3c0315a` でデプロイ済み。Railwayデプロイ進行中。
- Stripeのテスト環境（サンドボックス）が開いている状態。本番環境への切り替えが必要な場合は確認。

## Next action

1. Railwayデプロイ完了後、スーパーアドミン（/superadmin）でFONEテナントの「課金管理 ▾」→「プロ 支払いURL発行」をクリック
2. コピーされたStripe Checkout URLをFONEに送信
3. FONEがURLからクレカ入力→完了でプランがPROに自動更新される
4. Stripeは現在サンドボックスモードのため、本番課金には本番環境への切り替えが必要（`STRIPE_BILLING_SECRET_KEY`・`STRIPE_PRO_PRICE_ID`等の本番値をRailway環境変数にセット）

## Pending: リマインドが届かない問題

FONEのLINE設定完了後にリマインドが届かない可能性。
- 診断：ブラウザコンソールで `fetch('/api/admin/events').then(r=>r.json()).then(d=>console.log(d.events?.map(e=>({title:e.title,remindAt:e.remindAt,remindedAt:e.remindedAt}))))` を実行
- `remindedAt`がセット済みならDBで`null`にリセットが必要

## Completed changes (2026-11-17 session 2, Claude Code)

### 課金管理機能追加 (commit 3c0315a)
- `backend/src/stripe/stripe-webhook.controller.ts`: `invoice.payment_failed` Webhook追加 → プランをfreeに自動ダウングレード
- `backend/src/superadmin/superadmin.controller.ts`: `POST /superadmin/tenants/:id/billing-checkout` エンドポイント追加
- `backend/src/superadmin/superadmin.service.ts`: `createBillingCheckoutForTenant()` メソッド追加（COMIUのStripe Billingで任意テナント向けCheckout URLを発行）
- `frontend/src/lib/api.ts`: `api.superadmin.billingCheckout(id, plan)` 追加・`TenantWithStats`に`stripeSubscriptionId`追加
- `frontend/src/app/superadmin/page.tsx`: `BillingMenu`コンポーネント追加（支払いURL発行・フリー強制変更）

### その他完了（session 1）
- FONEをフルカスタマイザー（showLegacyCustomizer）に追加 (commit b33deb4)
- EventFormのremindEnabledデフォルトをtrueに変更 (commit ae2918c)
- LINE設定ガイドのWebhook URL説明修正 (commit 62a1359)

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
