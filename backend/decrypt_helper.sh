#!/bin/bash
# GPG復号ヘルパースクリプト（decrypt_test_windows.ps1から呼ばれる）
# パスフレーズをコマンドライン引数に渡さず、.env.backupから直接読み込む
#
# 使い方:
#   wsl bash /mnt/c/saas/backend/decrypt_helper.sh <input.gpg> <output.gz>
#
# 【安全設計】
#   - パスフレーズは .env.backup から読み込む（引数・環境変数・標準出力に出ない）
#   - --passphrase-fd 0 でstdinから読み込む（プロセスリストに表示されない）
#
set -euo pipefail

GPG_INPUT="$1"
GPG_OUTPUT="$2"
ENV_BACKUP="/mnt/c/saas/backend/.env.backup"

if [ ! -f "$ENV_BACKUP" ]; then
  echo "[ERROR] .env.backup が見つかりません: $ENV_BACKUP" >&2
  exit 1
fi

GPG_PASSPHRASE=$(grep -E '^GPG_PASSPHRASE=' "$ENV_BACKUP" | head -1 | sed 's/^GPG_PASSPHRASE=//')

if [ -z "$GPG_PASSPHRASE" ]; then
  echo "[ERROR] GPG_PASSPHRASEが.env.backupに設定されていません" >&2
  exit 1
fi

echo "$GPG_PASSPHRASE" | gpg \
  --batch \
  --yes \
  --passphrase-fd 0 \
  --decrypt \
  --output "$GPG_OUTPUT" \
  "$GPG_INPUT" 2>&1

echo "GPG_DECRYPT_OK"
