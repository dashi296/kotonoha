import { invoke } from "@tauri-apps/api/core"
import { useState, useEffect } from "react"

export type OllamaStatus = "loading" | "not_installed" | "starting" | "running"

// Fallback for sidecars that spawn successfully but never bind the port
const STARTING_TIMEOUT_MS = 120_000

export function useOllamaStatus() {
  const [status, setStatus] = useState<OllamaStatus>("loading")

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    let startingStart: number | null = null

    const check = async () => {
      try {
        const s = await invoke<OllamaStatus>("get_ollama_status")
        if (cancelled) return
        if (s === "starting") {
          if (startingStart === null) startingStart = Date.now()
          if (Date.now() - startingStart >= STARTING_TIMEOUT_MS) {
            setStatus("not_installed")
            timer = setTimeout(check, 5000)
          } else {
            setStatus(s)
            timer = setTimeout(check, 2000)
          }
        } else {
          startingStart = null
          setStatus(s)
          // Keep polling so the UI reflects status changes (Ollama stops or is installed manually)
          timer = setTimeout(check, 5000)
        }
      } catch {
        if (!cancelled) {
          setStatus("not_installed")
          timer = setTimeout(check, 5000)
        }
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
