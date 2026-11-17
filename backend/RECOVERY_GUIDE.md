# COMIU 本番DB 復旧手順書

## バックアップ体制

| 種別 | 場所 | 取得タイミング | 保持期間 |
|---|---|---|---|
| クラウド日次バックアップ | Cloudflare R2 `daily/` | 毎日02:00 JST（GitHub Actions） | 30日 |
| クラウド月次バックアップ | Cloudflare R2 `monthly/` | 毎月1日（同上） | 12ヶ月 |
| ローカル変更前バックアップ | `C:\saas\backup\pgdump_*.sql.gz` | DB変更コマンド実行前（PreToolUseフック） | 手動削除まで |

バックアップファイルには個人情報・認証情報が含まれます。外部に公開しないでください。
クラウドバックアップはGPGで暗号化されています（`.sql.gz.gpg`）。

---

## セットアップ（初回のみ）

### 1. .env.backup の作成
```bash
cp /mnt/c/saas/backend/.env.backup.template /mnt/c/saas/backend/.env.backup
# .env.backup を編集して実際の接続情報とGPGパスフレーズを設定
```

### 2. GitHub Secrets の設定
GitHub > Settings > Secrets and variables > Actions で以下を設定:
- `PGBACKUP_DATABASE_URL` : Railway の DATABASE_URL
- `GPG_PASSPHRASE` : バックアップ暗号化パスフレーズ（強いランダム文字列）
- `R2_ACCESS_KEY_ID` : Cloudflare R2 Access Key ID
- `R2_SECRET_ACCESS_KEY` : Cloudflare R2 Secret Access Key
- `R2_BUCKET` : R2バケット名
- `R2_ENDPOINT` : `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

---

## 事故発生時の判断フロー

```
事故発生
 ↓
1. 直前バックアップファイルを確認（ローカルまたはR2）
 ↓
2. 事故内容の分類
   A. 誤UPDATE/DELETE（一部データ破損）→ 差分復旧（STEP 2）
   B. 大規模消失（複数テーブル）       → 別DB復元 → 差分マージ（STEP 3-4）
 ↓
3. 事故後に入った正常な予約の保護
   → 復旧作業前に現状スナップショットを取得（STEP 0）
```

---

## 復旧手順

### STEP 0：現状スナップショット取得（必須）

```bash
# 復旧作業開始前に必ず実行
wsl bash /mnt/c/saas/backend/pg_backup.sh
```

### STEP 1：バックアップの確認・チェックサム検証

```powershell
# ローカルバックアップ一覧
Get-ChildItem C:\saas\backup\pgdump_*.sql.gz | Sort-Object LastWriteTime -Descending | Select-Object -First 10 Name, LastWriteTime, Length
```

```bash
# メタ情報（取得時刻・SHA256）確認
cat /mnt/c/saas/backup/pgdump_20XXXXXX_XXXXXX.meta.json

# SHA256チェックサム検証
EXPECTED=$(python3 -c "import json; print(json.load(open('/mnt/c/saas/backup/pgdump_20XXXXXX_XXXXXX.meta.json'))['sha256'])")
ACTUAL=$(sha256sum /mnt/c/saas/backup/pgdump_20XXXXXX_XXXXXX.sql.gz | cut -d' ' -f1)
[ "$EXPECTED" = "$ACTUAL" ] && echo "CHECKSUM: OK" || echo "CHECKSUM: MISMATCH"
```

```bash
# R2から暗号化バックアップをダウンロードして複合（必要な場合）
# AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY を設定済みの場合:
aws s3 cp s3://<BUCKET>/daily/pgdump_XXXXXXXX_XXXXXX.sql.gz.gpg /tmp/backup.sql.gz.gpg \
  --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com
# 復号
gpg --batch --passphrase "<GPG_PASSPHRASE>" --output /tmp/backup.sql.gz --decrypt /tmp/backup.sql.gz.gpg
```

### STEP 2：差分復旧（誤UPDATE/DELETEの場合）

バックアップから対象テーブルの対象行だけを抽出して復元する。

```bash
# バックアップをWSLで展開して対象テーブルの内容を抽出
BACKUP="/mnt/c/saas/backup/pgdump_20XXXXXX_XXXXXX.sql.gz"
TABLE="reservations"
TENANT_ID="<tenant-id>"

zcat "$BACKUP" \
  | awk "/COPY public.${TABLE}/,/^\\\\\\./" \
  | grep "${TENANT_ID}" \
  > /tmp/recover_rows.txt

# 内容確認後、必要な行だけを本番DBに適用
# ※ 実行前にSTEP 0のスナップショットを取得済みであること
# ※ 本番DBへの適用は明示的な承認を得てから実施
```

### STEP 3：別DBへのフル復元（大規模消失の場合）

```bash
# Railway上に復元用DBを別途作成（Railwayダッシュボードから追加）
# その後、psqlで復元

RESTORE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway"

zcat /mnt/c/saas/backup/pgdump_20XXXXXX_XXXXXX.sql.gz \
  | PGSSLMODE=require psql "$RESTORE_URL"
```

### STEP 4：事故後の正常予約を失わない差分マージ

```sql
-- 1. 復元DBと本番DBで、事故後に追加されたreservationを特定
--    （事故発生時刻以降に created_at が入っているもの）
SELECT id, event_id, member_id, status, reserved_at
FROM reservations
WHERE reserved_at > '事故発生時刻'
  AND tenant_id = '<tenant-id>'
ORDER BY reserved_at;

-- 2. 復元DBには存在せず本番DBにある正常予約をINSERT
-- （行ごとに確認してからINSERT）
```

---

## 定期復元テスト（月1回推奨）

```bash
# WSL上のローカルPostgreSQLで復元テスト
wsl bash -c "
  sudo service postgresql start
  sudo -u postgres psql -c 'DROP DATABASE IF EXISTS comiu_restore_test;'
  sudo -u postgres psql -c 'CREATE DATABASE comiu_restore_test ENCODING UTF8;'
  LATEST=\$(ls -t /mnt/c/saas/backup/pgdump_*.sql.gz | head -1)
  zcat \"\$LATEST\" | sudo -u postgres psql comiu_restore_test
  sudo -u postgres psql comiu_restore_test -c '
    SELECT
      (SELECT COUNT(*) FROM tenants) AS tenants,
      (SELECT COUNT(*) FROM events) AS events,
      (SELECT COUNT(*) FROM reservations) AS reservations,
      (SELECT COUNT(*) FROM members) AS members;
  '
  sudo -u postgres psql -c 'DROP DATABASE comiu_restore_test;'
"
```

---

## PreToolUseフック（ローカル変更前保護）

以下のコマンド実行前に自動バックアップが実行されます:
- `psql` + `INSERT/UPDATE/DELETE/COMMIT/BEGIN` を含むコマンド
- `prisma migrate deploy` または `prisma migrate dev`
- `prisma db push`

フックの設定は `.claude/settings.local.json` にあります。

---

## 関連ファイル

| ファイル | 用途 |
|---|---|
| `backend/pg_backup.sh` | pg_dumpフルバックアップ（DDL込み・GPG暗号化対応） |
| `backend/pre_psql_backup.sh` | PreToolUseフック（DB変更前自動バックアップ） |
| `backend/.env.backup.template` | 接続情報テンプレート（Git管理） |
| `backend/.env.backup` | 実際の接続情報（.gitignore対象・Git管理外） |
| `.github/workflows/db-backup.yml` | GitHub Actions日次バックアップ（R2への暗号化保存） |
| `.claude/settings.local.json` | PreToolUseフック設定 |
| `backup/pgdump_*.sql.gz` | ローカルバックアップ本体（.gitignore対象） |
| `backup/pgdump_*.meta.json` | バックアップメタ情報（タイムスタンプ・SHA256） |
| `backup/pre_psql_backup.log` | フック実行ログ |

---

## PITRについて（Railway）

Railway PostgreSQLはPITR（Point-in-Time Recovery）をサポートしています。
- 有効化: サービスの Backups タブ > Enable PITR
- WALを継続的にアーカイブし、Railway Bucket に保存
- 分単位での復元が可能
- 費用: Bucket ストレージ料金のみ（追加料金なし）
- 注意: PITRはPro/Hobbyプランで利用可能（プラン確認推奨）
- 有効化後のWALのみ対象（過去に遡ることは不可）

**PITRを有効化することを強く推奨します。** 日次バックアップだけでは最大24時間のデータ損失が発生しえます。
