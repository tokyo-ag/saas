# Railway + Vercel デプロイ指示書

## 構成概要

```
GitHub リポジトリ
  ├── backend/   → Railway (NestJS API + PostgreSQL)
  └── frontend/  → Vercel (Next.js)
```

- `backend/railway.json` — Railway ビルド・起動設定（作成済み）
- `frontend/railway.json` — Railway用（Vercel使う場合は不要）
- Prisma マイグレーションは起動コマンドに含まれる（`prisma migrate deploy && node dist/main`）

---

## Step 1: GitHub リポジトリ作成 & プッシュ

```bash
cd c:/saas
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

---

## Step 2: Railway セットアップ（Backend + PostgreSQL）

### 2-1. プロジェクト作成
1. https://railway.app → New Project
2. **Deploy from GitHub repo** → リポジトリを選択

### 2-2. PostgreSQL を追加
1. プロジェクト内で **+ New** → **Database** → **Add PostgreSQL**
2. `DATABASE_URL` が自動的に backend サービスに注入される（手動設定不要）

### 2-3. Backend サービスの設定
1. **Settings** → **Root Directory**: `backend`
2. Railway が `backend/railway.json` を読んで自動的に以下を実行する：
   - Build: `npm ci && npm run build`（Nixpacks が自動検出）
   - Start: `npx prisma migrate deploy && npm run start:prod`

### 2-4. Volume 設定（画像アップロード永続化）
1. Backend サービス → **Volumes** → **Add Volume**
2. Mount Path: `/app/public/uploads`
3. これで再デプロイ後もユーザーがアップロードした画像が消えない

### 2-5. 環境変数を設定（Backend）
Backend サービス → **Variables** に以下を追加：

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `JWT_SECRET` | `openssl rand -hex 32` の出力 | **必須。強いランダム値を生成すること** |
| `SUPERADMIN_EMAIL` | superadmin のメールアドレス | このメールでログインすると superadmin 権限が付与される |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Vercel デプロイ後に設定 |
| `BACKEND_URL` | `https://your-backend.railway.app` | Railway が発行する URL |
| `LINE_LOGIN_CHANNEL_ID` | LINE Developer Console から取得 | 主催者の LINE ログイン用 |
| `LINE_LOGIN_CHANNEL_SECRET` | LINE Developer Console から取得 | |
| `STRIPE_BILLING_SECRET_KEY` | Stripe ダッシュボードから取得 | サブスクリプション課金用 |
| `STRIPE_BILLING_WEBHOOK_SECRET` | Step 5 で設定 | Stripe Webhook 署名検証 |
| `STRIPE_STANDARD_PRICE_ID` | `price_1TX65ARgZHiSHl1dZHA12Hdk` | ¥2,980/月プラン |
| `STRIPE_PRO_PRICE_ID` | `price_1TX65VRgZHiSHl1dGvZro0eh` | ¥6,980/月プラン |

**自動注入されるため設定不要な変数：**
- `DATABASE_URL` — Railway PostgreSQL が自動設定
- `PORT` — Railway が自動設定

---

## Step 3: Vercel セットアップ（Frontend）

1. https://vercel.com → **Add New Project** → GitHub リポジトリを選択
2. **Root Directory**: `frontend`
3. Framework: **Next.js**（自動検出）
4. 環境変数を設定：

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.railway.app` | Railway Backend の URL |
| `NEXT_PUBLIC_LIFF_ID` | LINE Developer Console の LIFF ID | LIFF アプリの ID |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` | SEO 用サイト URL |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID（任意） | |

5. **Deploy** → デプロイ完了後に表示される URL を控える
6. Railway の `FRONTEND_URL` をこの URL に更新する

---

## Step 4: LINE Webhook URL を更新

LINE Developer Console → Messaging API チャンネル → **Webhook URL**:

```
https://your-backend.railway.app/api/webhook/<tenantId>
```

`<tenantId>` は DB の `tenants` テーブルで確認（seed で `tenant-001` が作られている）。

---

## Step 5: Stripe Webhook を設定

1. Stripe ダッシュボード → **開発者** → **Webhooks** → **エンドポイントを追加**
2. エンドポイント URL:
   ```
   https://your-backend.railway.app/api/stripe/billing
   ```
3. リッスンするイベント:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
4. 作成後に表示される `whsec_...` を Railway の `STRIPE_BILLING_WEBHOOK_SECRET` に設定

---

## Step 6: Superadmin アカウント作成

Railway デプロイ後、superadmin アカウントを作成する：

```bash
curl -X POST https://your-backend.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"<SUPERADMIN_EMAIL と同じアドレス>","password":"<強いパスワード>","orgName":"COMIU"}'
```

このアカウントでログイン（`/superadmin/login`）すると `isSuperadmin: true` の JWT が発行され、superadmin 機能が使える。

---

## Step 7: 動作確認チェックリスト

- [ ] `https://your-backend.railway.app/api/health` または任意のエンドポイントが 200 を返す
- [ ] `https://your-app.vercel.app/` でトップページが表示される
- [ ] `/login` でテナント主催者ログインができる
- [ ] `/admin` でダッシュボードが表示される
- [ ] `/superadmin/login` → superadmin ログインができる
- [ ] `/admin/settings/line` で LINE 設定が保存できる
- [ ] LIFF URL（`/liff/<tenantId>`）が LINE アプリで開ける
- [ ] 画像アップロードが動作し、再デプロイ後も画像が残る（Volume 確認）

---

## トラブルシューティング

### Prisma マイグレーションが失敗する
- Railway の DB が起動完了する前に API が起動しようとするタイムラグが原因のことがある
- Railway ダッシュボードで Backend サービスを **Restart** する

### CORS エラーが出る
- Railway の `FRONTEND_URL` が Vercel の URL と完全一致しているか確認（末尾スラッシュなし）

### 画像がアップロードできない
- Volume が `/app/public/uploads` にマウントされているか確認
- Railway ログで `ENOENT` エラーが出ていたら Volume 未設定

### LINE ログインが動かない
- `LINE_LOGIN_CHANNEL_SECRET` と `LINE_LOGIN_CHANNEL_ID` の設定を確認
- LINE Developer Console の **Callback URL** に `https://your-backend.railway.app/api/auth/line/callback` が登録されているか確認
