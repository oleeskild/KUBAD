import { useState, useEffect } from 'react'
import { auth, serverManager, type EventStoreServer } from '@/api/eventstore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ServerManager } from '@/components/ServerManager'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Database, 
  Settings, 
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

interface LoginProps {
  onLogin: () => void
  preselectedServerId?: string
}

export function Login({ onLogin, preselectedServerId }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [servers, setServers] = useState<EventStoreServer[]>([])
  const [selectedServerId, setSelectedServerId] = useState<string>('')
  const [showServerManager, setShowServerManager] = useState(false)
  const [useStoredCredentials, setUseStoredCredentials] = useState(true)

  // Load servers on mount
  useEffect(() => {
    const loadedServers = serverManager.getServers()
    setServers(loadedServers)
    
    // Prioritize preselected server, then current server, then first server
    if (preselectedServerId && loadedServers.find(s => s.id === preselectedServerId)) {
      setSelectedServerId(preselectedServerId)
    } else {
      const currentServer = serverManager.getCurrentServer()
      if (currentServer) {
        setSelectedServerId(currentServer.id)
      } else if (loadedServers.length > 0) {
        setSelectedServerId(loadedServers[0].id)
      }
    }
    
    // If no servers, show server manager
    if (loadedServers.length === 0) {
      setShowServerManager(true)
    }
  }, [preselectedServerId])

  // Update servers when server manager is used
  const refreshServers = () => {
    const loadedServers = serverManager.getServers()
    setServers(loadedServers)
    
    // If we don't have a selected server or the selected server no longer exists
    if (!selectedServerId || !loadedServers.find(s => s.id === selectedServerId)) {
      // Only set default if no preselected server is specified
      if (!preselectedServerId) {
        const defaultServer = loadedServers.find(s => s.isDefault) || loadedServers[0]
        if (defaultServer) {
          setSelectedServerId(defaultServer.id)
        }
      }
    }
    
    if (loadedServers.length > 0) {
      setShowServerManager(false)
    }
  }

  // Remove showServerManager from dependencies to avoid closing manager when opening it
  useEffect(() => {
    refreshServers()
  }, [])
  
  // Force refresh when localStorage changes (from other tabs/windows)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'eventstore-servers') {
        refreshServers()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      let result
      
      if (useStoredCredentials) {
        // Use stored credentials from selected server
        result = await auth.login(undefined, undefined, selectedServerId)
      } else {
        // Use manually entered credentials
        result = await auth.login(username, password, selectedServerId)
      }
      
      if (result?.success) {
        onLogin()
      } else {
        setError(result?.error || 'Login failed')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Enter key to trigger login
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentSelectedServer = servers.find(s => s.id === selectedServerId)
      if (e.key === 'Enter' && !showServerManager && currentSelectedServer && !isLoading) {
        if (useStoredCredentials || (username && password)) {
          handleSubmit(e as any)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showServerManager, servers, selectedServerId, isLoading, useStoredCredentials, username, password, handleSubmit])

  const handleServerConnect = (server: EventStoreServer) => {
    // Auto-login with server credentials
    auth.login(undefined, undefined, server.id).then(result => {
      if (result?.success) {
        onLogin()
      } else {
        setError(result?.error || 'Connection failed')
        setShowServerManager(false)
      }
    })
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const selectedServer = servers.find(s => s.id === selectedServerId)

  if (showServerManager) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <ServerManager 
            onServerSelect={handleServerConnect}
            onClose={() => {
              if (servers.length > 0) {
                setShowServerManager(false)
              }
            }}
            onServersUpdated={refreshServers}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Database className="h-5 w-5" />
            KUBAD
          </CardTitle>
          <CardDescription>
            Select a server and enter your credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Server Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>EventStore Server</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowServerManager(true)}
                className="text-xs flex items-center gap-1"
              >
                <Settings className="h-3 w-3" />
                Manage
              </Button>
            </div>
            
            {servers.length > 0 ? (
              <Select value={selectedServerId} onValueChange={setSelectedServerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a server" />
                </SelectTrigger>
                <SelectContent>
                  {servers.map((server) => (
                    <SelectItem key={server.id} value={server.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(server.status)}
                          <span className="font-medium">{server.name}</span>
                        </div>
                        {server.isDefault && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No servers configured</p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setShowServerManager(true)}
                  className="text-xs"
                >
                  Add a server to get started
                </Button>
              </div>
            )}
            
            {selectedServer && (
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                <div className="font-mono">{selectedServer.url}</div>
              </div>
            )}
          </div>

          {selectedServer && (
            <>
              <Separator />
              
              {/* Credential Options */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="stored-creds"
                    name="credential-mode"
                    checked={useStoredCredentials}
                    onChange={() => setUseStoredCredentials(true)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="stored-creds" className="text-sm">
                    Use stored credentials for {selectedServer.name}
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="manual-creds"
                    name="credential-mode"
                    checked={!useStoredCredentials}
                    onChange={() => setUseStoredCredentials(false)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="manual-creds" className="text-sm">
                    Enter credentials manually
                  </Label>
                </div>
              </div>

              {/* Manual Credentials Form */}
              {!useStoredCredentials && (
                <>
                  <Separator />
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        disabled={isLoading}
                        placeholder="Enter username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        placeholder="Enter password"
                      />
                    </div>
                  </form>
                </>
              )}

              {/* Error Display */}
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {error}
                </div>
              )}

              {/* Login Button */}
              <Button 
                onClick={handleSubmit}
                className="w-full bg-primary hover:bg-primary/90" 
                disabled={isLoading || (!useStoredCredentials && (!username || !password))}
              >
                {isLoading ? 'Connecting...' : `Connect to ${selectedServer.name}`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}