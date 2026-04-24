import { createFileRoute, Link } from "@tanstack/react-router"
import { useOllamaModelStore } from "@/features/model-switch"
import { useModelManagement, ModelList, ModelPullForm } from "@/features/model-management"
import { Button } from "@/shadcn/button"

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const { models, selectedModel, setSelectedModel } = useOllamaModelStore()
  const { pullPhase, pullModel, cancelPull, deleteModel } = useModelManagement()

  return (
    <div className="max-w-lg mx-auto p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link to="/">
          <Button variant="ghost" size="sm">← 戻る</Button>
        </Link>
        <h1 className="text-xl font-bold">設定</h1>
      </div>

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium">使用モデル</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="mt-1 w-full border rounded px-2 py-1"
        >
          {models.length === 0
            ? <option value={selectedModel}>{selectedModel}</option>
            : models.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
        </select>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">インストール済みモデル</h2>
        <ModelList models={models} onDelete={deleteModel} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">モデルを追加</h2>
        <ModelPullForm pullPhase={pullPhase} onPull={pullModel} onCancel={cancelPull} />
      </section>
    </div>
  )
}
