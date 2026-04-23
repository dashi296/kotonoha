import { create } from "zustand"
import type { RefinementState } from "./types"

export const useRefinementStore = create<RefinementState>((set) => ({
  input: "",
  output: "",
  isStreaming: false,
  setInput: (input) => set({ input }),
  setOutput: (output) => set({ output }),
  appendOutput: (chunk) => set((s) => ({ output: s.output + chunk })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  reset: () => set({ input: "", output: "", isStreaming: false }),
}))
