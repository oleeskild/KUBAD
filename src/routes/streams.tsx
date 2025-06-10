import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { streams as streamsApi, type Event } from '@/api/eventstore'
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
import { ChevronLeft, ChevronRight, Search, ArrowLeft, ChevronDown } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'

type StreamsSearch = {
  streamId?: string
}

export const Route = createFileRoute('/streams')({
  component: StreamsPage,
  validateSearch: (search: Record<string, unknown>): StreamsSearch => {
    return {
      streamId: typeof search.streamId === 'string' ? search.streamId : undefined
    }
  },
})

function StreamsPage() {
  const router = useRouter()
  const { streamId: selectedStreamId } = Route.useSearch()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [eventData, setEventData] = useState<Map<string, Event>>(new Map())
  const [loadingEvents, setLoadingEvents] = useState<Set<string>>(new Set())

  const { data: streamsList, isLoading, error } = useQuery({
    queryKey: ['streams', page],
    queryFn: () => streamsApi.list(page, 20),
    enabled: !selectedStreamId,
  })

  const { data: events, isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ['stream', selectedStreamId],
    queryFn: () => selectedStreamId ? streamsApi.get(selectedStreamId) : null,
    enabled: !!selectedStreamId,
  })

  const filteredStreams = streamsList?.filter(stream =>
    stream.streamId.toLowerCase().includes(search.toLowerCase())
  ) || []

  // Clear event data when switching streams
  useEffect(() => {
    setExpandedEvents(new Set())
    setEventData(new Map())
    setLoadingEvents(new Set())
  }, [selectedStreamId])

  const toggleEvent = async (event: Event) => {
    const eventKey = `${selectedStreamId}-${event.eventNumber}`
    const newExpanded = new Set(expandedEvents)

    if (newExpanded.has(eventKey)) {
      newExpanded.delete(eventKey)
    } else {
      newExpanded.add(eventKey)

      // Fetch event data if not already loaded
      if (!eventData.has(eventKey)) {
        setLoadingEvents((prev) => new Set(prev).add(eventKey))

        try {
          const fullEvent = await streamsApi.getEvent(
            selectedStreamId!,
            event.eventNumber
          )
          setEventData((prev) => new Map(prev).set(eventKey, fullEvent))
        } catch (error) {
          console.error("Error fetching event data:", error)
        } finally {
          setLoadingEvents((prev) => {
            const newSet = new Set(prev)
            newSet.delete(eventKey)
            return newSet
          })
        }
      }
    }

    setExpandedEvents(newExpanded)
  }

  if (error || eventsError) {
    return <div>Error loading: {(error || eventsError)?.message}</div>
  }

  // Show single stream view
  if (selectedStreamId) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.navigate({ to: '/streams' })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Streams
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">{selectedStreamId}</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="text-center py-4">Loading events...</div>
            ) : events && events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event: Event) => (
                  <div
                    key={event.eventId}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleEvent(event)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-mono text-muted-foreground">
                            #{event.eventNumber}
                          </span>
                          <span className="font-medium">{event.eventType}</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(event.created).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        {expandedEvents.has(`${selectedStreamId}-${event.eventNumber}`) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {expandedEvents.has(`${selectedStreamId}-${event.eventNumber}`) && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Event Data</h4>
                          {loadingEvents.has(`${selectedStreamId}-${event.eventNumber}`) ? (
                            <div className="bg-muted p-3 rounded-md text-sm text-center">
                              Loading event data...
                            </div>
                          ) : (
                            <pre className="bg-muted p-3 rounded-md overflow-x-auto text-sm">
                              {JSON.stringify(
                                eventData.get(`${selectedStreamId}-${event.eventNumber}`)?.data || "No data available",
                                null,
                                2
                              )}
                            </pre>
                          )}
                        </div>
                        {!loadingEvents.has(`${selectedStreamId}-${event.eventNumber}`) && 
                         eventData.get(`${selectedStreamId}-${event.eventNumber}`)?.metadata && 
                         Object.keys(eventData.get(`${selectedStreamId}-${event.eventNumber}`)?.metadata || {}).length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Metadata</h4>
                            <pre className="bg-muted p-3 rounded-md overflow-x-auto text-sm">
                              {JSON.stringify(eventData.get(`${selectedStreamId}-${event.eventNumber}`)?.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No events found in this stream
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            router.navigate({ 
                              to: '/streams', 
                              search: { streamId: stream.streamId } 
                            })
                          }}
                        >
                          View Events
                        </Button>
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