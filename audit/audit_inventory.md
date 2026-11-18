# 監査対象一覧（audit_inventory）
作成: 2026-11-18

## セッションJSONLファイル

| ファイル | 最終更新 | サイズ | 内容 |
|---------|---------|-------|------|
| 8ea127a7-5871-47f7-800d-64e7b0507216.jsonl | 2026-11-18 | 156.3 MB | BELL事故調査・復旧作業・バックアップ強化（本セッション含む） |
| 6846ee4b-b302-4fc3-90e1-deed3cb7fd43.jsonl | 2026-11-12 | 2.8 MB | 2026-11-12「タスク全部まとめて」セッション |

**調査した範囲:**
- 8ea127a7: 一部精査（Line 15231, 15423, 15553, 15575, 15623, 15642, 15708）
- 6846ee4b: キーワード検索（BELL/DELETE/e43c2f1b）→ 92ヒット（ほぼ設定・参照のみ、直接的なDB操作なし）

**未調査のJSONLセッション:** 上記2件以外は存在しない（確認済み）

## Gitコミット

- 2026-10-01以降: 171コミット
- 2026-11-14以降: 22コミット（以下に主要コミット）
  - babedbd: docs: recovery procedure doc and restore test script
  - 5da1c72: feat: restore test scripts
  - f879b08: feat: GitHub Artifacts fallback
  - 246de96: fix: PowerShell hook coverage
  - 75d8afa: docs: AI_HANDOFF backup changes
  - eca35ac: feat: backup infrastructure
  - 3c0315a: feat: billing management in superadmin
  - 765471c: fix: Android login loop
  - 587d99f, 1739817: fix: redirect slug-based URLs

## バックアップファイル（C:\saas\backup\）

| ファイル | 取得時刻 | サイズ | 備考 |
|---------|---------|-------|------|
| railway_full_20261117_231014.dump | 2026-11-17 23:10 | 0 KB | 失敗（空ファイル） |
| railway_full_20261117_231745.dump | 2026-11-17 23:17 | 770.4 KB | pg_dump custom形式、事故後 |
| pgdump_20261118_025242.sql.gz | 2026-11-18 02:52 | 705.4 KB | 事故後 |
| pgdump_20261118_025949.sql.gz | 2026-11-18 03:00 | 705.2 KB | 事故後 |
| pgdump_20261118_044429.sql.gz.gpg | 2026-11-18 04:44 | 705.3 KB | GPG暗号化、事故後 |
| pgdump_20261118_081415.sql.gz | 2026-11-18 08:14 | 706.2 KB | 事故後 |
| backup_full_2026-11-18T00-40-08.sql | 2026-11-18 09:40 | 3806.1 KB | Node.js論理バックアップ、事故後 |

**事故前バックアップ: 0件**

## 調査したスクリプト（backend/）

- recover_v3.cjs: コード全行読み取り
- restore_reservations.cjs: コード全行読み取り
- find_bell_dec_members.cjs: コード全行読み取り
- full_backup.cjs: 参照
- restore_test_local.cjs: コード確認
- audit_reserved_at.cjs: 今回新規作成・実行
- audit_fone_dec.cjs: 今回新規作成・実行（FONEテナント12月イベント確認）

## 調査したJSONファイル（backend/）

| ファイル | 生成日時 | 確認内容 |
|---------|---------|---------|
| bell_recovery_full.json | 2026-11-17T09:21 | e43c2f1b×11, 20eae236×2（09:12ハードコード） |
| bell_full_forensic_result.json | 2026-11-17T10:38 | dead_events×24（全件tenant-001）, dead_reservations_all=0 |
| bell_audit_report.json | 2026-11-18T08:45 | 分類別予約リスト（B:13件, C:9件, E:1件） |
| backup_full_2026-11-18T00-40-08.json | 2026-11-18 | テーブル別行数・SHA256 |

## 本番DB（読み取りのみ）

| クエリ | 結果 |
|-------|------|
| 再構築フラグ付き予約 | 13件 / 全件reserved_at=2026-11-17T06:21:26.206Z |
| e43c2f1b（元12/01）予約 | 17件 |
| 9a1ddb59（代替12/01）予約 | 0件 |
| FONE正テナント12月イベント | 10件（12/03〜12/29）（2026-11-18確認） |
