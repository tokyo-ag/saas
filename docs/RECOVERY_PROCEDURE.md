# 予約データ復旧手順書

作成: 2026-11-18  
対象: COMIU 本番DB (Railway PostgreSQL 18)

---

## 1. バックアップの保存先

| バックアップ種別 | 保存先 | 取得頻度 | 保存期間 |
|---------------|--------|---------|---------|
| **自動バックアップ（推奨）** | GitHub Artifacts | 毎日 02:00 JST | 90日 |
| 手動論理バックアップ（SQL） | `C:\saas\backup\backup_full_*.sql` | 手動 | 無期限（手動削除まで） |
| 手動pg_dumpバックアップ | `C:\saas\backup\railway_full_*.dump` | 手動 | 無期限 |

### 自動バックアップの確認方法

GitHub Actions `db-backup.yml` が毎日 02:00 JST に実行。  
確認: `https://github.com/tokyo-ag/saas/actions/workflows/db-backup.yml`

失敗時は GitHub メール通知が届く。

---

## 2. 重要な本番変更前のバックアップ手順

**重要な変更の例:** テーブル削除・マイグレーション・大量UPDATE/DELETE・イベント削除など

```powershell
# 手動バックアップ（約1〜2分）
cd C:\saas\backend
# DATABASE_URL を環境変数に設定（パスワードを直接記述しないこと）
$env:DATABASE_URL = "（Railway の DATABASE_URL をここにセット）"
node full_backup.cjs
# → C:\saas\backup\backup_full_YYYY-MM-DDTHH-MM-SS.sql に保存
# → SHA256ハッシュを手元に記録しておく
```

または `backup\run_backup.ps1` を実行（PostgreSQL 17 クライアントが必要、パスワード対話入力）。  
**注意:** 本番DBは PostgreSQL 18 なので、pg_dump 17 はバージョン不一致エラーになる。`full_backup.cjs`（論理SQLバックアップ）を使用すること。

---

## 3. 通常復旧手順（全データをバックアップから復元）

> ⚠️ **本番DBへの復元操作は必ず事前承認が必要。この手順を実行する前に確認を取ること。**

### 3-1. バックアップファイルの特定

```powershell
# 利用可能なバックアップの一覧
dir C:\saas\backup\backup_full_*.sql | Sort-Object LastWriteTime -Descending

# GitHub Artifacts からダウンロードする場合:
# https://github.com/tokyo-ag/saas/actions/workflows/db-backup.yml
# → 最新の成功したrunを開く → Artifacts → db-backup-YYYY-MM-DD.sql.gz.gpg
# → GPGパスフレーズで復号: gpg --decrypt --passphrase-fd 0 ファイル.gpg > backup.sql.gz
# → 展開: gzip -d backup.sql.gz → backup.sql
```

### 3-2. 復元先の準備（ローカルテスト環境）

```powershell
# ローカルPostgreSQL 17 でテストDBに復元
cd C:\saas\backend
node restore_test_local.cjs
# → comiu_restore_test DB に全データを復元し件数を検証
```

### 3-3. 本番DBへの復元（要承認）

```sql
-- 本番DBへの復元は psql または Railway の管理画面から実施
-- 復元前に必ず現在のDBをバックアップすること
-- psql接続例（Railway CLIまたはturntable proxy経由）:
-- psql $DATABASE_URL < backup_full_YYYY-MM-DDTHH-MM-SS.sql
```

---

## 4. 事故後新規予約を消さない部分復元手順

**シナリオ:** 事故（イベント削除・予約消失）が発生し、事故後に正常な新規予約が行われた場合。

### 4-1. 現在のDBの状態を把握する

```sql
-- 事故後に新規作成された予約（reserved_atで判断）
SELECT id, tenant_id, event_id, member_id, status, reserved_at
FROM reservations
WHERE tenant_id = 'tenant-001'
  AND event_id = '対象イベントID'
ORDER BY reserved_at;
```

### 4-2. 保護すべき予約（事故後新規）を特定する

```sql
-- 事故発生日時より後に作成された予約を特定
-- ※ reserved_at が事故発生時刻より後のもの
SELECT id, member_id, reserved_at
FROM reservations
WHERE event_id = '対象イベントID'
  AND reserved_at > '事故発生日時'::timestamptz
ORDER BY reserved_at;
```

### 4-3. 復旧対象（事故前）の予約をINSERTする

```sql
-- バックアップから事故前の予約レコードを挿入（ON CONFLICT DO NOTHINGで重複スキップ）
INSERT INTO reservations (id, tenant_id, event_id, member_id, status, reserved_at)
VALUES ('復旧ID', '対象テナント', '対象イベント', '会員ID', 'reserved', '事故前日時')
ON CONFLICT (id) DO NOTHING;
```

### 4-4. dead tupleスキャンによる補完（VACUUM前のみ有効）

事故直後（autovacuum実行前）にのみ有効。`recover_v3.cjs` を参照。

```powershell
cd C:\saas\backend
node recover_v3.cjs
# → dead tupleから削除済み予約レコードを復元
# 結果を bell_recovery_full.json に保存してから復元を実施
```

---

## 5. 2026-11-17 BELL事故の記録（参照用）

| 項目 | 内容 |
|------|------|
| 事故日時 | 2026-11-17（詳細時刻不明） |
| 影響テナント | tenant-001（BELL） |
| 消失したイベント | 12/01 (e43c2f1b), 12/23 (20eae236), 12/30 (1b017dcd) |
| dead tupleで確認した予約 | 13件（12/01×11, 12/23×2）|
| 事故前予約数（主張） | 12/01=28人, 12/23=19人 |
| 乖離の説明 | 技術的に判断不能（恒久ルール#10） |
| 現在のDB状態 | 復旧済み（12/01=17件, 12/23=7件） |
| 参照ファイル | `backend/bell_audit_report.json`, `backend/bell_recovery_full.json` |

---

## 6. バックアップの整合性確認

```powershell
# ファイルのSHA256確認
(Get-FileHash "C:\saas\backup\backup_full_YYYY-MM-DDTHH-MM-SS.sql" -Algorithm SHA256).Hash
# → バックアップ時に記録したSHA256と一致することを確認

# メタファイルでテーブル行数を確認
Get-Content "C:\saas\backup\backup_full_YYYY-MM-DDTHH-MM-SS.json" | ConvertFrom-Json | Select-Object timestamp, total_rows, sha256
```

---

## 7. 最新バックアップ（2026-11-18 取得済み）

| 項目 | 値 |
|------|-----|
| ファイル名 | `backup_full_2026-11-18T00-40-08.sql` |
| 取得日時 | 2026-11-18 09:40 JST |
| ファイルサイズ | 3,897,493 bytes (3.72 MB) |
| SHA256 | `2858cad8ba3f00eb9c2975eda455056a8d2a46a6430651e7806202a844032e7f` |
| 総行数 | 11,963行 |
| reservations | 1,188件 |
| events | 128件 |
| members | 784件 |
| tenants | 7件 |
| BELL 12/01予約 | 17件 |
| BELL 12/23予約 | 7件 |
