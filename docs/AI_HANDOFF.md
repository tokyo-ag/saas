# AI Development Handoff

This file is the shared, repository-tracked handoff between Codex and Claude
Code. Both agents must read it before development and update it before pausing
or finishing.

## Current objective

comiu.link の Railway への移行完了。Vercel完全依存解消は後日タスク。

## Status

- **バックアップ基盤: 完成**（復元テスト2026-11-18合格、詳細は下記）
- 課金管理機能デプロイ済み（commit 3c0315a）。Stripe本番切り替えは保留。
- FONE 12月イベント10件を本番DBに投入済み（2026-11-18）
- **Railway frontendデプロイ: 完了** `https://frontend-production-5b197303.up.railway.app`（HTTP 200確認済み）
- **comiu.link Cloudflare+Railway移行: 完了**（2026-11-19）

## インフラ構成（2026-11-19時点）

| レイヤー | サービス | 用途 |
|---------|---------|------|
| ドメイン契約・更新 | お名前.com | comiu.link |
| DNS管理 | Cloudflare（Freeプラン） | damon.ns.cloudflare.com / mallory.ns.cloudflare.com |
| フロントエンド | Railway（frontendサービス） | Next.js |
| バックエンド | Railway（saasサービス） | NestJS API |
| DB | Railway（Postgresサービス） | PostgreSQL |
| ソースコード | GitHub（tokyo-ag/saas） | mainブランチ |

**Cloudflare DNS設定（comiu.link）：**
- CNAME `@` → `g91ksdkb.up.railway.app`（Proxy: DNS only）
- TXT `_railway-verify` → Railway指定の認証値

**Railway環境変数（frontendサービス）：**
- `NEXT_PUBLIC_API_URL=https://comiu.up.railway.app`
- `NEXT_PUBLIC_SITE_URL=https://comiu.link`
- `NEXT_PUBLIC_SUPPORT_EMAIL=comiunoreply@gmail.com`

## Next action

### 未完了タスク（後日）

- Vercelからの完全移行・依存関係調査（`BLOB_READ_WRITE_TOKEN`等）
- `NEXT_PUBLIC_LIFF_ID` 設定（LINE LIFFログイン用。DBのtenant.liffIdで確認可）
- Stripe本番切り替え（`STRIPE_BILLING_SECRET_KEY`等をRailway環境変数にセット）

### 旧DNS設定記録（移行前・参考）

**移行前（お名前.com DNS）：**
- A レコード: `comiu.link` → `153.52.255.100`
- お名前.com DNS（01-04.dnsv.jp）

**移行後（Cloudflare DNS）：**
- CNAME `@` → `g91ksdkb.up.railway.app`（CNAMEフラットニング）
- TXT `_railway-verify` → Railway認証値

---

### 旧: comiu.link復旧（移行済み・参考）

**旧DNS設定（お名前.com・削除済み）：**
```
nslookup comiu.link
```
`153.52.255.100` が返ったら `https://comiu.link` で動作確認。

**TXTレコード注意：**
Railwayは `_railway-verify.comiu.link` を要求するが、`railway-verify.comiu.link`（アンダースコアなし）で登録済み。
ドメイン検証が通らない場合は、お名前.comでTXTレコードを削除→ `_railway-verify` で再登録が必要。

**Railway環境変数（設定済み）：**
- `NEXT_PUBLIC_API_URL=https://comiu.up.railway.app`
- `NEXT_PUBLIC_SITE_URL=https://comiu.link`
- `NEXT_PUBLIC_SUPPORT_EMAIL=comiunoreply@gmail.com`

**未設定（必要に応じて）：**
- `NEXT_PUBLIC_LIFF_ID`: LINE LIFF ID（DBのtenant.liffIdで確認可）
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob token（画像アップロード用）

---

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

## Completed changes (2026-11-19 session 9, Claude Code)

### Android LIFF認証調査（3点追加検証）

**調査指示:** 原因確定までコード変更・コミット・本番デプロイ禁止。

#### 「INTO1」の正体（確定）
コードに `"INTO1"` という文字列は存在しない。`reserve/page.tsx:216` の `setAuthError(\`Step1: ${getInitError() ?? '不明'}\`)` が表示する **「Step1:」** が誤読されている。

#### ① clearLiffSdkState() の影響

削除されるキー: `/^LIFF[_:]/` パターン（`LIFF_STORE:{liffId}:xxx` 等）をlocalStorage・sessionStorage両方から削除（liff.ts:67）。PKCE verifier も含まれる可能性あり。

**呼び出しタイミングが問題:**
1. `initLiff()` 失敗後（liff.ts:180）→ SDKストレージ全消去
2. `redirectToLiffApp()` → liff.line.me → LINEがOAuth `code`+`state`付きでコールバック
3. コールバックで再び `liff.init()` → **PKCE verifierが消えているため検証失敗 → 再びStep1エラー**

**コード確認済み証拠:** clearLiffSdkState() はinit失敗後とリダイレクト前の両方で呼ばれる。  
**未確認:** LIFF SDK 2.28.0がPKCE verifierを `LIFF_STORE:` キーで保存するか（dist/が存在しない）。

#### ② LIFFリダイレクト処理（iPhone vs Android）

**iPhone成功・Android失敗を説明できる根拠:**
- iPhone LINEアプリ内→ `liff.isInClient()` = true → Step2別フロー → init()失敗でもOAuthリダイレクトしない
- Android外部アプリ（WebView）→ `liff.isInClient()` = false → init()失敗 → clearLiffSdkState() → PKCEなしでOAuth往復 → 失敗ループ
- `isInLineInAppBrowser()` は `/\bLine\//i` のみ検出（config.ts:65）→ Android WebView（サークルブック等）は検出されない

**「Chrome/LINE/サードパーティすべて失敗」の意味:**
- ブラウザ固有の問題ではなく、`liff.init()` 自体が失敗し続けている
- 765471c修正（sessionStorage→localStorage）でループは止まったが、init()失敗の根本原因は未解決の可能性

#### ③ LIFF設定の整合性

コードで確認済み: LIFF IDはDBのtenant.liffIdから取得・SITE_URL=`https://comiu.link`・エンドポイント構築は `liff.line.me/{liffId}/{suffix}`  
**未確認:** LINE Developersコンソールの実際のエンドポイントURL設定

#### 原因確定に必要な次の確認（コード変更なし）

1. **Android実機** → ブラウザ開発者ツールで `window.__LIFF_INIT_ERROR` の値確認
2. **LINE Developersコンソール** → テナントのLIFFアプリのエンドポイントURL確認
3. **LIFF SDK npm展開** → `LIFF_STORE:{liffId}:codeVerifier` 等のキーが存在するか確認

**コード変更禁止継続（指示遵守）**

---

## Completed changes (2026-11-18 session 8, Claude Code)

### COMIU 未特定人数 再計算・全件分類検証

**訂正推移:**
- 旧: 34未特定（47 - 13 dead tuple = 34）
- session 8第1報: **21未特定**（誤り：事後新規3人を含む総数を使用）
- **正確な数字: 24未特定**（47 - 23 = 24）

**根拠:**
読み取り専用DBクエリで `xmin`（PostgreSQL行挿入トランザクションID）と `staff_note` を確認：

| イベント | Dead tuple復元 | バッチ移行（xmin=21443） | その他 | 合計（DB在籍） | 未特定 |
|---------|---:|---:|---:|---:|---:|
| 12/01（28人） | 11 | 4 | 1（北 cancelled） | **16** | **12** |
| 12/23（19人） | 2 | 4（うち1 cancelled） | 1（石井） | **7** | **12** |
| **合計** | **13** | **8** | **2** | **23** | **24** |

**重要発見 — xmin=21443:**  
8件（12/01: 北村瞬典・椿公介・吉田巧歩・菅原大知、12/23: 佐々木拓海・梶浦主之和・佐藤光翼・高橋琉貴斗）が同一 xmin=21443 を共有。12/01・12/23の**異なる2イベントにまたがる**ため、これらはユーザーが個別予約したものではなく**バッチスクリプトによる一括挿入**。reserved_atが事故前の値なのは、移行時に元の予約時刻が設定されたためと考えられる。

**旧audit CSVの誤り:**  
bell_audit_12_01.csv・12_23.csvで「事故後予約（JST 12:42）」等と記録されていたが、12:42 JSTは事故時刻（17:46 JST）より前であり誤分類。

**作成ファイル:**
- `audit/reservation_classification_verified.md` — 全件分類（xmin・staff_note根拠）・計算訂正・旧CSV誤り記録
- `audit/reservation_matching_procedure.md` — LINE照合・復元手順書

**承認待ち（BELL運営の承認が必要）:**
1. 参加者への告知送信（LINE一斉送信）
2. xmin=21443バッチ移行の経緯確認（誰がいつ何のスクリプトで実行したか）
3. 本番DBへの予約復元（照合後）

---

## Completed changes (2026-11-18 session 7, Claude Code)

### COMIU 最終技術調査 完了

**作成ファイル:** `audit/final_recovery_report.md` — A〜E全項目・最終集計表・調査済み証拠ソース一覧を含む確定版

**GitHub Actions db-backup.yml の重要事実（新確認）:**  
全8回の実行が `push` イベント（事故後push）。ワークフロー自体が事故後に追加されたため、事故前にバックアップが実行されたことは一度もない。GitHub Artifactsにも事前バックアップなし。

**B（13件原因）新重要発見（a09536a4フォーク確認）:**
- `last_autovacuum: 2026-10-29` — 事故当日にautovacuumは一度も動いていなかった（確定）。autovacuum主因説は証拠なし
- `last_autoanalyze: 2026-11-17T08:47:29Z` — 削除完了と同時刻にautoanalyzeが起動（大量削除がトリガー）。ただしanalyzeは統計収集のみでデータは消さない
- 15件→9件差異・47件→13件差異の真因は依然未解明

**C（データ探索）a338be67フォーク完了:**
- JSONL L1〜L13000・c--newprogramプロジェクト全JSONL・Downloads・C:\newprogram\comiu\ → 予約データ新発見なし
- `bell_restore_candidates.json` の `dead_tuple_comparison`: 1回目スキャン(recover_v3)=15件 → 2回目スキャン=9件。差異-6件の原因は未解明（autoanalyzeはdead tupleを削除しない）
- ローカルPostgreSQL 17（postgresql-x64-17）: Running状態だが認証パスワード不明で接続不可

**調査結論（確定）:**  
技術的回収経路は全て枯渇。残21人の特定は参加者のLINE予約確認通知からの手動申告照合のみ。

---

## Completed changes (2026-11-18 session 6, Claude Code)

### COMIU未復元34人 最終技術調査

**更新ファイル:** `audit/missing_reservations_recovery.md`

**最終確認事項（A〜E）:**

**A. Railway PITR 事故前の復元ポイント: 存在しない（確定）**
- RECOVERY_GUIDE.md の「強く推奨します」は事故後に追加された推奨文言（未設定時の文言）
- GitHub Actions db-backup.yml: 全8回の実行が `push` イベント（事故後push）。ワークフロー自体が事故後に追加されたため JST 02:00 の定時バックアップは一度も実行されていない。GitHub Artifactsにも事前バックアップなし。
- backup/ ディレクトリ最古ファイル: JST 2026-11-17 21:05（事故後）

**B. 13/47の原因: 新たな証拠なし（依然未解明）**
- recover_v2 と recover_v3 の差異を発見: v2 に `t_xmax >= 21000` フィルターあり（v3 はなし）
- bell_recovery_evidence.json は「recover_v3で前セッション取得」と明記 → v2フィルターは今回の13件に影響なし
- 事故から約40分後（JST 18:20）のスキャン時点で既に14件（tenant-001）しか存在しなかった。残34件消失の原因は未解明。

**C. 新たに特定された未特定34人: 0人**
- 全調査ソース（JSONL全範囲・旧セッション・forensicファイル群）で予約データ新発見なし

**D. 新たに発見された復元可能な場所: なし**
- 全ルートが枯渇または確認不可（Railway PITR未設定、GitHub Artifacts未存在、backup/事故後のみ）

**E. 技術ルート枯渇後に残る未確認事項（ユーザー対応が必要）:**
1. Railwayダッシュボード → Backupsタブ → PITR有効化状態の直接確認
2. Railwayダッシュボード → 旧Volume・旧Database の残存確認
3. BELL運営から参加者への告知（「12/01・12/23に事故前予約していた方は申し出てください」）→ LINE通知経由で申告可能

**最終サマリー:**
| 対象 | 事故前 | 既に再構築 | 新たに特定 | 未特定 |
|------|-------|----------|-----------|-------|
| 12/01 | 28人 | 11人 | 0人 | **17人** |
| 12/23 | 19人 | 2人 | 0人 | **17人** |
| 合計 | 47人 | 13人 | 0人 | **34人** |

---

## Completed changes (2026-11-18 session 5, Claude Code)

### COMIU事故原因の完全解明と未復元34人の調査

**作成済みファイル:**
- `C:\saas\audit\incident_cause.md` - 事故原因の完全報告（削除コード全文・操作タイムライン・予約消失の仕組み）
- `C:\saas\audit\missing_reservations_recovery.md` - 未特定34人の調査報告

**incident_cause.md の主要確認事項（全て確認済み）:**
- L14991: 10件の個別IDリスト削除スクリプト（全ID確認済み）
- L15010/L15018/L15040: `filter(heldAt.startsWith('2026-12'))` による全削除スクリプト（全文確認済み）
- `events.service.ts:570`: `reservation.deleteMany({ where: { eventId: id } })` → Event削除前に全予約を削除
- Prisma schema: `Reservation → Event` の onDelete は NoAction（Cascade なし）→ Service層で先行削除
- 削除された元イベント: e43c2f1b（12/01）, 20eae236（12/23）, 1b017dcd（12/30）

**missing_reservations_recovery.md の主要確認事項:**
- dead tupleで確認: 13人（12/01: 11人 + 12/23: 2人）
- 未特定: 34人（47人 - 13人）
- dead tupleが見つからなかった原因: PostgreSQLのpage pruneの可能性
- 追加復元経路: LINE Messaging API送信履歴、Railwayアクセスログ（Claude Codeでは調査不可）
- バックアップは事故後取得のため、削除済み予約データは含まれていない

---

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
