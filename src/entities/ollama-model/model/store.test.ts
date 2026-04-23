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
