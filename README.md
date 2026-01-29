# 投資ファンドダッシュボード

過去1年分の投資ファンド価格を表示するダッシュボードです。

## 対象ファンド

- オルカン (eMAXIS Slim 全世界株式)
- S&P500 (eMAXIS Slim 米国株式)
- 宇宙開発 (eMAXIS Neo 宇宙開発)
- NASDAQ100 (eMAXIS NASDAQ100インデックス)
- 純金ファンド (三菱UFJ 純金ファンド)

## 技術スタック

- **フロントエンド**: React (CDN), TailwindCSS
- **バックエンド**: Vercel サーバーレス関数
- **データソース**: 三菱UFJアセットマネジメント 投信情報API

## 機能

- 過去1年分のファンド価格データを表示
- 価格推移チャート
- 1日1回の自動データ更新（24時間キャッシュ）
- レスポンシブデザイン

## Vercelへのデプロイ手順

### 1. GitHubにプッシュ

```bash
git add .
git commit -m "Vercel移行完了"
git push origin main
```

### 2. Vercelでプロジェクトを作成

1. [Vercel](https://vercel.com)にアクセス
2. GitHubアカウントでログイン
3. 「Add New Project」をクリック
4. GitHubリポジトリ `kabuka` を選択
5. 「Import」をクリック
6. 設定はデフォルトのまま「Deploy」をクリック

### 3. デプロイ完了

数分でデプロイが完了し、URLが発行されます。

## ローカル開発

Vercel CLIをインストールして、ローカルでサーバーレス関数をテストできます。

```bash
npm install -g vercel
vercel dev
```

ブラウザで `http://localhost:3000` を開いてください。

## キャッシュ戦略

- サーバーレス関数は24時間キャッシュを実装
- 1日1回のみMUFG APIを呼び出し
- API負荷を最小限に抑制

## ライセンス

MIT
