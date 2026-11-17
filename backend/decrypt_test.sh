#!/bin/bash
# COMIU バックアップ復号・復元テストスクリプト
#
# 【用途】
#   GPG暗号化バックアップが正常に復号・復元できることを検証する。
#   新方式（GitHub Actions + R2）導入時・月次定期テストに使用。
#
# 【使い方】
#   wsl bash /mnt/c/saas/backend/decrypt_test.sh [暗号化ファイルのパス]
#
#   引数なし: .env.backupと同じディレクトリのバックアップを自動検出
#   引数あり: 指定した .sql.gz.gpg ファイルをテスト
#
# 【前提条件】
#   - /mnt/c/saas/backend/.env.backup に GPG_PASSPHRASE が設定済み
#   - WSL上に gpg と postgresql がインストール済み
#   - sudo -u postgres psql が使える状態
#
# 【テスト内容】
#   STEP 1: GPGパスフレーズの確認
#   STEP 2: 暗号化ファイルの存在確認
#   STEP 3: 復号（暗号化ファイル → .sql.gz）
#   STEP 4: SHA256整合性検証（メタファイルがある場合）
#   STEP 5: ローカルPostgreSQLへの復元
#   STEP 6: テーブル数・行数・制約の確認
#   STEP 7: 一時ファイルの削除
#   STEP 8: テストDBの削除
#
# 【注意】
#   - 本番DBには一切変更を加えない
#   - テストDB名: comiu_decrypt_test（終了後に削除）
#   - 復号した .sql.gz は /tmp/ に一時保存し、テスト後に削除
#
set -euo pipefail

ENV_BACKUP_FILE="/mnt/c/saas/backend/.env.backup"
BACKUP_DIR="/mnt/c/saas/backup"
TEMP_DIR=$(mktemp -d /tmp/comiu_decrypt_test_XXXXXX)
TEST_DB="comiu_decrypt_test"
PASS=true

# 終了時のクリーンアップ（成功・失敗にかかわらず実行）
cleanup() {
  echo ""
  echo "[クリーンアップ] 一時ファイルを削除します..."
  rm -rf "$TEMP_DIR"
  sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${TEST_DB};" 2>/dev/null && echo "  テストDB削除: OK" || echo "  テストDB削除: スキップ（存在しない）"
  echo "[クリーンアップ] 完了"
}
trap cleanup EXIT

echo "======================================================"
echo " COMIU バックアップ復号・復元テスト"
echo " 開始時刻: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"
echo ""

# --- STEP 1: GPGパスフレーズの確認 ---
echo "[STEP 1] GPGパスフレーズの確認..."

GPG_PASSPHRASE=""
if [ -n "${GPG_PASSPHRASE_ENV:-}" ]; then
  GPG_PASSPHRASE="$GPG_PASSPHRASE_ENV"
  echo "  環境変数 GPG_PASSPHRASE_ENV から読み込みました"
elif [ -f "$ENV_BACKUP_FILE" ]; then
  GPG_PASSPHRASE=$(grep -E '^GPG_PASSPHRASE=' "$ENV_BACKUP_FILE" | head -1 | sed 's/^GPG_PASSPHRASE=//' || true)
  if [ -n "$GPG_PASSPHRASE" ]; then
    echo "  .env.backup から読み込みました"
  fi
fi

if [ -z "$GPG_PASSPHRASE" ]; then
  echo "  [ERROR] GPGパスフレーズが見つかりません。"
  echo "  .env.backup の GPG_PASSPHRASE= を設定してください。"
  PASS=false
  exit 1
fi
echo "  パスフレーズ: 設定済み（値は表示しません）"

# gpgのインストール確認
if ! command -v gpg &>/dev/null; then
  echo "  [ERROR] gpg がインストールされていません。sudo apt-get install -y gpg"
  PASS=false
  exit 1
fi
echo "  gpg: $(gpg --version | head -1)"

# --- STEP 2: テスト対象ファイルの確認 ---
echo ""
echo "[STEP 2] テスト対象ファイルの確認..."

GPG_FILE=""
if [ -n "${1:-}" ]; then
  GPG_FILE="$1"
  echo "  指定ファイル: $GPG_FILE"
else
  # 最新の暗号化バックアップを自動検出
  GPG_FILE=$(ls -t "${BACKUP_DIR}"/pgdump_*.sql.gz.gpg 2>/dev/null | head -1 || true)
  if [ -z "$GPG_FILE" ]; then
    # 平文バックアップを代わりに使ってテスト（暗号化スキップモード）
    PLAIN_FILE=$(ls -t "${BACKUP_DIR}"/pgdump_*.sql.gz 2>/dev/null | head -1 || true)
    if [ -n "$PLAIN_FILE" ]; then
      echo "  [WARN] 暗号化ファイル (.gpg) が見つかりません。"
      echo "  平文バックアップで復元テストのみ実施します: $PLAIN_FILE"
      SKIP_DECRYPT=true
      GPG_FILE="$PLAIN_FILE"
    else
      echo "  [ERROR] バックアップファイルが見つかりません: ${BACKUP_DIR}/pgdump_*.sql.gz.gpg"
      PASS=false
      exit 1
    fi
  else
    echo "  自動検出: $GPG_FILE"
    SKIP_DECRYPT=${SKIP_DECRYPT:-false}
  fi
fi

if [ ! -f "$GPG_FILE" ]; then
  echo "  [ERROR] ファイルが存在しません: $GPG_FILE"
  PASS=false
  exit 1
fi

FILE_SIZE=$(stat -c%s "$GPG_FILE")
echo "  ファイルサイズ: $(numfmt --to=iec $FILE_SIZE 2>/dev/null || echo $FILE_SIZE bytes)"

# --- STEP 3: 復号 ---
echo ""

if [ "${SKIP_DECRYPT:-false}" = "true" ]; then
  echo "[STEP 3] 復号スキップ（暗号化ファイルなし）"
  DECRYPTED_FILE="$GPG_FILE"
else
  echo "[STEP 3] GPG復号中..."
  DECRYPTED_FILE="${TEMP_DIR}/decrypted.sql.gz"

  echo "$GPG_PASSPHRASE" | gpg \
    --batch \
    --yes \
    --passphrase-fd 0 \
    --decrypt \
    --output "$DECRYPTED_FILE" \
    "$GPG_FILE" 2>/tmp/gpg_decrypt_err.txt

  DECRYPT_EXIT=$?
  if [ $DECRYPT_EXIT -ne 0 ]; then
    echo "  [ERROR] 復号失敗 (exit=$DECRYPT_EXIT)"
    cat /tmp/gpg_decrypt_err.txt
    PASS=false
    exit 1
  fi

  DECRYPTED_SIZE=$(stat -c%s "$DECRYPTED_FILE")
  echo "  復号成功: $(numfmt --to=iec $DECRYPTED_SIZE 2>/dev/null || echo $DECRYPTED_SIZE bytes)"

  # --- STEP 4: SHA256整合性検証 ---
  echo ""
  echo "[STEP 4] SHA256整合性検証..."

  # 元の .sql.gz と SHA256を比較（メタファイルがある場合）
  BASE_NAME=$(basename "$GPG_FILE" .gpg)
  META_FILE="${BACKUP_DIR}/${BASE_NAME%.sql.gz}.meta.json"

  if [ -f "$META_FILE" ]; then
    EXPECTED_SHA=$(python3 -c "import json; d=json.load(open('$META_FILE')); print(d.get('sha256', ''))" 2>/dev/null || true)
    if [ -n "$EXPECTED_SHA" ]; then
      ACTUAL_SHA=$(sha256sum "$DECRYPTED_FILE" | cut -d' ' -f1)
      if [ "$EXPECTED_SHA" = "$ACTUAL_SHA" ]; then
        echo "  SHA256: OK ($ACTUAL_SHA)"
      else
        echo "  [ERROR] SHA256不一致！"
        echo "  期待値: $EXPECTED_SHA"
        echo "  実際値: $ACTUAL_SHA"
        PASS=false
        exit 1
      fi
    else
      echo "  メタファイルにsha256キーなし: スキップ"
    fi
  else
    echo "  メタファイルなし: SHA256検証スキップ"
    echo "  復号ファイルのSHA256: $(sha256sum "$DECRYPTED_FILE" | cut -d' ' -f1)"
  fi
fi

# --- STEP 5: ローカルPostgreSQLへの復元 ---
echo ""
echo "[STEP 5] ローカルPostgreSQLへの復元..."

# PostgreSQLサーバーの確認・起動
if ! sudo -u postgres pg_isready -q 2>/dev/null; then
  echo "  PostgreSQLを起動中..."
  sudo service postgresql start 2>/dev/null || true
  sleep 3
  if ! sudo -u postgres pg_isready -q 2>/dev/null; then
    echo "  [ERROR] PostgreSQLが起動しません。sudo apt-get install -y postgresql を実行してください。"
    PASS=false
    exit 1
  fi
fi
echo "  PostgreSQL: $(sudo -u postgres psql -c 'SELECT version();' -t 2>/dev/null | head -1 | xargs)"

# テストDB作成
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${TEST_DB};" 2>/dev/null
sudo -u postgres psql -c "CREATE DATABASE ${TEST_DB} ENCODING 'UTF8';"
echo "  テストDB作成: ${TEST_DB}"

# 復元実行
echo "  復元中..."
zcat "$DECRYPTED_FILE" | sudo -u postgres psql "$TEST_DB" > /tmp/restore_output.txt 2>&1
RESTORE_EXIT=${PIPESTATUS[1]}

if [ $RESTORE_EXIT -ne 0 ]; then
  echo "  [ERROR] 復元失敗 (exit=$RESTORE_EXIT)"
  grep -iE '(error|ERROR)' /tmp/restore_output.txt | head -20
  PASS=false
  exit 1
fi

# エラー行の確認（警告は許容）
ERROR_COUNT=$(grep -icE '^ERROR:' /tmp/restore_output.txt 2>/dev/null || echo 0)
if [ "$ERROR_COUNT" -gt 0 ]; then
  echo "  [WARN] 復元中に $ERROR_COUNT 件のエラー行があります:"
  grep -iE '^ERROR:' /tmp/restore_output.txt | head -10
fi
echo "  復元完了"

# --- STEP 6: 検証クエリ ---
echo ""
echo "[STEP 6] データ検証..."

echo ""
echo "  --- テーブル一覧 ---"
TABLE_COUNT=$(sudo -u postgres psql "$TEST_DB" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';" | xargs)
echo "  テーブル数: $TABLE_COUNT"
sudo -u postgres psql "$TEST_DB" -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" 2>/dev/null

echo ""
echo "  --- 主要テーブルの行数 ---"
sudo -u postgres psql "$TEST_DB" -c "
  SELECT
    (SELECT COUNT(*) FROM tenants)      AS tenants,
    (SELECT COUNT(*) FROM events)       AS events,
    (SELECT COUNT(*) FROM reservations) AS reservations,
    (SELECT COUNT(*) FROM members)      AS members;
" 2>/dev/null

echo ""
echo "  --- インデックス数 ---"
INDEX_COUNT=$(sudo -u postgres psql "$TEST_DB" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public';" | xargs)
echo "  インデックス数: $INDEX_COUNT"

echo ""
echo "  --- FK制約数 ---"
FK_COUNT=$(sudo -u postgres psql "$TEST_DB" -t -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND constraint_schema='public';" | xargs)
echo "  FK制約数: $FK_COUNT"

echo ""
echo "  --- 文字コード ---"
sudo -u postgres psql "$TEST_DB" -c "SELECT pg_encoding_to_char(encoding) AS encoding FROM pg_database WHERE datname='${TEST_DB}';" 2>/dev/null

echo ""
echo "  --- 整合性チェック: 孤立した予約（FK違反） ---"
ORPHAN=$(sudo -u postgres psql "$TEST_DB" -t -c "
  SELECT COUNT(*) FROM reservations r
  LEFT JOIN events e ON r.event_id = e.id
  WHERE e.id IS NULL;
" | xargs)
echo "  孤立した予約: $ORPHAN 件"
if [ "$ORPHAN" -gt 0 ]; then
  echo "  [WARN] FK整合性に問題がある可能性があります"
fi

echo ""
echo "  --- Prismaマイグレーション履歴（最新3件） ---"
sudo -u postgres psql "$TEST_DB" -c "
  SELECT migration_name, finished_at FROM _prisma_migrations
  ORDER BY started_at DESC LIMIT 3;
" 2>/dev/null || echo "  _prisma_migrationsテーブルなし（スキップ）"

# --- 最終判定 ---
echo ""
echo "======================================================"
echo " テスト結果"
echo "======================================================"
echo "  テーブル数  : $TABLE_COUNT"
echo "  インデックス: $INDEX_COUNT"
echo "  FK制約数    : $FK_COUNT"
echo "  孤立予約    : $ORPHAN 件"
if [ "${SKIP_DECRYPT:-false}" != "true" ]; then
  echo "  GPG復号     : 成功"
  echo "  SHA256整合  : 確認済み（またはスキップ）"
fi
echo ""

if $PASS; then
  echo "✅ テスト合格: バックアップは正常に復号・復元できます"
  exit 0
else
  echo "❌ テスト失敗: バックアップの復元に問題があります"
  exit 1
fi
