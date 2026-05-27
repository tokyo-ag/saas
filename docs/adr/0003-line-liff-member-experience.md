# ADR 0003: 参加者体験はLINE LIFFを中心にする

## Status

Accepted

## Context

対象ユーザーはイベント参加前後の通知、予約確認、リマインドをLINEで受け取ることが自然である。通常Web会員登録は参加摩擦になる。

## Decision

- 参加者向け画面はLIFFを中心にする
- 参加者識別は `lineUserId` を使う
- メンバー情報はテナント単位で保存する
- LINE Messaging APIで通知やリマインドを送る

## Consequences

良い点:

- 参加者の導線が短い
- LINE通知と相性が良い
- 主催者の既存運用に馴染む

注意点:

- LIFF ID token検証を強化する余地がある
- LINE API障害時の代替導線が必要になる
