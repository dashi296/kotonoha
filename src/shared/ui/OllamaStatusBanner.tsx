import { useOllamaStatus } from "@/shared/hooks/use-ollama-status"

export function OllamaStatusBanner() {
  const status = useOllamaStatus()

  if (status === "loading" || status === "running") return null

  if (status === "not_installed") {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-sm text-red-700">
        Ollama の起動に失敗しました。アプリを再起動してください。
      </div>
    )
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-sm text-yellow-700">
      Ollama を起動中...
    </div>
  )
}
