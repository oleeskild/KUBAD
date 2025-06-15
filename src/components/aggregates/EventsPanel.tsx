import { useEffect, useRef } from "react";
import { type Event } from "@/api/eventstore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Database,
  Pin,
  PinOff,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Expand,
  Shrink,
  ChevronsDown,
  ChevronsUp,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow, solarizedlight } from "react-syntax-highlighter/dist/esm/styles/prism";

interface EventsPanelProps {
  selectedStream: string | null;
  events: Event[] | null | undefined;
  expandedEvents: Set<string>;
  eventData: Map<string, Event>;
  filteredEventData: Map<string, any>;
  loadingEvents: Set<string>;
  selectedEventIndex: number;
  isActiveColumn: boolean;
  isExpandingAll: boolean;
  pinnedStreams: string[];
  jsonPathFilter: string;
  isFullEventDisplay: boolean;
  isFullscreen?: boolean;
  onJsonPathFilterChange: (filter: string) => void;
  onToggleEvent: (event: Event) => void;
  onExpandAll: () => void;
  onTogglePinStream: (streamId: string) => void;
  onToggleEventDisplayMode: () => void;
  onToggleFullscreen?: () => void;
  onFilterFocusChange: (focused: boolean) => void;
}

export function EventsPanel({
  selectedStream,
  events,
  expandedEvents,
  eventData,
  filteredEventData,
  loadingEvents,
  selectedEventIndex,
  isActiveColumn,
  isExpandingAll,
  pinnedStreams,
  jsonPathFilter,
  isFullEventDisplay,
  isFullscreen = false,
  onJsonPathFilterChange,
  onToggleEvent,
  onExpandAll,
  onTogglePinStream,
  onToggleEventDisplayMode,
  onToggleFullscreen,
  onFilterFocusChange,
}: EventsPanelProps) {
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const isPinned = (streamId: string) => pinnedStreams.includes(streamId);

  // Auto-scroll to selected item
  useEffect(() => {
    if (isActiveColumn && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [selectedEventIndex, isActiveColumn]);

  if (!selectedStream) {
    return (
      <div className={cn("p-4 h-full", !isFullscreen && "border-l border-border")}>
        <div className="flex items-center justify-center h-full text-muted-readable">
          <div className="text-center">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-subtitle">Select an instance to view events</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4 h-full flex flex-col", !isFullscreen && "border-l border-border")}>
      <div className="flex-shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-keyword">Events</h3>
            <p className="text-sm text-code">{selectedStream}</p>
            {isFullscreen && (
              <p className="text-xs text-muted-foreground mt-1">Press ESC to exit fullscreen</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Fullscreen toggle */}
            {onToggleFullscreen && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleFullscreen}
                className={cn(
                  "flex items-center gap-2 transition-all duration-300",
                  isFullscreen
                    ? "border-primary text-primary bg-primary/10 hover:bg-primary/20"
                    : "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                )}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-3 w-3" />
                    <span className="text-xs font-medium">Exit</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3 w-3" />
                    <span className="text-xs font-medium">Fullscreen</span>
                  </>
                )}
              </Button>
            )}
            {/* Event display mode toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleEventDisplayMode}
              className={cn(
                "flex items-center gap-2 transition-all duration-300",
                isFullEventDisplay
                  ? "border-primary text-primary bg-primary/10 hover:bg-primary/20"
                  : "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
              )}
            >
              {isFullEventDisplay ? (
                <>
                  <Shrink className="h-3 w-3" />
                  <span className="text-xs font-medium">Scrollable</span>
                </>
              ) : (
                <>
                  <Expand className="h-3 w-3" />
                  <span className="text-xs font-medium">Full</span>
                </>
              )}
            </Button>
            {/* Pin button for current stream */}
            {selectedStream && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTogglePinStream(selectedStream)}
                className={cn(
                  "flex items-center gap-2 transition-all duration-300",
                  isPinned(selectedStream)
                    ? "border-primary text-primary bg-primary/10 hover:bg-primary/20"
                    : "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                )}
              >
                {isPinned(selectedStream) ? (
                  <>
                    <PinOff className="h-3 w-3" />
                    <span className="text-xs font-medium">Unpin</span>
                  </>
                ) : (
                  <>
                    <Pin className="h-3 w-3" />
                    <span className="text-xs font-medium">Pin</span>
                  </>
                )}
              </Button>
            )}
            {events && events.length > 0 && (
              <Button
                onClick={onExpandAll}
                disabled={isExpandingAll}
                variant="outline"
                size="sm"
                className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 hover:from-primary/20 hover:to-accent/20 hover:border-primary/50 transition-all duration-300 cursor-pointer group"
              >
                {isExpandingAll ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    <span className="text-xs">Loading...</span>
                  </div>
                ) : events.every((event) =>
                    expandedEvents.has(`${selectedStream}-${event.eventNumber}`)
                  ) ? (
                  <div className="flex items-center space-x-2">
                    <ChevronsUp className="h-3 w-3 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium">Collapse All</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <ChevronsDown className="h-3 w-3 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium">Expand All</span>
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* JSONPath Filter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              JSON Path Filter
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onJsonPathFilterChange("")}
              className="h-6 text-xs text-muted-foreground hover:text-foreground"
              disabled={!jsonPathFilter}
            >
              Clear
            </Button>
          </div>
          <Input
            placeholder="$.propertyName or $.items[0].name or $.data.*"
            value={jsonPathFilter}
            onChange={(e) => onJsonPathFilterChange(e.target.value)}
            onFocus={() => onFilterFocusChange(true)}
            onBlur={() => onFilterFocusChange(false)}
            className="h-8 text-xs font-mono"
          />
          {jsonPathFilter && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Examples:</span>{" "}
              <code className="bg-muted px-1 rounded">$.data</code>{" "}
              <code className="bg-muted px-1 rounded">$.items[0]</code>{" "}
              <code className="bg-muted px-1 rounded">$.user.name</code>{" "}
              <code className="bg-muted px-1 rounded">$.*</code>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pt-1 min-h-0">
          {events && events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event, eventIndex) => {
                const isKeyboardSelected =
                  isActiveColumn && selectedEventIndex === eventIndex;
                return (
                  <div
                    key={event.eventId}
                    ref={isKeyboardSelected ? selectedItemRef : null}
                    className={cn(
                      "border border-border bg-muted rounded-lg",
                      isKeyboardSelected &&
                        "ring-4 ring-blue-500 ring-offset-2 ring-offset-background shadow-2xl border-blue-400"
                    )}
                  >
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer"
                      onClick={() => onToggleEvent(event)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono bg-background px-1 rounded">
                            #{event.eventNumber}
                          </span>
                          <span className="font-medium text-sm truncate">
                            {event.eventType}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(event.created).toLocaleString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="cursor-pointer">
                        {expandedEvents.has(
                          `${selectedStream}-${event.eventNumber}`
                        ) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {expandedEvents.has(
                      `${selectedStream}-${event.eventNumber}`
                    ) && (
                      <div className="px-3 pb-3">
                        <Separator className="mb-3" />
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="text-xs font-medium">Event Data</h5>
                          {jsonPathFilter && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-md border">
                              Filtered: {jsonPathFilter}
                            </span>
                          )}
                        </div>
                        {loadingEvents.has(
                          `${selectedStream}-${event.eventNumber}`
                        ) ? (
                          <div className="bg-background p-3 rounded text-xs text-center">
                            Loading event data...
                          </div>
                        ) : (
                          <SyntaxHighlighter
                            language="json"
                            style={document.documentElement.classList.contains('dark') ? tomorrow : solarizedlight}
                            className={cn(
                              "rounded text-xs",
                              !isFullEventDisplay && "max-h-64 overflow-y-auto"
                            )}
                            customStyle={{
                              margin: 0,
                              background: "hsl(var(--card)) !important",
                              fontSize: "0.75rem",
                              border: "1px solid hsl(var(--border))",
                              padding: "12px",
                              maxHeight: isFullEventDisplay ? "none" : "16rem",
                            }}
                          >
                            {JSON.stringify(
                              filteredEventData.get(
                                `${selectedStream}-${event.eventNumber}`
                              )?.data ||
                                eventData.get(
                                  `${selectedStream}-${event.eventNumber}`
                                )?.data ||
                                "No data available",
                              null,
                              2
                            )}
                          </SyntaxHighlighter>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No events found</p>
            </div>
          )}
      </div>
    </div>
  );
}