import { describe, it, expect, vi, beforeEach } from "vitest"
import { OllamaAdapter } from "./ollama"

const mockFetch = vi.hoisted(() => vi.fn())

vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: mockFetch,
}))

describe("OllamaAdapter", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe("stream", () => {
    it("ストリーミングでトークンを順番に返す", async () => {
      const chunks = [
        JSON.stringify({ response: "承知", done: false }),
        JSON.stringify({ response: "しました", done: false }),
        JSON.stringify({ response: "。", done: true }),
      ].join("\n") + "\n"

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

      expect(tokens).toEqual(["承知", "しました", "。"])
    })

    it("HTTP エラー時に例外を投げる", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      })

      const adapter = new OllamaAdapter("llama3")
      const gen = adapter.stream("了解です", "ja")
      await expect(gen[Symbol.asyncIterator]().next()).rejects.toThrow("500")
    })
  })
})
