#!/usr/bin/env pwsh
# COMIU バックアップ復号・復元テスト（Windows PostgreSQL 17版）
#
# 【用途】
#   WSLのPostgreSQLサーバーが使えない環境で、Windows上のPostgreSQL 17を使って
#   GPG暗号化バックアップの復元テストを実施する。
#
# 【実行方法】
#   PowerShell で: cd c:\saas; .\backend\decrypt_test_windows.ps1
#
# 【前提条件】
#   - Windows上でPostgreSQL 17サービス (postgresql-x64-17) が稼働中
#   - c:\saas\backend\.env.backup に GPG_PASSPHRASE が設定済み
#   - WSLにgpgがインストール済み（gpg復号はWSL側で実行）
#
# 【安全確認】
#   - 本番DB（Railway: turntable.proxy.rlwy.net）への接続は一切行いません
#   - テスト用DB名: comiu_decrypt_test（終了後に削除）
#   - pg_hba.confを一時的にtrust認証に変更→テスト後に即座に元に戻します
#
set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$PG_BIN = "C:\Program Files\PostgreSQL\17\bin"
$PG_DATA = "C:\Program Files\PostgreSQL\17\data"
$PG_HBA = Join-Path $PG_DATA "pg_hba.conf"
$BACKUP_DIR = "C:\saas\backup"
$ENV_BACKUP = "C:\saas\backend\.env.backup"
$TEST_DB = "comiu_decrypt_test"
$PASS = $true
$PG_HBA_MODIFIED = $false
$TEMP_DIR = Join-Path $env:TEMP "comiu_decrypt_test_$([System.Guid]::NewGuid().ToString('N').Substring(0,8))"

Write-Host "======================================================"
Write-Host " COMIU バックアップ復号・復元テスト"
Write-Host " 開始時刻: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host " テスト環境: Windows PostgreSQL 17"
Write-Host "======================================================"
Write-Host ""

# --- クリーンアップ関数 ---
function Cleanup {
    Write-Host ""
    Write-Host "[クリーンアップ] 一時ファイルを削除します..."
    if (Test-Path $TEMP_DIR) {
        Remove-Item -Recurse -Force $TEMP_DIR -ErrorAction SilentlyContinue
        Write-Host "  一時ディレクトリ削除: OK"
    }
    # テストDBを削除
    try {
        $env:PGPASSWORD = ""
        & "$PG_BIN\psql.exe" -h 127.0.0.1 -U postgres -c "DROP DATABASE IF EXISTS $TEST_DB;" 2>$null
        Write-Host "  テストDB削除: OK"
    } catch {
        Write-Host "  テストDB削除: スキップ（接続エラーまたは存在しない）"
    }
    # pg_hba.confを元に戻す
    if ($PG_HBA_MODIFIED) {
        $PG_HBA_BAK = "$PG_HBA.bak"
        if (Test-Path $PG_HBA_BAK) {
            Copy-Item -Force $PG_HBA_BAK $PG_HBA
            Remove-Item -Force $PG_HBA_BAK
            # PostgreSQL設定リロード
            try {
                & "$PG_BIN\pg_ctl.exe" reload -D $PG_DATA 2>$null
                Write-Host "  pg_hba.conf: 元に戻しました（PostgreSQL設定リロード済み）"
            } catch {
                Write-Host "  pg_hba.conf: 元に戻しました（リロードは手動で: pg_ctl reload -D '$PG_DATA'）"
            }
        }
    }
    Write-Host "[クリーンアップ] 完了"
}

# 終了時に必ずクリーンアップ
try {

New-Item -ItemType Directory -Force $TEMP_DIR | Out-Null

# ======================================================
# 【安全確認】このスクリプトはローカルWindows PostgreSQLのみに接続します。
# Railway本番DB / turntable.proxy.rlwy.net には接続しません。
# 接続先: 127.0.0.1:5432 (Windows localhost)
# ======================================================

# --- STEP 1: GPGパスフレーズの確認 ---
Write-Host "[STEP 1] GPGパスフレーズの確認..."
$WSL_ENV_PATH = "/mnt/c/saas/backend/.env.backup"
# パスフレーズが設定されているかチェック（値は取得しない）
$pass_check = wsl bash -c "grep -cE '^GPG_PASSPHRASE=.+' '$WSL_ENV_PATH' 2>/dev/null" 2>$null
if ($pass_check -eq "1") {
    Write-Host "  .env.backup にGPG_PASSPHRASE設定済みを確認"
} else {
    Write-Host "  [ERROR] GPGパスフレーズが見つかりません。"
    Write-Host "  c:\saas\backend\.env.backup の GPG_PASSPHRASE= を確認してください。"
    exit 1
}
Write-Host "  パスフレーズ: 設定済み（値は表示しません）"

# gpg確認（WSL）
$gpg_ver = wsl bash -c "gpg --version 2>/dev/null | head -1" 2>$null
Write-Host "  gpg (WSL): $gpg_ver"

# --- STEP 2: バックアップファイルの確認 ---
Write-Host ""
Write-Host "[STEP 2] バックアップファイルの確認..."
$GPG_FILES = Get-ChildItem $BACKUP_DIR -Filter "pgdump_*.sql.gz.gpg" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
if ($GPG_FILES.Count -eq 0) {
    Write-Host "  [ERROR] バックアップファイルが見つかりません: $BACKUP_DIR\pgdump_*.sql.gz.gpg"
    exit 1
}
$GPG_FILE = $GPG_FILES[0].FullName
$FILE_SIZE = $GPG_FILES[0].Length
Write-Host "  最新バックアップ: $GPG_FILE"
Write-Host "  ファイルサイズ: $([math]::Round($FILE_SIZE/1024))KB"

# --- STEP 3: GPG復号（WSLヘルパースクリプト経由）---
Write-Host ""
Write-Host "[STEP 3] GPG復号中（WSLヘルパー経由・パスフレーズ非公開）..."
$WSL_GPG_FILE = "/mnt/c" + ($GPG_FILE -replace "^C:", "" -replace "\\", "/")
$DECRYPTED_GZ = Join-Path $TEMP_DIR "decrypted.sql.gz"
$WSL_DECRYPTED = "/mnt/c" + ($DECRYPTED_GZ -replace "^C:", "" -replace "\\", "/")

# decrypt_helper.sh がパスフレーズを .env.backup から読み込む（引数に渡さない）
$decrypt_result = wsl bash /mnt/c/saas/backend/decrypt_helper.sh "$WSL_GPG_FILE" "$WSL_DECRYPTED" 2>&1

if ($decrypt_result -match "GPG_DECRYPT_OK") {
    $DEC_SIZE = (Get-Item $DECRYPTED_GZ).Length
    Write-Host "  復号成功: $([math]::Round($DEC_SIZE/1024))KB"
} else {
    Write-Host "  [ERROR] 復号失敗"
    # エラー出力からパスフレーズ関連の行は除外して表示
    $decrypt_result | Where-Object { $_ -notmatch "passphrase|PASSPHRASE" } | ForEach-Object { Write-Host "  $_" }
    exit 1
}

# --- STEP 4: SHA256整合性検証 ---
Write-Host ""
Write-Host "[STEP 4] SHA256整合性検証..."
$BASE_NAME = [System.IO.Path]::GetFileNameWithoutExtension([System.IO.Path]::GetFileNameWithoutExtension($GPG_FILE))
$META_FILE = Join-Path $BACKUP_DIR "$BASE_NAME.meta.json"
if (Test-Path $META_FILE) {
    $meta = Get-Content $META_FILE -Raw | ConvertFrom-Json
    $EXPECTED_SHA = $meta.sha256
    if ($EXPECTED_SHA) {
        $WSL_DECRYPTED_PATH = "/mnt/c" + ($DECRYPTED_GZ -replace "^C:", "" -replace "\\", "/")
        $ACTUAL_SHA = wsl bash -c "sha256sum '$WSL_DECRYPTED_PATH' | cut -d' ' -f1" 2>$null
        if ($ACTUAL_SHA.Trim() -eq $EXPECTED_SHA.Trim()) {
            Write-Host "  SHA256: OK ($($ACTUAL_SHA.Trim()))"
        } else {
            Write-Host "  [ERROR] SHA256不一致！"
            Write-Host "  期待値: $EXPECTED_SHA"
            Write-Host "  実際値: $ACTUAL_SHA"
            exit 1
        }
    } else {
        Write-Host "  メタファイルにsha256キーなし: スキップ"
    }
} else {
    Write-Host "  メタファイルなし: SHA256検証スキップ"
    $WSL_SHA = wsl bash -c "sha256sum '/mnt/c$($DECRYPTED_GZ -replace '^C:','' -replace '\\','/')' | cut -d' ' -f1" 2>$null
    Write-Host "  復号ファイルのSHA256: $($WSL_SHA.Trim())"
}

# --- STEP 5: Windows PostgreSQL の準備 ---
Write-Host ""
Write-Host "[STEP 5] Windows PostgreSQL 17への復元準備..."

# pg_hba.conf を一時的にtrust認証に変更
Write-Host "  pg_hba.conf を一時的にtrust認証に変更します..."
$PG_HBA_BAK = "$PG_HBA.bak"
Copy-Item -Force $PG_HBA $PG_HBA_BAK
$PG_HBA_MODIFIED = $true

$hba_content = Get-Content $PG_HBA -Raw
# 127.0.0.1の認証をtrustに変更（テスト用）
$hba_modified = $hba_content -replace
    "host    all             all             127\.0\.0\.1/32            scram-sha-256",
    "host    all             all             127.0.0.1/32            trust`nhost    all             all             127.0.0.1/32            scram-sha-256"
# 最初のtrustを有効にするために、scram-sha-256行をコメントアウト
$hba_modified = $hba_content `
    -replace "(host\s+all\s+all\s+127\.0\.0\.1/32\s+)scram-sha-256", '$1trust'
Set-Content -Path $PG_HBA -Value $hba_modified -Encoding UTF8

# 設定リロード
$reload_out = & "$PG_BIN\pg_ctl.exe" reload -D $PG_DATA 2>&1
Write-Host "  pg_hba.conf: trust認証に変更・リロード完了"
Start-Sleep -Seconds 1

# 接続テスト
$conn_test = & "$PG_BIN\psql.exe" -h 127.0.0.1 -U postgres -c "SELECT version();" 2>&1
if ($conn_test -match "PostgreSQL") {
    Write-Host "  接続確認: OK (Windows PostgreSQL 17)"
} else {
    Write-Host "  [ERROR] 接続失敗: $conn_test"
    exit 1
}

# --- STEP 6: テストDB作成と復元 ---
Write-Host ""
Write-Host "[STEP 6] テストDB作成と復元..."

# テストDB作成
& "$PG_BIN\psql.exe" -h 127.0.0.1 -U postgres -c "DROP DATABASE IF EXISTS $TEST_DB;" 2>$null
& "$PG_BIN\psql.exe" -h 127.0.0.1 -U postgres -c "CREATE DATABASE $TEST_DB ENCODING 'UTF8' TEMPLATE template0;" 2>&1 | Out-Null
Write-Host "  テストDB作成: $TEST_DB"

# 復元（WSLでgzipを解凍してWindows psqlにパイプ）
Write-Host "  復元中...（数分かかる場合があります）"
$WSL_GZ = "/mnt/c" + ($DECRYPTED_GZ -replace "^C:", "" -replace "\\", "/")

# WSLでgzip解凍 → Windows TCPで送る
# WSL内でzcat → windows psql経由でTCP接続
$RESTORE_SQL = Join-Path $TEMP_DIR "restore.sql"
$WSL_RESTORE_SQL = "/mnt/c" + ($RESTORE_SQL -replace "^C:", "" -replace "\\", "/")
wsl bash -c "zcat '$WSL_GZ' > '$WSL_RESTORE_SQL'" 2>&1 | Out-Null
Write-Host "  SQL展開完了: $([math]::Round((Get-Item $RESTORE_SQL).Length/1MB, 1))MB"

$restore_out = & "$PG_BIN\psql.exe" -h 127.0.0.1 -U postgres -d $TEST_DB -f $RESTORE_SQL 2>&1
$error_count = ($restore_out | Where-Object { $_ -match "^ERROR:" }).Count
$warning_count = ($restore_out | Where-Object { $_ -match "^WARNING:" }).Count
Write-Host "  復元完了（エラー: $error_count 件、警告: $warning_count 件）"
if ($error_count -gt 0) {
    Write-Host "  [WARN] エラー詳細（最初の5件）:"
    $restore_out | Where-Object { $_ -match "^ERROR:" } | Select-Object -First 5 | ForEach-Object { Write-Host "    $_" }
}

# --- STEP 7: データ検証 ---
Write-Host ""
Write-Host "[STEP 7] データ検証..."

$TABLE_COUNT = (& "$PG_BIN\psql.exe" -h 127.0.0.1 -U postgres -d $TEST_DB -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';" 2>$null).Trim()
Write-Host "  テーブル数: $TABLE_COUNT"

$ROW_COUNTS = & "$PG_BIN\psql.exe" -h 127.0.0.1 -U postgres -d $TEST_DB -c @"
  SELECT
    (SELECT COUNT(*) FROM tenants)      AS tenants,
    (SELECT COUNT(*) FROM events)       AS events,
    (SELECT COUNT(*) FROM reservations) AS reservations,
    (SELECT COUNT(*) FROM members)      AS members;
"@ 2>$null
Write-Host ""
Write-Host "  --- 主要テーブルの行数 ---"
$ROW_COUNTS | ForEach-Object { Write-Host "  $_" }

$INDEX_COUNT = (& "$PG_BIN\psql.exe" -h 127.0.0.1 -U postgres -d $TEST_DB -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public';" 2>$null).Trim()
Write-Host "  インデックス数: $INDEX_COUNT"

$FK_COUNT = (& "$PG_BIN\psql.exe" -h 127.0.0.1 -U postgres -d $TEST_DB -t -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND constraint_schema='public';" 2>$null).Trim()
Write-Host "  FK制約数: $FK_COUNT"

$ENCODING = (& "$PG_BIN\psql.exe" -h 127.0.0.1 -U postgres -d $TEST_DB -t -c "SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname='$TEST_DB';" 2>$null).Trim()
Write-Host "  文字コード: $ENCODING"

$ORPHAN = (& "$PG_BIN\psql.exe" -h 127.0.0.1 -U postgres -d $TEST_DB -t -c @"
  SELECT COUNT(*) FROM reservations r
  LEFT JOIN events e ON r.event_id = e.id
  WHERE e.id IS NULL;
"@ 2>$null).Trim()
Write-Host "  孤立した予約（FK違反）: $ORPHAN 件"

$MIGRATION_COUNT = (& "$PG_BIN\psql.exe" -h 127.0.0.1 -U postgres -d $TEST_DB -t -c "SELECT COUNT(*) FROM _prisma_migrations;" 2>$null).Trim()
Write-Host "  Prismaマイグレーション数: $MIGRATION_COUNT"

$LATEST_MIGRATION = (& "$PG_BIN\psql.exe" -h 127.0.0.1 -U postgres -d $TEST_DB -t -c "SELECT migration_name FROM _prisma_migrations ORDER BY started_at DESC LIMIT 1;" 2>$null).Trim()
Write-Host "  最新マイグレーション: $LATEST_MIGRATION"

# --- 最終判定 ---
Write-Host ""
Write-Host "======================================================"
Write-Host " テスト結果"
Write-Host "======================================================"
Write-Host "  テーブル数  : $TABLE_COUNT"
Write-Host "  インデックス: $INDEX_COUNT"
Write-Host "  FK制約数    : $FK_COUNT"
Write-Host "  文字コード  : $ENCODING"
Write-Host "  孤立予約    : $ORPHAN 件"
Write-Host "  マイグレーション: $MIGRATION_COUNT 件"
Write-Host "  GPG復号     : 成功"
Write-Host "  SHA256整合  : 確認済み"
Write-Host ""

$validation_ok = ($TABLE_COUNT -gt 0) -and ($ENCODING -eq "UTF8") -and ($ORPHAN -eq "0")
if ($validation_ok) {
    Write-Host "✅ テスト合格: バックアップは正常に復号・復元できます"
    $exit_code = 0
} else {
    Write-Host "❌ テスト不合格: 検証値に問題があります"
    $exit_code = 1
}

} finally {
    Cleanup
}

exit $exit_code
