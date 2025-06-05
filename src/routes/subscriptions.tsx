import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { subscriptions as subscriptionsApi } from '@/api/eventstore'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search } from 'lucide-react'

export const Route = createFileRoute('/subscriptions')({
  component: SubscriptionsPage,
})

function SubscriptionsPage() {
  const [search, setSearch] = useState('')

  const { data: subscriptionsList, isLoading, error } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: subscriptionsApi.list,
  })

  const filteredSubscriptions = subscriptionsList?.filter(sub =>
    sub.name.toLowerCase().includes(search.toLowerCase()) ||
    sub.streamName.toLowerCase().includes(search.toLowerCase()) ||
    sub.groupName.toLowerCase().includes(search.toLowerCase())
  ) || []


  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      'Live': 'default',
      'Paused': 'secondary',
      'Stopped': 'destructive',
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  if (error) {
    return <div>Error loading subscriptions: {(error as Error).message}</div>
  }

  return (
    <div className="h-full flex flex-col space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Persistent Subscriptions</h2>
      </div>

      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subscriptions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-4">Loading subscriptions...</div>
          ) : (
            <div className="flex-1 overflow-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Messages/sec</TableHead>
                    <TableHead>Total Processed</TableHead>
                    <TableHead>Live Buffer</TableHead>
                    <TableHead>Parked Messages</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((sub) => (
                    <TableRow key={`${sub.streamName}-${sub.groupName}`}>
                      <TableCell className="font-medium">{sub.name}</TableCell>
                      <TableCell>{sub.streamName}</TableCell>
                      <TableCell>{sub.groupName}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell>{sub.averageItemsPerSecond.toFixed(2)}</TableCell>
                      <TableCell>{sub.totalItemsProcessed.toLocaleString()}</TableCell>
                      <TableCell>{sub.liveBufferCount}</TableCell>
                      <TableCell>
                        {sub.parkedMessageCount > 0 ? (
                          <span className="text-destructive font-medium">
                            {sub.parkedMessageCount}
                          </span>
                        ) : (
                          '0'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredSubscriptions.length === 0 && !isLoading && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              No subscriptions found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}