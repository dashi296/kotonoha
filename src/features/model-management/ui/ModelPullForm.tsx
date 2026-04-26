import { useState, useEffect } from "react"
import { POPULAR_OLLAMA_MODELS } from "@/shared/constants/ollama-models"
import type { PullPhase } from "../model/types"

interface ModelPullFormProps {
  pullPhase: PullPhase
  onPull: (model: string) => Promise<void>
  onCancel: () => Promise<void>
}

export function ModelPullForm({ pullPhase, onPull, onCancel }: ModelPullFormProps) {
  const [modelName, setModelName] = useState("")
  const isPulling = pullPhase.phase === "pulling"

  useEffect(() => {
    if (pullPhase.phase === "success") setModelName("")
  }, [pullPhase.phase])

  const handlePull = async () => {
    if (!modelName.trim()) return
    await onPull(modelName.trim())
  }

  const progress =
    pullPhase.phase === "pulling" &&
    pullPhase.progress.total != null &&
    pullPhase.progress.completed != null
      ? Math.round((pullPhase.progress.completed / pullPhase.progress.total) * 100)
      : null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          list="ollama-model-suggestions"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder="例: llama3.2:8b"
          className="flex-1 rounded border px-2 py-1 text-sm disabled:opacity-50"
          disabled={isPulling}
        />
        <datalist id="ollama-model-suggestions">
          {POPULAR_OLLAMA_MODELS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        {isPulling ? (
          <button
            className="rounded border px-3 py-1 text-sm hover:bg-muted"
            onClick={onCancel}
          >
            キャンセル
          </button>
        ) : (
          <button
            className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
            onClick={handlePull}
            disabled={!modelName.trim()}
          >
            Pull
          </button>
        )}
      </div>

      {isPulling && (
        <div className="flex flex-col gap-1">
          <div
            role="progressbar"
            aria-valuenow={progress ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 overflow-hidden rounded-full bg-secondary"
          >
            {progress != null ? (
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            ) : (
              <div className="h-full w-1/3 animate-pulse bg-primary" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">{pullPhase.progress.status}</p>
        </div>
      )}

      {pullPhase.phase === "success" && (
        <p className="text-xs text-green-600">インストール完了</p>
      )}
      {pullPhase.phase === "error" && (
        <p className="text-xs text-destructive">{pullPhase.message}</p>
      )}
    </div>
  )
}
