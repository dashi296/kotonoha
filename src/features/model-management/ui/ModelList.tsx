import type { OllamaModel } from "@/entities/ollama-model"

interface ModelListProps {
  models: OllamaModel[]
  onDelete: (name: string) => Promise<void>
}

export function ModelList({ models, onDelete }: ModelListProps) {
  if (models.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">インストール済みのモデルがありません</p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {models.map((model) => (
        <div
          key={model.name}
          className="flex items-center justify-between rounded border px-3 py-2 text-sm"
        >
          <div>
            <span className="font-medium">{model.name}</span>
            <span className="ml-2 text-muted-foreground">{formatSize(model.size)}</span>
          </div>
          <button
            className="text-destructive hover:underline text-sm"
            onClick={() => onDelete(model.name).catch(console.error)}
          >
            削除
          </button>
        </div>
      ))}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1_000_000_000) {
    return `${(bytes / 1_000_000).toFixed(0)} MB`
  }
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`
}
