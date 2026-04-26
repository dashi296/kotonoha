import { fetch } from "@tauri-apps/plugin-http"
import { buildPrompt } from "@/shared/prompts"
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
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: buildPrompt(prompt, lang),
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
          const parsed = JSON.parse(line) as { response: string; done: boolean }
          if (parsed.response) yield parsed.response
          if (parsed.done) return
        } catch {
          // skip malformed line
        }
      }

      if (done) {
        // Flush any content remaining in buffer when stream closes without trailing newline
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer) as { response: string; done: boolean }
            if (parsed.response) yield parsed.response
          } catch {}
        }
        break
      }
    }
  }
}
