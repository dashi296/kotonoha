import { invoke } from "@tauri-apps/api/core"
import { useState, useEffect } from "react"

export type OllamaStatus = "loading" | "not_installed" | "starting" | "running"

const STARTING_TIMEOUT_MS = 120_000

// Module-level singleton: one poller shared across all consumers.
// Multiple useOllamaStatus() calls subscribe to the same status updates
// instead of each running their own invoke loop.
let _status: OllamaStatus = "loading"
let _startingStart: number | null = null
let _started = false
const _listeners = new Set<(s: OllamaStatus) => void>()

function _notify(s: OllamaStatus) {
  _status = s
  _listeners.forEach((fn) => fn(s))
}

async function _check() {
  try {
    const s = await invoke<OllamaStatus>("get_ollama_status")
    if (s === "starting") {
      if (_startingStart === null) _startingStart = Date.now()
      if (Date.now() - _startingStart >= STARTING_TIMEOUT_MS) {
        _notify("not_installed")
        setTimeout(_check, 5000)
      } else {
        _notify(s)
        setTimeout(_check, 2000)
      }
    } else {
      _startingStart = null
      _notify(s)
      setTimeout(_check, 5000)
    }
  } catch {
    _notify("not_installed")
    setTimeout(_check, 5000)
  }
}

export function useOllamaStatus(): OllamaStatus {
  const [status, setStatus] = useState<OllamaStatus>(_status)

  useEffect(() => {
    setStatus(_status)
    _listeners.add(setStatus)
    if (!_started) {
      _started = true
      _check()
    }
    return () => {
      _listeners.delete(setStatus)
    }
  }, [])

  return status
}
