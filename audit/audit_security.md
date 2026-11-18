# セキュリティ・コード監査結果
調査範囲: Git 21コミット（2026-11-14〜11-18）+ backend/src/ 全体 + prisma/schema.prisma

---

## 発見した問題

### [Medium] JWT_SECRETフォールバック（auth.module.ts:23）
```typescript
secret: secret ?? 'dev-secret-change-me',
```
JWT_SECRET未設定時に脆弱なデフォルト値で動作する。
NODE_ENV=productionが未設定の場合に危険。
確認必要: RailwayでNODE_ENVとJWT_SECRETが確実に設定されているか。

### [設計リスク] Event直接DB削除で予約が孤立する
schema.prismaのReservation→EventにonDelete: Cascadeなし。
Prisma経由のevent.remove()は明示的deleteMany実行。
しかし直接DBからEventを削除するとReservationが孤立。
→ 2026-11-17事故の技術的メカニズム: DB直接削除（Prisma経由でない）でEventが消え、Reservationが孤立してdead tupleに残った。

---

## 問題なし（確認済み）

| 項目 | 結果 |
|------|------|
| Stripe webhook署名検証 | constructEventで両エンドポイントとも検証あり |
| Stripeシークレット | 全てprocess.envから取得、ハードコードなし |
| テナント分離 | 主要サービス全てwhere: { tenantId }でフィルタ済み |
| SuperadminGuard | JWT isSuperadminフラグで検証、@Public()なし |
| LINE通知重複防止 | remindedAt確認実装あり |
| SQLインジェクション | $queryRawはPrisma.sqlテンプレートのみ（executeRawUnsafeなし） |

---

## CASCADE削除マップ

| 削除対象 | CASCADEで削除されるもの |
|---------|----------------------|
| Tenant削除 | Event, Reservation, Member, CollabGroup全消去 |
| Event削除（Prisma経由） | EventAnonymousViewのみ。Reservationは明示的deleteMany |
| **Event削除（DB直接）** | **Reservationが孤立（FK制約なしのため）** |

---

## 未調査（このエージェントのスコープ外）

- Railway環境変数の実際の設定値
- 2026-11-14以前のGitコミット
- フロントエンドコード（XSS等）
