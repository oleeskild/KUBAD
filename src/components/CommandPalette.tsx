import { useState, useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { 
  Database, 
  Radio, 
  Activity, 
  Home,
  BookOpen,
  Package,
  Server,
  Search,
  LogOut,
  ArrowRight,
  Sun,
  Moon,
  Monitor
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { auth, serverManager } from '@/api/eventstore'
import { useTheme } from '@/contexts/ThemeContext'

interface Command {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  action: () => void
  keywords: string[]
  group: string
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { setTheme } = useTheme()

  // Check if the search input looks like a stream ID (contains GUID pattern)
  const isStreamId = search && search.match(/^(.+?)-[a-f0-9-]{36}$/i)

  const commands: Command[] = [
    // Navigation
    {
      id: 'home',
      label: 'Home',
      description: 'Go to home page',
      icon: <Home className="h-4 w-4" />,
      action: () => router.navigate({ to: '/' }),
      keywords: ['home', 'dashboard', 'main'],
      group: 'Navigation'
    },
    {
      id: 'aggregates',
      label: 'Aggregates',
      description: 'Browse aggregates by type',
      icon: <Package className="h-4 w-4" />,
      action: () => router.navigate({ 
        to: '/aggregates',
        search: { aggregate: undefined, guid: undefined, stream: undefined }
      }),
      keywords: ['aggregates', 'events', 'streams', 'guid'],
      group: 'Navigation'
    },
    {
      id: 'streams',
      label: 'Streams',
      description: 'View event streams',
      icon: <Database className="h-4 w-4" />,
      action: () => router.navigate({ to: '/streams' }),
      keywords: ['streams', 'events', 'data'],
      group: 'Navigation'
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      description: 'Manage persistent subscriptions',
      icon: <Radio className="h-4 w-4" />,
      action: () => router.navigate({ to: '/subscriptions' }),
      keywords: ['subscriptions', 'persistent', 'consumer'],
      group: 'Navigation'
    },
    {
      id: 'projections',
      label: 'Projections',
      description: 'View projection status',
      icon: <BookOpen className="h-4 w-4" />,
      action: () => router.navigate({ to: '/projections' }),
      keywords: ['projections', 'queries', 'views'],
      group: 'Navigation'
    },
    {
      id: 'statistics',
      label: 'Statistics',
      description: 'View server statistics',
      icon: <Activity className="h-4 w-4" />,
      action: () => router.navigate({ to: '/stats' }),
      keywords: ['statistics', 'stats', 'performance', 'metrics'],
      group: 'Navigation'
    },
    {
      id: 'servers',
      label: 'Server Management',
      description: 'Manage EventStore servers',
      icon: <Server className="h-4 w-4" />,
      action: () => router.navigate({ to: '/servers' }),
      keywords: ['servers', 'management', 'connections', 'config'],
      group: 'Navigation'
    },
    // Actions
    {
      id: 'theme-light',
      label: 'Light Theme',
      description: 'Switch to light theme',
      icon: <Sun className="h-4 w-4" />,
      action: () => setTheme('light'),
      keywords: ['theme', 'light', 'appearance'],
      group: 'Theme'
    },
    {
      id: 'theme-dark',
      label: 'Dark Theme',
      description: 'Switch to dark theme',
      icon: <Moon className="h-4 w-4" />,
      action: () => setTheme('dark'),
      keywords: ['theme', 'dark', 'appearance'],
      group: 'Theme'
    },
    {
      id: 'theme-system',
      label: 'System Theme',
      description: 'Use system theme preference',
      icon: <Monitor className="h-4 w-4" />,
      action: () => setTheme('system'),
      keywords: ['theme', 'system', 'auto', 'appearance'],
      group: 'Theme'
    },
    {
      id: 'logout',
      label: 'Logout',
      description: 'Sign out of the application',
      icon: <LogOut className="h-4 w-4" />,
      action: () => {
        auth.logout()
        router.navigate({ to: '/login', search: { serverId: undefined } })
      },
      keywords: ['logout', 'sign out', 'exit'],
      group: 'Actions'
    }
  ]

  // Add server switching commands
  const servers = serverManager.getServers()
  const serverCommands: Command[] = servers.map(server => ({
    id: `switch-${server.id}`,
    label: `Switch to ${server.name}`,
    description: server.url,
    icon: <Server className="h-4 w-4" />,
    action: async () => {
      // Set the server as current without trying to login
      serverManager.setCurrentServer(server.id)
      // Clear any existing auth token to force re-authentication
      auth.logout()
      // Navigate to login page with the selected server
      router.navigate({ to: '/login', search: { serverId: server.id } })
    },
    keywords: ['switch', 'server', server.name.toLowerCase(), 'connect'],
    group: 'Server Switching'
  }))

  const allCommands = [...commands, ...serverCommands]

  // If search looks like a stream ID, add a special command to navigate to it
  if (isStreamId) {
    const [aggregateType, guid] = [isStreamId[1], search.substring(isStreamId[1].length + 1)]
    allCommands.unshift({
      id: 'go-to-stream',
      label: `Go to stream: ${search}`,
      description: `Navigate to aggregate ${aggregateType} with GUID ${guid}`,
      icon: <ArrowRight className="h-4 w-4" />,
      action: () => {
        router.navigate({ 
          to: '/aggregates',
          search: { 
            aggregate: aggregateType,
            guid: guid,
            stream: search
          }
        })
      },
      keywords: [],
      group: 'Quick Navigation'
    })
  }

  const filteredCommands = search
    ? allCommands.filter(command =>
        command.label.toLowerCase().includes(search.toLowerCase()) ||
        command.description?.toLowerCase().includes(search.toLowerCase()) ||
        command.keywords.some(keyword => keyword.toLowerCase().includes(search.toLowerCase()))
      )
    : allCommands

  // Group commands
  const groupedCommands = filteredCommands.reduce((groups, command) => {
    const group = command.group
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(command)
    return groups
  }, {} as Record<string, Command[]>)

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action()
            onOpenChange(false)
            setSearch('')
          }
          break
        case 'Escape':
          e.preventDefault()
          onOpenChange(false)
          setSearch('')
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedIndex, filteredCommands, onOpenChange])

  const handleCommandSelect = (command: Command) => {
    command.action()
    onOpenChange(false)
    setSearch('')
  }

  if (!open) return null

  let commandIndex = 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
        </DialogHeader>
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 mr-3 text-muted-foreground" />
          <Input
            placeholder="Search for commands or paste aggregate ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 bg-transparent placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ↵
            </kbd>
            <span>to select</span>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {Object.keys(groupedCommands).length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No commands found.
            </div>
          ) : (
            Object.entries(groupedCommands).map(([group, commands]) => (
              <div key={group}>
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                  {group}
                </div>
                {commands.map((command) => {
                  const isSelected = commandIndex === selectedIndex
                  const currentIndex = commandIndex++
                  
                  return (
                    <div
                      key={command.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm cursor-pointer transition-colors",
                        isSelected 
                          ? "bg-accent text-accent-foreground" 
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                      onClick={() => handleCommandSelect(command)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {command.icon}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{command.label}</div>
                          {command.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {command.description}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
        
        <div className="border-t px-3 py-2 text-xs text-muted-foreground bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium">
                ↑↓
              </kbd>
              <span>to navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium">
                ESC
              </kbd>
              <span>to close</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}