# 外部設計

## 画面一覧

### 公開画面

| 画面 | URL | 概要 | index |
| --- | --- | --- | --- |
| トップ | `/` | 公開イベント・注目団体・カテゴリ導線 | yes |
| 公開イベント | `/e/:tenantCode/:eventId` | イベント詳細、LIFF予約導線 | yes |
| 公開団体 | `/clubs/:tenantCode` | 団体情報、開催予定イベント | yes |
| スポーツカテゴリ | `/sports/:category` | 種目別イベント一覧、FAQ | yes |
| 活用事例 | `/use-cases`, `/use-cases/:slug` | SEO向け活用事例 | yes |
| 料金 | `/pricing` | プラン説明 | yes |
| 規約/プライバシー | `/terms`, `/privacy` | 法務ページ | yes |

### 管理画面

| 画面 | URL | 概要 |
| --- | --- | --- |
| ログイン | `/login` | 主催者ログイン |
| 登録 | `/register`, `/register/line` | 主催者登録 |
| ダッシュボード | `/admin` | 統計、活動 |
| イベント一覧 | `/admin/events` | イベント管理 |
| イベント作成/編集 | `/admin/events/new`, `/admin/events/:id/edit` | イベントフォーム |
| イベント詳細 | `/admin/events/:id` | 予約者、レビュー、メッセージ |
| チェックイン | `/admin/events/:id/checkin` | QR/手動チェックイン |
| メンバー | `/admin/members`, `/admin/members/:id` | メンバー管理 |
| メッセージ | `/admin/messages`, `/admin/members/:id/messages` | 管理者-参加者トーク |
| 設定 | `/admin/settings/**` | 団体、アカウント、LINE、Stripe、プラン |
| サポート | `/admin/support` | COMIU運営への問い合わせ |

### LIFF画面

| 画面 | URL | 概要 |
| --- | --- | --- |
| イベント一覧 | `/liff/:tenantId` | テナント内イベント一覧 |
| イベント詳細 | `/liff/:tenantId/events/:eventId` | イベント詳細、レビュー |
| 予約 | `/liff/:tenantId/events/:eventId/reserve` | 予約入力 |
| 予約完了 | `/liff/:tenantId/events/:eventId/done` | 予約結果 |
| プロフィール | `/liff/:tenantId/profile` | 自分のプロフィール |
| プロフィール編集 | `/liff/:tenantId/profile/edit` | 名前、学年、性別 |
| コネクション | `/liff/:tenantId/connections` | 友達一覧 |
| コネクション詳細 | `/liff/:tenantId/connections/:id` | メッセージ |
| 管理者トーク | `/liff/:tenantId/admin-talk` | 主催者問い合わせ |
| サポート | `/liff/:tenantId/support` | COMIU問い合わせ |
| 通知 | `/liff/:tenantId/notifications` | アプリ内通知 |
| QR | `/liff/:tenantId/qr` | 自分のQR |

### スーパー管理

| 画面 | URL | 概要 |
| --- | --- | --- |
| ログイン | `/superadmin/login` | スーパー管理者ログイン |
| テナント管理 | `/superadmin` | テナント一覧、停止、BAN、代理ログイン |
| サポート | `/superadmin/support` | 全体サポート対応 |

## 外部API連携

| 連携先 | 用途 |
| --- | --- |
| LINE Login | 主催者登録導線 |
| LINE LIFF | 参加者識別、LINE内体験 |
| LINE Messaging API | 予約通知、リマインド、メッセージ |
| Stripe | SaaS課金、イベント決済 |
| Gmail OAuth | メール確認、パスワードリセット |
| Vercel Blob | イベント画像/アイコンアップロード |

## 入出力概要

### イベント作成

入力:

- タイトル
- 説明
- 開催日時/終了日時
- 場所/場所URL
- 定員/性別別定員
- 価格/性別別価格
- 支払い要否
- 画像/アイコン
- カテゴリ/タグ
- 通知/リマインド設定

出力:

- イベントID
- 公開/LIFF URL
- 管理画面表示

### 予約

入力:

- eventId
- lineUserId
- 名前
- 学年
- 性別

出力:

- reservationId
- status
- waitlistOrder
- stripeCheckoutUrl（必要な場合）

## エラー設計

- 認証失敗: 401
- 権限不足: 403
- 対象なし: 404
- 入力不正: 400
- 外部連携失敗: 400/500
- フロントはAPIエラーをメッセージとして表示する
