# ADR 0002: テナントIDと公開コードを併用する

## Status

Accepted

## Context

管理APIでは安全にテナントを識別する必要がある。一方で公開ページやLIFFでは、URLに内部UUIDを出さず、短い公開コードを使いたい。

## Decision

- 内部処理は `Tenant.id` を主識別子にする
- 公開URLでは `Tenant.code` を使う
- 管理APIはJWTから `tenantId` を取得する
- 公開APIは `tenant.code` で団体を解決する

## Consequences

良い点:

- 内部IDを隠せる
- URLが短くなる
- 管理APIのテナント分離が明確になる

注意点:

- `id` と `code` の両方を扱うため、APIごとの意味を明記する必要がある
- code変更時はcanonicalやsitemapに影響する
