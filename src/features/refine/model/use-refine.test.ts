import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useRefine } from "./use-refine"
import { useRefinementStore } from "@/entities/refinement"
import { useOllamaModelStore } from "@/entities/ollama-model"

async function* mockStream(tokens: string[]) {
  for (const token of tokens) yield token
}

vi.mock("@/shared/adapters/ollama", () => ({
  OllamaAdapter: vi.fn().mockImplementation(function () {
    return {
      stream: vi.fn().mockReturnValue(mockStream(["承知", "しました", "。"])),
    }
  }),
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
