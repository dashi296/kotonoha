import { useEffect, type ReactNode } from "react"
import { useOllamaModelStore } from "@/entities/ollama-model"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const { selectedModel } = useOllamaModelStore()

  useEffect(() => {
    // Warm up the model on startup to reduce first-transform latency
    fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: selectedModel, prompt: "", stream: false }),
    }).catch(() => {
      // Ollama not running — ignore silently
    })
  }, [selectedModel])

  return <>{children}</>
}
