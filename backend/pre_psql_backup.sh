#!/bin/bash
# PreToolUseフック：DB変更操作の前に自動バックアップ
#
# Claude CodeのPreToolUseフックから呼ばれる。
# stdin に {"tool_name":"Bash","tool_input":{"command":"..."}} が渡される。
#
# 以下のいずれかに該当するコマンドが実行される場合、バックアップを取得する:
#   - psql コマンドかつ INSERT/UPDATE/DELETE/COMMIT/BEGIN を含む
#   - prisma migrate deploy / prisma migrate dev を含む
#   - prisma db push を含む
#
# バックアップ失敗時は {"continue": false} を返してコマンドをブロックする。
#
set -euo pipefail

# stdinからコマンド文字列を取得
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('tool_input', {}).get('command', ''))
" 2>/dev/null || echo "")

# バックアップが必要かどうかを判定
NEEDS_BACKUP=false

# psqlコマンドかつ書き込み操作
if echo "$COMMAND" | grep -qi "psql" && echo "$COMMAND" | grep -qiE "(INSERT|UPDATE|DELETE|COMMIT|BEGIN)"; then
  NEEDS_BACKUP=true
fi

# Prisma migrate deploy / prisma migrate dev
if echo "$COMMAND" | grep -qiE "prisma migrate (deploy|dev)"; then
  NEEDS_BACKUP=true
fi

# prisma db push
if echo "$COMMAND" | grep -qi "prisma db push"; then
  NEEDS_BACKUP=true
fi

if $NEEDS_BACKUP; then
  LOG="/mnt/c/saas/backup/pre_psql_backup.log"
  mkdir -p /mnt/c/saas/backup

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] DB変更操作を検知。バックアップを開始します..." >> "$LOG"
  echo "  コマンド: $(echo "$COMMAND" | head -c 200)" >> "$LOG"

  # バックアップ実行
  if bash /mnt/c/saas/backend/pg_backup.sh >> "$LOG" 2>&1; then
    LATEST=$(ls -t /mnt/c/saas/backup/pgdump_*.sql.gz 2>/dev/null | head -1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] バックアップ成功: $LATEST" >> "$LOG"
    # 続行を許可
    echo '{"continue": true, "hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": "DB変更前バックアップ完了: '"$LATEST"'"}}'
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] バックアップ失敗。コマンドをブロックします。" >> "$LOG"
    # バックアップ失敗時はブロック
    echo '{"continue": false, "stopReason": "DB変更前の自動バックアップが失敗しました。c:\\saas\\backup\\pre_psql_backup.log を確認してください。バックアップなしの書き込みは禁止されています。"}'
  fi
else
  # 対象外のコマンドは何も出力せず続行
  exit 0
fi
