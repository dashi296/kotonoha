import { vi } from "vitest"
import "@testing-library/jest-dom"

// Tauri の invoke をモック（jsdom 環境では未定義のため）
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))

// Tauri HTTP プラグインをモック（jsdom 環境では未定義のため）
vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: vi.fn(),
}))

// Tauri clipboard プラグインをモック
vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  writeText: vi.fn(),
}))
