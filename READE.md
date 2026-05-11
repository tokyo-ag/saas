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

## 4. 画面一覧・UI仕様

### 参加者向け（LIFF画面）

#### 団体トップ `/liff/:tenantId`

**表示要素**
- 団体名（大見出し）
- 団体説明文
- 友だち未追加の場合：「友だち追加」ボタンのみ表示、イベント一覧は非表示
- 友だち追加済みの場合：イベントカード一覧（横2列グリッド）

**イベントカード（1枚）**
- イベントタイトル
- 開催日時（例：6/1（日）14:00）
- 残席数（例：「残り5席」「満席」「キャンセル待ち受付中」）
- タップでイベント詳細へ遷移

**空状態**
- イベントが0件：「現在募集中のイベントはありません」

---

#### イベント詳細 `/liff/:tenantId/events/:eventId`

**表示要素**
- イベントタイトル（大見出し）
- 開催日時
- 開催場所
- 参加料（0円の場合「無料」）
- 定員・残席数（定員NULLの場合「定員なし」）
- イベント説明文

**ボタン**
- 残席あり：「予約する」→ 予約フォームへ
- 満席（payment_requiredなし）：「キャンセル待ちに登録する」→ 予約フォームへ（status=waitlisted で登録）
- status=closed：「受付終了」（ボタン無効）

---

#### 予約フォーム `/liff/:tenantId/events/:eventId/reserve`

**フォーム項目**
| フィールド | 種類 | 必須 | 選択肢 |
|---|---|---|---|
| 名前 | テキスト入力 | ○ | - |
| 学年 | セレクト | ○ | 高校1年〜3年 / 大学1年〜4年 / 大学院生 / 社会人 / その他 |
| 性別 | ラジオ | ○ | 男性 / 女性 / その他・回答しない |

**バリデーション**
- 名前：1〜50文字
- 全項目必須

**ボタン**
- 「予約を確定する」→ POST /api/liff/:tenantId/reservations

**エラー表示**
- 重複予約（3回目）：「このイベントへの予約上限（2回）に達しています」
- 定員超過（payment_required=true のイベント）：「満席のため予約できません」

---

#### 予約完了 `/liff/:tenantId/events/:eventId/done`

**表示パターン**
- 通常予約：「ご予約ありがとうございます！」+ イベント名・日時・場所
- キャンセル待ち：「キャンセル待ちN番目に登録しました」+ イベント名・日時・場所
- 「LINEに戻る」ボタン（liff.closeWindow()）

---

### 主催者向け（管理画面）

#### ダッシュボード `/admin`

**表示要素**
- サマリーカード（横並び）
  - 今月のイベント数（フリープランは「2件中N件使用」）
  - 累計参加者数（フリープランは「50人中N人」）
- 直近イベント一覧（最大5件）
  - タイトル・開催日時・予約数/定員・ステータスバッジ
  - 「詳細を見る」リンク

**ボタン**
- 右上に「＋ イベントを作成」

**空状態**
- イベント0件：「まだイベントがありません。最初のイベントを作成しましょう」＋作成ボタン

---

#### イベント一覧 `/admin/events`

**タブ**
- 「予定」（held_at > 現在 かつ status=open/draft）
- 「過去」（held_at <= 現在 または status=closed）
- 「下書き」（status=draft）

**イベントカード**
- タイトル
- 開催日時・場所
- 予約数 / 定員（例：「23 / 30人」、定員なしは「23人」）
- ステータスバッジ（draft=グレー / open=緑 / closed=赤）
- 「詳細」「編集」「削除」アクション

**ボタン**
- 右上に「＋ 新規作成」

---

#### イベント作成・編集 `/admin/events/new` / `/admin/events/:eventId/edit`

**フォーム項目**
| フィールド | 種類 | 必須 | 備考 |
|---|---|---|---|
| タイトル | テキスト | ○ | 最大100文字 |
| 説明 | テキストエリア | - | |
| 開催日時 | 日時ピッカー | ○ | |
| 開催場所 | テキスト | ○ | 最大200文字 |
| 定員 | 数値入力 | - | 空欄で無制限 |
| ステータス | セレクト | ○ | draft / open / closed |
| 参加料（円） | 数値入力 | ○ | 0で無料 |
| 前払い必須 | トグル | - | 参加料 > 0 のときのみ表示 |
| 予約完了メッセージ | トグル | - | デフォルトON |
| リマインドメッセージ | トグル | - | フリープランはON不可（アップグレード案内） |

**リマインド日時サブフォーム（リマインドON時）**
```
○ 前日18:00
○ 当日09:00
○ カスタム → 日時ピッカー表示
```

**ボタン**
- 「保存」「キャンセル」
- 編集時のみ「削除」（確認ダイアログあり）

---

#### イベント詳細 `/admin/events/:eventId`

**ヘッダー**
- タイトル・日時・場所・ステータスバッジ
- 「編集」ボタン

**予約一覧テーブル**
| 列 | 内容 |
|---|---|
| 名前 | テキスト |
| 学年 | テキスト |
| 性別 | テキスト |
| 予約日時 | 日時 |
| ステータス | バッジ（予約確定 / キャンセル待ち / 参加済 / キャンセル） |
| 出欠操作 | 「参加済にする」「キャンセルにする」ボタン |

**ステータスバッジの色分け**
- reserved：青
- waitlisted：黄
- attended：緑
- cancelled：グレー
- waiting_payment：オレンジ

**ボタン**
- 「CSVダウンロード」
- 「リマインド手動送信」（確認ダイアログあり）

---

#### 参加者名簿 `/admin/members`

**検索・フィルター**
- テキスト検索（名前）
- 学年フィルター（セレクト）
- 性別フィルター（セレクト）

**テーブル**
| 列 | 内容 |
|---|---|
| 名前 | テキスト（詳細ページへのリンク） |
| 学年 | テキスト |
| 性別 | テキスト |
| 登録日 | 日付 |
| 参加イベント数 | 数値 |

**ボタン**
- 「名簿CSVダウンロード」

---

#### 参加者詳細 `/admin/members/:memberId`

**プロフィール**
- 名前・学年・性別
- 登録日
- LINE ID（先頭4文字＋マスク、例：`Uabc****`）

**参加履歴テーブル**
| 列 | 内容 |
|---|---|
| イベント名 | テキスト（イベント詳細へのリンク） |
| 開催日時 | 日時 |
| ステータス | バッジ |
| 支払い状況 | 支払済 / 未払い / 無料 |

---

#### LINE設定 `/admin/settings/line`

ステップ形式（§6参照）。

---

#### アカウント設定 `/admin/settings`

**フォーム項目**
- 団体名
- 団体説明文
- メールアドレス（変更時は現在のパスワード必要）
- パスワード変更（現在のパスワード・新しいパスワード・確認）

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
| `plan` | ENUM | `free` / `standard` |
| `plan_started_at` | TIMESTAMP | 課金開始日時 |
| `stripe_customer_id` | VARCHAR(100) | StripeカスタマーID |
| `stripe_subscription_id` | VARCHAR(100) | StripeサブスクリプションID |
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

#### GET `/api/liff/:tenantId/events`
イベント一覧取得（status=open のみ）

**Response 200**
```json
[
  {
    "id": "uuid",
    "title": "春の交流会",
    "description": "みんなで楽しく交流しましょう",
    "held_at": "2025-06-01T14:00:00",
    "location": "渋谷カフェ",
    "capacity": 30,
    "reserved_count": 25,
    "status": "open",
    "price": 0
  }
]
```

---

#### GET `/api/liff/:tenantId/events/:eventId`
イベント詳細取得

**Response 200**
```json
{
  "id": "uuid",
  "title": "春の交流会",
  "description": "みんなで楽しく交流しましょう",
  "held_at": "2025-06-01T14:00:00",
  "location": "渋谷カフェ",
  "capacity": 30,
  "reserved_count": 25,
  "status": "open",
  "price": 0,
  "payment_required": false
}
```

---

#### POST `/api/liff/:tenantId/reservations`
予約登録

**Request**
```json
{
  "event_id": "uuid",
  "line_user_id": "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "name": "山田太郎",
  "grade": "大学2年",
  "gender": "男性"
}
```

**Response 201**
```json
{
  "id": "uuid",
  "status": "reserved",
  "waitlist_order": null
}
```

キャンセル待ちの場合：
```json
{
  "id": "uuid",
  "status": "waitlisted",
  "waitlist_order": 3
}
```

**Error 409**（重複予約上限超過）
```json
{ "message": "このイベントへの予約上限（2回）に達しています" }
```

---

#### DELETE `/api/liff/:tenantId/reservations/:id`
予約キャンセル（参加者）

**Response 200**
```json
{ "message": "キャンセルしました" }
```

---

### 主催者向け（認証：JWT、Authorizationヘッダー）

#### POST `/api/auth/login`

**Request**
```json
{
  "email": "organizer@example.com",
  "password": "password123"
}
```

**Response 200**
```json
{
  "access_token": "eyJhbGci..."
}
```

**Error 401**
```json
{ "message": "メールアドレスまたはパスワードが正しくありません" }
```

---

#### GET `/api/admin/events`
イベント一覧（全ステータス）

**Response 200**
```json
[
  {
    "id": "uuid",
    "title": "春の交流会",
    "held_at": "2025-06-01T14:00:00",
    "location": "渋谷カフェ",
    "capacity": 30,
    "reserved_count": 25,
    "waitlisted_count": 2,
    "status": "open",
    "price": 0
  }
]
```

---

#### POST `/api/admin/events`
イベント作成

**Request**
```json
{
  "title": "春の交流会",
  "description": "みんなで楽しく交流しましょう",
  "held_at": "2025-06-01T14:00:00",
  "location": "渋谷カフェ",
  "capacity": 30,
  "status": "draft",
  "price": 0,
  "payment_required": false,
  "notify_on_reserve": true,
  "remind_enabled": true,
  "remind_at": "2025-05-31T18:00:00"
}
```

**Response 201**
```json
{ "id": "uuid", ...イベント全フィールド }
```

**Error 403**（フリープランの上限超過）
```json
{ "message": "今月のイベント作成上限（2件）に達しました", "upgrade_required": true }
```

---

#### PUT `/api/admin/events/:eventId`
イベント更新（POSTと同じbody）

**Response 200**：更新後のイベント全フィールド

---

#### GET `/api/admin/events/:eventId/reservations`
予約一覧取得

**Response 200**
```json
[
  {
    "id": "uuid",
    "member": {
      "id": "uuid",
      "name": "山田太郎",
      "grade": "大学2年",
      "gender": "男性"
    },
    "status": "reserved",
    "waitlist_order": null,
    "paid_at": null,
    "reserved_at": "2025-05-10T18:32:00"
  }
]
```

---

#### PATCH `/api/admin/reservations/:id/status`
出欠ステータス更新

**Request**
```json
{ "status": "attended" }
```

**Response 200**：更新後の予約データ

---

#### GET `/api/admin/members`
参加者名簿

**Query params**：`?name=山田&grade=大学2年&gender=男性`

**Response 200**
```json
[
  {
    "id": "uuid",
    "name": "山田太郎",
    "grade": "大学2年",
    "gender": "男性",
    "created_at": "2025-04-01T10:00:00",
    "event_count": 3
  }
]
```

---

#### POST `/api/admin/events/:eventId/remind`
リマインド手動送信

**Response 200**
```json
{ "sent_count": 25 }
```

---

#### GET `/api/admin/events/:eventId/export`
参加者CSV（Content-Type: text/csv）

```
名前,学年,性別,予約日時,ステータス,支払い状況
山田太郎,大学2年,男性,2025-05-01 18:32,参加確定,支払済
```

---

#### GET `/api/admin/members/export`
名簿CSV（Content-Type: text/csv）

```
名前,学年,性別,登録日,参加イベント数
山田太郎,大学2年,男性,2025-04-01,3
```

---

### LINE Webhook

#### POST `/api/webhook/:tenantId`
LINEイベント受信

**受信するイベント種別**
| type | 処理 |
|---|---|
| `follow` | line_user_id を members に保存（なければ新規作成） |
| `unfollow` | 特になし（将来的に通知も可） |

---

## 11. 技術スタック

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

### Phase 1：自分用で動くものを作る（実装順）

#### Step 1：バックエンド基盤
- [ ] NestJSプロジェクト作成（`backend/`）
- [ ] Prismaセットアップ・スキーマ定義（tenants / users / events / members / reservations）
- [ ] PostgreSQL接続設定（ローカルはDockerで起動）
- [ ] 環境変数設定（`.env`：DATABASE_URL / JWT_SECRET / LINE_* ）

#### Step 2：管理画面の骨格（フロント）
- [ ] `/admin` レイアウト（サイドバー＋ヘッダー）コンポーネント作成
- [ ] サイドバー：ダッシュボード / イベント / 参加者名簿 / 設定 へのリンク
- [ ] APIクライアント（fetch wrapper）作成：`src/lib/api.ts`
- [ ] 認証なし（Phase 1は固定テナントで動作確認）

#### Step 3：イベント機能（バック＋フロント）
- [ ] バック：`GET/POST/PUT /api/admin/events` 実装
- [ ] フロント：イベント一覧画面 `/admin/events`
- [ ] フロント：イベント作成・編集フォーム `/admin/events/new`
- [ ] フロント：イベント詳細画面 `/admin/events/:eventId`（予約一覧・出欠管理含む）

#### Step 4：参加者・予約機能（バック＋フロント）
- [ ] バック：`GET /api/admin/members` 実装
- [ ] バック：`PATCH /api/admin/reservations/:id/status` 実装
- [ ] フロント：参加者名簿 `/admin/members`
- [ ] フロント：参加者詳細 `/admin/members/:memberId`

#### Step 5：LIFF画面
- [ ] LIFF SDKのインストール・`liff.init()` 設定
- [ ] バック：`GET /api/liff/:tenantId/events` 実装
- [ ] バック：`POST /api/liff/:tenantId/reservations` 実装（重複チェック含む）
- [ ] フロント：団体トップ `/liff/:tenantId`（友だち登録チェック）
- [ ] フロント：イベント詳細 `/liff/:tenantId/events/:eventId`
- [ ] フロント：予約フォーム・完了画面

#### Step 6：LINE連携
- [ ] `@line/bot-sdk` インストール
- [ ] バック：Webhook受信エンドポイント `POST /api/webhook/:tenantId`
  - `follow` イベントで line_user_id を保存
- [ ] 予約完了時にプッシュメッセージ送信
- [ ] リマインドcronジョブ（node-cron）実装

#### Step 7：キャンセル・キャンセル待ち
- [ ] バック：`DELETE /api/liff/:tenantId/reservations/:id` 実装
- [ ] キャンセル時の自動繰り上げロジック
- [ ] 主催者へのキャンセル通知
- [ ] キャンセル待ち昇格通知

#### Step 8：CSVエクスポート
- [ ] バック：`GET /api/admin/events/:eventId/export`
- [ ] バック：`GET /api/admin/members/export`
- [ ] フロント：各画面にダウンロードボタン追加

---

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

---