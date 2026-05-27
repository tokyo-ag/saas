# セキュリティ設計

## 現状と方針

この文書には実装済みの仕組みと、今後実装すべき設計を併記する。特にLIFF ID token検証、UGCモデレーション、監査ログ、秘密値暗号化は重要な未実装/強化候補であり、詳細は [SEO・セキュリティ・UGC戦略](12_seo_security_ugc_strategy.md) にまとめる。

## 認証

### 主催者

- メール/パスワードでログインする
- パスワードはハッシュ化して保存する
- JWTを発行し、管理APIでは `Authorization: Bearer` で送信する
- JWTには `tenantId` と `accountId` を含める

### スーパー管理者

- スーパー管理者は専用Guardで保護する
- `SUPERADMIN_EMAIL` 等の設定により権限付与する
- テナント横断操作はスーパー管理者に限定する

### 参加者

- LINE LIFF上で `lineUserId` を識別子として扱う
- メンバーはテナントごとに作成される
- 今後、LIFF ID tokenをBackendで検証し、クライアント申告の `lineUserId` を信頼しない設計へ移行する

## 認可

| 領域 | 認可方式 |
| --- | --- |
| `/admin/**` API | AdminGuard + tenantId |
| `/superadmin/**` API | SuperadminGuard |
| `/liff/**` API | tenantId + lineUserId |
| `/public/**` API | 公開情報のみ |
| Webhook | 署名検証 |

## テナント分離

- 管理APIはJWTの `tenantId` を必ずServiceへ渡す
- DB検索条件に `tenantId` を含める
- 公開ページでは公開コード `tenant.code` を利用する
- スーパー管理者以外は他テナントIDを任意指定できない

## 機密情報

| 種別 | 保存先 | クライアント返却 |
| --- | --- | --- |
| JWT_SECRET | 環境変数 | しない |
| LINE Channel Secret | DB | しない |
| LINE Channel Access Token | DB | しない |
| Stripe Secret Key | DB/環境変数 | しない |
| Stripe Webhook Secret | DB/環境変数 | しない |
| Gmail OAuth Secret | 環境変数 | しない |
| Blob Token | 環境変数 | しない |

`TenantService.toSafeTenant()` で秘密値を除外し、設定済みかどうかだけ返す。

## 再認証

LINE/Stripeなどの機密設定を変更する際は、再認証トークンを要求する。再認証は短時間のみ有効とする。

## Webhook

### LINE

- `x-line-signature` を検証する
- テナントごとの `lineChannelSecret` を使用する

### Stripe

- Stripe署名を検証する
- SaaS課金とテナント決済で利用するsecretを区別する

## レート制限

- グローバルに `60 requests / minute`
- 登録5回/分、ログイン10回/分、再認証5回/分、パスワードリセット・確認メール再送3回/分の個別Throttleを設定

## セキュリティヘッダ

Next.jsで以下を付与する。

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-DNS-Prefetch-Control: on`
- `Permissions-Policy`

## SEOと情報漏えい対策

- 管理画面、LIFF、認証、代理ログインはnoindex
- sitemapには公開イベント/公開団体のみ含める
- 終了イベントは検索価値が低い場合noindex

## CORS

`FRONTEND_URL` および `*.vercel.app`（Vercelプレビューデプロイ向け）のみを許可する。

## リスクと今後の改善

- LIFF APIは `lineUserId` をクライアントから受け取るため、LIFF ID token検証を強化候補とする
- 管理画面JWTの保存方式はXSSリスク評価が必要
- 監査ログの永続化が未整備
- 秘密値の暗号化保存を検討する
- UGCの通報、非公開化、削除理由、投稿制限が未整備
- 公開UGCをSEO資産化する前に品質基準とモデレーション導線が必要
