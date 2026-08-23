# らてのきろく 🐰

家族みんなでらての成長・お世話・写真を共有できる Web アプリです。

## 主な機能

- **アカウント／家族グループ共有** — メール＋パスワードでログイン。新規登録時に「家族グループを作る」か「招待コードで参加」を選べます。招待コードは `/household` ページでいつでも確認・共有できます。
- **成長記録** — うさぎごとに体重・体長・写真・メモを記録し、体重の推移を折れ線グラフで確認できます。
- **今日のお世話チェックリスト** — ごはん／お水交換／トイレ掃除／ブラッシング／遊んだ、をワンタップで記録。誰がいつ行ったかが家族全員に共有されます。過去7日間の実施状況も一覧表示。
- **家族カレンダー** — 通院・お手入れ・爪切りなどの予定を登録し、月表示のカレンダーで確認できます。
- **写真共有** — うさぎの写真をアップロードして家族で共有できるギャラリー。
- **ホームダッシュボード** — 今日のお世話状況、直近の予定、最近の写真、体重の増減をひとめで確認できます。

## 技術スタック

- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- [Prisma](https://www.prisma.io/) + PostgreSQL（[Neon](https://neon.tech) の無料枠で運用できます）
- [Auth.js (NextAuth v5)](https://authjs.dev/) — Credentials 認証
- Tailwind CSS / [Recharts](https://recharts.org/)

写真はブラウザ側でリサイズ・圧縮した上で Data URL としてデータベースに保存する、シンプルな構成にしています（外部ストレージ不要ですぐに動かせます）。

## ローカルでのセットアップ

PostgreSQL データベースが必要です（ローカルに立てても、Neon 等のクラウドDBでも構いません）。

```bash
npm install                 # 依存パッケージのインストール（prisma generate も自動実行されます）
cp .env.example .env        # DATABASE_URL と AUTH_SECRET を実際の値に書き換える
npx prisma migrate dev      # マイグレーション適用（初回にサンプルデータも投入されます）
npm run dev                 # 開発サーバーを起動 (http://localhost:3000)
```

本番環境にデプロイする場合は `AUTH_SECRET` を `openssl rand -base64 32` などで生成したランダムな値に変更してください。`npm run build` は `prisma migrate deploy` を自動実行してからビルドするので、デプロイ時にスキーマが自動的にDBへ反映されます。

### サンプルアカウント

`npx prisma migrate dev` を初めて実行すると、以下のサンプルデータが投入されます。

- メール: `mama@example.com` / パスワード: `password123`
- うさぎ「もち」の成長記録・予定・お世話ログ入り

もう一度シードし直したい場合は `npm run db:seed` を実行してください（既存データに追加されます）。

## 無料でデプロイする（Vercel + Neon）

1. **Neon でデータベースを作成**
   - https://neon.tech で GitHub アカウントなどでサインアップ
   - 「Create a project」→ 適当なプロジェクト名（例: `usagi-app`）で作成
   - ダッシュボードの「Connection string」に表示される接続文字列（`postgresql://...` で始まるもの）をコピーしておく
2. **Vercel でプロジェクトをインポート**
   - https://vercel.com で GitHub アカウントでサインアップ／ログイン
   - 「Add New...」→「Project」→ GitHub リポジトリ `777docomonejp/my-project` を選択してインポート
     （まだ Vercel から見えない場合は「Adjust GitHub App Permissions」からこのリポジトリへのアクセスを許可）
   - Framework Preset は自動で「Next.js」になります（変更不要）
3. **環境変数を設定**（インポート画面の「Environment Variables」で追加）
   - `DATABASE_URL` … 手順1でコピーした Neon の接続文字列
   - `AUTH_SECRET` … `openssl rand -base64 32` で生成したランダムな文字列
4. **Deploy をクリック**
   - ビルド時に `prisma migrate deploy` が自動実行され、Neon のデータベースにテーブルが作成されます
   - 数分で `https://<プロジェクト名>.vercel.app` のURLが発行されます
5. （任意）サンプルデータを投入したい場合は、ローカルの `.env` の `DATABASE_URL` を Neon の接続文字列に変更し、`npm run db:seed` を実行してください

## ディレクトリ構成（抜粋）

```
prisma/schema.prisma       データベーススキーマ
src/app/(app)/...          ログイン後の画面（ダッシュボード・うさぎ・お世話・カレンダー・写真・家族）
src/app/api/...            API ルート
src/components/            共通UIコンポーネント
src/lib/                   Prisma クライアント、認証ヘルパー、フォーマット関数など
```
