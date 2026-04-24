import { useRefinementStore } from "@/entities/refinement"
import { useOllamaModelStore } from "@/entities/ollama-model"
import { OllamaAdapter } from "@/shared/adapters/ollama"
import type { SupportedLanguage } from "@/shared/adapters"

export function useRefine() {
  const { input, setOutput, appendOutput, setIsStreaming } = useRefinementStore()
  const { selectedModel } = useOllamaModelStore()

  const refine = async (lang: SupportedLanguage) => {
    setOutput("")
    setIsStreaming(true)
    const adapter = new OllamaAdapter(selectedModel)
    try {
      for await (const chunk of adapter.stream(input, lang)) {
        appendOutput(chunk)
      }
    } finally {
      setIsStreaming(false)
    }
  }

  return { refine }
}
