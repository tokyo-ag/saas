# 非機能要件

## 実装ステータスの扱い

この文書は「最終的に満たすべき非機能要件」を含む。現時点で未実装または一部実装のSEO、セキュリティ、UGCについては、[SEO・セキュリティ・UGC戦略](12_seo_security_ugc_strategy.md) に現状、方針、ロードマップを分けて記載する。

## セキュリティ

| ID | 要件 |
| --- | --- |
| NFR-SEC-001 | 管理APIはJWTで保護する |
| NFR-SEC-002 | テナントIDをJWTから取得し、他テナントデータへアクセスさせない |
| NFR-SEC-003 | スーパー管理者APIは専用Guardで保護する |
| NFR-SEC-004 | パスワードはハッシュ化して保存する |
| NFR-SEC-005 | メール確認、パスワードリセット、再認証トークンは期限付きにする |
| NFR-SEC-006 | LINE Webhook署名を検証する |
| NFR-SEC-007 | Stripe Webhook署名を検証する |
| NFR-SEC-008 | LINE/Stripe/Gmailの秘密情報はDBまたは環境変数に置き、クライアントへ返さない |
| NFR-SEC-009 | CORSは許可originに限定する |
| NFR-SEC-010 | セキュリティヘッダをNext.jsで付与する |
| NFR-SEC-011 | レート制限を全体・認証系に適用する |
| NFR-SEC-012 | LIFF APIではLINE ID token検証により `lineUserId` なりすましを防止する |
| NFR-SEC-013 | UGC投稿では入力検証、通報、非公開化、BANの運用導線を持つ |
| NFR-SEC-014 | 管理操作、BAN、代理ログイン等の監査ログを保存する |

## 性能

| ID | 要件 |
| --- | --- |
| NFR-PERF-001 | 公開ページはSSR/SSG/ISRを利用し、検索エンジンにHTMLを返す |
| NFR-PERF-002 | sitemapは1時間程度で再検証する |
| NFR-PERF-003 | 画像は `next/image` と許可済みremotePatternsで最適化する |
| NFR-PERF-004 | 公開イベント一覧は開催日昇順で必要項目だけ返す |
| NFR-PERF-005 | 管理画面の大量データは将来ページングを導入できる設計にする |

## 可用性

| ID | 要件 |
| --- | --- |
| NFR-AVL-001 | フロントとバックエンドを分離し、片方の再デプロイ影響を局所化する |
| NFR-AVL-002 | sitemap生成時にAPI失敗しても静的URLを返す |
| NFR-AVL-003 | 外部API失敗時はユーザー操作に対して明確なエラーを返す |
| NFR-AVL-004 | スケジューラ処理は冪等に設計する |

## 保守性

| ID | 要件 |
| --- | --- |
| NFR-MNT-001 | BackendはController/Service/Moduleで責務分離する |
| NFR-MNT-002 | DBスキーマ変更はPrisma migrationで管理する |
| NFR-MNT-003 | FrontendはApp Routerのルート単位で画面を分離する |
| NFR-MNT-004 | 重要な設計判断はADRに残す |
| NFR-MNT-005 | 要件、API、DB、運用手順を `docs/` に集約する |
| NFR-MNT-006 | lint/build/test/e2eを定期的に実行できる |

## 運用

| ID | 要件 |
| --- | --- |
| NFR-OPS-001 | `.env.example` に必要環境変数を明示する |
| NFR-OPS-002 | 本番DB migrationは `prisma migrate deploy` で適用する |
| NFR-OPS-003 | 障害時にLINE/Stripe/Gmail/Vercel Blobの依存箇所を切り分けられる |
| NFR-OPS-004 | スーパー管理画面からテナント停止・BAN・サポート対応ができる |

## SEO

| ID | 要件 |
| --- | --- |
| NFR-SEO-001 | index対象ページはtitle/description/canonicalを持つ |
| NFR-SEO-002 | 公開イベントページはEvent JSON-LDを持つ |
| NFR-SEO-003 | 団体ページはOrganization/Breadcrumb/ItemList JSON-LDを持つ |
| NFR-SEO-004 | スポーツページはFAQPage/Breadcrumb/ItemList JSON-LDを持つ |
| NFR-SEO-005 | 管理・認証・LIFFページはnoindexにする |
| NFR-SEO-006 | UGCをindex対象にする場合は品質基準、公開審査、スパム対策を満たす |
| NFR-SEO-007 | 地域、種目、年代、初心者歓迎等の検索意図に対応するランディングページ戦略を持つ |

## UGC

| ID | 要件 |
| --- | --- |
| NFR-UGC-001 | レビュー、プロフィール、メッセージ等のユーザー投稿を分類して管理する |
| NFR-UGC-002 | 公開UGCと非公開UGCを明確に分離する |
| NFR-UGC-003 | 公開UGCは管理者承認または自動モデレーション後に表示する |
| NFR-UGC-004 | 個人情報、誹謗中傷、スパム、外部誘導に対する削除基準を持つ |
| NFR-UGC-005 | 投稿者、対象イベント、テナント、公開状態、作成日時を追跡できる |
