# COMIU Backend

NestJS + Prisma + PostgreSQLで構成したCOMIUのAPIサーバーです。

## 主な責務

- 管理者認証、メール確認、パスワードリセット
- テナント、イベント、予約、メンバー管理
- LIFF向け参加者API
- LINE Messaging / LINE Webhook連携
- Stripe Checkout / Webhook連携
- Superadmin向け管理API

## 開発コマンド

```bash
npm install
npm run start:dev
npm run build
npm run test
npm run test:e2e
npx prisma migrate dev
```

## ドキュメント

プロジェクト全体の仕様、設計、ADR、図はリポジトリ直下の[README](../README.md)と[docs](../docs/00_overview.md)を参照してください。
