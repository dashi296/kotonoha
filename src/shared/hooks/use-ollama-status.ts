import { invoke } from "@tauri-apps/api/core"
import { useState, useEffect } from "react"

export type OllamaStatus = "loading" | "not_installed" | "starting" | "running"

const MAX_RETRIES = 15 // 2000ms × 15 = 30秒でタイムアウト

export function useOllamaStatus() {
  const [status, setStatus] = useState<OllamaStatus>("loading")

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    let retries = 0

    const check = async () => {
      try {
        const s = await invoke<OllamaStatus>("get_ollama_status")
        if (cancelled) return
        setStatus(s)
        if (s === "starting") {
          if (retries++ < MAX_RETRIES) {
            timer = setTimeout(check, 2000)
          } else {
            setStatus("not_installed")
          }
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
