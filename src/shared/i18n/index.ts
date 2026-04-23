import type { SupportedLanguage } from "@/shared/adapters/types"
import type { I18nDictionary } from "./types"
import { ja } from "./ja"
import { en } from "./en"

export type { I18nDictionary } from "./types"

const dictionaries: Record<SupportedLanguage, I18nDictionary> = { ja, en }

export function getI18n(lang: SupportedLanguage): I18nDictionary {
  return dictionaries[lang]
}
