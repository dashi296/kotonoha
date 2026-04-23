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

  async generate(prompt: string, lang: SupportedLanguage): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: buildPrompt(prompt, lang),
        stream: false,
      }),
    })
    const data = await response.json()
    return data.response
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

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value)
      for (const line of text.split("\n").filter(Boolean)) {
        const parsed = JSON.parse(line) as { response: string; done: boolean }
        if (!parsed.done) yield parsed.response
      }
    }
  }
}
