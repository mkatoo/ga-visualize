# 遺伝的アルゴリズム可視化アプリケーション

2次元の実数値関数を遺伝的アルゴリズムで最適化し、その収束過程をリアルタイムで可視化するWebアプリケーションです。

[https://mkatoo.github.io/ga-visualize/](https://mkatoo.github.io/ga-visualize/)

## 特徴

- Sphere・Rosenbrock・Ackley・Rastrigin・Beale関数の最小値を探索
- 世代ごとの個体分布と収束過程を2D・3Dでリアルタイムに表示
- 選択した関数の地形をヒートマップ・等高線・3D曲面で表示
- 最良評価値・平均評価値の推移をグラフで表示

## 技術仕様

### 遺伝的アルゴリズム

- 個体数: 1-1000（デフォルト: 100）
- 変数の範囲
  - Sphere関数: x, y ∈ [-10, 10]
  - Rosenbrock関数: x, y ∈ [-2, 2]
  - Ackley関数: x, y ∈ [-5, 5]
  - Rastrigin関数: x, y ∈ [-5.12, 5.12]
  - Beale関数: x, y ∈ [-4.5, 4.5]
- 選択手法: トーナメント選択（サイズ: 3）
- 交叉手法: BLX-α交叉（α = 0.5）
- 突然変異: ガウシアン変異（突然変異率: 0.1）
- 世代数: 1-1000（デフォルト: 50）

### 技術スタック

- フロントエンド: SolidJS + TypeScript
- 可視化: Canvas API（2D）、Three.js（3D、選択時に読み込み）
- ビルドツール: Vite
- コード品質: Biome (linting, formatting)
- テスト: Vitest + Testing Library
- スタイリング: CSS3

## セットアップ

### 必要な環境

- Node.js 24
- npm

### インストールと実行

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# プレビュー
npm run serve

# テスト実行
npm run test

# テストを1回実行
npm run test:ci

# テストカバレッジ付き実行
npm run test -- --coverage

# 型チェック
npm run typecheck

# コード品質チェック
npm run lint          # linting
npm run format        # formatting
npm run check         # lint + format チェック
npm run check:fix     # 自動修正
```

開発サーバーを起動したら、ブラウザで `http://localhost:3000` にアクセスしてください。

## 利用上の注意

- 実行中は個体数・世代数・最適化関数を変更できません。
- 色の尺度は関数と探索範囲ごとに固定され、世代によって変化しません。
- 対数尺度には `log(1 + 評価値)` を使います。色・高さの目盛には元の評価値を表示します。
- 3Dの高さの尺度を変更しても、色の尺度とGAの評価値は変わりません。
- 3D表示にはWebGL 2が必要です。
- 3Dでは、点が近似した曲面から少し離れたり、谷底で隠れたりする場合があります。

## カスタマイズ

### アルゴリズムパラメータ

`src/genetic-algorithm.ts` の `DEFAULT_CONFIG` を変更すると、次のパラメータを調整できます。

- `populationSize`: 個体数（1-1000）
- `generations`: 世代数（1-1000）
- `mutationRate`: 突然変異率（0.0-1.0、デフォルト: 0.1）
- `crossoverRate`: 交叉率（0.0-1.0、デフォルト: 0.8）
- `tournamentSize`: トーナメントサイズ（デフォルト: 3）
- `functionType`: 最適化関数
- `bounds`: 変数の範囲（関数タイプに応じて自動設定）

## テスト

単体テストで最適化関数・遺伝的操作・可視化と状態管理を検証しています。
