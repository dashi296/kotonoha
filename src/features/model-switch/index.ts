import { useOllamaModelStore } from "@/entities/ollama-model"

export async function fetchOllamaModels(): Promise<string[]> {
  const response = await fetch("http://localhost:11434/api/tags")
  const data = await response.json()
  return (data.models as { name: string }[]).map((m) => m.name)
}

export { useOllamaModelStore }
