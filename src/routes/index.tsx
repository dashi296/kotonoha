import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: () => (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Kotonoha</h1>
      <p className="text-muted-foreground">テキストを入力して変換してください</p>
    </div>
  ),
})
