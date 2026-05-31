# 運用設計

## 環境

| 領域 | 想定 |
| --- | --- |
| Frontend | Vercel |
| Backend | Railway |
| Database | PostgreSQL |
| Image Storage | Vercel Blob / backend public uploads |

## 環境変数

### Frontend

| 変数 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | ブラウザ・画像最適化から到達可能なBackend URL |
| `API_BASE_URL` | SSR/ISRから使うBackend URL |
| `NEXT_PUBLIC_SITE_URL` | canonical/OGP/JSON-LD用URL |
| `NEXT_PUBLIC_LIFF_ID` | LIFF ID |
| `NEXT_PUBLIC_GA_ID` | Google Analytics |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blobアップロード |
| `NEXT_PUBLIC_DISCOVERY_LOCKED` | スポーツカテゴリページ非公開フラグ |

### Backend

| 変数 | 用途 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL接続 |
| `PORT` | APIポート |
| `JWT_SECRET` | JWT署名 |
| `SUPERADMIN_EMAIL` | スーパー管理者判定 |
| `FRONTEND_URL` | CORS/メールリンク |
| `BACKEND_URL` | LINE OAuth callback |
| `LINE_LOGIN_CHANNEL_ID` | LINE Login |
| `LINE_LOGIN_CHANNEL_SECRET` | LINE Login |
| `LIFF_CHANNEL_ID` | LIFF ID token検証用。テナントの `liffId` から判定できる場合は任意 |
| `GMAIL_CLIENT_ID` | Gmail OAuth |
| `GMAIL_CLIENT_SECRET` | Gmail OAuth |
| `GMAIL_REFRESH_TOKEN` | Gmail OAuth |
| `GMAIL_USER` | 送信元 |
| `STRIPE_BILLING_SECRET_KEY` | SaaS課金 |
| `STRIPE_STANDARD_PRICE_ID` | Standardプラン |
| `STRIPE_PRO_PRICE_ID` | Proプラン |
| `STRIPE_BILLING_WEBHOOK_SECRET` | SaaS課金Webhook |

## デプロイ手順

### Backend

```bash
cd backend
npm ci
npx prisma migrate deploy
npm run build
npm run start:prod
```

### Frontend

```bash
cd frontend
npm ci
npm run build
```

## 検証コマンド

```bash
cd frontend
npm run build
npm run lint
```

```bash
cd backend
npm run build
npx eslint "{src,apps,libs,test}/**/*.ts"
npm test -- --runInBand
npm run test:e2e -- --runInBand
npx prisma migrate status
```

## Migration運用

- schema変更時はPrisma migrationを作成する
- 本番適用は `migrate deploy`
- migration履歴とDB実体がズレた場合は、原因を確認してから `migrate resolve` を使う
- 破壊的変更前はバックアップを取る

## バックアップ

最低限の運用方針:

- 本番DBは日次バックアップ
- 重要リリース前に手動バックアップ
- 復旧手順を定期的に検証

## 監視

現時点で明示的な監視実装は未確認。今後必要な監視:

- API 5xx率
- レスポンスタイム
- Stripe Webhook失敗
- LINE Messaging API失敗
- メール送信失敗
- DB接続失敗
- sitemap生成失敗

## 障害対応

### 予約ができない

1. Backend稼働確認
2. DB接続確認
3. LIFFから送られる `tenantId` / `lineUserId` を確認
4. Eventのstatus/heldAt/capacityを確認
5. Stripe決済要否を確認

### LINE通知が届かない

1. テナントのLINE Channel Access Tokenを確認
2. LINE Webhook/Message APIのエラーを確認
3. メンバーのlineUserIdを確認
4. 対象イベントの通知設定を確認

### 公開ページが検索に出ない

1. robots.txt確認
2. sitemap.xml確認
3. ページmetadata/noindex確認
4. 公開APIがイベント/団体を返すか確認
5. Search ConsoleでURL検査

## ロールバック

- Frontend: Vercelの直前デプロイへ戻す
- Backend: Railwayの直前デプロイへ戻す
- DB: migrationの影響範囲を確認し、必要ならバックアップから復元
