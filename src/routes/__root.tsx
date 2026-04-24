import { createRootRoute, Outlet } from "@tanstack/react-router"
import { OllamaStatusBanner } from "@/shared/ui/OllamaStatusBanner"

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background text-foreground">
      <OllamaStatusBanner />
      <Outlet />
    </div>
  ),
})
