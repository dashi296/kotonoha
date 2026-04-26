import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useCallback, useEffect, useRef, useState } from "react"
import { useOllamaModelStore } from "@/entities/ollama-model"
import type { OllamaModel } from "@/entities/ollama-model"
import { useOllamaStatus } from "@/shared/hooks/use-ollama-status"
import type { PullPhase, PullProgress } from "./types"

export function useModelManagement() {
  const { setModels, setSelectedModel } = useOllamaModelStore()
  const [pullPhase, setPullPhase] = useState<PullPhase>({ phase: "idle" })
  const [ollamaError, setOllamaError] = useState<string | null>(null)
  const unlistenRef = useRef<(() => void) | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ollamaStatus = useOllamaStatus()

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      unlistenRef.current?.()
      unlistenRef.current = null
    }
  }, [])

  const refreshModels = useCallback(async () => {
    try {
      const models = await invoke<OllamaModel[]>("list_models")
      setModels(models)
      setOllamaError(null)
      const current = useOllamaModelStore.getState().selectedModel
      if (models.length === 0) {
        setSelectedModel("")
      } else if (!models.some((m) => m.name === current)) {
        setSelectedModel(models[0].name)
      }
    } catch (e) {
      setOllamaError(String(e))
    }
  }, [setModels, setSelectedModel])

  useEffect(() => {
    if (ollamaStatus === "running") {
      refreshModels()
    }
  }, [ollamaStatus, refreshModels])

  const pullModel = useCallback(async (model: string) => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }
    setPullPhase({ phase: "pulling", progress: { status: "starting" } })

    const unlisten = await listen<PullProgress>("pull_progress", (event) => {
      const progress = event.payload
      if (progress.status === "success") {
        setPullPhase({ phase: "success" })
        refreshModels().catch(console.error)
        if (successTimerRef.current) clearTimeout(successTimerRef.current)
        successTimerRef.current = setTimeout(() => setPullPhase({ phase: "idle" }), 3000)
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

  return { pullPhase, pullModel, cancelPull, deleteModel, refreshModels, ollamaError }
}
