# API仕様

Base URL: `/api`

## 認証

| Method | Path | Auth | 概要 |
| --- | --- | --- | --- |
| POST | `/auth/register` | none | メール登録 |
| POST | `/auth/login` | none | ログイン |
| POST | `/auth/reconfirm` | admin | 機密設定変更用の再認証 |
| GET | `/auth/verify-email` | none | メール確認 |
| POST | `/auth/forgot-password` | none | パスワードリセットメール送信 |
| POST | `/auth/reset-password` | none | パスワード再設定 |
| POST | `/auth/set-email-password` | admin | LINE登録後等のメール/パスワード設定 |
| POST | `/auth/resend-verification` | admin | 確認メール再送 |
| POST | `/auth/resend-verification-by-email` | none | メール指定で確認メール再送 |
| GET | `/auth/line` | none | LINE Login開始 |
| GET | `/auth/line/callback` | none | LINE Login callback |
| POST | `/auth/line/complete` | none | LINE登録完了 |
| GET | `/auth/me` | admin | ログイン中ユーザー情報 |

## 管理: イベント

| Method | Path | 概要 |
| --- | --- | --- |
| GET | `/admin/events` | イベント一覧 |
| GET | `/admin/events/:eventId` | イベント詳細 |
| POST | `/admin/events` | イベント作成 |
| PUT | `/admin/events/:eventId` | イベント更新 |
| DELETE | `/admin/events/:eventId` | イベント削除 |
| GET | `/admin/events/:eventId/reservations` | 予約者一覧 |
| GET | `/admin/events/:eventId/reviews` | レビュー一覧 |
| PATCH | `/admin/events/:eventId/reviews/:reviewId` | レビュー公開状態更新 |
| POST | `/admin/events/:eventId/remind` | リマインド送信 |
| POST | `/admin/events/:eventId/checkin` | チェックイン |
| POST | `/admin/events/:eventId/message` | 参加者へメッセージ |
| GET | `/admin/events/:eventId/export` | CSV出力 |

## 管理: メンバー

| Method | Path | 概要 |
| --- | --- | --- |
| GET | `/admin/members` | メンバー一覧 |
| GET | `/admin/members/:memberId` | メンバー詳細 |
| PATCH | `/admin/members/:memberId/block` | ブロック |
| PATCH | `/admin/members/:memberId/unblock` | ブロック解除 |
| POST | `/admin/members/sync-line-profiles` | LINEプロフィール同期 |
| GET | `/admin/members/messages/threads` | 管理者トーク一覧 |
| GET | `/admin/members/:memberId/messages` | 管理者トーク詳細 |
| POST | `/admin/members/:memberId/messages` | 管理者から送信 |

## 管理: 予約

| Method | Path | 概要 |
| --- | --- | --- |
| PATCH | `/admin/reservations/:id/status` | 予約状態更新 |

## 管理: テナント

| Method | Path | 概要 |
| --- | --- | --- |
| GET | `/admin/tenant` | テナント取得 |
| PUT | `/admin/tenant` | テナント更新 |
| GET | `/admin/tenant/stats` | 統計 |
| GET | `/admin/tenant/growth` | 成長データ |
| GET | `/admin/tenant/activity` | 活動履歴 |
| POST | `/admin/tenant/sync-line-profile` | LINEプロフィール同期 |
| GET | `/admin/tenant/support` | サポートメッセージ |
| POST | `/admin/tenant/support` | サポート送信 |
| POST | `/admin/tenant/billing/checkout` | SaaS課金Checkout作成 |

## LIFF

| Method | Path | 概要 |
| --- | --- | --- |
| GET | `/liff/:tenantId` | テナント情報 |
| POST | `/liff/:tenantId/access` | アクセス記録 |
| GET | `/liff/:tenantId/events` | イベント一覧 |
| GET | `/liff/:tenantId/events/:eventId` | イベント詳細 |
| GET | `/liff/:tenantId/events/:eventId/my-reservation` | 自分の予約 |
| GET | `/liff/:tenantId/events/:eventId/reviews` | 公開レビュー |
| GET | `/liff/:tenantId/events/:eventId/my-review` | 自分のレビュー |
| POST | `/liff/:tenantId/events/:eventId/reviews` | レビュー投稿 |
| POST | `/liff/:tenantId/reservations` | 予約作成 |
| DELETE | `/liff/:tenantId/reservations/:reservationId` | 予約キャンセル |
| GET | `/liff/:tenantId/profile` | 自分のプロフィール |
| PATCH | `/liff/:tenantId/profile` | プロフィール更新 |
| PATCH | `/liff/:tenantId/profile/line` | LINEプロフィール同期 |
| PATCH | `/liff/:tenantId/profile/settings` | プライバシー設定更新 |
| GET | `/liff/:tenantId/members/:memberId` | メンバープロフィール |
| POST | `/liff/:tenantId/connections` | コネクション作成 |
| GET | `/liff/:tenantId/connections` | コネクション一覧 |
| GET | `/liff/:tenantId/connections/:connectionId/messages` | メッセージ一覧 |
| POST | `/liff/:tenantId/connections/:connectionId/messages` | メッセージ送信 |
| GET | `/liff/:tenantId/notifications` | 通知一覧 |
| PATCH | `/liff/:tenantId/notifications/:notificationId/read` | 通知既読 |
| PATCH | `/liff/:tenantId/notifications/read-all` | 全通知既読 |
| GET | `/liff/:tenantId/admin-messages` | 管理者トーク |
| POST | `/liff/:tenantId/admin-messages` | 管理者へ送信 |
| PATCH | `/liff/:tenantId/admin-messages/read` | 管理者トーク既読 |
| GET | `/liff/:tenantId/support` | COMIUサポート |
| POST | `/liff/:tenantId/support` | COMIUサポート送信 |

## 公開

| Method | Path | 概要 |
| --- | --- | --- |
| GET | `/public/events` | 公開イベント一覧 |
| POST | `/public/events/:id/view` | 閲覧数加算 |
| GET | `/public/events/:eventId` | 公開イベント詳細 |
| GET | `/public/tenants` | 公開団体ランキング |
| GET | `/public/tenants/:tenantCode` | 公開団体詳細 |
| GET | `/public/tenant-theme/:tenantId` | テーマカラー |
| GET | `/public/sitemap-events` | sitemap用イベント |
| GET | `/public/sitemap-tenants` | sitemap用団体 |

## スーパー管理

| Method | Path | 概要 |
| --- | --- | --- |
| GET | `/superadmin/tenants` | テナント一覧 |
| POST | `/superadmin/tenants` | テナント作成 |
| PUT | `/superadmin/tenants/:id` | テナント更新 |
| PATCH | `/superadmin/tenants/:id/deactivate` | 停止 |
| PATCH | `/superadmin/tenants/:id/restore` | 復元 |
| PATCH | `/superadmin/tenants/:id/ban` | BAN |
| DELETE | `/superadmin/tenants/:id` | 物理削除 |
| GET | `/superadmin/tenants/:id/impersonate` | 代理ログイントークン |
| GET | `/superadmin/banned-users` | BANユーザー一覧 |
| POST | `/superadmin/banned-users` | BANユーザー登録 |
| DELETE | `/superadmin/banned-users/:lineUserId` | BAN解除 |
| GET | `/superadmin/support` | サポートスレッド |
| GET | `/superadmin/support/:lineUserId` | サポート詳細 |
| POST | `/superadmin/support/:lineUserId/reply` | サポート返信 |

## Webhook / Upload

| Method | Path | 概要 |
| --- | --- | --- |
| POST | `/webhook/:tenantId` | LINE Webhook |
| POST | `/stripe-webhook/:tenantId` | テナント別イベント決済Stripe Webhook |
| POST | `/stripe-webhook/billing` | SaaSプラン課金Stripe Webhook |
| POST | `/admin/upload` | バックエンド画像アップロード |
| POST | `/api/upload` | フロントエンドNext API経由Vercel Blobアップロード（Backend Base URLの`/api`配下ではない） |
