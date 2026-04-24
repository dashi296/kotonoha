# Kotonoha ディレクトリ設計

## 概要

Kotonoha のフロントエンドは Feature Sliced Design (Slim FSD) を採用する。
層は `app / routes / features / entities / shared` の5層構成とし、shadcn/ui 生成コンポーネントは FSD 層の外に独立配置する。

## 技術スタック

| 項目 | 採用技術 |
|------|----------|
| デスクトップフレームワーク | Tauri v2 |
| フロントエンド | React + TypeScript |
| ビルドツール | Vite |
| スタイリング | Tailwind CSS + shadcn/ui |
| 状態管理 | Zustand |
| ルーティング | TanStack Router |
| LLM | Ollama（ローカル） |

## ディレクトリ構造

```
kotonoha/
├── src/
│   ├── app/                        # アプリ初期化・プロバイダ
│   │   ├── providers.tsx           # Zustand, i18n プロバイダ
│   │   ├── styles/
│   │   │   └── global.css          # Tailwind base styles
│   │   └── index.tsx               # ルート App コンポーネント
│   │
│   ├── routes/                     # TanStack Router 画面単位
│   │   ├── __root.tsx              # ルートレイアウト
│   │   ├── index.tsx               # メイン画面（テキスト変換）
│   │   └── settings.tsx            # 設定画面（モデル・言語）
│   │
│   ├── features/                   # ユーザーが起こすアクション単位
│   │   ├── refine/                 # テキスト変換実行
│   │   │   ├── ui/
│   │   │   │   ├── RefineForm.tsx      # 入力フォーム
│   │   │   │   └── RefineResult.tsx    # 変換結果（ストリーミング対応）
│   │   │   ├── model/
│   │   │   │   └── use-refine.ts       # 変換ロジック（hook）
│   │   │   └── index.ts
│   │   ├── copy-to-clipboard/
│   │   │   └── index.ts
│   │   ├── language-switch/
│   │   │   └── index.ts
│   │   └── model-switch/
│   │       └── index.ts
│   │
│   ├── entities/                   # ドメインの状態・型
│   │   ├── refinement/             # 変換リクエスト・結果
│   │   │   ├── model/
│   │   │   │   ├── types.ts        # RefinementRequest, RefinementResult
│   │   │   │   └── store.ts        # Zustand store
│   │   │   └── index.ts
│   │   └── ollama-model/           # 利用可能モデル一覧
│   │       ├── model/
│   │       │   ├── types.ts
│   │       │   └── store.ts
│   │       └── index.ts
│   │
│   ├── shared/                     # 横断的リソース
│   │   ├── ui/                     # shadcn に依存しない共通コンポーネント
│   │   ├── adapters/               # ModelAdapter
│   │   │   ├── types.ts            # ModelAdapter interface, SupportedLanguage
│   │   │   └── ollama.ts           # OllamaAdapter 実装（ストリーミング対応）
│   │   ├── prompts/                # 言語別プロンプトテンプレート
│   │   │   ├── ja.ts
│   │   │   └── en.ts
│   │   ├── i18n/                   # UI テキスト辞書
│   │   │   ├── types.ts
│   │   │   ├── ja.ts
│   │   │   └── en.ts
│   │   ├── lib/
│   │   │   └── utils.ts            # shadcn/ui の cn() ヘルパー等
│   │   └── types/
│   │       └── index.ts            # グローバル型定義
│   │
│   └── shadcn/                     # shadcn/ui 生成コンポーネント（FSD 層外）
│       ├── button.tsx
│       ├── input.tsx
│       └── ...
│
├── src-tauri/                      # Rust バックエンド (Tauri v2)
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   └── commands/               # Tauri コマンド
│   │       ├── mod.rs
│   │       └── clipboard.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── CLAUDE.md
└── README.md
```

## FSD インポートルール

インポートは上位層から下位層への一方向のみ許可する。

```
app → routes → features → entities → shared → shadcn
```

- **features 間の直接インポート禁止** — 共通ロジックは `shared` または `entities` に切り出す
- **各層は `index.ts` を公開 API とする** — 内部ファイルへの直接インポート禁止

## 各層の責務

| 層 | 責務 |
|----|------|
| `app` | プロバイダ初期化、グローバルスタイル、ルーター設定 |
| `routes` | 画面レベルのレイアウト・コンポーネント合成 |
| `features` | ユーザーアクション（変換・コピー・言語切替・モデル切替）のロジックと UI |
| `entities` | ドメイン型定義と Zustand ストア |
| `shared` | ModelAdapter、プロンプトテンプレート、i18n 辞書、ユーティリティ、共通 UI コンポーネント |
| `shadcn` | shadcn/ui CLI で自動生成されるコンポーネント（手動編集可） |

## ModelAdapter インターフェース

```ts
type SupportedLanguage = "ja" | "en"

interface ModelAdapter {
  generate(prompt: string, lang: SupportedLanguage): Promise<string>
  stream(prompt: string, lang: SupportedLanguage): AsyncIterable<string>
}
```

`stream` はストリーミング出力に使用し、`RefineResult` コンポーネントがトークン単位で表示を更新する。

## Tauri コマンド

Rust 側のコマンドは `src-tauri/src/commands/` に機能別ファイルで管理する。
現時点で想定されるコマンド:

- `clipboard.rs` — クリップボード読み書き
- 将来: `shortcut.rs` — グローバルショートカット登録

## 多言語対応

- `shared/prompts/` — LLM へ渡すプロンプトテンプレート（言語ごとに異なる表現指示）
- `shared/i18n/` — UI テキスト（ボタンラベル、プレースホルダ等）の辞書
- 言語は `SupportedLanguage` 型で管理し、`features/language-switch` で切り替える

## 将来の拡張

- `widgets/` 層は複雑な合成ブロックが必要になった時点で追加する
- `SupportedLanguage` に型を追加することで新言語に対応できる
