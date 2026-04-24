export interface OllamaModel {
  name: string
  size: number
}

export interface OllamaModelState {
  models: OllamaModel[]
  selectedModel: string
  setModels: (models: OllamaModel[]) => void
  setSelectedModel: (model: string) => void
  reset: () => void
}
