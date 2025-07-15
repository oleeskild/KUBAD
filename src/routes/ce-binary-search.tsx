import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  Calendar,
  AlertCircle,
  Loader2,
  ChevronRight,
  Star,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { serverManager } from "@/api/eventstore";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Badge } from "@/components/ui/badge";
import { useSavedAggregates } from "@/contexts/SavedAggregatesContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/ce-binary-search")({
  component: CEBinarySearch,
});

interface EventEntry {
  eventId: string;
  eventType: string;
  eventNumber: number;
  data: string;
  metaData: string;
  linkMetaData: string;
  streamId: string;
  positionEventNumber: number;
  positionStreamId: string;
  title: string;
  updated: string;
}

interface StreamResponse {
  entries: EventEntry[];
  links: Array<{
    uri: string;
    relation: string;
  }>;
}

function CEBinarySearch() {
  const [streamName, setStreamName] = useState("$ce-MyStream");
  const [targetDate, setTargetDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [timeWindowMinutes, setTimeWindowMinutes] = useState(60);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<EventEntry[]>([]);
  const [searchPath, setSearchPath] = useState<
    Array<{ position: number; date: string; direction: "forward" | "backward" }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [foundRange, setFoundRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [useCustomStream, setUseCustomStream] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'position' | 'size' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [timezone, setTimezone] = useState<'UTC' | 'Europe/Oslo'>('Europe/Oslo');

  const { savedAggregates } = useSavedAggregates();

  const fetchEvents = async (
    position: string | "head",
    direction: "backward" | "forward" = "backward",
    limit: number = 20
  ): Promise<StreamResponse | null> => {
    try {
      const currentServer = serverManager.getCurrentServer();
      if (!currentServer) {
        throw new Error("No server configured");
      }

      const baseUrl = currentServer.url;
      const username = currentServer.username;
      const password = currentServer.password;

      const url = `${baseUrl}/streams/${encodeURIComponent(streamName)}/${position}/${direction}/${limit}?embed=tryharder`;

      const response = await fetch(url, {
        headers: {
          Authorization: "Basic " + btoa(`${username}:${password}`),
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error("Error fetching events:", err);
      return null;
    }
  };

  const getEventDate = (event: EventEntry): Date => {
    try {
      const data = JSON.parse(event.data);
      return new Date(data.occurredAt);
    } catch {
      return new Date(event.updated);
    }
  };

  const binarySearch = useCallback(async () => {
    setSearching(true);
    setError(null);
    setResults([]);
    setSearchPath([]);
    setFoundRange(null);

    const target = new Date(targetDate);

    try {
      // Start from head
      const headResponse = await fetchEvents("head");
      if (!headResponse || headResponse.entries.length === 0) {
        setError("No events found in stream");
        return;
      }

      // Get the latest event position
      const latestPosition = headResponse.entries[0].positionEventNumber;

      // Binary search
      let left = 0;
      let right = latestPosition;
      let iterations = 0;
      const maxIterations = 50;

      while (left < right && iterations < maxIterations) {
        iterations++;
        const mid = Math.floor((left + right) / 2);

        // Fetch events at mid position
        const response = await fetchEvents(mid.toString(), "forward", 10);
        if (!response || response.entries.length === 0) {
          // If no events at mid, adjust bounds
          right = mid - 1;
          continue;
        }

        const firstEvent = response.entries[0];
        const eventDate = getEventDate(firstEvent);

        setSearchPath((prev) => [
          ...prev,
          {
            position: mid,
            date: eventDate.toISOString(),
            direction: eventDate < target ? "forward" : "backward",
          },
        ]);

        if (eventDate < target) {
          left = mid + 1;
        } else {
          right = mid;
        }
      }

      // Fetch events around the found position
      const finalPosition = Math.max(0, left - 10);
      const finalResponse = await fetchEvents(
        finalPosition.toString(),
        "forward",
        100
      );

      if (finalResponse && finalResponse.entries.length > 0) {
        // Filter events within a time window around the target
        const timeWindow = timeWindowMinutes * 60 * 1000; // Convert minutes to milliseconds
        const relevantEvents = finalResponse.entries.filter((event) => {
          const eventDate = getEventDate(event);
          return Math.abs(eventDate.getTime() - target.getTime()) <= timeWindow;
        });

        if (relevantEvents.length > 0) {
          setResults(relevantEvents);
          setFoundRange({
            start: relevantEvents[0].positionEventNumber,
            end: relevantEvents[relevantEvents.length - 1].positionEventNumber,
          });
        } else {
          setError(
            `No events found within ${timeWindowMinutes} minutes of the target date`
          );
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred during search"
      );
    } finally {
      setSearching(false);
    }
  }, [streamName, targetDate, timeWindowMinutes]);

  const navigateToStream = (eventPosition: number) => {
    const currentServer = serverManager.getCurrentServer();
    if (!currentServer) return;

    const baseUrl = currentServer.url;
    const streamUrl = `${baseUrl}/web/index.html#/streams/${encodeURIComponent(streamName)}/${eventPosition}`;
    window.open(streamUrl, "_blank");
  };

  const getEventSize = (event: EventEntry): number => {
    return JSON.stringify(event.data).length + JSON.stringify(event.metaData).length;
  };

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleSort = (field: 'date' | 'position' | 'size' | 'type') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortedResults = () => {
    const sorted = [...results].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'date':
          aValue = getEventDate(a).getTime();
          bValue = getEventDate(b).getTime();
          break;
        case 'position':
          aValue = a.positionEventNumber;
          bValue = b.positionEventNumber;
          break;
        case 'size':
          aValue = getEventSize(a);
          bValue = getEventSize(b);
          break;
        case 'type':
          aValue = a.eventType;
          bValue = b.eventType;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getSortIcon = (field: 'date' | 'position' | 'size' | 'type') => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const getTimezoneOffset = (tz: string) => {
    if (tz === 'UTC') return 'UTC'
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'short'
    })
    return formatter.formatToParts(now).find(part => part.type === 'timeZoneName')?.value || tz
  }

  const formatDateForTimezone = (date: Date, formatStr: string): string => {
    if (timezone === 'UTC') {
      return format(date, formatStr)
    }
    return formatInTimeZone(date, timezone, formatStr)
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Temporal Search</h1>
        <p className="text-muted-foreground">
          Efficiently search for events around a specific date using binary
          search
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Search Parameters</CardTitle>
            <CardDescription>
              Configure the stream and target date for your search
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="streamSelector">Stream Selection</Label>
              <div className="flex gap-2">
                <Button
                  variant={!useCustomStream ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseCustomStream(false)}
                >
                  <Star className="mr-2 h-4 w-4" />
                  Saved Aggregates
                </Button>
                <Button
                  variant={useCustomStream ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseCustomStream(true)}
                >
                  Custom Stream
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stream">
                {useCustomStream
                  ? "Custom Stream Name"
                  : "Select Saved Aggregate"}
              </Label>
              {useCustomStream ? (
                <Input
                  id="stream"
                  value={streamName}
                  onChange={(e) => setStreamName(e.target.value)}
                  placeholder="$ce-MyStream"
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
                        <SelectItem
                          key={aggregate.id}
                          value={aggregate.streamPrefix}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {aggregate.name}
                            </span>
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

            <div className="space-y-2">
              <Label htmlFor="date">Target Date & Time ({getTimezoneOffset(timezone)})</Label>
              <Input
                id="date"
                type="datetime-local"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeWindow">Time Window (minutes)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="timeWindow"
                    type="number"
                    min="1"
                    max="1440"
                    value={timeWindowMinutes}
                    onChange={(e) =>
                      setTimeWindowMinutes(parseInt(e.target.value) || 60)
                    }
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    Events within ±{timeWindowMinutes} minutes
                  </span>
                </div>
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

            <Button
              onClick={binarySearch}
              disabled={searching || !streamName}
              className="w-full"
            >
              {searching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Start Binary Search
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {searchPath.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Search Path</CardTitle>
              <CardDescription>
                Binary search iterations to find the target date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {searchPath.map((step, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Badge
                      variant={
                        step.direction === "forward" ? "default" : "secondary"
                      }
                    >
                      Position {step.position}
                    </Badge>
                    <span className="text-muted-foreground">
                      {formatDateForTimezone(new Date(step.date), "yyyy-MM-dd HH:mm:ss")} ({getTimezoneOffset(timezone)})
                    </span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-xs">Going {step.direction}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                Found {results.length} events around the target date
                {foundRange && (
                  <span className="ml-2">
                    (Positions {foundRange.start} - {foundRange.end})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Sorting Controls */}
              <div className="flex flex-wrap gap-2 mb-4 p-2 bg-muted rounded-lg">
                <span className="text-sm font-medium self-center">Sort by:</span>
                <Button
                  variant={sortBy === 'date' ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleSort('date')}
                  className="flex items-center gap-1"
                >
                  Date {getSortIcon('date')}
                </Button>
                <Button
                  variant={sortBy === 'position' ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleSort('position')}
                  className="flex items-center gap-1"
                >
                  Position {getSortIcon('position')}
                </Button>
                <Button
                  variant={sortBy === 'size' ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleSort('size')}
                  className="flex items-center gap-1"
                >
                  Size {getSortIcon('size')}
                </Button>
                <Button
                  variant={sortBy === 'type' ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleSort('type')}
                  className="flex items-center gap-1"
                >
                  Type {getSortIcon('type')}
                </Button>
              </div>

              <div className="space-y-4">
                {getSortedResults().map((event) => {
                  const eventData = JSON.parse(event.data);
                  const metaData = JSON.parse(event.metaData);
                  const eventDate = getEventDate(event);
                  const eventSize = getEventSize(event);
                  const isExpanded = expandedEvents.has(event.eventId);

                  return (
                    <div
                      key={event.eventId}
                      className="space-y-3 p-4 border rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge>{event.eventType}</Badge>
                          <span className="text-sm text-muted-foreground">
                            Position: {event.positionEventNumber}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Size: {formatBytes(eventSize)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleEventExpansion(event.eventId)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              navigateToStream(event.positionEventNumber)
                            }
                          >
                            <Calendar className="mr-2 h-3 w-3" />
                            View in Stream
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Date:</span>
                            <span className="font-mono">
                              {formatDateForTimezone(eventDate, "yyyy-MM-dd HH:mm:ss.SSS")} ({getTimezoneOffset(timezone)})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Stream:</span>
                            <span className="font-mono text-xs">
                              {event.streamId}
                            </span>
                          </div>
                          {eventData.correlationId && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Correlation ID:</span>
                              <span className="font-mono text-xs">
                                {eventData.correlationId}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          {eventData.aggregateId && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Aggregate ID:</span>
                              <span className="font-mono text-xs">
                                {eventData.aggregateId}
                              </span>
                            </div>
                          )}
                          {eventData.userName && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">User:</span>
                              <span className="text-xs">
                                {eventData.userName}
                              </span>
                            </div>
                          )}
                          {eventData.environment && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Environment:</span>
                              <span className="text-xs">
                                {eventData.environment}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="space-y-3 border-t pt-3">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm">Event Data</h4>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(JSON.stringify(eventData, null, 2))}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-60">
                              {JSON.stringify(eventData, null, 2)}
                            </pre>
                          </div>
                          
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm">Metadata</h4>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(JSON.stringify(metaData, null, 2))}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                              {JSON.stringify(metaData, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
