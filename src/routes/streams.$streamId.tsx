import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { streams as streamsApi } from '@/api/eventstore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/streams/$streamId')({
  component: StreamDetailsPage,
})

function StreamDetailsPage() {
  const { streamId: encodedStreamId } = Route.useParams()
  const streamId = decodeURIComponent(encodedStreamId)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => streamsApi.get(streamId),
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  const toggleEvent = (eventId: string) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpandedEvents(newExpanded)
  }

  if (error) {
    return <div>Error loading stream: {(error as Error).message}</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link to="/streams">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Streams
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">{streamId}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading events...</div>
          ) : events && events.length > 0 ? (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.eventId}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleEvent(event.eventId)}
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
                      {expandedEvents.has(event.eventId) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {expandedEvents.has(event.eventId) && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Event Data</h4>
                        <pre className="bg-muted p-3 rounded-md overflow-x-auto text-sm">
                          {JSON.stringify(event.data, null, 2)}
                        </pre>
                      </div>
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Metadata</h4>
                          <pre className="bg-muted p-3 rounded-md overflow-x-auto text-sm">
                            {JSON.stringify(event.metadata, null, 2)}
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