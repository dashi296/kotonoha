import type { SupportedLanguage } from "@/shared/adapters/types"
import { jaSystemPrompt } from "./ja"
import { enSystemPrompt } from "./en"

export function buildSystemPrompt(lang: SupportedLanguage): string {
  if (lang === "ja") return jaSystemPrompt
  return enSystemPrompt
}
