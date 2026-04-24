import { openUrl } from "@tauri-apps/plugin-opener"
import { useOllamaStatus } from "@/shared/hooks/use-ollama-status"

export function OllamaStatusBanner() {
  const status = useOllamaStatus()

  if (status === "loading" || status === "running") return null

  if (status === "not_installed") {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between text-sm">
        <span className="text-red-700">Ollama がインストールされていません</span>
        <button
          className="text-red-700 underline hover:text-red-900"
          onClick={() => openUrl("https://ollama.com/download")}
        >
          ダウンロード
        </button>
      </div>
    )
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-sm text-yellow-700">
      Ollama を起動中...
    </div>
  )
}
