import type { SupportedLanguage } from "@/shared/adapters/types"
import { jaPrompt } from "./ja"
import { enPrompt } from "./en"

export function buildPrompt(text: string, lang: SupportedLanguage): string {
  if (lang === "ja") return jaPrompt(text)
  return enPrompt(text)
}
