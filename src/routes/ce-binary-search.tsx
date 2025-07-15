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
} from "lucide-react";
import { serverManager } from "@/api/eventstore";
import { format } from "date-fns";
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
              <Label htmlFor="date">Target Date & Time</Label>
              <Input
                id="date"
                type="datetime-local"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="font-mono"
              />
            </div>

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
                      {format(new Date(step.date), "yyyy-MM-dd HH:mm:ss")}
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
              <div className="space-y-4">
                {results.map((event) => {
                  const eventData = JSON.parse(event.data);
                  const eventDate = getEventDate(event);

                  return (
                    <div
                      key={event.eventId}
                      className="space-y-2 p-4 border rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge>{event.eventType}</Badge>
                          <span className="text-sm text-muted-foreground">
                            Position: {event.positionEventNumber}
                          </span>
                        </div>
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

                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Date:</span>
                          <span className="font-mono">
                            {format(eventDate, "yyyy-MM-dd HH:mm:ss.SSS")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Stream:</span>
                          <span className="font-mono text-xs">
                            {event.streamId}
                          </span>
                        </div>
                      </div>

                      {eventData.correlationId && (
                        <div className="text-xs text-muted-foreground">
                          Correlation ID: {eventData.correlationId}
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
