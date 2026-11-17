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

### 1. GPGパスフレーズの生成と保管

**⚠️ 最重要: パスフレーズを紛失するとバックアップが永久に復元不能になります。**

#### パスフレーズの生成
```bash
# 十分にランダムなパスフレーズを生成する（例）
wsl bash -c "openssl rand -base64 32"
# または
wsl bash -c "cat /dev/urandom | tr -dc 'A-Za-z0-9!@#%^&*' | head -c 40; echo"
```

生成した値は**絶対にチャット・ターミナルログ・GitHubに貼り付けない**でください。

#### パスフレーズの三重保管（必須）

| 保管場所 | 方法 | 目的 |
|---|---|---|
| **1. パスワードマネージャー** | Bitwarden（無料）/ 1Password 等に「COMIU GPG Backup Passphrase」として保存 | 日常的な参照・復旧 |
| **2. ローカル `.env.backup`** | `C:\saas\backend\.env.backup` の `GPG_PASSPHRASE=` 行 | ローカルバックアップ・手動復号 |
| **3. GitHub Secrets** | `GPG_PASSPHRASE` Secret | GitHub Actions による自動バックアップ |

> **推奨**: さらに印刷または手書きで物理的な安全な場所（鍵のかかる引き出し等）に保管。

**保管確認チェックリスト（セットアップ後に必ず実施）:**
- [ ] パスワードマネージャーで参照できることを確認
- [ ] `.env.backup` から手動で復号できることを確認（後述の復号テスト参照）
- [ ] GitHub Secrets に設定済みであることを確認

### 2. .env.backup の作成
```bash
cp /mnt/c/saas/backend/.env.backup.template /mnt/c/saas/backend/.env.backup
# .env.backup を編集して実際の接続情報とGPGパスフレーズを設定
# （生成したパスフレーズをGPG_PASSPHRASE= の行に設定する）
```

### 3. GitHub Secrets の設定
GitHub > Settings > Secrets and variables > Actions で以下を設定:
- `PGBACKUP_DATABASE_URL` : Railway の DATABASE_URL
- `GPG_PASSPHRASE` : バックアップ暗号化パスフレーズ（生成した値）
- `R2_ACCESS_KEY_ID` : Cloudflare R2 Access Key ID
- `R2_SECRET_ACCESS_KEY` : Cloudflare R2 Secret Access Key
- `R2_BUCKET` : R2バケット名
- `R2_ENDPOINT` : `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

### 4. 初回の暗号化・復号・復元テスト（必須）

**新方式のバックアップが正常に復元できることを確認してから、旧方式のバックアップを削除してください。**

```bash
# ローカル復号テストスクリプトを実行
wsl bash /mnt/c/saas/backend/decrypt_test.sh
```

詳細は「暗号化バックアップの復号テスト」セクションを参照。

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

## 暗号化バックアップの復号テスト

GPG暗号化バックアップが実際に復号・復元できるかを確認するテストです。
新方式（GitHub Actions + R2）を導入したら必ず実施してください。

```bash
# decrypt_test.sh を使って一括テスト
wsl bash /mnt/c/saas/backend/decrypt_test.sh /path/to/pgdump_YYYYMMDD_HHMMSS.sql.gz.gpg
```

このスクリプトは以下を行います:
1. `.env.backup` からGPGパスフレーズを読み込む
2. 暗号化ファイルを復号して `.sql.gz` を生成
3. SHA256で整合性を検証（メタファイルがある場合）
4. ローカルPostgreSQLに復元
5. テーブル数・行数・制約を確認
6. テストDBを削除
7. 一時ファイル（復号した `.sql.gz`）を削除

**いずれかのステップが失敗した場合は、バックアップは復元不能と判断してください。**

---

## 鍵紛失・障害発生時の緊急復旧手順

### ケース1: GPGパスフレーズを忘れた / 紛失した

**復号は不可能です。** 以下の順序で代替を探してください:

1. パスワードマネージャー（Bitwarden等）を確認
2. `.env.backup` ファイルを確認: `cat /mnt/c/saas/backend/.env.backup | grep GPG_PASSPHRASE`
3. 物理的な保管場所（印刷・手書きメモ）を確認
4. GitHub Secrets は**読み取りできない**（設定した値を確認する方法はない）

**どこにも残っていない場合:**
- 暗号化バックアップからの復元は不可能
- ローカルの平文バックアップ（`C:\saas\backup\pgdump_*.sql.gz`）があれば平文から復元できる
- 今後のバックアップ用に新しいパスフレーズを生成し、全保管場所を更新する

### ケース2: GitHubアカウントが使えなくなった / GitHub Actionsが止まった

GitHub Actionsが停止しても、以下で対応できます:

1. **R2に保存済みのバックアップは引き続きアクセス可能**（R2の認証情報でアクセス）
2. **ローカルバックアップ**（`C:\saas\backup\`）から復元可能
3. **新しいGitHubリポジトリ**に `.github/workflows/db-backup.yml` をコピーして再設定
4. 緊急時: WSLで手動バックアップ `wsl bash /mnt/c/saas/backend/pg_backup.sh`

### ケース3: Windows PCが故障した

**ローカルバックアップは失われます。** R2のクラウドバックアップのみ残ります。

復旧手順:
1. 新しいPCにWSLをインストール
2. GitHubからリポジトリをクローン
3. パスワードマネージャーからGPGパスフレーズを取得
4. `.env.backup` を再作成（Railway DashboardでDATABASE_URLを確認）
5. R2から最新の暗号化バックアップをダウンロード
6. `wsl bash /mnt/c/saas/backend/decrypt_test.sh <ダウンロードしたファイル>` で復元

### ケース4: Cloudflare R2が使えなくなった

1. ローカルバックアップ（`C:\saas\backup\`）から復元
2. R2に代わるストレージへの移行: Backblaze B2、AWS S3等
3. `.github/workflows/db-backup.yml` のアップロード先を変更

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
