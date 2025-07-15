import { createRootRoute, Link, Outlet, useRouter, useLocation } from '@tanstack/react-router'
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
  Search,
  Menu,
  X
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { ServerManager } from '@/components/ServerManager'
import { CommandPalette } from '@/components/CommandPalette'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { SavedAggregatesProvider } from '@/contexts/SavedAggregatesContext'
import { cn } from '@/lib/utils'
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
    const location = useLocation()
    const [currentServer, setCurrentServer] = useState(serverManager.getCurrentServer())
    const [showServerManager, setShowServerManager] = useState(false)
    const [showCommandPalette, setShowCommandPalette] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    
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

    const navigationItems = [
      { to: '/', icon: Home, label: 'Home' },
      { to: '/streams', icon: Database, label: 'Streams' },
      { to: '/subscriptions', icon: Radio, label: 'Subscriptions' },
      { to: '/projections', icon: BookOpen, label: 'Projections' },
      { to: '/stats', icon: Activity, label: 'Statistics' },
      { to: '/aggregates', icon: Package, label: 'Aggregates', search: { aggregate: undefined, guid: undefined, stream: undefined } },
      { to: '/servers', icon: Server, label: 'Servers' },
      { to: '/ce-binary-search', icon: Search, label: 'Temporal Search' },
      { to: '/manage-aggregates', icon: Settings, label: 'Manage Aggregates' },
    ]

    return (
      <SavedAggregatesProvider>
        <div className="h-screen flex bg-background">
          {/* Sidebar */}
          <div className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center space-x-3">
                  <img src="/kubad-logo.svg" alt="KUBAD Logo" className="h-8 w-8" />
                  <div className="flex flex-col">
                    <h1 className="text-lg font-bold">KUBAD</h1>
                    <p className="text-xs text-muted-foreground">Kurrent UI But Actually Decent</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.to
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      search={item.search}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>

              {/* Footer */}
              <div className="p-4 border-t space-y-3">
                {/* Current Server */}
                {currentServer && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                    {getStatusIcon(currentServer.status)}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{currentServer.name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {new URL(currentServer.url).host}
                      </div>
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
                
                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCommandPalette(true)}
                    className="flex-1 h-8 px-2 text-muted-foreground"
                  >
                    <Search className="h-3 w-3 mr-2" />
                    <span>Search</span>
                    <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                      ⌘K
                    </kbd>
                  </Button>
                  <ThemeToggle />
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full justify-start h-8 px-3"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>

          {/* Overlay for mobile */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main content area */}
          <div className="flex-1 flex flex-col lg:ml-0">
            {/* Mobile header */}
            <header className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="h-8 w-8 p-0"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-3">
                <img src="/kubad-logo.svg" alt="KUBAD Logo" className="h-6 w-6" />
                <h1 className="text-lg font-bold">KUBAD</h1>
              </div>
              <div className="w-8" /> {/* Spacer for centering */}
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </div>
        
          {/* Command Palette */}
          <CommandPalette 
            open={showCommandPalette} 
            onOpenChange={setShowCommandPalette} 
          />
        </div>
      </SavedAggregatesProvider>
    )
  },
})