import { vi } from "vitest"
import "@testing-library/jest-dom"

// Tauri の invoke をモック（jsdom 環境では未定義のため）
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))
