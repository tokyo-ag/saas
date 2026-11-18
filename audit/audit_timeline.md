# 操作時系列（audit_timeline）
作成: 2026-11-18

---

## 2026-11-17（事故当日）

| 時刻(UTC) | 操作 | 対象 | 結果 | 承認 | 証拠 |
|-----------|------|------|------|------|------|
| 08:17以前 | イベント・予約の削除 | BELL 12/01(e43c2f1b), 12/23(20eae236), 12/30(1b017dcd) | 削除完了 | 不明 | bell_full_forensic_result.jsonのdead_events, dead tupleのxmax |
| 08:17 | Claude Codeセッション開始（8ea127a7） | — | — | — | JSONL timestamp |
| 08:53頃 | check_bell2.cjs実行 | BELL予約孤立確認 | 削除済みを認識 | — | JSONL |
| 09:12 | recover_v3.cjs実行（dead tupleスキャン） | reservationsテーブル全ページ | 15件取得（12/01×11, 12/23×2, 他×2） | — | JSONL Line 15642 |
| 09:20 | restore_reservations.cjs実行（dead tupleスキャン） | reservationsテーブル全ページ | 9件取得（12/01×5, 12/23×2, b6154fac×1, 82756640×1） | — | JSONL Line 15708 |
| 09:21 | find_bell_dec_members.cjs実行 | membersテーブル（09:12のID参照） | bell_recovery_full.json作成 | — | ファイルタイムスタンプ |
| ~10:34 | 代替イベント作成 | BELL 12/01(9a1ddb59), 12/23(73a90a09) | 作成 | 推定あり | bell_full_forensic_result.json |
| 10:38 | bell_full_forensic.cjs実行 | dead events + dead reservations | dead_events=24, dead_reservations_all=0 | — | ファイルタイムスタンプ |
| 15:21頃 | 11件 INSERT（restore_reservations_only.sql実行） | e43c2f1bへの予約再構築 | 11件 reserved_at=2026-11-17T06:21:26（全件同一） | 推定あり | 本番DB確認、staff_note=【再構築】 |
| 23:17 JST | pg_dump実行 | 本番DB全体 | railway_full_20261117_231745.dump（788KB）生成 | — | ファイルタイムスタンプ |

## 2026-11-18

| 時刻(JST) | 操作 | 対象 | 結果 | 承認 |
|-----------|------|------|------|------|
| 02:52 | pg_dump実行 | 本番DB | pgdump_20261118_025242.sql.gz | — |
| 03:00 | pg_dump実行（2回目） | 本番DB | pgdump_20261118_025949.sql.gz | — |
| 04:44 | GPG暗号化pg_dump | 本番DB | pgdump_20261118_044429.sql.gz.gpg（.env.backup作成日と同時刻） | — |
| 08:14 | pg_dump実行 | 本番DB | pgdump_20261118_081415.sql.gz | — |
| 08:45頃 | bell_audit_report.json生成 | BELL予約分析 | 分類済み監査レポート | — |
| 09:21 | 本番DB改修作業コミット完了 | — | — | — |
| 09:40 | full_backup.cjs実行 | 本番DB | backup_full_2026-11-18T00-40-08.sql（3.72MB） | — |

## 2026-11-14〜11-16（事故前）

| コミット | 内容 |
|---------|------|
| 765471c | fix: Android login loop |
| ae2918c | feat: default remindEnabled to true |
| b33deb4 | feat: enable legacy website editor for FONE |
| 3c0315a | feat: billing management in superadmin |

**注:** 2026-11-14〜11-16の期間にBELLイベント・予約に影響するDB操作のコミットはなし。

---

## 未確認の操作（時系列に組み込めない）

- 08:17 UTC以前の削除操作の詳細（実行ツール・SQL・操作者）
- f→one系イベント（xmin: 21225〜21256）の作成日時（PostgreSQLのxmin=トランザクションIDは日時に変換不可）
- restore_events_only.sql の実行日時（e43c2f1bイベント自体の再挿入）
