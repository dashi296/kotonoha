import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useCallback, useEffect, useRef, useState } from "react"
import { useOllamaModelStore } from "@/entities/ollama-model"
import type { OllamaModel } from "@/entities/ollama-model"
import type { PullPhase, PullProgress } from "./types"

export function useModelManagement() {
  const { setModels } = useOllamaModelStore()
  const [pullPhase, setPullPhase] = useState<PullPhase>({ phase: "idle" })
  const unlistenRef = useRef<(() => void) | null>(null)

  const refreshModels = useCallback(async () => {
    const models = await invoke<OllamaModel[]>("list_models")
    setModels(models)
  }, [setModels])

  useEffect(() => {
    refreshModels().catch(console.error)
  }, [refreshModels])

  const pullModel = useCallback(async (model: string) => {
    setPullPhase({ phase: "pulling", progress: { status: "starting" } })

    const unlisten = await listen<PullProgress>("pull_progress", (event) => {
      const progress = event.payload
      if (progress.status === "success") {
        setPullPhase({ phase: "success" })
        refreshModels().catch(console.error)
      } else {
        setPullPhase({ phase: "pulling", progress })
      }
    })
    unlistenRef.current = unlisten

    try {
      await invoke("start_pull", { model })
    } catch (err) {
      setPullPhase({ phase: "error", message: String(err) })
    } finally {
      unlistenRef.current?.()
      unlistenRef.current = null
    }
  }, [refreshModels])

  const cancelPull = useCallback(async () => {
    await invoke("cancel_pull")
    setPullPhase({ phase: "idle" })
    unlistenRef.current?.()
    unlistenRef.current = null
  }, [])

  const deleteModel = useCallback(async (model: string) => {
    await invoke("delete_model", { model })
    await refreshModels()
  }, [refreshModels])

  return { pullPhase, pullModel, cancelPull, deleteModel, refreshModels }
}
