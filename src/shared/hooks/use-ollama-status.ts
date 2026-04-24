import { invoke } from "@tauri-apps/api/core"
import { useState, useEffect } from "react"

export type OllamaStatus = "loading" | "not_installed" | "starting" | "running"

export function useOllamaStatus() {
  const [status, setStatus] = useState<OllamaStatus>("loading")

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const check = async () => {
      try {
        const s = await invoke<OllamaStatus>("get_ollama_status")
        if (cancelled) return
        setStatus(s)
        if (s === "starting") {
          timer = setTimeout(check, 2000)
        }
      } catch {
        if (!cancelled) setStatus("not_installed")
      }
    }

    check()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  return status
}
