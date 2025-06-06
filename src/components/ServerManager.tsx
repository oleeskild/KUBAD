import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Server, 
  TestTube,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

export interface EventStoreServer {
  id: string
  name: string
  url: string
  username: string
  password: string
  isDefault?: boolean
  lastTested?: string
  status?: 'online' | 'offline' | 'unknown'
}

interface ServerManagerProps {
  onServerSelect?: (server: EventStoreServer) => void
  onClose?: () => void
  onServersUpdated?: () => void
}

export function ServerManager({ onServerSelect, onClose, onServersUpdated }: ServerManagerProps) {
  const [servers, setServers] = useState<EventStoreServer[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<EventStoreServer | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    password: ''
  })
  const [testingServerId, setTestingServerId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load servers from localStorage on mount
  useEffect(() => {
    const savedServers = localStorage.getItem('eventstore-servers')
    if (savedServers) {
      try {
        setServers(JSON.parse(savedServers))
      } catch (error) {
        console.error('Error loading servers:', error)
      }
    }
  }, [])

  // Save servers to localStorage whenever servers change
  const saveServers = (updatedServers: EventStoreServer[]) => {
    try {
      localStorage.setItem('eventstore-servers', JSON.stringify(updatedServers))
      setServers(updatedServers)
      
      // Notify parent component that servers have been updated (with small delay)
      setTimeout(() => {
        onServersUpdated?.()
      }, 10)
    } catch (error) {
      console.error('Error saving servers to localStorage:', error)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', url: '', username: '', password: '' })
    setEditingServer(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (server: EventStoreServer) => {
    setFormData({
      name: server.name,
      url: server.url,
      username: server.username,
      password: server.password
    })
    setEditingServer(server)
    setIsDialogOpen(true)
  }

  const testConnection = async (server: EventStoreServer) => {
    setTestingServerId(server.id)
    
    try {
      // Create a temporary axios instance for testing
      const axios = await import('axios')
      const testApi = axios.default.create({
        baseURL: server.url,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000 // 5 second timeout
      })

      const token = btoa(`${server.username}:${server.password}`)
      
      // Try to fetch stats endpoint
      await testApi.get('/stats', {
        headers: {
          Authorization: `Basic ${token}`,
          Accept: 'application/json',
        },
      })

      // Get current servers from localStorage (not state) to avoid race condition
      const currentServers = JSON.parse(localStorage.getItem('eventstore-servers') || '[]')
      
      // Update server status to online
      const updatedServers = currentServers.map((s: EventStoreServer) => 
        s.id === server.id 
          ? { ...s, status: 'online' as const, lastTested: new Date().toISOString() }
          : s
      )
      saveServers(updatedServers)
      
    } catch (error) {
      console.error('Connection test failed:', error)
      
      // Get current servers from localStorage (not state) to avoid race condition
      const currentServers = JSON.parse(localStorage.getItem('eventstore-servers') || '[]')
      
      // Update server status to offline
      const updatedServers = currentServers.map((s: EventStoreServer) => 
        s.id === server.id 
          ? { ...s, status: 'offline' as const, lastTested: new Date().toISOString() }
          : s
      )
      saveServers(updatedServers)
    } finally {
      setTestingServerId(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const serverData: EventStoreServer = {
        id: editingServer?.id || crypto.randomUUID(),
        name: formData.name,
        url: formData.url.replace(/\/$/, ''), // Remove trailing slash
        username: formData.username,
        password: formData.password,
        isDefault: servers.length === 0, // First server becomes default
        status: 'unknown'
      }

      let updatedServers: EventStoreServer[]
      
      if (editingServer) {
        // Update existing server
        updatedServers = servers.map(s => 
          s.id === editingServer.id ? { ...serverData, isDefault: s.isDefault } : s
        )
      } else {
        // Add new server
        updatedServers = [...servers, serverData]
      }

      saveServers(updatedServers)
      setIsDialogOpen(false)
      resetForm()
      
      // Auto-test the connection for new/updated servers
      setTimeout(() => testConnection(serverData), 100)
      
    } catch (error) {
      console.error('Error saving server:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteServer = (serverId: string) => {
    const updatedServers = servers.filter(s => s.id !== serverId)
    
    // If we deleted the default server, make the first remaining server default
    if (updatedServers.length > 0 && !updatedServers.some(s => s.isDefault)) {
      updatedServers[0].isDefault = true
    }
    
    saveServers(updatedServers)
  }

  const setAsDefault = (serverId: string) => {
    const updatedServers = servers.map(s => ({
      ...s,
      isDefault: s.id === serverId
    }))
    saveServers(updatedServers)
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

  const getStatusBadge = (status?: string) => {
    const variants = {
      online: 'default' as const,
      offline: 'destructive' as const,
      unknown: 'secondary' as const
    }
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status || 'unknown'}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-keyword">
            <Server className="h-6 w-6 text-primary" />
            Server Management
          </h2>
          <p className="text-subtitle">
            Manage your EventStore server connections
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Server
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingServer ? 'Edit Server' : 'Add New Server'}
                </DialogTitle>
                <DialogDescription>
                  {editingServer 
                    ? 'Update the server connection details'
                    : 'Add a new EventStore server connection'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Server Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Production, Development"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">Server URL</Label>
                  <Input
                    id="url"
                    placeholder="https://eventstore.example.com"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium text-info">Credentials stored locally</p>
                      <p className="text-xs mt-1 text-muted-readable">
                        Your credentials are stored securely in your browser's local storage and never sent to external servers.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editingServer ? 'Update' : 'Add'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-keyword">Configured Servers</CardTitle>
        </CardHeader>
        <CardContent>
          {servers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-subtitle">No servers configured yet</p>
              <p className="text-sm text-muted-readable">Add your first EventStore server to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {servers.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell className="font-medium text-info">{server.name}</TableCell>
                    <TableCell className="font-mono text-sm text-code">{server.url}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(server.status)}
                        {getStatusBadge(server.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {server.isDefault ? (
                        <Badge variant="outline">Default</Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAsDefault(server.id)}
                          className="text-xs"
                        >
                          Set Default
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => testConnection(server)}
                          disabled={testingServerId === server.id}
                          title="Test Connection"
                        >
                          {testingServerId === server.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(server)}
                          title="Edit Server"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {onServerSelect && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onServerSelect(server)}
                            title="Connect to this server"
                          >
                            Connect
                          </Button>
                        )}
                        {!server.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteServer(server.id)}
                            title="Delete Server"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}