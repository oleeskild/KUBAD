import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  Radio, 
  Activity, 
  BookOpen, 
  Search, 
  Package,
  Server,
  Settings,
  ArrowRight,
  Clock,
  Zap,
  HelpCircle,
  Keyboard,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react'
import { serverManager } from '@/api/eventstore'
import { useSavedAggregates } from '@/contexts/SavedAggregatesContext'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const [currentServer, setCurrentServer] = useState(serverManager.getCurrentServer())
  const { savedAggregates } = useSavedAggregates()

  useEffect(() => {
    const checkServer = () => {
      setCurrentServer(serverManager.getCurrentServer())
    }
    
    window.addEventListener('storage', checkServer)
    const interval = setInterval(checkServer, 5000)
    
    return () => {
      window.removeEventListener('storage', checkServer)
      clearInterval(interval)
    }
  }, [])

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'offline':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  const quickActions = [
    {
      title: "Browse Streams",
      description: "Explore all available event streams",
      icon: Database,
      to: "/streams",
      color: "hover:bg-muted/50"
    },
    {
      title: "View Aggregates",
      description: "Analyze aggregate event patterns",
      icon: Package,
      to: "/aggregates",
      color: "hover:bg-muted/50"
    },
    {
      title: "Temporal Search",
      description: "Find events around specific dates",
      icon: Search,
      to: "/ce-binary-search",
      color: "hover:bg-muted/50"
    },
    {
      title: "Event Analysis",
      description: "Visualize event rates and patterns",
      icon: TrendingUp,
      to: "/analyze",
      color: "hover:bg-muted/50"
    },
    {
      title: "Subscriptions",
      description: "Manage persistent subscriptions",
      icon: Radio,
      to: "/subscriptions",
      color: "hover:bg-muted/50"
    },
    {
      title: "Projections",
      description: "Create and manage projections",
      icon: BookOpen,
      to: "/projections",
      color: "hover:bg-muted/50"
    }
  ]

  const helpItems = [
    {
      title: "Keyboard Shortcuts",
      description: "Press ⌘K to open command palette",
      icon: Keyboard
    },
    {
      title: "Saved Aggregates",
      description: "Save frequently used aggregates for quick access",
      icon: Package
    },
    {
      title: "Binary Search",
      description: "Efficiently find events by date using temporal search",
      icon: Search
    },
    {
      title: "Event Analysis",
      description: "Visualize event patterns over time ranges",
      icon: Activity
    }
  ]

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to KUBAD</h1>
        <p className="text-muted-foreground">
          Kurrent UI But Actually Decent - Your EventStore management dashboard
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {currentServer ? (
                <>
                  {getStatusIcon(currentServer.status)}
                  <div className="flex flex-col">
                    <div className="text-lg font-bold">{currentServer.name}</div>
                    <p className="text-xs text-muted-foreground">
                      {new URL(currentServer.url).host}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div className="text-lg font-bold">No Server</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Aggregates</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{savedAggregates.length}</div>
            <p className="text-xs text-muted-foreground">
              Ready for quick access
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Access</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">⌘K</div>
            <p className="text-xs text-muted-foreground">
              Command palette
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Features</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickActions.length}</div>
            <p className="text-xs text-muted-foreground">
              Tools available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-6 w-6" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Link key={index} to={action.to}>
                <Card className={`transition-colors cursor-pointer ${action.color}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-5 w-5" />
                        <CardTitle className="text-lg">{action.title}</CardTitle>
                      </div>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Aggregates */}
      {savedAggregates.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Clock className="h-6 w-6" />
              Recent Aggregates
            </h2>
            <Link to="/manage-aggregates">
              <Button variant="outline" size="sm">
                Manage All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedAggregates.slice(0, 6).map((aggregate) => (
                  <Link
                    key={aggregate.id}
                    to="/aggregates"
                    search={{ 
                      aggregate: aggregate.streamPrefix.replace('$ce-', ''),
                      guid: undefined,
                      stream: undefined
                    }}
                  >
                    <div className="p-3 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{aggregate.name}</div>
                          {aggregate.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {aggregate.description}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Help Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <HelpCircle className="h-6 w-6" />
          Getting Started
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {helpItems.map((item, index) => {
            const Icon = item.icon
            return (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {item.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>KUBAD - Kurrent UI But Actually Decent</span>
            <Badge variant="secondary">v1.0.0</Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Link to="/servers">
              <Button variant="ghost" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}