import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { streams as streamsApi } from '@/api/eventstore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/streams')({
  component: StreamsPage,
})

function StreamsPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  const { data: streamsList, isLoading, error } = useQuery({
    queryKey: ['streams', page],
    queryFn: () => streamsApi.list(page, 20),
  })

  const filteredStreams = streamsList?.filter(stream =>
    stream.streamId.toLowerCase().includes(search.toLowerCase())
  ) || []

  if (error) {
    return <div>Error loading streams: {(error as Error).message}</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Streams</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Streams</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search streams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-4">Loading streams...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stream ID</TableHead>
                    <TableHead>Event Count</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStreams.map((stream) => (
                    <TableRow key={stream.streamId}>
                      <TableCell className="font-medium">
                        {stream.streamId}
                      </TableCell>
                      <TableCell>{stream.eventCount}</TableCell>
                      <TableCell>
                        {new Date(stream.created).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {new Date(stream.lastUpdated).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Link
                          to="/streams/$streamId"
                          params={{ streamId: stream.streamId }}
                        >
                          <Button variant="outline" size="sm">
                            View Events
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={filteredStreams.length < 20}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}