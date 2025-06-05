import { createFileRoute } from '@tanstack/react-router'
import { ServerManager } from '@/components/ServerManager'

export const Route = createFileRoute('/servers')({
  component: ServersPage,
})

function ServersPage() {
  return (
    <div className="p-6">
      <ServerManager />
    </div>
  )
}