import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Login } from '@/pages/Login'

export const Route = createFileRoute('/login')({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      serverId: (search.serverId as string) || undefined,
    }
  },
})

function LoginPage() {
  const router = useRouter()
  const { serverId } = Route.useSearch()
  
  const handleLogin = () => {
    // Navigate to the main app after successful login
    router.navigate({ to: '/' })
  }
  
  return <Login onLogin={handleLogin} preselectedServerId={serverId} />
}