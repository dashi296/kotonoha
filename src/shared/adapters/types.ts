export type SupportedLanguage = "ja" | "en"

export interface ModelAdapter {
  generate(prompt: string, lang: SupportedLanguage): Promise<string>
  stream(prompt: string, lang: SupportedLanguage): AsyncIterable<string>
}
