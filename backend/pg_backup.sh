#!/bin/bash
# COMIU 本番DB pg_dump フルバックアップ
#
# 【用途】
#   DDL（CREATE TABLE・インデックス・シーケンス）＋全データを取得する。
#
# 【接続情報の取得順序】
#   1. 環境変数 PGBACKUP_DATABASE_URL
#   2. c:\saas\backend\.env.backup ファイル（git 管理外）
#   どちらも未設定の場合はエラー終了。
#
# 【出力先】
#   $BACKUP_DIR/pgdump_YYYYMMDD_HHMMSS.sql.gz      平文（gzip）
#   $BACKUP_DIR/pgdump_YYYYMMDD_HHMMSS.sql.gz.gpg  暗号化（GPG_PASSPHRASE が設定されている場合）
#
# 【実行方法】
#   wsl bash /mnt/c/saas/backend/pg_backup.sh
#
# 【個人情報について】
#   出力ファイルには全会員の個人情報・認証情報が含まれます。
#   backup/ ディレクトリは .gitignore 対象です。外部に公開しないでください。
#
set -euo pipefail

ENV_BACKUP_FILE="/mnt/c/saas/backend/.env.backup"

# --- 接続情報の読み込み ---
# 環境変数が未設定なら .env.backup から読み込む
if [ -z "${PGBACKUP_DATABASE_URL:-}" ]; then
  if [ ! -f "$ENV_BACKUP_FILE" ]; then
    echo "[ERROR] PGBACKUP_DATABASE_URL が未設定で、$ENV_BACKUP_FILE も見つかりません。" >&2
    echo "[ERROR] $ENV_BACKUP_FILE.template をコピーして .env.backup を作成してください。" >&2
    exit 1
  fi
  # .env.backup から PGBACKUP_DATABASE_URL を読み込む（コメント行・空行を無視）
  PGBACKUP_DATABASE_URL=$(grep -E '^PGBACKUP_DATABASE_URL=' "$ENV_BACKUP_FILE" | head -1 | sed 's/^PGBACKUP_DATABASE_URL=//')
  if [ -z "$PGBACKUP_DATABASE_URL" ]; then
    echo "[ERROR] $ENV_BACKUP_FILE に PGBACKUP_DATABASE_URL が設定されていません。" >&2
    exit 1
  fi
fi

# --- GPGパスフレーズの読み込み ---
if [ -z "${GPG_PASSPHRASE:-}" ] && [ -f "$ENV_BACKUP_FILE" ]; then
  GPG_PASSPHRASE=$(grep -E '^GPG_PASSPHRASE=' "$ENV_BACKUP_FILE" | head -1 | sed 's/^GPG_PASSPHRASE=//' || true)
fi

# --- 出力ディレクトリの読み込み ---
BACKUP_DIR="${BACKUP_DIR:-}"
if [ -z "$BACKUP_DIR" ] && [ -f "$ENV_BACKUP_FILE" ]; then
  BACKUP_DIR=$(grep -E '^BACKUP_DIR=' "$ENV_BACKUP_FILE" | head -1 | sed 's/^BACKUP_DIR=//' || true)
fi
BACKUP_DIR="${BACKUP_DIR:-/mnt/c/saas/backup}"

mkdir -p "$BACKUP_DIR"

# --- URLから接続情報を分解（パスワードをコマンド引数に残さない）---
DB_URL_PARSED=$(python3 - <<PYEOF
import urllib.parse, sys
u = urllib.parse.urlparse("${PGBACKUP_DATABASE_URL}")
print(u.hostname or '')
print(str(u.port or 5432))
print(u.username or '')
print(u.path.lstrip('/') or 'railway')
print(u.password or '')
PYEOF
)

HOST=$(echo "$DB_URL_PARSED" | sed -n '1p')
PORT=$(echo "$DB_URL_PARSED" | sed -n '2p')
USER=$(echo "$DB_URL_PARSED" | sed -n '3p')
DB=$(echo "$DB_URL_PARSED" | sed -n '4p')
PW=$(echo "$DB_URL_PARSED" | sed -n '5p')

if [ -z "$PW" ] || [ -z "$HOST" ]; then
  echo "[ERROR] PGBACKUP_DATABASE_URL から接続情報を解析できませんでした。" >&2
  exit 1
fi

# --- 出力ファイルパス ---
TS=$(date +%Y%m%d_%H%M%S)
OUT_FILE="${BACKUP_DIR}/pgdump_${TS}.sql.gz"
META_FILE="${BACKUP_DIR}/pgdump_${TS}.meta.json"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] バックアップ開始: ${OUT_FILE}"

# --- pg_dump 実行（plain SQL + gzip圧縮）---
# --no-password: pgpasswd不使用（PGPASSWORD経由）
# --format=plain: SQL形式（可読性・互換性優先）
# --no-owner: 復元時のオーナー設定をスキップ（Railway環境差異を吸収）
# --no-privileges: 権限設定をスキップ
PGPASSWORD="$PW" PGSSLMODE=require pg_dump \
  --host="$HOST" \
  --port="$PORT" \
  --username="$USER" \
  --dbname="$DB" \
  --no-password \
  --format=plain \
  --no-owner \
  --no-privileges \
  --schema=public \
  2>/tmp/pg_backup_err.txt \
  | gzip -9 > "$OUT_FILE"

DUMP_EXIT=${PIPESTATUS[0]}

if [ $DUMP_EXIT -ne 0 ]; then
  echo "[ERROR] pg_dump 失敗 (exit=$DUMP_EXIT)" >&2
  cat /tmp/pg_backup_err.txt >&2
  rm -f "$OUT_FILE"
  exit 1
fi

# pg_dumpのstderr確認（WARNINGが出ることがある）
if [ -s /tmp/pg_backup_err.txt ]; then
  echo "[WARN] pg_dump stderr:"
  cat /tmp/pg_backup_err.txt
fi

# --- SHA256チェックサム計算 ---
FILE_SIZE=$(stat -c%s "$OUT_FILE" 2>/dev/null || stat -f%z "$OUT_FILE")
SHA256=$(sha256sum "$OUT_FILE" | cut -d' ' -f1)

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 平文バックアップ完了: $(numfmt --to=iec ${FILE_SIZE} 2>/dev/null || echo ${FILE_SIZE} bytes)"

# --- GPG暗号化 ---
GPG_FILE=""
GPG_SHA256=""
GPG_SIZE=0
ENCRYPTED=false

if command -v gpg &>/dev/null; then
  if [ -n "${GPG_PASSPHRASE:-}" ]; then
    GPG_FILE="${OUT_FILE}.gpg"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] GPG暗号化中..."
    echo "$GPG_PASSPHRASE" | gpg \
      --batch \
      --yes \
      --passphrase-fd 0 \
      --symmetric \
      --cipher-algo AES256 \
      --compress-algo none \
      --output "$GPG_FILE" \
      "$OUT_FILE"
    GPG_SIZE=$(stat -c%s "$GPG_FILE" 2>/dev/null || stat -f%z "$GPG_FILE")
    GPG_SHA256=$(sha256sum "$GPG_FILE" | cut -d' ' -f1)
    ENCRYPTED=true
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] GPG暗号化完了: ${GPG_FILE}"
  else
    echo "[WARN] GPG_PASSPHRASE が未設定のため暗号化をスキップします。"
  fi
else
  echo "[WARN] gpg が見つかりません。暗号化をスキップします。WSLで: sudo apt-get install -y gpg"
fi

# --- メタ情報出力 ---
cat > "$META_FILE" <<JSON
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "file": "pgdump_${TS}.sql.gz",
  "file_size_bytes": ${FILE_SIZE},
  "sha256": "${SHA256}",
  "encrypted": ${ENCRYPTED},
  "gpg_file": "${GPG_FILE}",
  "gpg_sha256": "${GPG_SHA256}",
  "gpg_size_bytes": ${GPG_SIZE},
  "host": "${HOST}",
  "port": "${PORT}",
  "db": "${DB}",
  "format": "plain+gzip",
  "note": "DDL・インデックス・シーケンス・全データ含む。個人情報含む。外部公開禁止。"
}
JSON

echo "[$(date '+%Y-%m-%d %H:%M:%S')] バックアップ完了"
echo "  平文ファイル: ${OUT_FILE}"
echo "  SHA-256     : ${SHA256}"
if $ENCRYPTED; then
  echo "  暗号化ファイル: ${GPG_FILE}"
  echo "  GPG SHA-256 : ${GPG_SHA256}"
fi
echo "  メタ        : ${META_FILE}"
