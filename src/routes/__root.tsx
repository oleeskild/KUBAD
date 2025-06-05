import { createRootRoute, Link, Outlet, useRouter } from '@tanstack/react-router'
import { auth, serverManager } from '@/api/eventstore'
import { Button } from '@/components/ui/button'
import { 
  Database, 
  Radio, 
  Activity, 
  LogOut,
  Home,
  BookOpen,
  Package,
  Server,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { ServerManager } from '@/components/ServerManager'
import { CommandPalette } from '@/components/CommandPalette'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export const Route = createRootRoute({
  component: () => {
    const router = useRouter()
    const [currentServer, setCurrentServer] = useState(serverManager.getCurrentServer())
    const [showServerManager, setShowServerManager] = useState(false)
    const [showCommandPalette, setShowCommandPalette] = useState(false)
    
    // Update current server when it changes
    useEffect(() => {
      const checkServer = () => {
        setCurrentServer(serverManager.getCurrentServer())
      }
      
      // Listen for storage changes (when servers are modified)
      window.addEventListener('storage', checkServer)
      
      // Check periodically for current server changes
      const interval = setInterval(checkServer, 1000)
      
      return () => {
        window.removeEventListener('storage', checkServer)
        clearInterval(interval)
      }
    }, [])

    // Command palette keyboard shortcut
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault()
          setShowCommandPalette(true)
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])
    
    const handleLogout = () => {
      auth.logout()
      router.navigate({ to: '/login', search: { serverId: undefined } })
    }
    
    const handleServerSwitch = async (serverId: string) => {
      const result = await auth.switchServer(serverId)
      if (result?.success) {
        setCurrentServer(serverManager.getCurrentServer())
        setShowServerManager(false)
        // Optionally refresh the page to clear any cached data
        window.location.reload()
      } else {
        console.error('Failed to switch server:', result?.error)
      }
    }
    
    const getStatusIcon = (status?: string) => {
      switch (status) {
        case 'online':
          return <CheckCircle className="h-3 w-3 text-green-500" />
        case 'offline':
          return <XCircle className="h-3 w-3 text-red-500" />
        default:
          return <AlertCircle className="h-3 w-3 text-yellow-500" />
      }
    }

    // Handle authentication redirect in useEffect instead of during render
    useEffect(() => {
      if (!auth.isAuthenticated() && window.location.pathname !== '/login') {
        router.navigate({ to: '/login', search: { serverId: undefined } })
      }
    }, [router])

    if (!auth.isAuthenticated() && window.location.pathname !== '/login') {
      return null
    }

    if (window.location.pathname === '/login') {
      return <Outlet />
    }

    return (
      <div className="h-screen flex flex-col bg-background">
        <header className="border-b flex-shrink-0">
          <div className="flex h-16 items-center px-4">
            <div className="flex items-center space-x-4">
              <Database className="h-6 w-6" />
              <div className="flex flex-col">
                <h1 className="text-xl font-bold">KUBAD</h1>
                <p className="text-xs text-muted-foreground">Kurrent UI But Actually Decent</p>
              </div>
            </div>
            <nav className="ml-6 flex items-center space-x-4 lg:space-x-6">
              <Link
                to="/"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                <Home className="h-4 w-4 inline mr-2" />
                Home
              </Link>
              <Link
                to="/streams"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                <Database className="h-4 w-4 inline mr-2" />
                Streams
              </Link>
              <Link
                to="/subscriptions"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                <Radio className="h-4 w-4 inline mr-2" />
                Subscriptions
              </Link>
              <Link
                to="/projections"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                <BookOpen className="h-4 w-4 inline mr-2" />
                Projections
              </Link>
              <Link
                to="/stats"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                <Activity className="h-4 w-4 inline mr-2" />
                Statistics
              </Link>
              <Link
                to="/aggregates"
                search={{
                  aggregate: undefined,
                  guid: undefined,
                  stream: undefined
                }}
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                <Package className="h-4 w-4 inline mr-2" />
                Aggregates
              </Link>
              <Link
                to="/servers"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                <Server className="h-4 w-4 inline mr-2" />
                Servers
              </Link>
            </nav>
            <div className="ml-auto flex items-center gap-3">
              {/* Search/Command Palette Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCommandPalette(true)}
                className="h-8 px-3 text-muted-foreground flex items-center gap-2 hover:text-foreground"
              >
                <Search className="h-3 w-3" />
                <span className="hidden sm:inline">Search</span>
                <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
              
              {/* Current Server Indicator */}
              {currentServer && (
                <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md">
                  {getStatusIcon(currentServer.status)}
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">{currentServer.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {new URL(currentServer.url).host}
                    </span>
                  </div>
                  <Dialog open={showServerManager} onOpenChange={setShowServerManager}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Settings className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl w-[90vw] max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Server Management</DialogTitle>
                      </DialogHeader>
                      <ServerManager 
                        onServerSelect={(server) => handleServerSwitch(server.id)}
                        onClose={() => setShowServerManager(false)}
                        onServersUpdated={() => setCurrentServer(serverManager.getCurrentServer())}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        
        {/* Command Palette */}
        <CommandPalette 
          open={showCommandPalette} 
          onOpenChange={setShowCommandPalette} 
        />
      </div>
    )
  },
})