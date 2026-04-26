import { create } from "zustand"
import type { OllamaModelState } from "./types"

export const useOllamaModelStore = create<OllamaModelState>((set) => ({
  models: [],
  selectedModel: "llama3.2",
  setModels: (models) => set({ models }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  reset: () => set({ models: [], selectedModel: "llama3.2" }),
}))
