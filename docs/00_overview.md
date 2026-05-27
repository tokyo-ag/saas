# 概要

## 目的

COMIU は、サークル・コミュニティ・交流会の主催者が、イベント作成、参加者募集、予約管理、通知、メンバー対応を LINE と Web 管理画面で完結できるようにする SaaS である。

参加者は LINE LIFF 上でイベント閲覧、プロフィール登録、予約、キャンセル、友達とのつながり、管理者への問い合わせを行う。検索流入向けには公開イベントページ、団体ページ、スポーツカテゴリページを提供する。

## システム境界

COMIU が担当する範囲:

- テナントごとの団体管理
- 主催者アカウント認証
- イベント管理
- 予約・キャンセル・キャンセル待ち
- 参加者プロフィール管理
- LINE LIFF 体験
- LINE Messaging API による通知
- Stripe によるSaaS課金・イベント決済連携
- 公開ページのSEO
- サポートチャット
- スーパー管理者によるテナント管理

外部サービスが担当する範囲:

- LINE Login / LIFF / Messaging API
- Stripe Checkout / PaymentIntent / Webhook
- Gmail OAuth によるメール送信
- Vercel Blob による画像保存
- Vercel / Railway によるホスティング

## ユーザー種別

| 種別 | 説明 |
| --- | --- |
| 参加者 | LINE/LIFFからイベント閲覧・予約を行うユーザー |
| 主催者 | テナント管理画面でイベント・メンバー・通知を管理するユーザー |
| スーパー管理者 | COMIU運営者。テナント管理、BAN、代理ログイン、サポート対応を行う |
| 検索ユーザー | Google等から公開ページへ流入する未ログインユーザー |

## 現在の主要機能

- メール/パスワード登録、ログイン、メール確認、パスワードリセット
- LINE Login による主催者登録導線
- テナント単位のイベントCRUD
- イベント画像、アイコン、カテゴリ、タグ、日時、価格、定員、通知設定
- 予約、キャンセル、キャンセル待ち
- CSVエクスポート
- QR/チェックイン
- 参加者管理、ブロック、LINEプロフィール同期
- 管理者・参加者間メッセージ
- 参加者同士のコネクション・メッセージ
- イベントレビューと公開制御
- LIFF通知、LINE通知、リマインド
- 公開イベント・団体・スポーツカテゴリ・活用事例・料金ページ
- robots.txt / sitemap.xml / JSON-LD / OGP
- Stripe SaaS課金
- スーパー管理者によるテナント作成、停止、復元、BAN、削除、代理ログイン

## ディレクトリ

```txt
backend/   NestJS API, Prisma schema, migrations
frontend/  Next.js frontend, public pages, admin, LIFF UI
docs/      要件・設計・運用・ADR・図表
```

## 関連ドキュメント

- [要件定義](01_requirements.md)
- [基本設計](04_basic_design.md)
- [API仕様](07_api_spec.md)
- [DB設計・ER図](08_database_design.md)
- [セキュリティ設計](09_security_design.md)
