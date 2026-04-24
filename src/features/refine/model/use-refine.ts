import { useRefinementStore } from "@/entities/refinement"
import { useOllamaModelStore } from "@/entities/ollama-model"
import { OllamaAdapter } from "@/shared/adapters/ollama"
import type { SupportedLanguage } from "@/shared/adapters"

export function useRefine() {
  const { input, setOutput, appendOutput, setIsStreaming, setError } = useRefinementStore()
  const { selectedModel } = useOllamaModelStore()

  const refine = async (lang: SupportedLanguage) => {
    setOutput("")
    setError(null)
    setIsStreaming(true)
    const adapter = new OllamaAdapter(selectedModel)
    try {
      for await (const chunk of adapter.stream(input, lang)) {
        appendOutput(chunk)
      }
    } catch (err) {
      console.error("[useRefine] error:", err)
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : JSON.stringify(err)
      setError(message || "変換中にエラーが発生しました")
    } finally {
      setIsStreaming(false)
    }
  }

  return { refine }
}
