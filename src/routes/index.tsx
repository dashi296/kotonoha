import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { RefineForm, RefineResult, useRefine } from "@/features/refine"
import { copyToClipboard } from "@/features/copy-to-clipboard"
import { SUPPORTED_LANGUAGES } from "@/features/language-switch"
import { useRefinementStore } from "@/entities/refinement"
import { getI18n } from "@/shared/i18n"
import type { SupportedLanguage } from "@/shared/adapters"
import { Button } from "@/shadcn/button"

export const Route = createFileRoute("/")({
  component: MainPage,
})

function MainPage() {
  const [lang, setLang] = useState<SupportedLanguage>("ja")
  const { refine } = useRefine()
  const { output } = useRefinementStore()
  const dict = getI18n(lang)

  return (
    <div className="max-w-lg mx-auto p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Kotonoha</h1>
        <div className="flex items-center gap-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as SupportedLanguage)}
            className="text-sm border rounded px-2 py-1"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <Link to="/settings">
            <Button variant="ghost" size="sm">⚙</Button>
          </Link>
        </div>
      </div>
      <RefineForm dict={dict} onRefine={() => refine(lang)} />
      <RefineResult dict={dict} onCopy={() => copyToClipboard(output)} />
    </div>
  )
}
