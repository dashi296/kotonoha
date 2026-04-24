import type { SupportedLanguage } from "@/shared/adapters/types"

export interface RefinementRequest {
  input: string
  language: SupportedLanguage
}

export interface RefinementResult {
  output: string
}

export interface RefinementState {
  input: string
  output: string
  isStreaming: boolean
  error: string | null
  setInput: (input: string) => void
  setOutput: (output: string) => void
  appendOutput: (chunk: string) => void
  setIsStreaming: (value: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}
