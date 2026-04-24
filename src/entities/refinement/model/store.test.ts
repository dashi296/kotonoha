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
    expect(state.error).toBeNull()
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
