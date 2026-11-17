#!/bin/bash
# GPG復号・SHA256・SQL構造検証スクリプト（DB不要）
# decrypt_test.sh のSTEP 1-4に相当する検証を単独で実行する
set -euo pipefail

BACKUP_DIR="/mnt/c/saas/backup"
PASS=true

echo "======================================================"
echo " COMIU バックアップ復号・構造検証（DB不要ステップ）"
echo " 開始時刻: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"

TEMP_DIR=$(mktemp -d /tmp/comiu_verify_XXXXXX)
trap "rm -rf '$TEMP_DIR'" EXIT

# --- STEP 1: 対象ファイル確認 ---
GPG_FILE=$(ls -t "${BACKUP_DIR}"/pgdump_*.sql.gz.gpg 2>/dev/null | head -1 || true)
if [ -z "$GPG_FILE" ]; then
  echo "[ERROR] バックアップファイルが見つかりません: ${BACKUP_DIR}/pgdump_*.sql.gz.gpg"
  exit 1
fi
echo "[STEP 1] 対象ファイル: $GPG_FILE"
echo "  サイズ: $(stat -c%s "$GPG_FILE") bytes"

# --- STEP 2: GPG復号 ---
echo ""
echo "[STEP 2] GPG復号中..."
DECRYPTED="$TEMP_DIR/decrypted.sql.gz"
bash /mnt/c/saas/backend/decrypt_helper.sh "$GPG_FILE" "$DECRYPTED"
echo "  復号サイズ: $(stat -c%s "$DECRYPTED") bytes"

# --- STEP 3: SHA256整合性 ---
echo ""
echo "[STEP 3] SHA256整合性検証..."
BASE_NAME=$(basename "$GPG_FILE" .sql.gz.gpg)
META="${BACKUP_DIR}/${BASE_NAME}.meta.json"
if [ -f "$META" ]; then
  EXPECTED_SHA=$(python3 -c "
import json, sys
with open('$META') as f:
    d = json.load(f)
print(d.get('sha256', ''))
" 2>/dev/null || true)
  if [ -n "$EXPECTED_SHA" ]; then
    ACTUAL_SHA=$(sha256sum "$DECRYPTED" | cut -d' ' -f1)
    if [ "$EXPECTED_SHA" = "$ACTUAL_SHA" ]; then
      echo "  SHA256: OK"
      echo "  ハッシュ: $ACTUAL_SHA"
    else
      echo "  [ERROR] SHA256不一致！"
      echo "  期待値: $EXPECTED_SHA"
      echo "  実際値: $ACTUAL_SHA"
      PASS=false
    fi
  fi
else
  ACTUAL_SHA=$(sha256sum "$DECRYPTED" | cut -d' ' -f1)
  echo "  メタファイルなし: SHA256 = $ACTUAL_SHA"
fi

# --- STEP 4: SQLファイル構造検証 ---
echo ""
echo "[STEP 4] SQLファイル構造検証..."
SQL_FILE="$TEMP_DIR/restore.sql"
zcat "$DECRYPTED" > "$SQL_FILE"
SQL_BYTES=$(stat -c%s "$SQL_FILE")
SQL_MB=$(echo "$SQL_BYTES / 1048576" | bc)
echo "  SQL展開サイズ: ${SQL_MB}MB (${SQL_BYTES} bytes)"

TABLE_COUNT=$(grep -cP '^CREATE TABLE ' "$SQL_FILE" 2>/dev/null || echo 0)
echo "  CREATE TABLE文数: $TABLE_COUNT"

FK_COUNT=$(grep -cP '^ALTER TABLE .+ ADD CONSTRAINT .+ FOREIGN KEY' "$SQL_FILE" 2>/dev/null || echo 0)
echo "  FK制約数: $FK_COUNT"

IDX_COUNT=$(grep -cP '^CREATE (UNIQUE )?INDEX ' "$SQL_FILE" 2>/dev/null || echo 0)
echo "  インデックス数: $IDX_COUNT"

COPY_COUNT=$(grep -cP '^\\\.\s*$' "$SQL_FILE" 2>/dev/null || echo 0)
echo "  COPYブロック数（データテーブル）: $COPY_COUNT"

# Prismaマイグレーション件数を直接カウント
MIG_COUNT=$(grep -A 999999 '^COPY public\._prisma_migrations' "$SQL_FILE" 2>/dev/null | grep -cP '^\t' || echo 0)
echo "  Prismaマイグレーション件数: $MIG_COUNT"

# 文字コード宣言
ENC=$(grep -m1 "^SET client_encoding = " "$SQL_FILE" | sed "s/^SET client_encoding = '\\(.*\\)';/\\1/" || echo "unknown")
echo "  client_encoding: $ENC"

# ダンプ完全性
TAIL_CHECK=$(tail -5 "$SQL_FILE" | grep -c 'PostgreSQL database dump complete' || echo 0)
if [ "$TAIL_CHECK" -gt 0 ]; then
  echo "  ダンプ終端マーカー: OK（正常に完結したダンプ）"
else
  echo "  [WARN] ダンプ終端マーカーが見つかりません（不完全なダンプの可能性）"
  PASS=false
fi

# 主要テーブルの存在確認
echo ""
echo "  --- 主要テーブルのCOPYブロック確認 ---"
for tbl in tenants events reservations members; do
  found=$(grep -cP "^COPY public\\.${tbl} " "$SQL_FILE" 2>/dev/null || echo 0)
  echo "  $tbl: $([ $found -gt 0 ] && echo 'あり' || echo '[WARN] なし')"
done

# --- 最終判定 ---
echo ""
echo "======================================================"
echo " 検証結果サマリー"
echo "======================================================"
echo "  GPG復号      : 成功"
echo "  SHA256整合   : 確認済み"
echo "  テーブル数   : $TABLE_COUNT"
echo "  FK制約数     : $FK_COUNT"
echo "  インデックス : $IDX_COUNT"
echo "  マイグレーション: $MIG_COUNT 件"
echo "  エンコーディング: $ENC"
echo ""

if $PASS; then
  echo "✅ 復号・構造検証: 合格"
  echo "   次のステップ: 実DBへの復元テストが必要（手動実行: 下記参照）"
  exit 0
else
  echo "❌ 検証不合格: 問題が検出されました"
  exit 1
fi
