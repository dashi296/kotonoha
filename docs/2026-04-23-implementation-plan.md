# Kotonoha プロジェクト基盤 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tauri v2 + React TypeScript + FSD 構成のプロジェクト基盤を構築し、Ollama を使ったテキスト変換が動作する状態にする。

**Architecture:** Feature Sliced Design (Slim FSD) で `app / routes / features / entities / shared` の5層構成。shadcn/ui コンポーネントは `src/shadcn/` に独立配置。LLM アクセスはすべて `ModelAdapter` 抽象を通じて行い、UI からの直接呼び出しを禁止する。

**Tech Stack:** Tauri v2, React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Zustand, TanStack Router, Vitest, Ollama

---

## ファイルマップ

| ファイル | 役割 |
|---------|------|
| `src/app/index.tsx` | ルート App コンポーネント・ルーター設定 |
| `src/app/providers.tsx` | Zustand・i18n プロバイダ |
| `src/app/styles/global.css` | Tailwind base styles |
| `src/routes/__root.tsx` | TanStack Router ルートレイアウト |
| `src/routes/index.tsx` | メイン画面（テキスト変換） |
| `src/routes/settings.tsx` | 設定画面（モデル・言語） |
| `src/shared/adapters/types.ts` | `ModelAdapter` interface・`SupportedLanguage` 型 |
| `src/shared/adapters/ollama.ts` | `OllamaAdapter` 実装（generate / stream） |
| `src/shared/prompts/index.ts` | `buildPrompt()` 関数 |
| `src/shared/prompts/ja.ts` | 日本語プロンプトテンプレート |
| `src/shared/prompts/en.ts` | 英語プロンプトテンプレート |
| `src/shared/i18n/types.ts` | `I18nDictionary` 型 |
| `src/shared/i18n/ja.ts` | 日本語 UI テキスト |
| `src/shared/i18n/en.ts` | 英語 UI テキスト |
| `src/shared/i18n/index.ts` | `getI18n()` 関数 |
| `src/shared/lib/utils.ts` | shadcn/ui `cn()` ヘルパー |
| `src/shared/types/index.ts` | グローバル型定義 |
| `src/entities/refinement/model/types.ts` | `RefinementState` 型 |
| `src/entities/refinement/model/store.ts` | Zustand refinement store |
| `src/entities/refinement/index.ts` | Public API |
| `src/entities/ollama-model/model/types.ts` | `OllamaModel` 型 |
| `src/entities/ollama-model/model/store.ts` | Zustand ollama-model store |
| `src/entities/ollama-model/index.ts` | Public API |
| `src/features/refine/model/use-refine.ts` | テキスト変換ロジック（streaming hook） |
| `src/features/refine/ui/RefineForm.tsx` | 入力フォームコンポーネント |
| `src/features/refine/ui/RefineResult.tsx` | 変換結果表示（streaming 対応） |
| `src/features/refine/index.ts` | Public API |
| `src/features/copy-to-clipboard/index.ts` | クリップボードコピー機能 |
| `src/features/language-switch/index.ts` | 言語切り替え機能 |
| `src/features/model-switch/index.ts` | モデル切り替え機能 |
| `src/test-setup.ts` | Vitest グローバルセットアップ |
| `src-tauri/src/commands/mod.rs` | Tauri コマンド登録 |
| `src-tauri/src/commands/clipboard.rs` | クリップボード Tauri コマンド |
| `vitest.config.ts` | Vitest 設定 |
| `components.json` | shadcn/ui 設定 |

---

## Task 1: Tauri v2 プロジェクト初期化

**Files:**
- Create: `package.json`, `src-tauri/`, `src/`, `vite.config.ts`, `tsconfig.json`

- [ ] **Step 1: プロジェクトを生成する**

```bash
cd ~/projects
npm create tauri-app@latest kotonoha -- --template react-ts --manager npm
cd kotonoha
```

プロンプトが出た場合: Project name → `kotonoha`, Frontend → `React`, TypeScript → yes

- [ ] **Step 2: 依存パッケージをインストールする**

```bash
npm install
```

- [ ] **Step 3: 起動確認する**

```bash
npm run tauri dev
```

Expected: Tauri ウィンドウが開き「Vite + React」のデフォルト画面が表示される。確認後 Ctrl+C で停止。

- [ ] **Step 4: 既存の不要ファイルを削除する**

```bash
rm src/App.tsx src/App.css src/assets/react.svg public/vite.svg
```

- [ ] **Step 5: コミットする**

```bash
git add -A
git commit -m "chore: Tauri v2 + React TypeScript プロジェクト初期化"
```

---

## Task 2: Tailwind CSS v4 セットアップ

**Files:**
- Create: `src/app/styles/global.css`
- Modify: `vite.config.ts`, `index.html`

- [ ] **Step 1: Tailwind CSS をインストールする**

```bash
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: vite.config.ts に Tailwind プラグインを追加する**

```ts
// vite.config.ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

- [ ] **Step 3: グローバル CSS ファイルを作成する**

```bash
mkdir -p src/app/styles
```

```css
/* src/app/styles/global.css */
@import "tailwindcss";
```

- [ ] **Step 4: index.html を更新してグローバル CSS を読み込む**

```html
<!-- index.html -->
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kotonoha</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: main.tsx を更新して global.css をインポートする**

```tsx
// src/main.tsx
import React from "react"
import ReactDOM from "react-dom/client"
import "./app/styles/global.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="p-4 text-2xl font-bold">Kotonoha</div>
  </React.StrictMode>
)
```

- [ ] **Step 6: Tailwind が効いているか確認する**

```bash
npm run dev
```

Expected: ブラウザで太字の「Kotonoha」が表示される。確認後 Ctrl+C で停止。

- [ ] **Step 7: tsconfig.json にパスエイリアスを追加する**

`compilerOptions` に以下を追加:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- [ ] **Step 8: コミットする**

```bash
git add -A
git commit -m "chore: Tailwind CSS v4 セットアップ"
```

---

## Task 3: shadcn/ui セットアップ

**Files:**
- Create: `components.json`, `src/shared/lib/utils.ts`, `src/shadcn/`

- [ ] **Step 1: shadcn/ui を初期化する**

```bash
npx shadcn@latest init
```

以下のオプションを選択:
- Style: `Default`
- Base color: `Slate`
- CSS variables: `yes`

- [ ] **Step 2: components.json のコンポーネントパスを修正する**

`components.json` を開き、aliases を以下に変更する:

```json
{
  "aliases": {
    "components": "@/shadcn",
    "utils": "@/shared/lib/utils"
  }
}
```

- [ ] **Step 3: utils.ts を正しい場所に移動する**

shadcn が `src/lib/utils.ts` を生成した場合は移動する:

```bash
mkdir -p src/shared/lib
mv src/lib/utils.ts src/shared/lib/utils.ts
rmdir src/lib 2>/dev/null || true
```

- [ ] **Step 4: Button コンポーネントを追加して動作確認する**

```bash
npx shadcn@latest add button
```

Expected: `src/shadcn/button.tsx` が生成される。

- [ ] **Step 5: main.tsx で Button を使って表示確認する**

```tsx
// src/main.tsx
import React from "react"
import ReactDOM from "react-dom/client"
import "./app/styles/global.css"
import { Button } from "@/shadcn/button"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="p-4">
      <Button>Kotonoha</Button>
    </div>
  </React.StrictMode>
)
```

```bash
npm run dev
```

Expected: ブラウザでスタイル付きのボタンが表示される。確認後 Ctrl+C で停止。

- [ ] **Step 6: main.tsx を元に戻す**

```tsx
// src/main.tsx
import React from "react"
import ReactDOM from "react-dom/client"
import "./app/styles/global.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="p-4 text-2xl font-bold">Kotonoha</div>
  </React.StrictMode>
)
```

- [ ] **Step 7: コミットする**

```bash
git add -A
git commit -m "chore: shadcn/ui セットアップ（コンポーネントパス: src/shadcn）"
```

---

## Task 4: TanStack Router セットアップ

**Files:**
- Create: `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/settings.tsx`
- Modify: `vite.config.ts`, `src/main.tsx`

- [ ] **Step 1: TanStack Router をインストールする**

```bash
npm install @tanstack/react-router
npm install -D @tanstack/router-plugin
```

- [ ] **Step 2: vite.config.ts に TanStack Router プラグインを追加する**

```ts
// vite.config.ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import path from "path"

export default defineConfig({
  plugins: [
    TanStackRouterVite({ routesDirectory: "./src/routes" }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

- [ ] **Step 3: ルートファイルを作成する**

```tsx
// src/routes/__root.tsx
import { createRootRoute, Link, Outlet } from "@tanstack/react-router"

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  ),
})
```

```tsx
// src/routes/index.tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: () => (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Kotonoha</h1>
      <p className="text-muted-foreground">テキストを入力して変換してください</p>
    </div>
  ),
})
```

```tsx
// src/routes/settings.tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/settings")({
  component: () => (
    <div className="p-4">
      <h1 className="text-2xl font-bold">設定</h1>
    </div>
  ),
})
```

- [ ] **Step 4: main.tsx にルーターを設定する**

```bash
npm run dev
```

TanStack Router プラグインが `src/routeTree.gen.ts` を自動生成する。確認後 Ctrl+C で停止。

```tsx
// src/main.tsx
import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import "./app/styles/global.css"

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
```

- [ ] **Step 5: 動作確認する**

```bash
npm run dev
```

Expected: ブラウザで「Kotonoha」と表示され、`/settings` で「設定」が表示される。確認後 Ctrl+C で停止。

- [ ] **Step 6: コミットする**

```bash
git add -A
git commit -m "chore: TanStack Router ファイルベースルーティング セットアップ"
```

---

## Task 5: Vitest + React Testing Library セットアップ

**Files:**
- Create: `vitest.config.ts`, `src/test-setup.ts`

- [ ] **Step 1: テスト依存パッケージをインストールする**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: vitest.config.ts を作成する**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

- [ ] **Step 3: テストセットアップファイルを作成する**

```ts
// src/test-setup.ts
import "@testing-library/jest-dom"

// Tauri の invoke をモック（ブラウザ環境では未定義のため）
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))
```

- [ ] **Step 4: package.json にテストスクリプトを追加する**

`scripts` に追加:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

- [ ] **Step 5: 動作確認用の仮テストを作成して実行する**

```ts
// src/test-setup.test.ts
describe("test setup", () => {
  it("should work", () => {
    expect(true).toBe(true)
  })
})
```

```bash
npm run test:run
```

Expected: `1 passed` と表示される。

- [ ] **Step 6: 仮テストを削除してコミットする**

```bash
rm src/test-setup.test.ts
git add -A
git commit -m "chore: Vitest + React Testing Library セットアップ"
```

---

## Task 6: shared/prompts — 言語別プロンプトテンプレート (TDD)

**Files:**
- Create: `src/shared/prompts/ja.ts`
- Create: `src/shared/prompts/en.ts`
- Create: `src/shared/prompts/index.ts`
- Create: `src/shared/prompts/index.test.ts`

- [ ] **Step 1: SupportedLanguage 型を先に定義する**

`adapters/types.ts` の型定義のみを先に作成する（実装は Task 7）:

```ts
// src/shared/adapters/types.ts
export type SupportedLanguage = "ja" | "en"

export interface ModelAdapter {
  generate(prompt: string, lang: SupportedLanguage): Promise<string>
  stream(prompt: string, lang: SupportedLanguage): AsyncIterable<string>
}
```

```bash
mkdir -p src/shared/adapters
```

- [ ] **Step 2: 失敗するテストを書く**

```ts
// src/shared/prompts/index.test.ts
import { describe, it, expect } from "vitest"
import { buildPrompt } from "./index"

describe("buildPrompt", () => {
  it("ja: 敬語変換の指示を含むプロンプトを返す", () => {
    const prompt = buildPrompt("了解です", "ja")
    expect(prompt).toContain("了解です")
    expect(prompt).toContain("敬語")
  })

  it("en: polite rewrite の指示を含むプロンプトを返す", () => {
    const prompt = buildPrompt("got it", "en")
    expect(prompt).toContain("got it")
    expect(prompt).toMatch(/polite|formal/i)
  })
})
```

- [ ] **Step 3: テストが失敗することを確認する**

```bash
npm run test:run src/shared/prompts/index.test.ts
```

Expected: FAIL

- [ ] **Step 4: プロンプトテンプレートを実装する**

```ts
// src/shared/prompts/ja.ts
export const jaPrompt = (text: string): string =>
  `以下のテキストを丁寧な敬語に書き換えてください。変換後のテキストのみを出力してください。\n\n${text}`
```

```ts
// src/shared/prompts/en.ts
export const enPrompt = (text: string): string =>
  `Rewrite the following text in a polite and formal tone. Output only the rewritten text.\n\n${text}`
```

```ts
// src/shared/prompts/index.ts
import type { SupportedLanguage } from "@/shared/adapters/types"
import { jaPrompt } from "./ja"
import { enPrompt } from "./en"

export function buildPrompt(text: string, lang: SupportedLanguage): string {
  if (lang === "ja") return jaPrompt(text)
  return enPrompt(text)
}
```

- [ ] **Step 5: テストが通ることを確認する**

```bash
npm run test:run src/shared/prompts/index.test.ts
```

Expected: 2 passed

- [ ] **Step 6: コミットする**

```bash
git add src/shared/adapters/types.ts src/shared/prompts/
git commit -m "feat: SupportedLanguage 型定義と言語別プロンプトテンプレート（ja / en）"
```

---

## Task 7: shared/adapters — OllamaAdapter 実装 (TDD)

**Files:**
- Modify: `src/shared/adapters/types.ts` (Task 6 で作成済み)
- Create: `src/shared/adapters/ollama.ts`
- Create: `src/shared/adapters/ollama.test.ts`
- Create: `src/shared/adapters/index.ts`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// src/shared/adapters/ollama.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { OllamaAdapter } from "./ollama"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

describe("OllamaAdapter", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe("generate", () => {
    it("Ollama API を呼び出して結果を返す", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ response: "承知しました。" }),
      })

      const adapter = new OllamaAdapter("llama3")
      const result = await adapter.generate("了解です", "ja")

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/generate",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"stream":false'),
        })
      )
      expect(result).toBe("承知しました。")
    })
  })

  describe("stream", () => {
    it("ストリーミングでトークンを順番に返す", async () => {
      const chunks = [
        JSON.stringify({ response: "承知", done: false }),
        JSON.stringify({ response: "しました", done: false }),
        JSON.stringify({ response: "。", done: true }),
      ].join("\n")

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(chunks))
          controller.close()
        },
      })

      mockFetch.mockResolvedValue({ ok: true, body: stream })

      const adapter = new OllamaAdapter("llama3")
      const tokens: string[] = []
      for await (const token of adapter.stream("了解です", "ja")) {
        tokens.push(token)
      }

      expect(tokens).toEqual(["承知", "しました"])
    })
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm run test:run src/shared/adapters/ollama.test.ts
```

Expected: FAIL（`OllamaAdapter` が未定義）

- [ ] **Step 3: OllamaAdapter を実装する**

```ts
// src/shared/adapters/ollama.ts
import { buildPrompt } from "@/shared/prompts"
import type { ModelAdapter, SupportedLanguage } from "./types"

export class OllamaAdapter implements ModelAdapter {
  private readonly baseUrl: string

  constructor(
    private readonly model: string,
    baseUrl = "http://localhost:11434"
  ) {
    this.baseUrl = baseUrl
  }

  async generate(prompt: string, lang: SupportedLanguage): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: buildPrompt(prompt, lang),
        stream: false,
      }),
    })
    const data = await response.json()
    return data.response
  }

  async *stream(prompt: string, lang: SupportedLanguage): AsyncIterable<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: buildPrompt(prompt, lang),
        stream: true,
      }),
    })

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value)
      for (const line of text.split("\n").filter(Boolean)) {
        const parsed = JSON.parse(line) as { response: string; done: boolean }
        if (!parsed.done) yield parsed.response
      }
    }
  }
}
```

- [ ] **Step 4: Public API を作成する**

```ts
// src/shared/adapters/index.ts
export type { ModelAdapter, SupportedLanguage } from "./types"
export { OllamaAdapter } from "./ollama"
```

- [ ] **Step 5: テストが通ることを確認する**

```bash
npm run test:run src/shared/adapters/ollama.test.ts
```

Expected: 2 passed

- [ ] **Step 6: コミットする**

```bash
git add src/shared/adapters/
git commit -m "feat: OllamaAdapter 実装（ストリーミング対応）"
```

---

## Task 8: shared/i18n — UI テキスト辞書 (TDD)


**Files:**
- Create: `src/shared/i18n/types.ts`
- Create: `src/shared/i18n/ja.ts`
- Create: `src/shared/i18n/en.ts`
- Create: `src/shared/i18n/index.ts`
- Create: `src/shared/i18n/index.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// src/shared/i18n/index.test.ts
import { describe, it, expect } from "vitest"
import { getI18n } from "./index"

describe("getI18n", () => {
  it("ja: 日本語辞書を返す", () => {
    const dict = getI18n("ja")
    expect(dict.refineButton).toBe("変換")
    expect(dict.copyButton).toBe("コピー")
  })

  it("en: 英語辞書を返す", () => {
    const dict = getI18n("en")
    expect(dict.refineButton).toBe("Refine")
    expect(dict.copyButton).toBe("Copy")
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm run test:run src/shared/i18n/index.test.ts
```

Expected: FAIL

- [ ] **Step 3: i18n を実装する**

```ts
// src/shared/i18n/types.ts
export interface I18nDictionary {
  placeholder: string
  refineButton: string
  copyButton: string
  settingsTitle: string
  languageLabel: string
  modelLabel: string
}
```

```ts
// src/shared/i18n/ja.ts
import type { I18nDictionary } from "./types"

export const ja: I18nDictionary = {
  placeholder: "テキストを入力してください",
  refineButton: "変換",
  copyButton: "コピー",
  settingsTitle: "設定",
  languageLabel: "言語",
  modelLabel: "モデル",
}
```

```ts
// src/shared/i18n/en.ts
import type { I18nDictionary } from "./types"

export const en: I18nDictionary = {
  placeholder: "Enter your text",
  refineButton: "Refine",
  copyButton: "Copy",
  settingsTitle: "Settings",
  languageLabel: "Language",
  modelLabel: "Model",
}
```

```ts
// src/shared/i18n/index.ts
import type { SupportedLanguage } from "@/shared/adapters/types"
import type { I18nDictionary } from "./types"
import { ja } from "./ja"
import { en } from "./en"

const dictionaries: Record<SupportedLanguage, I18nDictionary> = { ja, en }

export function getI18n(lang: SupportedLanguage): I18nDictionary {
  return dictionaries[lang]
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
npm run test:run src/shared/i18n/index.test.ts
```

Expected: 2 passed

- [ ] **Step 5: コミットする**

```bash
git add src/shared/i18n/
git commit -m "feat: UI テキスト i18n 辞書（ja / en）"
```

---

## Task 9: entities — Zustand ストア (TDD)


**Files:**
- Create: `src/entities/refinement/model/types.ts`
- Create: `src/entities/refinement/model/store.ts`
- Create: `src/entities/refinement/model/store.test.ts`
- Create: `src/entities/refinement/index.ts`
- Create: `src/entities/ollama-model/model/types.ts`
- Create: `src/entities/ollama-model/model/store.ts`
- Create: `src/entities/ollama-model/model/store.test.ts`
- Create: `src/entities/ollama-model/index.ts`

- [ ] **Step 1: Zustand をインストールする**

```bash
npm install zustand
```

- [ ] **Step 2: refinement の失敗するテストを書く**

```ts
// src/entities/refinement/model/store.test.ts
import { describe, it, expect, beforeEach } from "vitest"
import { useRefinementStore } from "./store"
import { act } from "@testing-library/react"

beforeEach(() => {
  act(() => useRefinementStore.getState().reset())
})

describe("useRefinementStore", () => {
  it("初期状態が正しい", () => {
    const state = useRefinementStore.getState()
    expect(state.input).toBe("")
    expect(state.output).toBe("")
    expect(state.isStreaming).toBe(false)
  })

  it("setInput で input が更新される", () => {
    act(() => useRefinementStore.getState().setInput("テスト"))
    expect(useRefinementStore.getState().input).toBe("テスト")
  })

  it("appendOutput でトークンが連結される", () => {
    act(() => {
      useRefinementStore.getState().appendOutput("承知")
      useRefinementStore.getState().appendOutput("しました")
    })
    expect(useRefinementStore.getState().output).toBe("承知しました")
  })

  it("reset で状態が初期化される", () => {
    act(() => {
      useRefinementStore.getState().setInput("テスト")
      useRefinementStore.getState().appendOutput("出力")
      useRefinementStore.getState().reset()
    })
    const state = useRefinementStore.getState()
    expect(state.input).toBe("")
    expect(state.output).toBe("")
  })
})
```

- [ ] **Step 3: テストが失敗することを確認する**

```bash
npm run test:run src/entities/refinement/model/store.test.ts
```

Expected: FAIL

- [ ] **Step 4: refinement entity を実装する**

```ts
// src/entities/refinement/model/types.ts
export interface RefinementState {
  input: string
  output: string
  isStreaming: boolean
  setInput: (input: string) => void
  setOutput: (output: string) => void
  appendOutput: (chunk: string) => void
  setIsStreaming: (value: boolean) => void
  reset: () => void
}
```

```ts
// src/entities/refinement/model/store.ts
import { create } from "zustand"
import type { RefinementState } from "./types"

export const useRefinementStore = create<RefinementState>((set) => ({
  input: "",
  output: "",
  isStreaming: false,
  setInput: (input) => set({ input }),
  setOutput: (output) => set({ output }),
  appendOutput: (chunk) => set((s) => ({ output: s.output + chunk })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  reset: () => set({ input: "", output: "", isStreaming: false }),
}))
```

```ts
// src/entities/refinement/index.ts
export { useRefinementStore } from "./model/store"
export type { RefinementState } from "./model/types"
```

- [ ] **Step 5: refinement テストが通ることを確認する**

```bash
npm run test:run src/entities/refinement/model/store.test.ts
```

Expected: 4 passed

- [ ] **Step 6: ollama-model entity を実装する（テストから）**

```ts
// src/entities/ollama-model/model/store.test.ts
import { describe, it, expect } from "vitest"
import { useOllamaModelStore } from "./store"

describe("useOllamaModelStore", () => {
  it("デフォルトモデルが llama3 である", () => {
    expect(useOllamaModelStore.getState().selectedModel).toBe("llama3")
  })

  it("setSelectedModel でモデルが更新される", () => {
    useOllamaModelStore.getState().setSelectedModel("mistral")
    expect(useOllamaModelStore.getState().selectedModel).toBe("mistral")
  })
})
```

```ts
// src/entities/ollama-model/model/types.ts
export interface OllamaModel {
  name: string
  size: number
}
```

```ts
// src/entities/ollama-model/model/store.ts
import { create } from "zustand"
import type { OllamaModel } from "./types"

interface OllamaModelState {
  models: OllamaModel[]
  selectedModel: string
  setModels: (models: OllamaModel[]) => void
  setSelectedModel: (model: string) => void
}

export const useOllamaModelStore = create<OllamaModelState>((set) => ({
  models: [],
  selectedModel: "llama3",
  setModels: (models) => set({ models }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
}))
```

```ts
// src/entities/ollama-model/index.ts
export { useOllamaModelStore } from "./model/store"
export type { OllamaModel } from "./model/types"
```

- [ ] **Step 7: 全テストが通ることを確認する**

```bash
npm run test:run src/entities/
```

Expected: 6 passed

- [ ] **Step 8: コミットする**

```bash
git add src/entities/ package.json package-lock.json
git commit -m "feat: Zustand ストア（refinement / ollama-model）"
```

---

## Task 10: features/refine — テキスト変換機能 (TDD)


**Files:**
- Create: `src/features/refine/model/use-refine.ts`
- Create: `src/features/refine/model/use-refine.test.ts`
- Create: `src/features/refine/ui/RefineForm.tsx`
- Create: `src/features/refine/ui/RefineResult.tsx`
- Create: `src/features/refine/index.ts`

- [ ] **Step 1: use-refine フックの失敗するテストを書く**

```ts
// src/features/refine/model/use-refine.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useRefine } from "./use-refine"
import { useRefinementStore } from "@/entities/refinement"
import { useOllamaModelStore } from "@/entities/ollama-model"

async function* mockStream(tokens: string[]) {
  for (const token of tokens) yield token
}

vi.mock("@/shared/adapters/ollama", () => ({
  OllamaAdapter: vi.fn().mockImplementation(() => ({
    stream: vi.fn().mockReturnValue(mockStream(["承知", "しました", "。"])),
  })),
}))

beforeEach(() => {
  useRefinementStore.getState().reset()
  useRefinementStore.getState().setInput("了解です")
  useOllamaModelStore.getState().setSelectedModel("llama3")
})

describe("useRefine", () => {
  it("refine を呼ぶとストリーミングで output が更新される", async () => {
    const { result } = renderHook(() => useRefine())

    await act(async () => {
      await result.current.refine("ja")
    })

    expect(useRefinementStore.getState().output).toBe("承知しました。")
    expect(useRefinementStore.getState().isStreaming).toBe(false)
  })

  it("refine 実行中は isStreaming が true になる", async () => {
    const states: boolean[] = []
    const unsubscribe = useRefinementStore.subscribe((s) =>
      states.push(s.isStreaming)
    )

    const { result } = renderHook(() => useRefine())
    await act(async () => {
      await result.current.refine("ja")
    })

    unsubscribe()
    expect(states).toContain(true)
    expect(useRefinementStore.getState().isStreaming).toBe(false)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm run test:run src/features/refine/model/use-refine.test.ts
```

Expected: FAIL

- [ ] **Step 3: use-refine フックを実装する**

```ts
// src/features/refine/model/use-refine.ts
import { useRefinementStore } from "@/entities/refinement"
import { useOllamaModelStore } from "@/entities/ollama-model"
import { OllamaAdapter } from "@/shared/adapters/ollama"
import type { SupportedLanguage } from "@/shared/adapters"

export function useRefine() {
  const { input, reset, appendOutput, setIsStreaming } = useRefinementStore()
  const { selectedModel } = useOllamaModelStore()

  const refine = async (lang: SupportedLanguage) => {
    reset()
    setIsStreaming(true)
    const adapter = new OllamaAdapter(selectedModel)
    try {
      for await (const chunk of adapter.stream(input, lang)) {
        appendOutput(chunk)
      }
    } finally {
      setIsStreaming(false)
    }
  }

  return { refine }
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
npm run test:run src/features/refine/model/use-refine.test.ts
```

Expected: 2 passed

- [ ] **Step 5: UI コンポーネントを実装する**

```tsx
// src/features/refine/ui/RefineForm.tsx
import { Textarea } from "@/shadcn/textarea"
import { Button } from "@/shadcn/button"
import { useRefinementStore } from "@/entities/refinement"
import type { I18nDictionary } from "@/shared/i18n/types"

interface RefineFormProps {
  dict: I18nDictionary
  onRefine: () => void
}

export function RefineForm({ dict, onRefine }: RefineFormProps) {
  const { input, setInput, isStreaming } = useRefinementStore()

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={dict.placeholder}
        rows={5}
        disabled={isStreaming}
      />
      <Button onClick={onRefine} disabled={isStreaming || !input.trim()}>
        {dict.refineButton}
      </Button>
    </div>
  )
}
```

```tsx
// src/features/refine/ui/RefineResult.tsx
import { Button } from "@/shadcn/button"
import { useRefinementStore } from "@/entities/refinement"
import type { I18nDictionary } from "@/shared/i18n/types"

interface RefineResultProps {
  dict: I18nDictionary
  onCopy: () => void
}

export function RefineResult({ dict, onCopy }: RefineResultProps) {
  const { output, isStreaming } = useRefinementStore()

  if (!output && !isStreaming) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border bg-muted p-3 min-h-[120px] whitespace-pre-wrap text-sm">
        {output}
        {isStreaming && <span className="animate-pulse">▍</span>}
      </div>
      <Button variant="outline" onClick={onCopy} disabled={isStreaming || !output}>
        {dict.copyButton}
      </Button>
    </div>
  )
}
```

Textarea が未追加の場合は追加する:

```bash
npx shadcn@latest add textarea
```

- [ ] **Step 6: Public API を作成する**

```ts
// src/features/refine/index.ts
export { useRefine } from "./model/use-refine"
export { RefineForm } from "./ui/RefineForm"
export { RefineResult } from "./ui/RefineResult"
```

- [ ] **Step 7: コミットする**

```bash
git add src/features/refine/ src/shadcn/
git commit -m "feat: features/refine — ストリーミング対応テキスト変換機能"
```

---

## Task 11: features — コピー・言語切替・モデル切替


**Files:**
- Create: `src/features/copy-to-clipboard/index.ts`
- Create: `src/features/language-switch/index.ts`
- Create: `src/features/model-switch/index.ts`

- [ ] **Step 1: copy-to-clipboard を実装する**

Tauri v2 のクリップボード API を使用する:

```bash
npm install @tauri-apps/plugin-clipboard-manager
```

`src-tauri/Cargo.toml` の `[dependencies]` に追加:

```toml
tauri-plugin-clipboard-manager = "2"
```

`src-tauri/src/lib.rs` の `tauri::Builder` に追加:

```rust
.plugin(tauri_plugin_clipboard_manager::init())
```

```ts
// src/features/copy-to-clipboard/index.ts
import { writeText } from "@tauri-apps/plugin-clipboard-manager"

export async function copyToClipboard(text: string): Promise<void> {
  await writeText(text)
}
```

- [ ] **Step 2: language-switch を実装する**

```ts
// src/features/language-switch/index.ts
import type { SupportedLanguage } from "@/shared/adapters"

export const SUPPORTED_LANGUAGES: { value: SupportedLanguage; label: string }[] = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "English" },
]
```

- [ ] **Step 3: model-switch を実装する**

```ts
// src/features/model-switch/index.ts
import { useOllamaModelStore } from "@/entities/ollama-model"

export async function fetchOllamaModels(): Promise<string[]> {
  const response = await fetch("http://localhost:11434/api/tags")
  const data = await response.json()
  return (data.models as { name: string }[]).map((m) => m.name)
}

export { useOllamaModelStore }
```

- [ ] **Step 4: コミットする**

```bash
git add src/features/copy-to-clipboard/ src/features/language-switch/ src/features/model-switch/ src-tauri/
git commit -m "feat: クリップボード・言語切替・モデル切替 feature 実装"
```

---

## Task 12: routes — 画面実装とアプリ統合


**Files:**
- Modify: `src/routes/index.tsx`
- Modify: `src/routes/settings.tsx`
- Modify: `src/routes/__root.tsx`
- Create: `src/app/providers.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: providers.tsx を作成する**

```tsx
// src/app/providers.tsx
import type { ReactNode } from "react"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return <>{children}</>
}
```

- [ ] **Step 2: main.tsx を更新する**

```tsx
// src/main.tsx
import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import { Providers } from "./app/providers"
import "./app/styles/global.css"

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </React.StrictMode>
)
```

- [ ] **Step 3: メイン画面を実装する**

```tsx
// src/routes/index.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { RefineForm, RefineResult, useRefine } from "@/features/refine"
import { copyToClipboard } from "@/features/copy-to-clipboard"
import { SUPPORTED_LANGUAGES } from "@/features/language-switch"
import { useRefinementStore } from "@/entities/refinement"
import { getI18n } from "@/shared/i18n"
import type { SupportedLanguage } from "@/shared/adapters"
import { Link } from "@tanstack/react-router"
import { Button } from "@/shadcn/button"

export const Route = createFileRoute("/")({
  component: MainPage,
})

function MainPage() {
  const [lang, setLang] = useState<SupportedLanguage>("ja")
  const { refine } = useRefine()
  const { output } = useRefinementStore()
  const dict = getI18n(lang)

  return (
    <div className="max-w-lg mx-auto p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Kotonoha</h1>
        <div className="flex items-center gap-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as SupportedLanguage)}
            className="text-sm border rounded px-2 py-1"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <Link to="/settings">
            <Button variant="ghost" size="sm">⚙</Button>
          </Link>
        </div>
      </div>
      <RefineForm dict={dict} onRefine={() => refine(lang)} />
      <RefineResult dict={dict} onCopy={() => copyToClipboard(output)} />
    </div>
  )
}
```

- [ ] **Step 4: 設定画面を実装する**

```tsx
// src/routes/settings.tsx
import { createFileRoute, Link } from "@tanstack/react-router"
import { useEffect } from "react"
import { fetchOllamaModels, useOllamaModelStore } from "@/features/model-switch"
import { Button } from "@/shadcn/button"

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const { models, selectedModel, setModels, setSelectedModel } = useOllamaModelStore()

  useEffect(() => {
    fetchOllamaModels()
      .then((names) => setModels(names.map((name) => ({ name, size: 0 }))))
      .catch(console.error)
  }, [setModels])

  return (
    <div className="max-w-lg mx-auto p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link to="/">
          <Button variant="ghost" size="sm">← 戻る</Button>
        </Link>
        <h1 className="text-xl font-bold">設定</h1>
      </div>
      <div>
        <label className="text-sm font-medium">モデル</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="mt-1 w-full border rounded px-2 py-1"
        >
          {models.length === 0
            ? <option value={selectedModel}>{selectedModel}</option>
            : models.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))
          }
        </select>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: アプリ全体の動作確認をする**

```bash
npm run tauri dev
```

Expected:
- メイン画面にテキストエリアと「変換」ボタンが表示される
- テキストを入力して「変換」を押すと Ollama が呼ばれてストリーミングで結果が表示される（Ollama が起動中の場合）
- ⚙ボタンで設定画面に遷移できる

確認後 Ctrl+C で停止。

- [ ] **Step 6: 全テストが通ることを確認する**

```bash
npm run test:run
```

Expected: all passed

- [ ] **Step 7: コミットする**

```bash
git add -A
git commit -m "feat: メイン画面・設定画面の実装、アプリ統合完了"
```

---

## Task 13: モデルウォームアップ（起動時プリフライト）


**Files:**
- Modify: `src/app/providers.tsx`

- [ ] **Step 1: providers.tsx にウォームアップ処理を追加する**

アプリ起動時に Ollama モデルをメモリにロードしておき、初回変換の遅延を防ぐ。

```tsx
// src/app/providers.tsx
import { useEffect, type ReactNode } from "react"
import { useOllamaModelStore } from "@/entities/ollama-model"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const { selectedModel } = useOllamaModelStore()

  useEffect(() => {
    // モデルをメモリにロードするためのウォームアップリクエスト
    fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: selectedModel, prompt: "", stream: false }),
    }).catch(() => {
      // Ollama が未起動の場合は無視する
    })
  }, [selectedModel])

  return <>{children}</>
}
```

- [ ] **Step 2: 動作確認する**

```bash
npm run tauri dev
```

Expected: 開発者ツールのネットワークタブで起動直後に `http://localhost:11434/api/generate` へのリクエストが確認できる。

- [ ] **Step 3: コミットする**

```bash
git add src/app/providers.tsx
git commit -m "feat: アプリ起動時の Ollama モデルウォームアップ"
```

---

## 完了条件

- [ ] `npm run test:run` でテストが全件 pass する
- [ ] `npm run tauri dev` でアプリが起動する
- [ ] テキストを入力して「変換」を押すとストリーミングで結果が表示される（Ollama 起動中）
- [ ] 設定画面でモデルを切り替えられる
- [ ] 言語を ja / en で切り替えられる
- [ ] コピーボタンでクリップボードにコピーされる
