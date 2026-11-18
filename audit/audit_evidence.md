# 証拠・参照先（audit_evidence）
作成: 2026-11-18

---

## 主要証拠ファイル

| 証拠 | ファイル/場所 | 内容 |
|------|-------------|------|
| dead tuple生スキャン結果（09:12） | JSONL Line 15642 | 15件全件のevent_id・member_id（確定） |
| dead tuple結果JSON（09:21ハードコード） | C:\saas\backend\bell_recovery_full.json | e43c2f1b×11名、20eae236×2名（再スキャンでない） |
| dead events/reservations全件 | C:\saas\backend\bell_full_forensic_result.json | dead_events=24件（全tenant-001）、dead_reservations_all=0 |
| 分類済み予約監査表 | C:\saas\backend\bell_audit_report.json | B:13件, C:9件, E:1件（分類定義含む） |
| ユーザーの「28人」発言 | JSONL Line 15231 | 「12/1 28人いたりろ」（DBクエリ結果でない） |
| Railwayバックアップ確認記録 | JSONL Line 15423 | 「2026-08-23スナップショット1件のみ」 |
| 再構築予約のreserved_at | 本番DB（2026-11-18確認） | 13件全件 2026-11-17T06:21:26.206Z（同一） |
| e43c2f1b現在の予約数 | 本番DB（2026-11-18確認） | 17件（11復元+6事故後新規） |
| FONEテナント12月イベント | 本番DB（2026-11-18確認） | tenant-1779403327733に10件存在（12/03〜12/29） |
| 最新論理バックアップ | C:\saas\backup\backup_full_2026-11-18T00-40-08.sql | SHA256: 2858cad8...、3.72MB |

## スクリプト証拠

| スクリプト | 確認内容 |
|-----------|---------|
| recover_v3.cjs | 09:12スキャン（本物）。decodeVarlena, WHERE t_xmax != 0 AND t_data IS NOT NULL |
| restore_reservations.cjs | 09:20スキャン（本物）。同一SQL、tenant-001フィルター、catch{}で無視 |
| find_bell_dec_members.cjs | 09:21実行（ハードコード）。EVENT_E43C2F1B_MEMBERSに11件のUUIDを直書き |

## Git証拠

事故に直接関係するコミット: なし（BELL削除はGit管理外のDB操作）
直近コミット: babedbd（docs/RECOVERY_PROCEDURE.md, backend/restore_test_local.cjs, docs/AI_HANDOFF.md）

## 本番DB確認結果（読み取り専用、2026-11-18）

- 再構築フラグ(staff_note LIKE '%再構築%'): 13件
- reserved_at範囲: min=max=2026-11-17T06:21:26.206Z
- e43c2f1b予約数: 17件（11再構築+6事故後新規）
- 9a1ddb59予約数: 0件（代替イベントは現在空）
