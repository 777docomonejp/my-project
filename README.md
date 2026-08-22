# うさぎのきろく 🐰

家族みんなでうさぎの成長・お世話・写真を共有できる Web アプリです。

## 主な機能

- **アカウント／家族グループ共有** — メール＋パスワードでログイン。新規登録時に「家族グループを作る」か「招待コードで参加」を選べます。招待コードは `/household` ページでいつでも確認・共有できます。
- **成長記録** — うさぎごとに体重・体長・写真・メモを記録し、体重の推移を折れ線グラフで確認できます。
- **今日のお世話チェックリスト** — ごはん／お水交換／トイレ掃除／ブラッシング／遊んだ、をワンタップで記録。誰がいつ行ったかが家族全員に共有されます。過去7日間の実施状況も一覧表示。
- **家族カレンダー** — 通院・お手入れ・爪切りなどの予定を登録し、月表示のカレンダーで確認できます。
- **写真共有** — うさぎの写真をアップロードして家族で共有できるギャラリー。
- **ホームダッシュボード** — 今日のお世話状況、直近の予定、最近の写真、体重の増減をひとめで確認できます。

## 技術スタック

- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- [Prisma](https://www.prisma.io/) + SQLite（開発用。本番では Postgres 等に切り替え可能）
- [Auth.js (NextAuth v5)](https://authjs.dev/) — Credentials 認証
- Tailwind CSS / [Recharts](https://recharts.org/)

写真はブラウザ側でリサイズ・圧縮した上で Data URL としてデータベースに保存する、シンプルな構成にしています（外部ストレージ不要ですぐに動かせます）。

## セットアップ

```bash
npm install                 # 依存パッケージのインストール（prisma generate も自動実行されます）
npx prisma migrate dev      # データベースの作成・マイグレーション（初回にサンプルデータも投入されます）
npm run dev                 # 開発サーバーを起動 (http://localhost:3000)
```

`.env` に以下の環境変数があります（開発用の初期値が既に設定済みです）。

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="change-this-to-a-random-string-in-production"
```

本番環境にデプロイする場合は `AUTH_SECRET` を `openssl rand -base64 32` などで生成したランダムな値に変更してください。

### サンプルアカウント

`npx prisma migrate dev` を初めて実行すると、以下のサンプルデータが投入されます。

- メール: `mama@example.com` / パスワード: `password123`
- うさぎ「もち」の成長記録・予定・お世話ログ入り

もう一度シードし直したい場合は `npm run db:seed` を実行してください（既存データに追加されます）。

## ディレクトリ構成（抜粋）

```
prisma/schema.prisma       データベーススキーマ
src/app/(app)/...          ログイン後の画面（ダッシュボード・うさぎ・お世話・カレンダー・写真・家族）
src/app/api/...            API ルート
src/components/            共通UIコンポーネント
src/lib/                   Prisma クライアント、認証ヘルパー、フォーマット関数など
```
