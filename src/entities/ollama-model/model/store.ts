import { create } from "zustand"
import type { OllamaModel } from "./types"

interface OllamaModelState {
  models: OllamaModel[]
  selectedModel: string
  setModels: (models: OllamaModel[]) => void
  setSelectedModel: (model: string) => void
}

export const useOllamaModelStore = create<OllamaModelState>((set) => ({
  models: [],
  selectedModel: "llama3",
  setModels: (models) => set({ models }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
}))
