export interface RefinementState {
  input: string
  output: string
  isStreaming: boolean
  setInput: (input: string) => void
  setOutput: (output: string) => void
  appendOutput: (chunk: string) => void
  setIsStreaming: (value: boolean) => void
  reset: () => void
}
