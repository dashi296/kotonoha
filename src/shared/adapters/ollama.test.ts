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
