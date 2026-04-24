import { invoke } from "@tauri-apps/api/core"
import { useState, useEffect } from "react"

export type OllamaStatus = "loading" | "not_installed" | "starting" | "running"

export function useOllamaStatus() {
  const [status, setStatus] = useState<OllamaStatus>("loading")

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      const s = await invoke<OllamaStatus>("get_ollama_status")
      if (cancelled) return
      setStatus(s)
      if (s === "starting") {
        setTimeout(check, 2000)
      }
    }

    check()
    return () => { cancelled = true }
  }, [])

  return status
}
