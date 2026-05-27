# ADR 0001: Next.js + NestJS + Prisma の分離構成を採用する

## Status

Accepted

## Context

COMIUは公開SEOページ、管理画面、LIFF UI、API、外部サービス連携を持つ。SEOと画面開発の速度、APIの責務分離、DB migration管理が必要である。

## Decision

- FrontendはNext.js App Routerを使う
- BackendはNestJSを使う
- DBアクセスはPrismaを使う
- `frontend/` と `backend/` を分けたmonorepo構成にする

## Consequences

良い点:

- 公開ページでSSR/SSG/ISRとMetadata APIを使える
- BackendはController/Service/Moduleで整理できる
- Prisma schema/migrationでDB変更を追跡できる

注意点:

- Frontend/Backendで環境変数が分かれる
- API型は手動同期になりやすい
- デプロイ単位が2つになる
