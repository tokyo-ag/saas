# Atsumaro（アツマロ）

LINE連携コミュニティイベント管理SaaS。スポーツサークル・交流会の主催者が管理画面からイベント・参加者・予約・LINE通知・課金を管理し、参加者はLIFFからイベント確認・予約・メンバー交流を行う。

---

## 要件定義

### ターゲット
- **主催者（テナント）**: スポーツサークル・地域コミュニティの幹事。月2〜30件程度のイベントを開催する個人・団体。
- **参加者（メンバー）**: LINE経由でサークルを知り、イベントに参加する一般ユーザー。

### 解決する課題
- LINEグループでの告知・参加管理が煩雑（スプレッドシート、手作業）
- 有料イベントの集金が現金・振込のみでオンライン決済できない
- リマインド通知を手動で送っている
- 参加者同士が繋がれる仕組みがない

### プラン

| プラン | 月額 | イベント数 | 参加者上限 | リマインド | Stripe決済 | CSV | 複数管理者 |
|--------|------|-----------|-----------|-----------|-----------|-----|-----------|
| Free | ¥0 | 月2件 | 50人/イベント | - | - | - | - |
| Standard | ¥2,980 | 無制限 | 300人/イベント | ✓ | ✓ | ✓ | - |
| Pro | ¥6,980 | 無制限 | 無制限 | ✓ | ✓ | ✓ | 3名まで |

---

## 設計書

### システム構成

```
ブラウザ(管理者)        ブラウザ/LINE(参加者)
      │                       │
      ▼                       ▼
 Next.js Frontend (:3000)  LIFF App (LINE内)
      │                       │
      └──────────┬────────────┘
                 ▼
         NestJS Backend (:3001)
                 │
         ┌───────┴────────┐
         ▼                ▼
    PostgreSQL        外部サービス
    (Prisma ORM)    LINE / Stripe
```

### マルチテナント設計
- 全テーブルに `tenant_id` を持つ。テナント間データは完全分離。
- テナントIDはJWTトークンから取得（`TenantId` デコレーター）。
- 公開API（LIFF用）は `tenantId` をURLパラメータで受け取る。

### 認証
- 管理者: メール＋パスワード or LINE Login → JWT（Authorization ヘッダー）
- スーパーアドミン: 別エンドポイント `/api/superadmin`
- メンバー: LIFFでLINEログイン → `lineUserId` でメンバー特定

### データモデル（主要テーブル）

```
Tenant (テナント)
  ├── OrganizerAccount (管理者アカウント)
  ├── Event (イベント)
  │     ├── Reservation (予約)
  │     ├── EventLike (いいね)
  │     └── EventReview (口コミ)
  └── Member (メンバー)
        ├── Connection (メンバー間コネクション)
        ├── Message (DM)
        ├── AdminMemberMessage (管理者↔メンバーメッセージ)
        └── Notification (通知)
```

### API構成（Backend）

| プレフィックス | 役割 |
|---|---|
| `/api/auth` | 登録・ログイン・LINE OAuth |
| `/api/admin/events` | イベントCRUD（管理者） |
| `/api/admin/members` | メンバー管理（管理者） |
| `/api/admin/reservations` | 予約管理（管理者） |
| `/api/admin/tenant` | テナント設定・Billing |
| `/api/admin/upload` | 画像アップロード |
| `/api/liff/:tenantId` | LIFF用API（メンバー操作） |
| `/api/public` | 公開API（イベント一覧・いいね） |
| `/api/stripe-webhook` | Stripe Webhook（予約決済） |
| `/api/stripe-webhook/billing` | Stripe Webhook（プラン課金） |
| `/api/superadmin` | プラットフォーム管理 |

### フロントエンド構成

| パス | 役割 |
|---|---|
| `/` | トップページ（SEO・カテゴリー導線） |
| `/admin/*` | 管理画面 |
| `/liff/[tenantId]/*` | LIFF（LINE内アプリ） |
| `/sports/[category]` | カテゴリー別イベント一覧（SEO） |
| `/use-cases/*` | ユースケースLP（SEO） |
| `/pricing` | 料金ページ |
| `/register`, `/login` | 主催者登録・ログイン |
| `/superadmin/*` | スーパーアドミン画面 |

### イベントフロー

```
主催者: イベント作成(draft) → 公開(open) → 終了(closed)
参加者: LIFF でイベント閲覧 → 予約 → (Stripe決済) → 参加 → 口コミ投稿
主催者: リマインド送信 → QRチェックイン → CSV出力
```

### 予約ステータス遷移

```
waiting_payment → reserved → attended
                           ↘ cancelled
     → waitlisted → reserved（キャンセル待ち繰り上がり）
```

### Stripe連携（2系統）

**① イベント決済（テナント独自のStripe Connect）**
- テナントが自分のStripe秘密キーを設定
- 参加者が有料イベントを予約 → Checkout Session → `checkout.session.completed` Webhook → 予約確定
- エンドポイント: `/api/stripe-webhook/:tenantId`

**② プラン課金（プラットフォームStripe）**
- `STRIPE_BILLING_SECRET_KEY` で Atsumaro の Stripe アカウントを使用
- アップグレードボタン → `POST /api/admin/tenant/billing/checkout` → Checkout Session
- `invoice.payment_succeeded` → `planStartedAt` 更新
- `customer.subscription.deleted` → `plan = 'free'` にリセット
- エンドポイント: `/api/stripe-webhook/billing`

---

## 環境変数

### backend/.env

```env
DATABASE_URL="postgresql://saas:saas_password@localhost:5432/saas_db"
TENANT_ID="tenant-001"
PORT=3001
JWT_SECRET="ランダムな256bit文字列"
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3001"

# LINE Messaging API（テナントごとに設定画面から登録）
LINE_CHANNEL_ACCESS_TOKEN=""
LINE_CHANNEL_SECRET=""

# LINE Login（管理者ログイン用）
LINE_LOGIN_CHANNEL_ID=""
LINE_LOGIN_CHANNEL_SECRET=""

# Stripe Billing（プラットフォーム課金）
STRIPE_BILLING_SECRET_KEY="sk_test_..."
STRIPE_STANDARD_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_BILLING_WEBHOOK_SECRET="whsec_..."
```

### frontend/.env.local

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_TENANT_ID=tenant-001
NEXT_PUBLIC_LIFF_ID=
NEXT_PUBLIC_GA_ID=          # Google Analytics（任意）
```

---

## セットアップ

### 1. 依存関係インストール

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. PostgreSQL 起動

```bash
docker compose up -d
```

| 項目 | 値 |
|------|-----|
| host | localhost:5432 |
| database | saas_db |
| user / password | saas / saas_password |

### 3. DB マイグレーション＆シード

```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
```

### 4. 開発サーバー起動

```bash
# backend（ポート3001）
cd backend && npm run start:dev

# frontend（ポート3000）
cd frontend && npm run dev
```

---

## 主要画面

### 管理画面 `/admin`
- ダッシュボード（メンバー数・売上・直近アクティビティ）
- イベント管理（作成・編集・公開・チェックイン・CSV出力）
- メンバー管理（一覧・詳細・メッセージ）
- 設定（団体情報・LINE連携・Stripe決済・プラン）

### LIFF `/liff/[tenantId]`
- イベント一覧・詳細・予約・決済完了
- プロフィール（登録・編集）
- コネクション（メンバー間のつながり・DM）
- 通知一覧
- サポート

### 公開ページ
- トップ（カテゴリー導線・タグフィルター・イベント一覧）
- スポーツカテゴリー別 `/sports/badminton` など
- ユースケースLP `/use-cases/badminton-tokyo` など

---

## Stripe テスト手順

### ローカルWebhookテスト

```bash
# Stripe CLIインストール後
stripe login
stripe listen --forward-to localhost:3001/stripe-webhook/billing
# → whsec_test_... を backend/.env の STRIPE_BILLING_WEBHOOK_SECRET にセット
```

### テストカード
- カード番号: `4242 4242 4242 4242`
- 有効期限: 任意の未来日付
- CVC: 任意3桁

---

## ビルド・テスト確認

```bash
# backend
cd backend
npm run build
npm test
npm run test:e2e

# frontend
cd frontend
npm run build
```

| コマンド | 確認日 | 結果 |
|---------|--------|------|
| backend: npm run build | 2026-05-14 | 成功 |
| backend: npm test | 2026-05-14 | 成功 |
| frontend: npm run build | 2026-05-14 | 成功 |

---

## デプロイ（予定）

| 項目 | サービス |
|------|---------|
| Backend | AWS EC2 |
| Database | AWS RDS（PostgreSQL） |
| Frontend | Vercel |
| 画像ストレージ | EC2ローカル or S3（未実装） |
| ドメイン | 未定 |

本番環境では `JWT_SECRET` を必ず強いランダム値に変更し、`.env` をGit管理外に置くこと。
