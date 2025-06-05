import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { stats as statsApi } from '@/api/eventstore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  TrendingUp,
  Activity,
  Database,
  Radio,
  Globe
} from 'lucide-react'

export const Route = createFileRoute('/stats')({
  component: StatsPage,
})

function StatsPage() {
  const { data: stats, isLoading: statsLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: statsApi.get,
    refetchInterval: 5000,
  })

  if (error) {
    return <div>Error loading stats: {(error as Error).message}</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Statistics</h2>
          <p className="text-muted-foreground">Monitor your KurrentDB instance performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-muted-foreground">Connected</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Online</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          // Loading skeletons
          [...Array(4)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </div>
              <Skeleton className="h-6 w-16 mb-2" />
              <Skeleton className="h-2 w-full mb-2" />
              <Skeleton className="h-3 w-24" />
            </Card>
          ))
        ) : (
          // Actual data cards
          <>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">CPU Usage</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {stats?.proc?.cpu !== undefined ? `${stats.proc.cpu.toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              {stats?.proc?.cpu !== undefined && (
                <div className="space-y-2">
                  <Progress value={stats.proc.cpu} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {stats.proc.cpu > 80 ? 'High usage' : stats.proc.cpu > 50 ? 'Active' : 'Normal'}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Memory Usage</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {stats?.proc?.mem ? `${(stats.proc.mem / 1024 / 1024 / 1024).toFixed(1)} GB` : 'N/A'}
                </span>
              </div>
              {stats?.proc?.mem && stats?.sys?.totalMem && (
                <div className="space-y-2">
                  <Progress value={(stats.proc.mem / stats.sys.totalMem) * 100} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    of {(stats.sys.totalMem / 1024 / 1024 / 1024).toFixed(1)} GB total
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Active Queues</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {(() => {
                    if (!stats) return 0;
                    const queues = stats.es?.queue || stats.queues || stats.queue;
                    return queues ? Object.keys(queues).length : 0;
                  })()}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Processing queues
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Radio className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Queue Items</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {(() => {
                    if (!stats) return 0;
                    const queues = stats.es?.queue || stats.queues || stats.queue;
                    return queues ? Object.values(queues).reduce((sum: number, q: any) => sum + (q.length || 0), 0) : 0;
                  })()}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Pending items
              </div>
            </Card>
          </>
        )}
      </div>

      {stats?.es?.queue && Object.keys(stats.es.queue).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Queue Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue Name</TableHead>
                  <TableHead>Length</TableHead>
                  <TableHead>Items/sec</TableHead>
                  <TableHead>Avg Processing Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(stats.es.queue).map(([name, queue]: [string, any]) => (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell>{queue.length.toLocaleString()}</TableCell>
                    <TableCell>{queue.avgItemsPerSecond.toFixed(2)}</TableCell>
                    <TableCell>{queue.avgProcessingTime.toFixed(2)}ms</TableCell>
                    <TableCell>
                      <Badge variant={queue.length > 1000 ? 'destructive' : 'default'}>
                        {queue.length > 1000 ? 'High Load' : 'Normal'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Platform</span>
              <span className="text-sm font-medium">KurrentDB EventStore</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Process ID</span>
              <span className="text-sm font-medium">{stats?.proc?.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Memory (MB)</span>
              <span className="text-sm font-medium">
                {stats?.proc?.mem ? `${(stats.proc.mem / 1024 / 1024).toFixed(0)} MB` : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Throughput</span>
              <span className="text-sm font-medium">
                {stats?.es?.queue 
                  ? `${Object.values(stats.es.queue).reduce((sum, q: any) => sum + (q.avgItemsPerSecond || 0), 0).toFixed(0)}/s`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Average Latency</span>
              <span className="text-sm font-medium">
                {stats?.es?.queue && Object.keys(stats.es.queue).length > 0
                  ? `${(Object.values(stats.es.queue).reduce((sum, q: any) => sum + (q.avgProcessingTime || 0), 0) / Object.keys(stats.es.queue).length).toFixed(2)}ms`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Queue Depth</span>
              <span className="text-sm font-medium">
                {stats?.es?.queue 
                  ? Object.values(stats.es.queue).reduce((sum, q: any) => sum + (q.length || 0), 0).toLocaleString()
                  : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Raw Statistics Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm max-h-96">
              {JSON.stringify(stats, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}