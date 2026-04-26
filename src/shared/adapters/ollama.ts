import { fetch } from "@tauri-apps/plugin-http"
import { buildSystemPrompt } from "@/shared/prompts"
import type { ModelAdapter, SupportedLanguage } from "./types"

export class OllamaAdapter implements ModelAdapter {
  private readonly baseUrl: string

  constructor(
    private readonly model: string,
    baseUrl = "http://localhost:11434"
  ) {
    this.baseUrl = baseUrl
  }

  async *stream(
    prompt: string,
    lang: SupportedLanguage
  ): AsyncIterable<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: buildSystemPrompt(lang) },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
    })
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
    }
    if (!response.body) {
      throw new Error("Ollama API returned no response body")
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines.filter(Boolean)) {
        try {
          const parsed = JSON.parse(line) as { message?: { content: string }; done: boolean }
          if (parsed.message?.content) yield parsed.message.content
          if (parsed.done) return
        } catch {
          // skip malformed line
        }
      }

      if (done) {
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer) as { message?: { content: string }; done: boolean }
            if (parsed.message?.content) yield parsed.message.content
          } catch {}
        }
        break
      }
    }
  }
}
