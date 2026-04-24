export type SupportedLanguage = "ja" | "en"

export interface ModelAdapter {
  stream(prompt: string, lang: SupportedLanguage): AsyncIterable<string>
}
