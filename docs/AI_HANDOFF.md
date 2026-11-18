# AI Development Handoff

This file is the shared, repository-tracked handoff between Codex and Claude
Code. Both agents must read it before development and update it before pausing
or finishing.

## Current objective

バックアップ基盤: 復元テスト✅合格済み。残はGitHub Secrets設定（ユーザー操作）のみ。

## Status

- **バックアップ基盤: 完成**（復元テスト2026-11-18合格、詳細は下記）
- 課金管理機能デプロイ済み（commit 3c0315a）。Stripe本番切り替えは保留。
- FONE 12月イベント10件を本番DBに投入済み（2026-11-18）

## Next action

### ユーザーが実施する必要がある作業（2項目）

**【優先度高】1. GitHub Secrets設定**
GitHubリポジトリ > Settings > Secrets and variables > Actions:
- `PGBACKUP_DATABASE_URL`: 以下のコマンドで取得
  ```
  wsl bash -c "grep PGBACKUP_DATABASE_URL /mnt/c/saas/backend/.env.backup"
  ```
- `GPG_PASSPHRASE`: 以下のコマンドで取得
  ```
  wsl bash -c "grep GPG_PASSPHRASE /mnt/c/saas/backend/.env.backup"
  ```
- R2 Secrets（任意。未設定時はGitHub Artifactsに自動フォールバック）

**【優先度高】2. GPGパスフレーズのオフライン保管**
- 上記で確認したGPG_PASSPHRASEをBitwarden等に登録（名前:「COMIU GPG Backup Passphrase」）
- 紙にも書いて保管（PCが壊れても復元できるように）
- ⚠️ GitHub Secretsはバックアップ保管先として数えません

**GitHub Actions手動テスト（Secrets設定後）**
Actions > DB Backup (Daily) > Run workflow

### 課金フロー

1. /superadmin でFONEテナント「課金管理」→「プロ 支払いURL発行」
2. URLをFONEに送信 → カード入力
3. Stripe本番切り替え（`STRIPE_BILLING_SECRET_KEY`等をRailway環境変数にセット）

## Pending: リマインドが届かない問題

FONEのLINE設定完了後にリマインドが届かない可能性。
- 診断：ブラウザコンソールで `fetch('/api/admin/events').then(r=>r.json()).then(d=>console.log(d.events?.map(e=>({title:e.title,remindAt:e.remindAt,remindedAt:e.remindedAt}))))` を実行
- `remindedAt`がセット済みならDBで`null`にリセットが必要

## Completed changes (2026-11-18 session 4, Claude Code)

### COMIU独立監査 追加確認・ファイル整備

**監査ファイル完全整備（C:\saas\audit\）**
- audit_inventory.md, audit_timeline.md, audit_findings.md, audit_evidence.md, audit_unresolved.md, audit_final_report.md 全6ファイル確認・更新済み

**f→one 12月イベント確認（確定）**
- tenant-1779403327733（FONE正テナント）に12月イベント10件存在（12/03〜12/29）
- BELLのdead events内のf→one系は「誤テナント作成後削除」の痕跡と確定。現在のFONEイベントに問題なし

**過去報告の訂正（確定）**
- 「技術的に不可能（確定）」→ 「調査範囲（バックアップ・PITR・dead tuple・セッションログ）においては追加復元経路は確認できない」が正確な表現
- U2（f→one系dead events原因）をLowに格下げ・解決済みとしてマーク

---

## Completed changes (2026-11-18 session 4, Claude Code)

### COMIU特別監査 完了

**監査ファイル群（C:\saas\audit\ ）:**
- audit_inventory.md, audit_timeline.md, audit_findings.md, audit_evidence.md, audit_unresolved.md, audit_final_report.md 全6ファイル作成済み
- F02（e43c2f1b 17件内訳）：4件null-staff_note = bell_audit_report.jsonのC分類（事故後新規）と完全一致確認済み→ **解決済み**
- F03（09:21=独立スキャンでなかった）: find_bell_dec_members.cjsのコード確認により確定
- f→one系dead events（BELL tenant-001に6件）: FONEイベント誤テナント作成後削除の痕跡（現FONEテナントに正常な10件存在）
- e43c2f1b reserved_at: 再構築11件全件 2026-11-17T06:21:26.206Z（同一）、4件は事故後新規

**未解決（調査継続中）:**
- U2: f→one系dead eventsの作成経緯（意図的テストか誤操作か：ユーザー確認待ち）
- U4: 再構築11件のreserved_at同一タイムスタンプの実務影響（ユーザーへの正式通知が必要）
- U5: 「28人/19人/47人」は証明されていない（ユーザー申告のみ）

---

## Completed changes (2026-11-18 session 3, Claude Code)

### バックアップ強化・BELL事故調査最終監査

**新規バックアップ取得（2026-11-18 09:40 JST）**

| 項目 | 値 |
|------|-----|
| ファイル | `backup/backup_full_2026-11-18T00-40-08.sql` |
| サイズ | 3.72 MB |
| SHA256 | `2858cad8ba3f00eb9c2975eda455056a8d2a46a6430651e7806202a844032e7f` |
| 総行数 | 11,963行 |
| reservations | 1,188件 |
| BELL 12/01予約 | 17件（現在DBの実際の件数） |
| BELL 12/23予約 | 7件（現在DBの実際の件数） |

**復元テスト（部分的）**
- ローカルPostgresのパスワード不明のためpsql復元は未実施
- SQLファイル整合性確認済み: BEGIN/COMMIT=1/1、INSERT文数=11,963、主要テーブル全件確認済み
- `run_restore_test.ps1`でローカルPostgresパスワード入力すれば完全テスト可能

**復旧手順書作成**
- `docs/RECOVERY_PROCEDURE.md`: バックアップ取得・通常復元・事故後新規予約を消さない部分復元手順を記載

**BELL事故最終監査（JSONLログ実証）**
- recover_v3.cjsの09:12 UTC生出力をJSONLログ（Line 15642）で確認
- 15件全件のevent_id・member_idが確定（12/01×11, 12/23×2, b6154fac×1, 他テナント×1）
- 「14件→9件」はrestore_reservations.cjsのスクリプト実装差が原因（autovacuumではない）
- 「10件→11件」は生ログで直接確認できない（コンテキスト圧縮前のやり取りに含まれる）
- 13件に含まれなかったレコード: b6154fac（11/17当日イベント/ゆき）が1件除外済み

---

## Completed changes (2026-11-18 session 2, Claude Code)

### バックアップ基盤完成 (commits 246de96, f879b08, ce2xxxx)

**復元テスト結果（✅ 合格）**

| 項目 | 結果 |
|------|------|
| GPG復号 | ✅ 成功 (AES256) |
| SHA256整合性 | ✅ OK (285d36f5...) |
| テーブル数 | ✅ 26 |
| インデックス数 | ✅ 65 |
| FK制約数 | ✅ 22 |
| 文字コード | ✅ UTF8 |
| 孤立した予約 | ✅ 0件 |
| Prismaマイグレーション | ✅ 105件 |
| tenants / events / reservations / members | ✅ 7 / 121 / 1185 / 784 |

**復元テスト方法:** PostgreSQL 17（Windows）で`initdb --auth=trust`による隔離テストクラスターを作成し、ポート5433で実施。既存DBは一切変更なし。

**スクリプト:**
- `backend/decrypt_helper.sh`: GPG復号ヘルパー（パスフレーズをコマンドラインに渡さない）
- `backend/verify_decrypt.sh`: 復号・SHA256・SQL構造検証（DB不要ステップ）
- `backend/decrypt_test_windows.ps1`: Windows PostgreSQL対応復元テストスクリプト

**その他完了:**
- `.claude/settings.local.json`: PowerShell toolをPreToolUseフックに追加
- `backend/pre_psql_backup.sh`: `railway run` + SQL操作の検出、`prisma migrate reset`検出を追加
- `.github/workflows/db-backup.yml`: R2未設定時にGitHub Artifactsへ自動フォールバック
- `backend/.env.backup`: 本番DB接続URL + GPG_PASSPHRASE設定済み（Gitコミット対象外）
- Windows Task Schedulerタスク（COMIU-PgBackup-Daily）: 2:00 AM JSTに正常動作確認済み

**未完了（ユーザーアクションが必要）:**
- GitHub Secrets設定（下記参照）
- GPGパスフレーズのパスワードマネージャー登録

---

## Completed changes (2026-11-18 session 1, Claude Code)

### バックアップ基盤改善 (commit eca35ac)

- `backend/pg_backup.sh`: check_bell.cjs依存を排除。`PGBACKUP_DATABASE_URL`環境変数または`.env.backup`から接続情報を取得。GPG対称暗号化（AES256）を追加（`GPG_PASSPHRASE`が設定されている場合）。
- `backend/pre_psql_backup.sh`: prisma migrate deploy/dev・prisma db pushも自動バックアップのトリガーに追加。
- `backend/.env.backup.template`: 接続情報テンプレート（Git管理、シークレットなし）。
- `.gitignore`: `.env.backup.template`を除外対象外に追加（`.env.backup`は引き続き除外）。
- `.github/workflows/db-backup.yml`: GitHub Actions日次バックアップ（Cloudflare R2への暗号化保存）。毎日02:00 JST実行・30日世代管理・月次12ヶ月保持。
- `backend/RECOVERY_GUIDE.md`: バックアップ体制・復旧手順を最新アーキテクチャに更新。

**次のアクション（バックアップ関連）:**
1. GitHub Secretsを設定（`PGBACKUP_DATABASE_URL`, `GPG_PASSPHRASE`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`）
2. Cloudflare R2バケットを作成（無料枠: 10GB/月、エグレス無料）
3. `.env.backup`を作成（`cp .env.backup.template .env.backup`して実際の値を設定）
4. Railway PostgreSQLダッシュボードでPITRを有効化（Backups タブ > Enable PITR）
5. 復元テスト（WSLローカルPostgreSQLで）: `wsl bash /mnt/c/saas/backend/pg_backup.sh`実行後 `RECOVERY_GUIDE.md`の定期復元テスト手順を参照

**ローカル復元テストについて:** WSL上のPostgreSQL 18サーバーインストールが完了していない（インストール試行中）。完了後は`RECOVERY_GUIDE.md`の定期復元テスト手順で実施可能。

---

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
