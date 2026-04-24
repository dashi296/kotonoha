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
    expect(result.current.ollamaError).toBeNull()
  })

  it("list_models が失敗すると ollamaError にメッセージが入る", async () => {
    mockInvoke.mockRejectedValueOnce("Ollama に接続できません。Ollama が起動しているか確認してください。")
    const { result } = renderHook(() => useModelManagement())
    await act(async () => {})
    expect(result.current.ollamaError).toContain("Ollama")
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

  it("cancelPull を呼ぶと cancel_pull を invoke し phase が idle になる", async () => {
    const { result } = renderHook(() => useModelManagement())
    await act(async () => {})

    await act(async () => {
      await result.current.cancelPull()
    })

    expect(mockInvoke).toHaveBeenCalledWith("cancel_pull")
    expect(result.current.pullPhase).toEqual({ phase: "idle" })
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
