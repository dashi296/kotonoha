import { Textarea } from "@/shadcn/textarea"
import { Button } from "@/shadcn/button"
import { useRefinementStore } from "@/entities/refinement"
import type { I18nDictionary } from "@/shared/i18n"

interface RefineFormProps {
  dict: I18nDictionary
  onRefine: () => void
}

export function RefineForm({ dict, onRefine }: RefineFormProps) {
  const { input, setInput, isStreaming } = useRefinementStore()

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={dict.placeholder}
        rows={5}
        disabled={isStreaming}
      />
      <Button onClick={onRefine} disabled={isStreaming || !input.trim()}>
        {dict.refineButton}
      </Button>
    </div>
  )
}
