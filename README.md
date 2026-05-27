# COMIU

COMIU は、コミュニティ・サークル・交流会のイベント管理、参加予約、LINE/LIFF 連携、メンバー管理、通知、公開SEOページ、SaaS課金を扱うマルチテナント型Webアプリケーションです。

このREADMEは入口だけに絞り、詳細な要件・設計・運用情報は `docs/` に集約しています。

## ドキュメント

- [概要](docs/00_overview.md)
- [要件定義](docs/01_requirements.md)
- [機能要件](docs/02_functional_requirements.md)
- [非機能要件](docs/03_non_functional_requirements.md)
- [基本設計](docs/04_basic_design.md)
- [外部設計](docs/05_external_design.md)
- [詳細設計・内部設計](docs/06_internal_design.md)
- [API仕様](docs/07_api_spec.md)
- [DB設計・ER図](docs/08_database_design.md)
- [セキュリティ設計](docs/09_security_design.md)
- [運用設計](docs/10_operations.md)
- [デザインドック](docs/11_design_doc.md)
- [SEO・セキュリティ・UGC戦略](docs/12_seo_security_ugc_strategy.md)
- [ADR](docs/adr/)
- [図表](docs/diagrams/)

## 技術スタック

- Frontend: Next.js App Router, React, TypeScript
- Backend: NestJS, TypeScript
- Database: PostgreSQL, Prisma
- Integrations: LINE LIFF / Messaging API, Stripe, Gmail OAuth, Vercel Blob
- Deployment想定: Vercel frontend, Railway backend

## 主要コマンド

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

## 注意

- ローカルDBは `backend/prisma/migrations` を適用した状態で利用します。
- 機密値は `.env` に置き、リポジトリへコミットしません。
- 詳細な環境変数は [運用設計](docs/10_operations.md) を参照してください。
