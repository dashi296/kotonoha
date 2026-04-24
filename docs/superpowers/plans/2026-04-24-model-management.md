# Model Management Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 設定画面からOllamaモデルの一覧表示・インストール（Pull）・削除を行えるようにする。

**Architecture:** Rust側がreqwestでOllama APIを直接呼び出し、Tauriイベント経由でフロントに進捗を送信する。キャンセルはRust側の`AtomicBool`フラグで制御し、中断後に未完了blobを削除する。フロントはFSD `features/model-management/` として実装し、設定画面にシングルページのセクションとして統合する。

**Tech Stack:** Rust (reqwest, futures-util, std::sync::atomic), Tauri v2 (invoke + events), React + TypeScript, Zustand, Vitest + @testing-library/react

---

## File Map

### 新規作成
| ファイル | 責務 |
|---|---|
| `src-tauri/src/commands/mod.rs` | commandsモジュール宣言 |
| `src-tauri/src/commands/model_management.rs` | list_models / start_pull / cancel_pull / delete_model コマンド + PullState |
| `src/features/model-management/model/types.ts` | PullProgress / PullPhase 型 |
| `src/features/model-management/model/use-model-management.ts` | モデル管理フック |
| `src/features/model-management/model/use-model-management.test.ts` | フックのテスト |
| `src/features/model-management/ui/ModelList.tsx` | インストール済みモデル一覧 + 削除 |
| `src/features/model-management/ui/ModelList.test.tsx` | ModelListテスト |
| `src/features/model-management/ui/ModelPullForm.tsx` | Pull入力 + 進捗バー + キャンセル |
| `src/features/model-management/ui/ModelPullForm.test.tsx` | ModelPullFormテスト |
| `src/features/model-management/index.ts` | 公開API |
| `src/shared/constants/ollama-models.ts` | 人気モデルリスト |

### 変更
| ファイル | 変更内容 |
|---|---|
| `src-tauri/Cargo.toml` | reqwest / futures-util 追加 |
| `src-tauri/src/lib.rs` | commandsモジュール追加、PullState管理、コマンド登録 |
| `src/entities/ollama-model/model/types.ts` | OllamaModel に modified_at / digest 追加 |
| `src/features/model-switch/index.ts` | fetchOllamaModels削除（model-managementに移管） |
| `src/routes/settings.tsx` | モデル管理セクション統合、useModelManagement使用 |

---

## Task 1: Rust依存関係を追加する

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Cargo.tomlに依存関係を追加**

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
tauri-plugin-clipboard-manager = "2"
tauri-plugin-http = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.12", features = ["json", "stream"] }
futures-util = "0.3"
```

- [ ] **Step 2: ビルドが通るか確認**

```bash
cd src-tauri && cargo check
```

Expected: `Finished` (エラーなし)

---

## Task 2: Rustコマンドモジュール構造を作成する

**Files:**
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/model_management.rs`

- [ ] **Step 1: mod.rs を作成**

```rust
pub mod model_management;
```

- [ ] **Step 2: model_management.rs の骨格を作成**

```rust
use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

pub struct PullState {
    pub cancel_flag: AtomicBool,
    pub tracked_digests: Mutex<Vec<String>>,
}

impl PullState {
    pub fn new() -> Self {
        Self {
            cancel_flag: AtomicBool::new(false),
            tracked_digests: Mutex::new(Vec::new()),
        }
    }
}

#[derive(Deserialize)]
struct OllamaModelRaw {
    name: String,
    size: u64,
    modified_at: String,
    digest: String,
}

#[derive(Serialize, Clone)]
pub struct ModelInfo {
    pub name: String,
    pub size: u64,
    pub modified_at: String,
    pub digest: String,
}

#[derive(Deserialize)]
struct ListResponse {
    models: Vec<OllamaModelRaw>,
}

#[derive(Deserialize)]
struct PullProgressRaw {
    status: String,
    digest: Option<String>,
    completed: Option<u64>,
    total: Option<u64>,
}

#[derive(Serialize, Clone)]
struct PullProgress {
    status: String,
    digest: Option<String>,
    completed: Option<u64>,
    total: Option<u64>,
}
```

- [ ] **Step 3: cargo check でコンパイル確認**

```bash
cd src-tauri && cargo check
```

Expected: `Finished` (エラーなし)

---

## Task 3: list_models コマンドを実装する

**Files:**
- Modify: `src-tauri/src/commands/model_management.rs`

- [ ] **Step 1: list_models 関数を追記**

```rust
#[tauri::command]
pub async fn list_models() -> Result<Vec<ModelInfo>, String> {
    let client = Client::new();
    let response = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Ollama API error: {}", response.status()));
    }

    let data = response
        .json::<ListResponse>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(data
        .models
        .into_iter()
        .map(|m| ModelInfo {
            name: m.name,
            size: m.size,
            modified_at: m.modified_at,
            digest: m.digest,
        })
        .collect())
}
```

- [ ] **Step 2: cargo check 確認**

```bash
cd src-tauri && cargo check
```

Expected: `Finished`

---

## Task 4: start_pull / cancel_pull コマンドを実装する

**Files:**
- Modify: `src-tauri/src/commands/model_management.rs`

- [ ] **Step 1: start_pull を追記**

`AtomicBool`フラグをチェックしながらストリームを処理する。`select!`を使わないことでStream型のUnpin制約を回避する。

```rust
#[tauri::command]
pub async fn start_pull(
    app: AppHandle,
    model: String,
    state: State<'_, PullState>,
) -> Result<(), String> {
    state.cancel_flag.store(false, Ordering::SeqCst);
    {
        let mut digests = state.tracked_digests.lock().map_err(|e| e.to_string())?;
        digests.clear();
    }

    let client = Client::new();
    let response = client
        .post("http://localhost:11434/api/pull")
        .json(&serde_json::json!({ "model": model, "stream": true }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Ollama API error: {}", response.status()));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        if state.cancel_flag.load(Ordering::SeqCst) {
            break;
        }
        match chunk {
            Err(e) => return Err(e.to_string()),
            Ok(bytes) => {
                buffer.push_str(&String::from_utf8_lossy(&bytes));
                while let Some(pos) = buffer.find('\n') {
                    let line = buffer[..pos].to_string();
                    buffer = buffer[pos + 1..].to_string();
                    if line.is_empty() {
                        continue;
                    }
                    if let Ok(p) = serde_json::from_str::<PullProgressRaw>(&line) {
                        if let Some(ref digest) = p.digest {
                            let mut digests = state.tracked_digests.lock().unwrap();
                            if !digests.contains(digest) {
                                digests.push(digest.clone());
                            }
                        }
                        let _ = app.emit(
                            "pull_progress",
                            PullProgress {
                                status: p.status.clone(),
                                digest: p.digest,
                                completed: p.completed,
                                total: p.total,
                            },
                        );
                        if p.status == "success" {
                            return Ok(());
                        }
                    }
                }
            }
        }
    }

    Ok(())
}
```

- [ ] **Step 2: cancel_pull を追記**

```rust
#[tauri::command]
pub async fn cancel_pull(state: State<'_, PullState>) -> Result<(), String> {
    state.cancel_flag.store(true, Ordering::SeqCst);

    let digests = {
        let guard = state.tracked_digests.lock().map_err(|e| e.to_string())?;
        guard.clone()
    };

    let client = Client::new();
    for digest in &digests {
        let _ = client
            .delete(&format!("http://localhost:11434/api/blobs/{}", digest))
            .send()
            .await;
    }

    state
        .tracked_digests
        .lock()
        .map_err(|e| e.to_string())?
        .clear();

    Ok(())
}
```

- [ ] **Step 3: cargo check 確認**

```bash
cd src-tauri && cargo check
```

Expected: `Finished`

---

## Task 5: delete_model コマンドを実装する

**Files:**
- Modify: `src-tauri/src/commands/model_management.rs`

- [ ] **Step 1: delete_model を追記**

```rust
#[tauri::command]
pub async fn delete_model(model: String) -> Result<(), String> {
    let client = Client::new();
    let response = client
        .delete("http://localhost:11434/api/delete")
        .json(&serde_json::json!({ "model": model }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to delete model: {}", response.status()));
    }

    Ok(())
}
```

- [ ] **Step 2: cargo check 確認**

```bash
cd src-tauri && cargo check
```

Expected: `Finished`

---

## Task 6: lib.rs にコマンドを登録する

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: mod宣言とuse文を追加し、PullStateを管理、コマンドを登録**

`lib.rs` 全体を以下に差し替える:

```rust
mod commands;

use commands::model_management::{cancel_pull, delete_model, list_models, start_pull, PullState};
use std::net::TcpStream;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

struct OllamaProcess(Mutex<Option<Child>>);
struct OllamaInstalled(bool);

fn check_ollama_installed() -> bool {
    Command::new("ollama")
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .is_ok()
}

fn is_ollama_running() -> bool {
    TcpStream::connect("127.0.0.1:11434").is_ok()
}

#[tauri::command]
fn get_ollama_status(installed: tauri::State<OllamaInstalled>) -> &'static str {
    if !installed.0 {
        return "not_installed";
    }
    if is_ollama_running() {
        "running"
    } else {
        "starting"
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let installed = check_ollama_installed();
            let child = if installed && !is_ollama_running() {
                Command::new("ollama")
                    .arg("serve")
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .spawn()
                    .ok()
            } else {
                None
            };
            app.manage(OllamaInstalled(installed));
            app.manage(OllamaProcess(Mutex::new(child)));
            app.manage(PullState::new());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Ok(mut guard) = window.state::<OllamaProcess>().0.lock() {
                    if let Some(ref mut child) = *guard {
                        let _ = child.kill();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_ollama_status,
            list_models,
            start_pull,
            cancel_pull,
            delete_model,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: cargo build でビルド確認**

```bash
cd src-tauri && cargo build
```

Expected: `Finished` (エラーなし)

- [ ] **Step 3: コミット**

```bash
git add src-tauri/
git commit -m "feat: Rust モデル管理コマンドを追加（list/pull/cancel/delete）"
```

---

## Task 7: OllamaModel エンティティ型を更新する

**Files:**
- Modify: `src/entities/ollama-model/model/types.ts`

- [ ] **Step 1: types.ts を更新**

```typescript
export interface OllamaModel {
  name: string
  size: number
  modified_at: string
  digest: string
}

export interface OllamaModelState {
  models: OllamaModel[]
  selectedModel: string
  setModels: (models: OllamaModel[]) => void
  setSelectedModel: (model: string) => void
  reset: () => void
}
```

- [ ] **Step 2: 既存テストを確認**

```bash
npm run test:run -- src/entities/ollama-model
```

Expected: `test files 1 passed`

---

## Task 8: model-management feature の型を作成する

**Files:**
- Create: `src/features/model-management/model/types.ts`

- [ ] **Step 1: types.ts を作成**

```typescript
export interface PullProgress {
  status: string
  digest?: string
  completed?: number
  total?: number
}

export type PullPhase =
  | { phase: "idle" }
  | { phase: "pulling"; progress: PullProgress }
  | { phase: "success" }
  | { phase: "error"; message: string }
```

---

## Task 9: use-model-management フックを作成する

**Files:**
- Create: `src/features/model-management/model/use-model-management.ts`
- Create: `src/features/model-management/model/use-model-management.test.ts`

- [ ] **Step 1: テストを先に書く**

`src/features/model-management/model/use-model-management.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useModelManagement } from "./use-model-management"
import { useOllamaModelStore } from "@/entities/ollama-model"

const mockInvoke = vi.hoisted(() => vi.fn())
const mockListen = vi.hoisted(() => vi.fn())

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@tauri-apps/api/event", () => ({ listen: mockListen }))

const sampleModels = [
  { name: "llama3.2", size: 2000000000, modified_at: "2024-01-01T00:00:00Z", digest: "sha256:abc" },
]

beforeEach(() => {
  vi.clearAllMocks()
  useOllamaModelStore.getState().reset()
  mockListen.mockResolvedValue(() => {})
  mockInvoke.mockResolvedValue([])
})

describe("useModelManagement", () => {
  it("マウント時に list_models を呼んでストアを更新する", async () => {
    mockInvoke.mockResolvedValueOnce(sampleModels)
    const { result } = renderHook(() => useModelManagement())
    await act(async () => {})
    expect(mockInvoke).toHaveBeenCalledWith("list_models")
    expect(useOllamaModelStore.getState().models).toEqual(sampleModels)
    expect(result.current.pullPhase).toEqual({ phase: "idle" })
  })

  it("pullModel を呼ぶと phase が pulling になる", async () => {
    let progressCallback: ((e: { payload: unknown }) => void) | null = null
    mockListen.mockImplementation((_event: string, cb: (e: { payload: unknown }) => void) => {
      progressCallback = cb
      return Promise.resolve(() => {})
    })
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "start_pull") return new Promise((resolve) => setTimeout(resolve, 50))
      return Promise.resolve([])
    })

    const { result } = renderHook(() => useModelManagement())
    await act(async () => {})

    act(() => { result.current.pullModel("llama3.2") })
    await act(async () => {})

    expect(result.current.pullPhase.phase).toBe("pulling")

    await act(async () => {
      progressCallback?.({ payload: { status: "success" } })
    })

    expect(result.current.pullPhase.phase).toBe("success")
  })

  it("deleteModel を呼ぶと delete_model を invoke し一覧を再取得する", async () => {
    const { result } = renderHook(() => useModelManagement())
    await act(async () => {})

    await act(async () => {
      await result.current.deleteModel("llama3.2")
    })

    expect(mockInvoke).toHaveBeenCalledWith("delete_model", { model: "llama3.2" })
    expect(mockInvoke).toHaveBeenCalledWith("list_models")
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npm run test:run -- src/features/model-management/model/use-model-management.test.ts
```

Expected: `FAIL` (モジュールが存在しない)

- [ ] **Step 3: use-model-management.ts を実装する**

```typescript
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useCallback, useEffect, useRef, useState } from "react"
import { useOllamaModelStore } from "@/entities/ollama-model"
import type { OllamaModel } from "@/entities/ollama-model"
import type { PullPhase, PullProgress } from "./types"

export function useModelManagement() {
  const { setModels } = useOllamaModelStore()
  const [pullPhase, setPullPhase] = useState<PullPhase>({ phase: "idle" })
  const unlistenRef = useRef<(() => void) | null>(null)

  const refreshModels = useCallback(async () => {
    const models = await invoke<OllamaModel[]>("list_models")
    setModels(models)
  }, [setModels])

  useEffect(() => {
    refreshModels().catch(console.error)
  }, [refreshModels])

  const pullModel = useCallback(async (model: string) => {
    setPullPhase({ phase: "pulling", progress: { status: "starting" } })

    const unlisten = await listen<PullProgress>("pull_progress", (event) => {
      const progress = event.payload
      if (progress.status === "success") {
        setPullPhase({ phase: "success" })
        refreshModels().catch(console.error)
      } else {
        setPullPhase({ phase: "pulling", progress })
      }
    })
    unlistenRef.current = unlisten

    try {
      await invoke("start_pull", { model })
    } catch (err) {
      setPullPhase({ phase: "error", message: String(err) })
    } finally {
      unlistenRef.current?.()
      unlistenRef.current = null
    }
  }, [refreshModels])

  const cancelPull = useCallback(async () => {
    await invoke("cancel_pull")
    setPullPhase({ phase: "idle" })
    unlistenRef.current?.()
    unlistenRef.current = null
  }, [])

  const deleteModel = useCallback(async (model: string) => {
    await invoke("delete_model", { model })
    await refreshModels()
  }, [refreshModels])

  return { pullPhase, pullModel, cancelPull, deleteModel, refreshModels }
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npm run test:run -- src/features/model-management/model/use-model-management.test.ts
```

Expected: `test files 1 passed`

- [ ] **Step 5: コミット**

```bash
git add src/features/model-management/model/
git commit -m "feat: use-model-management フックを追加"
```

---

## Task 10: ModelList コンポーネントを作成する

**Files:**
- Create: `src/features/model-management/ui/ModelList.tsx`
- Create: `src/features/model-management/ui/ModelList.test.tsx`

- [ ] **Step 1: テストを先に書く**

`src/features/model-management/ui/ModelList.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ModelList } from "./ModelList"

const models = [
  { name: "llama3.2", size: 2_100_000_000, modified_at: "2024-01-01T00:00:00Z", digest: "sha256:abc" },
  { name: "gemma3", size: 4_200_000_000, modified_at: "2024-01-02T00:00:00Z", digest: "sha256:def" },
]

describe("ModelList", () => {
  it("モデル一覧を表示する", () => {
    render(<ModelList models={models} onDelete={vi.fn()} />)
    expect(screen.getByText("llama3.2")).toBeInTheDocument()
    expect(screen.getByText("gemma3")).toBeInTheDocument()
    expect(screen.getByText("2.1 GB")).toBeInTheDocument()
  })

  it("モデルが空のとき空メッセージを表示する", () => {
    render(<ModelList models={[]} onDelete={vi.fn()} />)
    expect(screen.getByText(/インストール済みのモデルがありません/)).toBeInTheDocument()
  })

  it("削除ボタンをクリックすると onDelete が呼ばれる", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(<ModelList models={models} onDelete={onDelete} />)
    await userEvent.click(screen.getAllByText("削除")[0])
    expect(onDelete).toHaveBeenCalledWith("llama3.2")
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npm run test:run -- src/features/model-management/ui/ModelList.test.tsx
```

Expected: `FAIL`

- [ ] **Step 3: ModelList.tsx を実装する**

```tsx
import type { OllamaModel } from "@/entities/ollama-model"

interface ModelListProps {
  models: OllamaModel[]
  onDelete: (name: string) => Promise<void>
}

export function ModelList({ models, onDelete }: ModelListProps) {
  if (models.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">インストール済みのモデルがありません</p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {models.map((model) => (
        <div
          key={model.name}
          className="flex items-center justify-between rounded border px-3 py-2 text-sm"
        >
          <div>
            <span className="font-medium">{model.name}</span>
            <span className="ml-2 text-muted-foreground">{formatSize(model.size)}</span>
          </div>
          <button
            className="text-destructive hover:underline text-sm"
            onClick={() => onDelete(model.name)}
          >
            削除
          </button>
        </div>
      ))}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npm run test:run -- src/features/model-management/ui/ModelList.test.tsx
```

Expected: `test files 1 passed`

- [ ] **Step 5: コミット**

```bash
git add src/features/model-management/ui/ModelList.tsx src/features/model-management/ui/ModelList.test.tsx
git commit -m "feat: ModelList コンポーネントを追加"
```

---

## Task 11: ModelPullForm コンポーネントを作成する

**Files:**
- Create: `src/features/model-management/ui/ModelPullForm.tsx`
- Create: `src/features/model-management/ui/ModelPullForm.test.tsx`
- Create: `src/shared/constants/ollama-models.ts`

- [ ] **Step 1: 人気モデルリストを作成**

`src/shared/constants/ollama-models.ts`:

```typescript
export const POPULAR_OLLAMA_MODELS = [
  "llama3.2",
  "llama3.2:1b",
  "llama3.2:3b",
  "llama3.1",
  "llama3.1:8b",
  "gemma3",
  "gemma3:2b",
  "gemma3:9b",
  "gemma3:27b",
  "mistral",
  "phi4",
  "qwen2.5",
  "qwen2.5:7b",
  "deepseek-r1",
  "deepseek-r1:7b",
] as const
```

- [ ] **Step 2: テストを先に書く**

`src/features/model-management/ui/ModelPullForm.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ModelPullForm } from "./ModelPullForm"
import type { PullPhase } from "../model/types"

const idle: PullPhase = { phase: "idle" }
const pulling: PullPhase = {
  phase: "pulling",
  progress: { status: "pulling manifest", completed: 500, total: 1000 },
}
const success: PullPhase = { phase: "success" }
const error: PullPhase = { phase: "error", message: "connection refused" }

describe("ModelPullForm", () => {
  it("idle状態ではPullボタンが表示される", () => {
    render(<ModelPullForm pullPhase={idle} onPull={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText("Pull")).toBeInTheDocument()
    expect(screen.queryByText("キャンセル")).not.toBeInTheDocument()
  })

  it("モデル名を入力してPullボタンを押すと onPull が呼ばれる", async () => {
    const onPull = vi.fn().mockResolvedValue(undefined)
    render(<ModelPullForm pullPhase={idle} onPull={onPull} onCancel={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/例:/), "llama3.2")
    await userEvent.click(screen.getByText("Pull"))
    expect(onPull).toHaveBeenCalledWith("llama3.2")
  })

  it("pulling状態ではキャンセルボタンと進捗バーが表示される", () => {
    render(<ModelPullForm pullPhase={pulling} onPull={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText("キャンセル")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toBeInTheDocument()
  })

  it("キャンセルボタンを押すと onCancel が呼ばれる", async () => {
    const onCancel = vi.fn().mockResolvedValue(undefined)
    render(<ModelPullForm pullPhase={pulling} onPull={vi.fn()} onCancel={onCancel} />)
    await userEvent.click(screen.getByText("キャンセル"))
    expect(onCancel).toHaveBeenCalled()
  })

  it("success状態では完了メッセージが表示される", () => {
    render(<ModelPullForm pullPhase={success} onPull={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/インストール完了/)).toBeInTheDocument()
  })

  it("error状態ではエラーメッセージが表示される", () => {
    render(<ModelPullForm pullPhase={error} onPull={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/connection refused/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: テストが失敗することを確認**

```bash
npm run test:run -- src/features/model-management/ui/ModelPullForm.test.tsx
```

Expected: `FAIL`

- [ ] **Step 4: ModelPullForm.tsx を実装する**

```tsx
import { useState } from "react"
import { POPULAR_OLLAMA_MODELS } from "@/shared/constants/ollama-models"
import type { PullPhase } from "../model/types"

interface ModelPullFormProps {
  pullPhase: PullPhase
  onPull: (model: string) => Promise<void>
  onCancel: () => Promise<void>
}

export function ModelPullForm({ pullPhase, onPull, onCancel }: ModelPullFormProps) {
  const [modelName, setModelName] = useState("")
  const isPulling = pullPhase.phase === "pulling"

  const handlePull = async () => {
    if (!modelName.trim()) return
    await onPull(modelName.trim())
    setModelName("")
  }

  const progress =
    pullPhase.phase === "pulling" &&
    pullPhase.progress.total != null &&
    pullPhase.progress.completed != null
      ? Math.round((pullPhase.progress.completed / pullPhase.progress.total) * 100)
      : null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          list="ollama-model-suggestions"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder="例: llama3.2:8b"
          className="flex-1 rounded border px-2 py-1 text-sm disabled:opacity-50"
          disabled={isPulling}
        />
        <datalist id="ollama-model-suggestions">
          {POPULAR_OLLAMA_MODELS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        {isPulling ? (
          <button
            className="rounded border px-3 py-1 text-sm hover:bg-muted"
            onClick={onCancel}
          >
            キャンセル
          </button>
        ) : (
          <button
            className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
            onClick={handlePull}
            disabled={!modelName.trim()}
          >
            Pull
          </button>
        )}
      </div>

      {isPulling && (
        <div className="flex flex-col gap-1">
          <div
            role="progressbar"
            aria-valuenow={progress ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 overflow-hidden rounded-full bg-secondary"
          >
            {progress != null ? (
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            ) : (
              <div className="h-full w-1/3 animate-pulse bg-primary" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">{pullPhase.progress.status}</p>
        </div>
      )}

      {pullPhase.phase === "success" && (
        <p className="text-xs text-green-600">インストール完了</p>
      )}
      {pullPhase.phase === "error" && (
        <p className="text-xs text-destructive">{pullPhase.message}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: テストが通ることを確認**

```bash
npm run test:run -- src/features/model-management/ui/ModelPullForm.test.tsx
```

Expected: `test files 1 passed`

- [ ] **Step 6: コミット**

```bash
git add src/features/model-management/ui/ src/shared/constants/
git commit -m "feat: ModelPullForm コンポーネントと人気モデルリストを追加"
```

---

## Task 12: feature/model-management の公開APIを作成する

**Files:**
- Create: `src/features/model-management/index.ts`

- [ ] **Step 1: index.ts を作成**

```typescript
export { useModelManagement } from "./model/use-model-management"
export { ModelList } from "./ui/ModelList"
export { ModelPullForm } from "./ui/ModelPullForm"
export type { PullPhase, PullProgress } from "./model/types"
```

---

## Task 13: features/model-switch を整理し settings.tsx を更新する

**Files:**
- Modify: `src/features/model-switch/index.ts`
- Modify: `src/routes/settings.tsx`

- [ ] **Step 1: model-switch から fetchOllamaModels を削除**

`src/features/model-switch/index.ts`:

```typescript
export { useOllamaModelStore } from "@/entities/ollama-model"
```

- [ ] **Step 2: settings.tsx を更新**

```tsx
import { createFileRoute, Link } from "@tanstack/react-router"
import { useOllamaModelStore } from "@/features/model-switch"
import { useModelManagement, ModelList, ModelPullForm } from "@/features/model-management"
import { Button } from "@/shadcn/button"

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const { models, selectedModel, setSelectedModel } = useOllamaModelStore()
  const { pullPhase, pullModel, cancelPull, deleteModel } = useModelManagement()

  return (
    <div className="max-w-lg mx-auto p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link to="/">
          <Button variant="ghost" size="sm">← 戻る</Button>
        </Link>
        <h1 className="text-xl font-bold">設定</h1>
      </div>

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium">使用モデル</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="mt-1 w-full border rounded px-2 py-1"
        >
          {models.length === 0
            ? <option value={selectedModel}>{selectedModel}</option>
            : models.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
        </select>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">インストール済みモデル</h2>
        <ModelList models={models} onDelete={deleteModel} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">モデルを追加</h2>
        <ModelPullForm pullPhase={pullPhase} onPull={pullModel} onCancel={cancelPull} />
      </section>
    </div>
  )
}
```

- [ ] **Step 3: 全テストが通ることを確認**

```bash
npm run test:run
```

Expected: 全テスト `passed`

- [ ] **Step 4: TypeScript型チェック**

```bash
npm run build
```

Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/features/model-management/index.ts src/features/model-switch/index.ts src/routes/settings.tsx
git commit -m "feat: モデル管理機能を設定画面に統合"
```

---

## Task 14: Tauriアプリを起動して動作確認する

- [ ] **Step 1: 開発サーバー起動**

```bash
npm run tauri dev
```

- [ ] **Step 2: 設定画面で以下を確認**
  - インストール済みモデルが一覧表示される（名前・サイズ）
  - モデル名を入力（サジェスト付き）してPullできる
  - Pull中はプログレスバーとステータスが表示される
  - キャンセルボタンでPullを中断できる
  - Pull完了後に一覧が自動更新される
  - 削除ボタンでモデルを削除できる

- [ ] **Step 3: 最終コミット（差分があれば）**

```bash
git add -A
git commit -m "fix: 動作確認後の修正"
```
