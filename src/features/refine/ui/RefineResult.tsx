import { Button } from "@/shadcn/button"
import { useRefinementStore } from "@/entities/refinement"
import type { I18nDictionary } from "@/shared/i18n"

interface RefineResultProps {
  dict: I18nDictionary
  onCopy: () => void
}

export function RefineResult({ dict, onCopy }: RefineResultProps) {
  const { output, isStreaming, error } = useRefinementStore()

  if (error) {
    return (
      <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!output && !isStreaming) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border bg-muted p-3 min-h-[120px] whitespace-pre-wrap text-sm">
        {output}
        {isStreaming && <span className="animate-pulse">▍</span>}
      </div>
      <Button variant="outline" onClick={onCopy} disabled={isStreaming || !output}>
        {dict.copyButton}
      </Button>
    </div>
  )
}
