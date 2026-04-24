import { createFileRoute, Link } from "@tanstack/react-router"
import { useEffect } from "react"
import { fetchOllamaModels, useOllamaModelStore } from "@/features/model-switch"
import { Button } from "@/shadcn/button"

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const { models, selectedModel, setModels, setSelectedModel } = useOllamaModelStore()

  useEffect(() => {
    fetchOllamaModels()
      .then((names) => setModels(names.map((name) => ({ name, size: 0 }))))
      .catch(console.error)
  }, [setModels])

  return (
    <div className="max-w-lg mx-auto p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link to="/">
          <Button variant="ghost" size="sm">← 戻る</Button>
        </Link>
        <h1 className="text-xl font-bold">設定</h1>
      </div>
      <div>
        <label className="text-sm font-medium">モデル</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="mt-1 w-full border rounded px-2 py-1"
        >
          {models.length === 0
            ? <option value={selectedModel}>{selectedModel}</option>
            : models.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))
          }
        </select>
      </div>
    </div>
  )
}
