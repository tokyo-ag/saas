# 交流会管理SaaS 設計書

## 1. サービス概要

交流会の主催者が自分のLINE公式アカウントと連携し、参加者の募集・管理をおこなえるマルチテナント型SaaS。参加者はLINE内からイベント一覧を閲覧・予約できる。

課金はサブスクリプション型（月額固定）。フリープランで試用し、イベント数が増えたタイミングで有料プランへアップグレードする設計。

---

## 2. システム構成図

```
┌─────────────────────────────────────────────────────────┐
│                      参加者（スマホ）                        │
│   LINEアプリ → リッチメニュー → LIFF（LINE内ブラウザ）          │
└─────────────────┬───────────────────────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────────────────────┐
│                    フロントエンド                            │
│   LIFF画面（イベント一覧・予約フォーム）                        │
│   管理画面（主催者用：イベント作成・名簿・出欠管理）               │
└─────────────────┬───────────────────────────────────────┘
                  │ REST API
┌─────────────────▼───────────────────────────────────────┐
│                    バックエンド                              │
│   - テナント管理                                            │
│   - イベント CRUD                                          │
│   - 参加者・出欠管理                                         │
│   - LINE Messaging API 連携                               │
└──────┬──────────────────────────┬────────────────────────┘
       │                          │
┌──────▼──────┐          ┌────────▼────────┐
│   Database   │          │ LINE Platform    │
│  PostgreSQL  │          │ - Messaging API  │
│              │          │ - LIFF           │
└─────────────┘          └─────────────────┘
```

---

## 3. ユーザー種別と権限

| 種別 | 説明 | 主な操作 |
|------|------|---------|
| 主催者 | SaaSに登録した交流会の運営者 | イベント作成・名簿確認・出欠管理・LINE連携設定 |
| 参加者 | LINE経由でイベントに参加するユーザー | イベント閲覧・予約 |

---

## 4. 画面一覧

### 参加者向け（LIFF画面）

| 画面名 | パス | 説明 |
|--------|------|------|
| 団体トップ | `/liff/:tenantId` | 団体紹介・友だち追加ボタン・イベント一覧（横2列） |
| イベント詳細 | `/liff/:tenantId/events/:eventId` | イベント詳細・予約ボタン |
| 予約フォーム | `/liff/:tenantId/events/:eventId/reserve` | 名前・学年・性別を入力して予約 |
| 予約完了 | `/liff/:tenantId/events/:eventId/done` | 完了メッセージ |

### 主催者向け（管理画面）

| 画面名 | パス | 説明 |
|--------|------|------|
| ダッシュボード | `/admin` | 直近イベント・参加者数サマリー |
| イベント一覧 | `/admin/events` | 過去・予定のイベント一覧 |
| イベント作成・編集 | `/admin/events/new` | 日時・場所・定員・メモ |
| イベント詳細 | `/admin/events/:eventId` | 参加者リスト・出欠管理 |
| 参加者名簿 | `/admin/members` | 全参加者一覧・検索・絞り込み |
| 参加者詳細 | `/admin/members/:memberId` | プロフィール・参加履歴 |
| LINE設定 | `/admin/settings/line` | Channel ID・Channel Secret登録（ステップ形式） |
| アカウント設定 | `/admin/settings` | 団体名・プロフィール・ログイン情報 |

---

## 5. データベース設計

### テーブル一覧

#### `tenants`（テナント：主催者の団体）

| カラム名 | 型 | 説明 |
|----------|-----|------|
| `id` | UUID PK | テナントID |
| `name` | VARCHAR(100) | 団体名 |
| `description` | TEXT | 団体説明 |
| `line_channel_id` | VARCHAR(100) | LINE Channel ID |
| `line_channel_secret` | VARCHAR(100) | LINE Channel Secret |
| `line_channel_access_token` | TEXT | LINE Channel Access Token |
| `liff_id` | VARCHAR(100) | LIFF ID |
| `stripe_account_id` | VARCHAR(100) | Stripe ConnectアカウントID（前払い集金用） |
| `created_at` | TIMESTAMP | 作成日時 |
| `updated_at` | TIMESTAMP | 更新日時 |

#### `users`（主催者アカウント）

| カラム名 | 型 | 説明 |
|----------|-----|------|
| `id` | UUID PK | ユーザーID |
| `tenant_id` | UUID FK | テナントID |
| `email` | VARCHAR(255) | メールアドレス |
| `password_hash` | VARCHAR(255) | パスワードハッシュ |
| `created_at` | TIMESTAMP | 作成日時 |

#### `events`（イベント）

| カラム名 | 型 | 説明 |
|----------|-----|------|
| `id` | UUID PK | イベントID |
| `tenant_id` | UUID FK | テナントID |
| `title` | VARCHAR(100) | イベント名 |
| `description` | TEXT | 説明 |
| `held_at` | TIMESTAMP | 開催日時 |
| `location` | VARCHAR(200) | 開催場所 |
| `capacity` | INTEGER | 定員（NULLで無制限） |
| `status` | ENUM | `draft` / `open` / `closed` |
| `price` | INTEGER | 参加料（円）。0で無料 |
| `payment_required` | BOOLEAN | 前払い必須ON/OFF |
| `notify_on_reserve` | BOOLEAN | 予約完了メッセージON/OFF（デフォルトON） |
| `remind_enabled` | BOOLEAN | リマインドメッセージON/OFF |
| `remind_at` | TIMESTAMP | リマインド送信予定日時（NULLで未設定） |
| `reminded_at` | TIMESTAMP | 実際に送信した日時（NULLで未送信） |
| `created_at` | TIMESTAMP | 作成日時 |
| `updated_at` | TIMESTAMP | 更新日時 |

#### `members`（参加者）

| カラム名 | 型 | 説明 |
|----------|-----|------|
| `id` | UUID PK | 参加者ID |
| `tenant_id` | UUID FK | テナントID |
| `line_user_id` | VARCHAR(100) | LINE ユーザーID |
| `name` | VARCHAR(100) | 名前 |
| `grade` | VARCHAR(50) | 学年 |
| `gender` | VARCHAR(20) | 性別 |
| `created_at` | TIMESTAMP | 初回登録日時 |

#### `reservations`（予約・出欠）

| カラム名 | 型 | 説明 |
|----------|-----|------|
| `id` | UUID PK | 予約ID |
| `tenant_id` | UUID FK | テナントID |
| `event_id` | UUID FK | イベントID |
| `member_id` | UUID FK | 参加者ID |
| `status` | ENUM | `waiting_payment` / `reserved` / `waitlisted` / `attended` / `cancelled` |
| `waitlist_order` | INTEGER | キャンセル待ち順番（NULLで通常予約） |
| `stripe_payment_intent_id` | VARCHAR(100) | Stripe決済ID（前払い時） |
| `paid_at` | TIMESTAMP | 決済完了日時（NULLで未払い） |
| `reserved_at` | TIMESTAMP | 予約日時 |

---

## 6. LINE設定画面 UX仕様

主催者がLINE連携で躓かないよう、設定画面はステップ形式で埋め込む。

```
STEP 1：LINE公式アカウントを作る
  → 「作成ページを開く」ボタン（外部リンク）
  → 完了したら「次へ」

STEP 2：Messaging APIチャネルを作る
  → スクリーンショット付き手順を表示
  → Channel ID / Channel Secret / Access Token を入力
  → 「確認する」ボタンで疎通チェック

STEP 3：LIFFアプリを追加する
  → エンドポイントURLは自動入力済みで表示
  → LIFF IDを入力
  → 「確認する」ボタン

STEP 4：WebhookURLを設定する
  → URLを「コピー」ボタンで渡す
  → LINEのどこに貼るかスクリーンショットで説明
  → 「接続テスト」ボタン

完了 → ダッシュボードへ
```

---

## 7. メッセージ通数とコスト

LINE公式アカウントの送信数は**参加者1人への送信1回 = 1通**としてカウントされる。

| プラン | 月額 | 送信数 |
|---|---|---|
| フリー | 無料 | 200通/月 |
| ライト | 5,000円 | 5,000通/月 |
| スタンダード | 15,000円 | 30,000通/月 |

**通数の消費例：**
```
参加者50人にリマインド1回  → 50通
参加者50人に予約完了 + リマインド → 100通
```

> SaaS化する場合、LINEの月額費用は各主催者が自分のアカウントで負担する設計とする。

---

## 8. メッセージ配信設計

### 配信種別

| 種別 | タイミング | ON/OFF |
|---|---|---|
| 予約完了メッセージ | 予約直後 | 主催者が設定可能 |
| リマインドメッセージ | 主催者が指定した日時 | 主催者が設定可能 |

### リマインド設定UI（イベント作成・編集画面）

```
リマインドメッセージ  ● ON / OFF
  └ ONの場合
     ○ 前日18時
     ○ 当日朝9時
     ○ カスタム [日時指定]

予約完了メッセージ    ● ON / OFF
```

### リマインド送信フロー

```
cronジョブが毎分起動
  ↓
remind_enabled = true かつ
remind_at <= 現在時刻 かつ
reminded_at IS NULL のイベントを検索
  ↓
該当イベントの予約者全員にプッシュメッセージ送信
  ↓
reminded_at に送信日時を記録
```

### メッセージテンプレート（変数自動挿入）

```
予約完了：
「【{イベント名}】ご予約ありがとうございます！
日時：{開催日時}
場所：{開催場所}」

リマインド：
「【{イベント名}】まもなく開催です！
日時：{開催日時}
場所：{開催場所}」
```

---

## 9. LINE連携フロー

```
1. 参加者が団体ページにアクセス
       ↓
2. 「友だち追加」ボタンをタップ
   → line.me/R/ti/p/{lineId} へ遷移
       ↓
3. LINEアプリで友だち追加
   → Webhookで follow イベントを受信
   → line_user_id を取得・保存
       ↓
4. リッチメニューからLIFFを開く
   → liff.init() で line_user_id を取得
   → イベント一覧を表示
       ↓
5. イベントをタップ → 予約フォーム
   → 名前・学年・性別を入力
   → POST /api/reservations
       ↓
6. 予約完了
   → LINE Messaging API で確認メッセージを送信
```

---

## 10. API設計（主要エンドポイント）

### 参加者向け（認証：LIFF token）

| メソッド | パス | 説明 |
|--------|------|------|
| GET | `/api/liff/:tenantId/events` | イベント一覧取得 |
| GET | `/api/liff/:tenantId/events/:eventId` | イベント詳細取得 |
| POST | `/api/liff/:tenantId/reservations` | 予約登録 |

### 主催者向け（認証：JWT）

| メソッド | パス | 説明 |
|--------|------|------|
| POST | `/api/auth/login` | ログイン |
| GET | `/api/admin/events` | イベント一覧 |
| POST | `/api/admin/events` | イベント作成 |
| PUT | `/api/admin/events/:eventId` | イベント更新 |
| GET | `/api/admin/events/:eventId/reservations` | 予約一覧 |
| PATCH | `/api/admin/reservations/:id/status` | 出欠ステータス更新 |
| GET | `/api/admin/members` | 参加者名簿 |
| POST | `/api/admin/events/:eventId/remind` | リマインド手動送信 |
| GET | `/api/admin/events/:eventId/export` | 参加者CSVダウンロード |
| GET | `/api/admin/members/export` | 名簿CSVダウンロード |
| DELETE | `/api/liff/:tenantId/reservations/:id` | 予約キャンセル（参加者） |

### LINE Webhook

| メソッド | パス | 説明 |
|--------|------|------|
| POST | `/api/webhook/:tenantId` | LINEイベント受信（follow / postback） |

---

## 11. 技術スタック（案）

| レイヤー | 技術 | 備考 |
|--------|------|------|
| フロントエンド | Next.js 16（App Router） | Vercelにデプロイ |
| スタイリング | Tailwind CSS | Flexboxで横2列レイアウト |
| バックエンド | NestJS | RailwayにデプロイNestJSはLaravelに近いMVC構成なので移行しやすい |
| DB | PostgreSQL | Railwayで管理（バックと同じ画面） |
| ORM | Prisma | DBスキーマをコードで管理・マイグレーションも簡単 |
| 認証 | JWT（主催者） / LIFF token（参加者） / Stripe Connect KYC（電話番号・本人確認） | |
| LINE連携 | LINE Messaging API SDK / LIFF SDK | |
| スケジューラー | node-cron（NestJS内） | リマインド定期送信・キャンセル待ち自動通知 |
| 決済 | Stripe Connect（イベント前払い） / Stripe Billing（SaaSサブスク） | |
| ホスティング | Vercel（フロント） / Railway（バック・DB） | |

---

## 12. 課金設計

### プラン一覧

| | フリー | スタンダード |
|---|---|---|
| 月額 | 無料 | 2,000円 |
| イベント作成 | 月2件まで | 無制限 |
| 参加者数 | 50人まで | 無制限 |
| リマインド送信 | ✕ | ○ |
| 予約完了メッセージ | ○ | ○ |

> フリープランで使い始めてもらい、月3件目の作成またはリマインド設定時にアップグレードを促す設計。

### 決済

Stripeを使用。サブスクリプション管理・Webhookによるプラン状態の同期をおこなう。

### `tenants`テーブルへの追加カラム

| カラム名 | 型 | 説明 |
|---|---|---|
| `plan` | ENUM | `free` / `standard` |
| `plan_started_at` | TIMESTAMP | 課金開始日時 |
| `stripe_customer_id` | VARCHAR(100) | StripeカスタマーID |
| `stripe_subscription_id` | VARCHAR(100) | StripeサブスクリプションID |

### プランチェックのタイミング

```
① イベント作成時
  → plan === 'free' かつ 今月のイベント数 >= 2
  → 403 を返し、アップグレード案内を表示

② リマインドON時
  → plan === 'free'
  → 設定を保存せず、アップグレード案内を表示

③ 予約登録時
  → plan === 'free' かつ テナントの累計参加者数 >= 50
  → 403 を返し、アップグレード案内を表示
```

### Stripe Webhookで管理するイベント

| Webhookイベント | 処理 |
|---|---|
| `checkout.session.completed` | planを`standard`に更新 |
| `invoice.payment_succeeded` | plan_started_atを更新 |
| `customer.subscription.deleted` | planを`free`に戻す |
| `payment_intent.succeeded` | reservationのpaid_atを更新・予約確定 |

---

## 13. 予約・キャンセル仕様

### 重複予約

同一LINEユーザーが同じイベントに予約できる上限は**2回まで**。3回目は登録時に弾く。

### キャンセルフロー

```
参加者がキャンセル
  ↓
reservation.status → 'cancelled'
  ↓
主催者にLINEで通知
「{名前}さんが{イベント名}をキャンセルしました」
  ↓
waitlisted の予約が存在する場合
  → waitlist_order が最小の人を自動で 'reserved' に昇格
  → その人にLINEで通知
「キャンセルが出たため{イベント名}の予約が確定しました！」
```

### キャンセル待ち登録フロー

```
定員に達した状態で予約
  ↓
reservation.status → 'waitlisted'
waitlist_order → 現在の最大値 + 1
  ↓
参加者にLINEで通知
「{イベント名}は満席のためキャンセル待ち{N}番目に登録しました」
```

### 前払いフロー（Stripe Connect）

```
参加者が予約ボタンをタップ
  ↓
Stripe Checkoutを開く（主催者のConnectアカウントに集金）
  ↓
決済完了
  → Webhook: payment_intent.succeeded
  → reservation.status → 'reserved'
  → reservation.paid_at を記録
  ↓
参加者・主催者双方にLINEで通知
```

> Stripe Connectの手数料：3.6% + 振込手数料。主催者はKYC（氏名・生年月日・銀行口座）の登録が必要。

### LINEフォロー強制

```
LIFFアプリ起動時
  ↓
liff.getFriendship() で友だち登録状態を確認
  ↓
未登録の場合
  → 友だち追加ボタンのみ表示
  → 予約フォームには進めない
```

---

## 14. CSV エクスポート仕様

### エクスポート種別

| 種別 | エンドポイント | 内容 |
|---|---|---|
| イベント別参加者 | `GET /api/admin/events/:eventId/export` | 名前・学年・性別・予約日時・ステータス・支払い状況 |
| 全参加者名簿 | `GET /api/admin/members/export` | 名前・学年・性別・登録日・参加イベント数 |

### CSVフォーマット（イベント別）

```
名前,学年,性別,予約日時,ステータス,支払い状況
山田太郎,大学2年,男性,2025-05-01 18:32,参加確定,支払済
鈴木花子,社会人,女性,2025-05-02 10:15,キャンセル待ち1番,未払い
```

---

## 15. 主催者認証仕様

```
① メールアドレス＋パスワードで登録
  ↓
② Stripeの本人確認（KYC）フローへ誘導
   ・氏名・生年月日・電話番号・銀行口座を登録
   ・Stripe側で本人確認を完了
  ↓
③ Stripe ConnectアカウントIDを tenants.stripe_account_id に保存
  ↓
④ ダッシュボードへ
```

> 電話番号認証はStripe ConnectのKYCフロー内で完結するため、TwilioなどSMS認証サービスの追加コストは不要。

---

## 16. フェーズ別実装計画

### Phase 1：自分用で動くものを作る
- [ ] 自テナント固定でイベント作成・参加者管理
- [ ] LIFFでイベント一覧・予約フォーム
- [ ] LINE友だち登録強制（liff.getFriendship()）
- [ ] LINE Messaging APIで予約完了メッセージ送信（ON/OFF）
- [ ] リマインドメッセージ送信（ON/OFF・日時指定）
- [ ] キャンセル・キャンセル待ち・自動繰り上げ通知
- [ ] 重複予約チェック（上限2回）
- [ ] 主催者管理画面（イベント・名簿・出欠）
- [ ] CSVエクスポート

### Phase 2：マルチテナント対応
- [ ] 主催者登録・ログイン機能
- [ ] Stripe Connect KYCフロー（本人確認・銀行口座）
- [ ] LINE Channel設定画面（ステップ形式・疎通チェック付き）
- [ ] Webhookのテナント振り分け（`/webhook/:tenantId`）
- [ ] 団体トップページ（友だち追加ボタン付き）
- [ ] Stripeサブスクリプション連携（フリー／スタンダード切り替え）
- [ ] プランチェック・アップグレード導線

### Phase 3：SaaS基盤整備
- [ ] イベント前払い機能（Stripe Connect決済）
- [ ] 参加者への一斉メッセージ送信
- [ ] 統計・分析ダッシュボード

### 備考
- next.js、nestJS、reactを教えながら一緒に開発をしてください。