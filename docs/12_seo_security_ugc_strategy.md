# SEO・セキュリティ・UGC戦略

## 位置づけ

この文書は、COMIUで今後強化する **SEO、セキュリティ、UGC** の戦略ドキュメントである。現時点では一部実装済みの基盤があるが、本格運用に必要な設計・実装・運用ルールは未完成である。

目的は次の3つ。

1. 現状実装と未実装を明確に分ける
2. SEO成長、セキュリティ強化、UGC活用を同じロードマップで管理する
3. UGCを検索流入資産にする前に、安全性と品質を担保する

## サマリー

| 領域 | 現状 | 目標 |
| --- | --- | --- |
| SEO | 公開ページ、metadata、sitemap、JSON-LDの基盤あり | 地域/種目/年代/目的別LPとUGCを活用した検索流入獲得 |
| セキュリティ | JWT、Guard、Webhook署名、noindex、レート制限の基盤あり | LIFF本人確認、監査ログ、秘密値保護、UGC安全対策を強化 |
| UGC | レビュー、プロフィール、メッセージ、サポートが存在 | 公開可能UGCを品質管理し、SEO資産として利用 |

## SEO戦略

### 現状実装済み

- トップページ `/`
- 公開イベントページ `/e/:tenantCode/:eventId`
- 公開団体ページ `/clubs/:tenantCode`
- スポーツカテゴリページ `/sports/:category`
- 活用事例ページ `/use-cases`
- 料金、規約、プライバシーポリシー
- `robots.txt`
- `sitemap.xml`
- canonical
- OGP / Twitter Card
- Event / Organization / FAQPage / Breadcrumb / ItemList JSON-LD
- 管理画面、認証、LIFFのnoindex

### 未実装/強化予定

- 地域別LP
  - 例: `/areas/tokyo/ikebukuro`
  - 例: `/areas/tokyo/shinjuku`
- 種目 × 地域 × 属性LP
  - 例: バドミントン 東京 20代
  - 例: フットサル 初心者 池袋
- 団体の実績ページ
  - 開催回数
  - 参加者の声
  - 過去イベント
- 終了イベントのindex方針最適化
- Search Console運用
- 構造化データ検証ワークフロー
- コンテンツ品質スコア

### SEOターゲット

優先キーワード群:

| 優先 | 検索意図 | 例 |
| --- | --- | --- |
| 高 | 今すぐ参加したい | `バドミントン サークル 東京 20代` |
| 高 | 初心者歓迎を探す | `フットサル 初心者 池袋` |
| 高 | 社会人サークル | `社会人 サークル 東京 スポーツ` |
| 中 | 交流会 | `20代 交流会 東京` |
| 中 | 主催者向け | `イベント管理 LINE 予約` |
| 低 | ブランド | `COMIU` |

### index方針

| ページ | 方針 |
| --- | --- |
| トップ | index |
| 公開イベント | 原則index |
| 終了イベント | 画像/説明/レビューなど検索価値がある場合のみindex |
| 公開団体 | index |
| スポーツ/地域LP | index |
| 活用事例 | index |
| LIFF | noindex |
| 管理/認証 | noindex |
| 検索結果風の薄い一覧 | noindexまたはcanonical集約 |

### SEOロードマップ

#### Phase 1: 技術SEOの安定化

- Search Console登録
- sitemap登録
- robots確認
- 構造化データテスト
- OGP画像確認
- Core Web Vitals確認

#### Phase 2: LP拡張

- 地域LP追加
- 種目LP拡張
- FAQ拡張
- 団体詳細のテキスト品質向上

#### Phase 3: UGC活用

- 公開承認済みレビューをイベント/団体ページへ表示
- レビュー集約ページ
- 団体実績ページ
- スパム/低品質UGC除外

#### Phase 4: 運用SEO

- キーワード別順位確認
- CTR改善
- 低品質ページのnoindex整理
- 終了イベントの棚卸し

## セキュリティ戦略

### 現状実装済み

- 管理API JWT保護
- Superadmin Guard
- テナントIDによるデータ分離
- bcrypt系のパスワードハッシュ
- メール確認
- パスワードリセット
- 再認証トークン
- LINE Webhook署名検証
- Stripe Webhook署名検証
- Throttlerによるレート制限
- CORS制限
- セキュリティヘッダ
- 管理/認証/LIFFのnoindex
- テナント秘密値のクライアント返却抑止

### 未実装/強化予定

#### LIFF本人確認

現在のLIFF APIは `lineUserId` をクライアントから受け取る箇所がある。これは実装を簡単にする一方で、なりすまし耐性が弱い。

改善方針:

- FrontendがLIFF ID tokenを取得する
- BackendにID tokenを送る
- BackendがLINEの検証エンドポイントまたは署名検証で確認する
- 検証済み `sub` を `lineUserId` として使う
- クライアント申告の `lineUserId` は段階的に廃止する

#### 監査ログ

対象操作:

- ログイン/ログアウト
- テナント設定変更
- LINE/Stripe機密設定変更
- イベント作成/削除
- 予約状態変更
- メンバーブロック
- テナント停止/BAN/削除
- 代理ログイン
- UGC削除/非公開化

保存項目:

- actorType
- actorId
- tenantId
- action
- targetType
- targetId
- before/after
- ip
- userAgent
- createdAt

#### 秘密値保護

現在は秘密値をDBに保存している。将来は以下を検討する。

- アプリケーションレベル暗号化
- KMS利用
- secret rotation
- 表示時は常にmask
- 更新時のみ再入力

#### XSS/CSRF対策

- JWT保存方式の再評価
- 管理画面入力値の表示時エスケープ
- UGC表示時のHTML禁止
- Cookie化する場合はSameSite/HttpOnly/Secureを検討

### セキュリティロードマップ

#### Phase 1: LIFF ID token検証

- token取得
- Backend検証
- API型変更
- 既存 `lineUserId` query/body の段階的廃止

#### Phase 2: 監査ログ

- `audit_logs` テーブル追加
- 管理系Serviceで記録
- Superadmin画面で閲覧

#### Phase 3: UGC安全対策

- 通報
- 非公開化
- 投稿制限
- BAN連動

#### Phase 4: 秘密値暗号化

- 暗号化方式決定
- migration
- rotation手順

## UGC戦略

### UGCの定義

COMIUにおけるUGCは、運営者または主催者ではなく参加者/ユーザーが生成するコンテンツを指す。

| UGC種別 | 現在の保存先 | 公開範囲 | SEO活用 |
| --- | --- | --- | --- |
| イベントレビュー | `EventReview` | 管理者が公開したもののみ公開 | 高 |
| プロフィール | `Member` | LIFF内中心 | 低 |
| 参加者同士メッセージ | `Message` | 当事者のみ | なし |
| 管理者トーク | `AdminMemberMessage` | 当事者のみ | なし |
| サポート | `SupportMessage` | 当事者/運営のみ | なし |
| 団体説明 | `Tenant.description` | 公開団体ページ | 中 |
| イベント説明 | `Event.description` | 公開イベントページ | 高 |

## UGC公開方針

### 公開してよいもの

- 管理者が公開承認したレビュー
- 団体説明
- イベント説明
- 主催者が管理するイベント画像

### 公開しないもの

- 参加者同士のDM
- 管理者との個別メッセージ
- サポートメッセージ
- LINE userId
- メールアドレス
- 決済情報
- 非公開プロフィール

## モデレーション方針

### 最低限必要な機能

- レビュー公開/非公開
- レビュー削除
- 通報
- 通報一覧
- 投稿者ブロック
- BANユーザー連動
- NGワード検知
- 連投制限

### 公開レビュー品質基準

公開対象:

- 実際の参加体験に基づく内容
- イベントや団体の雰囲気が伝わる内容
- 個人情報を含まない内容
- 誹謗中傷でない内容

非公開対象:

- 個人名、電話番号、住所などの個人情報
- 誹謗中傷
- 差別的表現
- 外部サービスへの誘導
- スパム
- イベントと無関係な内容

## UGCとSEO

UGCはSEO上の武器になるが、品質が低いと逆効果になる。

活用方針:

- 公開承認済みレビューだけindex対象ページへ出す
- レビュー件数が少ないページでは過度に構造化データへ載せない
- レビュー本文はHTMLを許可せずテキストのみ
- Event JSON-LDのReviewは最大件数を絞る
- 団体ページにレビュー集約を追加する場合は、低品質/重複を除外する

## UGCロードマップ

### Phase 1: 安全なレビュー公開

- 既存 `EventReview.isPublished` を軸に運用
- 管理画面で公開/非公開を明示
- 公開ページに承認済みレビューのみ表示
- JSON-LDに載せるレビュー件数を制御

### Phase 2: 通報・削除

- `ugc_reports` テーブル追加
- レビュー通報API
- Superadmin/主催者の通報一覧
- 削除理由/非公開理由の保存

### Phase 3: 投稿制限

- BANユーザーは投稿不可
- ブロックメンバーは投稿不可
- 同一イベントへの重複投稿制限
- 短時間連投制限

### Phase 4: SEO資産化

- 団体ページにレビューサマリー
- 過去開催実績
- 「参加者の声」セクション
- 地域/種目LPへのレビュー引用

## 実装候補テーブル

### ugc_reports

```prisma
model UgcReport {
  id           String   @id @default(uuid())
  tenantId     String   @map("tenant_id")
  reporterId   String?  @map("reporter_id")
  targetType   String   @map("target_type") @db.VarChar(50)
  targetId     String   @map("target_id")
  reason       String   @db.VarChar(100)
  detail       String?  @db.Text
  status       String   @default("open") @db.VarChar(20)
  resolvedBy   String?  @map("resolved_by")
  resolvedAt   DateTime? @map("resolved_at")
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([tenantId, targetType, targetId])
  @@map("ugc_reports")
}
```

### audit_logs

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  tenantId   String?  @map("tenant_id")
  actorType  String   @map("actor_type") @db.VarChar(50)
  actorId    String?  @map("actor_id")
  action     String   @db.VarChar(100)
  targetType String?  @map("target_type") @db.VarChar(50)
  targetId   String?  @map("target_id")
  metadata   Json?
  ip         String?  @db.VarChar(100)
  userAgent  String?  @map("user_agent") @db.Text
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([tenantId, action, createdAt])
  @@map("audit_logs")
}
```

## 優先順位

1. LIFF ID token検証
2. UGC公開ルールとレビュー通報
3. 監査ログ
4. 地域/種目LP拡張
5. 秘密値暗号化
6. レビューSEO活用

## 完了条件

- LIFF APIが検証済みLINE IDを使っている
- 公開UGCに通報/非公開/削除フローがある
- 管理者操作が監査ログに残る
- index対象ページとnoindex対象ページが仕様化されている
- SEOページの品質基準が運用できる
- UGCを検索流入に使っても安全な状態になっている
