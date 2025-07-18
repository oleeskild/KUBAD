import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, Loader2, TrendingUp, PieChartIcon, BarChart3 } from 'lucide-react'
import { serverManager } from '@/api/eventstore'
import { format, subHours, startOfHour } from 'date-fns'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'
import { useSavedAggregates } from '@/contexts/SavedAggregatesContext'

export const Route = createFileRoute('/analyze')({
  component: AnalyzePage,
})

interface EventEntry {
  eventId: string
  eventType: string
  eventNumber: number
  data: string
  metaData: string
  streamId: string
  positionEventNumber: number
  title: string
  updated: string
}

interface StreamResponse {
  entries: EventEntry[]
  links: Array<{
    uri: string
    relation: string
  }>
}

interface EventRateData {
  time: string
  count: number
}

interface EventTypeData {
  name: string
  count: number
  percentage: number
}

function AnalyzePage() {
  const [streamName, setStreamName] = useState('$all')
  const [useCustomStream, setUseCustomStream] = useState(true)
  const [startDate, setStartDate] = useState(() => {
    const start = subHours(new Date(), 1);
    return new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  })
  const [endDate, setEndDate] = useState(() => {
    const end = new Date();
    return new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  })
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eventRateData, setEventRateData] = useState<EventRateData[]>([])
  const [eventTypeData, setEventTypeData] = useState<EventTypeData[]>([])
  const [totalEvents, setTotalEvents] = useState(0)
  const [timeGranularity, setTimeGranularity] = useState<'hour' | 'minute' | 'second'>('hour')
  const [timezone, setTimezone] = useState<'UTC' | 'Europe/Oslo'>('Europe/Oslo')

  const { savedAggregates } = useSavedAggregates()

  const getTimezoneOffset = (tz: string) => {
    if (tz === 'UTC') return 'UTC'
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'short'
    })
    return formatter.formatToParts(now).find(part => part.type === 'timeZoneName')?.value || tz
  }

  const convertToSelectedTimezone = (date: Date): Date => {
    if (timezone === 'UTC') {
      return date
    }
    return toZonedTime(date, timezone)
  }

  const convertFromSelectedTimezone = (date: Date): Date => {
    if (timezone === 'UTC') {
      return date
    }
    return fromZonedTime(date, timezone)
  }

  const formatDateForTimezone = (date: Date, formatStr: string): string => {
    if (timezone === 'UTC') {
      return format(date, formatStr)
    }
    return formatInTimeZone(date, timezone, formatStr)
  }

  const fetchEvents = useCallback(async (
    streamName: string,
    position: string | 'head',
    direction: 'backward' | 'forward' = 'backward',
    limit: number = 1000
  ): Promise<StreamResponse | null> => {
    try {
      const currentServer = serverManager.getCurrentServer()
      if (!currentServer) {
        throw new Error('No server configured')
      }

      const baseUrl = currentServer.url
      const username = currentServer.username
      const password = currentServer.password

      const url = `${baseUrl}/streams/${encodeURIComponent(streamName)}/${position}/${direction}/${limit}?embed=tryharder`

      const response = await fetch(url, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${username}:${password}`),
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (err) {
      console.error('Error fetching events:', err)
      return null
    }
  }, [])

  const getEventDate = (event: EventEntry): Date => {
    try {
      const data = JSON.parse(event.data)
      const date = new Date(data.occurredAt || event.updated)
      if (isNaN(date.getTime())) {
        return new Date(event.updated)
      }
      return date
    } catch {
      return new Date(event.updated)
    }
  }

  const binarySearchForDate = useCallback(async (targetDate: Date, searchDirection: 'start' | 'end'): Promise<number> => {
    // Get the latest event position first
    const headResponse = await fetchEvents(streamName, 'head', 'backward', 1)
    if (!headResponse || headResponse.entries.length === 0) {
      throw new Error('No events found in stream')
    }

    const latestPosition = headResponse.entries[0].positionEventNumber

    // Binary search for the target date
    let left = 0
    let right = latestPosition
    let iterations = 0
    const maxIterations = 50

    while (left < right && iterations < maxIterations) {
      iterations++
      const mid = Math.floor((left + right) / 2)

      const response = await fetchEvents(streamName, mid.toString(), 'forward', 10)
      if (!response || response.entries.length === 0) {
        right = mid - 1
        continue
      }

      const firstEvent = response.entries[0]
      const eventDate = getEventDate(firstEvent)

      if (searchDirection === 'start') {
        // Finding the start position (first event >= targetDate)
        if (eventDate >= targetDate) {
          right = mid
        } else {
          left = mid + 1
        }
      } else {
        // Finding the end position (last event <= targetDate)
        if (eventDate <= targetDate) {
          left = mid + 1
        } else {
          right = mid
        }
      }
    }

    return searchDirection === 'start' ? Math.max(0, left) : Math.min(latestPosition, right)
  }, [streamName, fetchEvents])

  const analyzeEvents = useCallback(async () => {
    setAnalyzing(true)
    setError(null)
    setEventRateData([])
    setEventTypeData([])
    setTotalEvents(0)

    const start = convertFromSelectedTimezone(new Date(startDate))
    const end = convertFromSelectedTimezone(new Date(endDate))

    try {
      // Use binary search to find the start and end positions
      const startPosition = await binarySearchForDate(start, 'start')
      const endPosition = await binarySearchForDate(end, 'end')

      if (startPosition > endPosition) {
        setError('No events found in the specified time range')
        return
      }

      // Fetch events between start and end positions
      const allEvents: EventEntry[] = []
      const batchSize = 1000
      
      for (let position = startPosition; position <= endPosition; position += batchSize) {
        const limit = Math.min(batchSize, endPosition - position + 1)
        const response = await fetchEvents(streamName, position.toString(), 'forward', limit)
        
        if (!response || response.entries.length === 0) {
          break
        }

        // Filter events within the exact time range
        const filteredEvents = response.entries.filter(event => {
          const eventDate = getEventDate(event)
          return eventDate >= start && eventDate <= end
        })

        allEvents.push(...filteredEvents)
      }

      setTotalEvents(allEvents.length)

      // Process event rate data
      const rateMap = new Map<string, number>()
      const typeMap = new Map<string, number>()

      allEvents.forEach(event => {
        const eventDate = getEventDate(event)
        const zonedDate = convertToSelectedTimezone(eventDate)
        
        // Group by time granularity
        let timeKey: string
        if (timeGranularity === 'hour') {
          timeKey = formatDateForTimezone(startOfHour(zonedDate), 'yyyy-MM-dd HH:00')
        } else if (timeGranularity === 'minute') {
          timeKey = formatDateForTimezone(zonedDate, 'yyyy-MM-dd HH:mm')
        } else {
          timeKey = formatDateForTimezone(zonedDate, 'yyyy-MM-dd HH:mm:ss')
        }

        rateMap.set(timeKey, (rateMap.get(timeKey) || 0) + 1)

        // Count event types
        typeMap.set(event.eventType, (typeMap.get(event.eventType) || 0) + 1)
      })

      // Convert rate map to array and sort by time
      const rateData = Array.from(rateMap.entries())
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => a.time.localeCompare(b.time))

      setEventRateData(rateData)

      // Convert type map to array and calculate percentages
      const typeData = Array.from(typeMap.entries())
        .map(([name, count]) => ({
          name,
          count,
          percentage: (count / allEvents.length) * 100
        }))
        .sort((a, b) => b.count - a.count)

      setEventTypeData(typeData)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis')
    } finally {
      setAnalyzing(false)
    }
  }, [streamName, startDate, endDate, timeGranularity, timezone, binarySearchForDate])

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B', '#4ECDC4', '#45B7D1']

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Activity className="h-8 w-8" />
          Event Analysis
        </h1>
        <p className="text-muted-foreground">
          Analyze event patterns, rates, and distributions over time
        </p>
      </div>

      <div className="grid gap-6">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Parameters</CardTitle>
            <CardDescription>
              Configure the stream and time range for analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stream Selection</Label>
                <div className="flex gap-2">
                  <Button
                    variant={useCustomStream ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUseCustomStream(true)}
                  >
                    Custom Stream
                  </Button>
                  <Button
                    variant={!useCustomStream ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUseCustomStream(false)}
                  >
                    Saved Aggregates
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeGranularity">Time Granularity</Label>
                <Select value={timeGranularity} onValueChange={(value: 'hour' | 'minute' | 'second') => setTimeGranularity(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hour">Hour</SelectItem>
                    <SelectItem value="minute">Minute</SelectItem>
                    <SelectItem value="second">Second</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={(value: 'UTC' | 'Europe/Oslo') => setTimezone(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="Europe/Oslo">Norwegian Time (Europe/Oslo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stream">
                {useCustomStream ? "Stream Name" : "Select Saved Aggregate"}
              </Label>
              {useCustomStream ? (
                <Input
                  id="stream"
                  value={streamName}
                  onChange={(e) => setStreamName(e.target.value)}
                  placeholder="$all, $ce-MyAggregate, etc."
                  className="font-mono"
                />
              ) : (
                <Select value={streamName} onValueChange={setStreamName}>
                  <SelectTrigger className="font-mono">
                    <SelectValue placeholder="Select a saved aggregate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedAggregates.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No saved aggregates found
                      </SelectItem>
                    ) : (
                      savedAggregates.map((aggregate) => (
                        <SelectItem key={aggregate.id} value={aggregate.streamPrefix}>
                          <div className="flex flex-col">
                            <span className="font-medium">{aggregate.name}</span>
                            {aggregate.description && (
                              <span className="text-xs text-muted-foreground">
                                {aggregate.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date & Time ({getTimezoneOffset(timezone)})</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date & Time ({getTimezoneOffset(timezone)})</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <Button 
              onClick={analyzeEvents} 
              disabled={analyzing || !streamName}
              className="w-full"
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Analyze Events
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {(eventRateData.length > 0 || eventTypeData.length > 0) && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Total Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{totalEvents.toLocaleString()}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Rate per Minute</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {(() => {
                      const start = new Date(startDate)
                      const end = new Date(endDate)
                      const durationMs = end.getTime() - start.getTime()
                      const durationMinutes = durationMs / (1000 * 60)
                      const ratePerMinute = durationMinutes > 0 ? totalEvents / durationMinutes : 0
                      return ratePerMinute.toFixed(1)
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground">events/min</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Time Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {formatDateForTimezone(new Date(startDate), 'MMM d, HH:mm')} - {formatDateForTimezone(new Date(endDate), 'MMM d, HH:mm')} ({getTimezoneOffset(timezone)})
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Event Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{eventTypeData.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="rate" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="rate">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Event Rate
                </TabsTrigger>
                <TabsTrigger value="timeline">
                  <Activity className="mr-2 h-4 w-4" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="types">
                  <PieChartIcon className="mr-2 h-4 w-4" />
                  Event Types
                </TabsTrigger>
              </TabsList>

              <TabsContent value="rate" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Event Rate</CardTitle>
                    <CardDescription>
                      Number of events per {timeGranularity}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={eventRateData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="time" 
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Event Timeline</CardTitle>
                    <CardDescription>
                      Event distribution over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={eventRateData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="time" 
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#8884d8" 
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="types" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Event Type Distribution</CardTitle>
                      <CardDescription>
                        Event types by count
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={eventTypeData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                              outerRadius={120}
                              fill="#8884d8"
                              dataKey="count"
                            >
                              {eventTypeData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Event Type Details</CardTitle>
                      <CardDescription>
                        Breakdown by event type
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {eventTypeData.map((type, index) => (
                          <div key={type.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="text-sm font-medium">{type.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">{type.count.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">{type.percentage.toFixed(1)}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}