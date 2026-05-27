# ADR 0004: 公開ページをSEO流入の入口にする

## Status

Accepted

## Context

COMIUはイベント予約ツールであると同時に、サークル・イベント検索の入口でもある。検索流入を獲得するには、公開イベント、団体、カテゴリページを検索エンジンに理解させる必要がある。

## Decision

- `/`, `/e/:tenantCode/:eventId`, `/clubs/:tenantCode`, `/sports/:category`, `/use-cases/**`, `/pricing` をindex対象にする
- 管理画面、LIFF、認証画面はnoindexにする
- Event/Organization/FAQPage/Breadcrumb/ItemList JSON-LDを出力する
- sitemap.xml と robots.txt をNext.jsで生成する

## Consequences

良い点:

- 検索流入を取りやすい
- OGPや検索スニペットの品質が上がる
- 管理系URLの露出を抑えられる

注意点:

- 公開APIが落ちると動的sitemapのURLが減る可能性がある
- 終了イベントのindex方針を継続的に調整する必要がある
