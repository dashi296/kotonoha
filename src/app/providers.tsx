import { invoke } from "@tauri-apps/api/core"
import { useEffect, type ReactNode } from "react"
import { useOllamaModelStore } from "@/entities/ollama-model"
import type { OllamaModel } from "@/entities/ollama-model"
import { useOllamaStatus } from "@/shared/hooks/use-ollama-status"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const { setModels, setSelectedModel } = useOllamaModelStore()
  const ollamaStatus = useOllamaStatus()

  useEffect(() => {
    if (ollamaStatus !== "running") return
    invoke<OllamaModel[]>("list_models").then((models) => {
      setModels(models)
      const current = useOllamaModelStore.getState().selectedModel
      if (models.length === 0) {
        setSelectedModel("")
      } else if (!models.some((m) => m.name === current)) {
        setSelectedModel(models[0].name)
      }
    }).catch(() => {})
  }, [ollamaStatus, setModels, setSelectedModel])

  return <>{children}</>
}
