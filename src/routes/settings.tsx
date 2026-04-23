import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/settings")({
  component: () => (
    <div className="p-4">
      <h1 className="text-2xl font-bold">設定</h1>
    </div>
  ),
})
