import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  streams as streamsApi,
  serverManager,
  type Event,
} from "@/api/eventstore";
import { Separator } from "@/components/ui/separator";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Package } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AggregateTypesList,
  AggregateInstancesPanel,
  EventsPanel,
  useKeyboardNavigation,
  type AggregateInstance,
  type KeyboardNavigationState,
} from "@/components/aggregates";

export const Route = createFileRoute("/aggregates")({
  validateSearch: (search) => {
    return {
      aggregate: search.aggregate as string | undefined,
      guid: search.guid as string | undefined,
      stream: search.stream as string | undefined,
    };
  },
  component: AggregatesPage,
});

function AggregatesPage() {
  const navigate = useNavigate();
  const { aggregate, guid, stream } = Route.useSearch();
  const guidInputRef = useRef<HTMLInputElement>(null);

  // Main state
  const [selectedStream, setSelectedStream] = useState<string | null>(stream || null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [eventData, setEventData] = useState<Map<string, Event>>(new Map());
  const [loadingEvents, setLoadingEvents] = useState<Set<string>>(new Set());
  const [selectedAggregate, setSelectedAggregate] = useState<string | null>(aggregate || null);
  const [aggregateGuid, setAggregateGuid] = useState(guid || "");
  const [eventScanCount, setEventScanCount] = useState(200);
  const [selectedAggregateInstances, setSelectedAggregateInstances] = useState<AggregateInstance[]>([]);
  const [isLoadingInstances, setIsLoadingInstances] = useState(false);
  const [isExpandingAll, setIsExpandingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [jsonPathFilter, setJsonPathFilter] = useState("");
  const [filteredEventData, setFilteredEventData] = useState<Map<string, any>>(new Map());
  const [showSuggestions, setShowSuggestions] = useState(false);

  // User aggregates state
  const [userAggregates, setUserAggregates] = useState<string[]>(() => {
    const saved = localStorage.getItem("eventstore-aggregates");
    return saved ? JSON.parse(saved) : [];
  });

  // Pinned streams state
  const [pinnedStreams, setPinnedStreams] = useState<string[]>(() => {
    const currentServer = serverManager.getCurrentServer();
    const serverKey = currentServer
      ? `eventstore-pinned-streams-${currentServer.id}`
      : "eventstore-pinned-streams";
    const saved = localStorage.getItem(serverKey);
    return saved ? JSON.parse(saved) : [];
  });

  // Keyboard navigation state
  const [navigationState, setNavigationState] = useState<KeyboardNavigationState>({
    activeColumn: "aggregates",
    selectedAggregateIndex: 0,
    selectedInstanceIndex: 0,
    selectedEventIndex: 0,
    isFilterFocused: false,
  });

  // Simple JSONPath-like filter implementation
  const applyJsonPathFilter = (data: any, path: string): any => {
    if (!path || path === "$" || path === "") return data;

    try {
      const cleanPath = path.startsWith("$") ? path.slice(1) : path;
      const parts = cleanPath.split(".").filter((p) => p !== "");

      let result = data;
      for (const part of parts) {
        if (part === "*") {
          if (Array.isArray(result)) {
            return result;
          } else if (typeof result === "object" && result !== null) {
            return Object.values(result);
          }
          return result;
        } else if (part.includes("[") && part.includes("]")) {
          const [key, indexPart] = part.split("[");
          const index = indexPart.replace("]", "");

          if (key) {
            result = result?.[key];
          }

          if (Array.isArray(result)) {
            if (index === "*") {
              return result;
            } else {
              const idx = parseInt(index);
              result = isNaN(idx) ? result : result[idx];
            }
          }
        } else {
          result = result?.[part];
        }

        if (result === undefined || result === null) {
          return null;
        }
      }

      return result;
    } catch (error) {
      console.error("JSONPath filter error:", error);
      return data;
    }
  };

  // Update filtered data when jsonPathFilter or eventData changes
  useEffect(() => {
    if (!jsonPathFilter) {
      setFilteredEventData(eventData);
      return;
    }

    const filtered = new Map();
    eventData.forEach((event, key) => {
      try {
        const filteredData = applyJsonPathFilter(event.data, jsonPathFilter);
        filtered.set(key, { ...event, data: filteredData });
      } catch (error) {
        filtered.set(key, event);
      }
    });
    setFilteredEventData(filtered);
  }, [jsonPathFilter, eventData]);

  // Update URL when state changes
  const updateURL = (
    newAggregate?: string | null,
    newGuid?: string,
    newStream?: string | null
  ) => {
    const searchParams: any = {};
    if (newAggregate) searchParams.aggregate = newAggregate;
    if (newGuid) searchParams.guid = newGuid;
    if (newStream) searchParams.stream = newStream;

    navigate({
      to: "/aggregates",
      search: searchParams,
      replace: true,
    });
  };

  // Initialize state from URL on component mount
  useEffect(() => {
    if (aggregate && !selectedAggregate) {
      setSelectedAggregate(aggregate);
    }
    if (guid && !aggregateGuid) {
      setAggregateGuid(guid);
    }
    if (stream && !selectedStream) {
      setSelectedStream(stream);
    }
  }, [aggregate, guid, stream]);

  // Reload pinned streams when server changes
  useEffect(() => {
    const currentServer = serverManager.getCurrentServer();
    const serverKey = currentServer
      ? `eventstore-pinned-streams-${currentServer.id}`
      : "eventstore-pinned-streams";
    const saved = localStorage.getItem(serverKey);
    const serverPinnedStreams = saved ? JSON.parse(saved) : [];
    setPinnedStreams(serverPinnedStreams);
  }, []);

  // Queries
  const { data: streams } = useQuery({
    queryKey: ["streams", eventScanCount],
    queryFn: () => streamsApi.list(0, 20, eventScanCount),
    enabled: showSuggestions,
  });

  const { data: events } = useQuery({
    queryKey: ["stream", selectedStream],
    queryFn: () => (selectedStream ? streamsApi.get(selectedStream) : null),
    enabled: !!selectedStream,
    refetchInterval: selectedStream ? 10000 : false,
  });

  // Save user aggregates to localStorage
  const saveUserAggregates = (aggregates: string[]) => {
    localStorage.setItem("eventstore-aggregates", JSON.stringify(aggregates));
    setUserAggregates(aggregates);
  };

  // Save pinned streams to localStorage
  const savePinnedStreams = (streams: string[]) => {
    const currentServer = serverManager.getCurrentServer();
    const serverKey = currentServer
      ? `eventstore-pinned-streams-${currentServer.id}`
      : "eventstore-pinned-streams";
    localStorage.setItem(serverKey, JSON.stringify(streams));
    setPinnedStreams(streams);
  };

  // Pin/unpin stream functionality
  const togglePinStream = (streamId: string) => {
    const newPinnedStreams = pinnedStreams.includes(streamId)
      ? pinnedStreams.filter((id) => id !== streamId)
      : [...pinnedStreams, streamId];
    savePinnedStreams(newPinnedStreams);
  };

  // Toast functionality
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyToClipboard = (text: string, event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard");
  };

  const getAggregatesByType = (aggregateType: string) => {
    if (!streams) return [];

    return streams
      .filter((stream) => stream.streamId.startsWith(`${aggregateType}-`))
      .map((stream) => {
        const guidMatch = stream.streamId.match(/-([a-f0-9-]{36})$/i);
        return {
          ...stream,
          guid: guidMatch ? guidMatch[1] : "",
          aggregateType,
        };
      })
      .filter((stream) => stream.guid);
  };

  const getPinnedAggregateInstances = (aggregateType: string) => {
    return pinnedStreams
      .filter((streamId) => streamId.startsWith(`${aggregateType}-`))
      .map((streamId) => {
        const guidMatch = streamId.match(/-([a-f0-9-]{36})$/i);
        if (!guidMatch) return null;

        const guid = guidMatch[1];
        const stream = streams?.find((s) => s.streamId === streamId);

        if (stream) {
          return {
            ...stream,
            guid,
            aggregateType,
          };
        } else {
          return {
            streamId,
            eventCount: 0,
            created: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            guid,
            aggregateType,
          };
        }
      })
      .filter(
        (instance): instance is NonNullable<typeof instance> =>
          instance !== null && instance.guid !== ""
      );
  };

  const handleAggregateSelect = async (
    aggregateType: string,
    guid?: string
  ) => {
    setSelectedAggregate(aggregateType);
    setSelectedAggregateInstances([]);
    setSelectedStream(null);

    if (!guid) {
      setAggregateGuid("");
    }
    setExpandedEvents(new Set());
    setEventData(new Map());
    setLoadingEvents(new Set());

    if (guid) {
      setAggregateGuid(guid);
      const streamId = `${aggregateType}-${guid}`;
      setSelectedStream(streamId);
      updateURL(aggregateType, guid, streamId);
    } else {
      updateURL(aggregateType, undefined, null);

      setTimeout(() => {
        guidInputRef.current?.focus();
        setNavigationState(prev => ({ ...prev, selectedInstanceIndex: -1 }));
      }, 100);

      setIsLoadingInstances(true);
      try {
        const instances = getAggregatesByType(aggregateType);
        const sortedInstances = instances
          .sort(
            (a, b) =>
              new Date(b.created).getTime() - new Date(a.created).getTime()
          )
          .slice(0, 20);
        setSelectedAggregateInstances(sortedInstances);
      } catch (error) {
        console.error("Error loading aggregate instances:", error);
      } finally {
        setIsLoadingInstances(false);
      }
    }
  };

  const handleInstanceSelect = (instance: AggregateInstance) => {
    setAggregateGuid(instance.guid);
    const streamId = `${selectedAggregate}-${instance.guid}`;
    setSelectedStream(streamId);
    updateURL(selectedAggregate, instance.guid, streamId);
  };

  const handleExpandAll = async () => {
    if (!events || !selectedStream) return;

    setIsExpandingAll(true);
    const allExpanded = events.every((event) =>
      expandedEvents.has(`${selectedStream}-${event.eventNumber}`)
    );

    if (allExpanded) {
      setExpandedEvents(new Set());
    } else {
      const newExpanded = new Set<string>();
      const newEventData = new Map(eventData);

      for (const event of events) {
        const eventKey = `${selectedStream}-${event.eventNumber}`;
        newExpanded.add(eventKey);

        if (!eventData.has(eventKey)) {
          setLoadingEvents((prev) => new Set(prev).add(eventKey));

          try {
            const fullEvent = await streamsApi.getEvent(
              selectedStream,
              event.eventNumber
            );
            newEventData.set(eventKey, fullEvent);
            setEventData((prev) => new Map(prev).set(eventKey, fullEvent));
          } catch (error) {
            console.error("Error fetching event data:", error);
          } finally {
            setLoadingEvents((prev) => {
              const newSet = new Set(prev);
              newSet.delete(eventKey);
              return newSet;
            });
          }
        }
      }

      setExpandedEvents(newExpanded);
    }

    setIsExpandingAll(false);
  };

  const toggleEvent = async (event: Event) => {
    const eventKey = `${selectedStream}-${event.eventNumber}`;
    const newExpanded = new Set(expandedEvents);

    if (newExpanded.has(eventKey)) {
      newExpanded.delete(eventKey);
    } else {
      newExpanded.add(eventKey);

      if (!eventData.has(eventKey)) {
        setLoadingEvents((prev) => new Set(prev).add(eventKey));

        try {
          const fullEvent = await streamsApi.getEvent(
            selectedStream!,
            event.eventNumber
          );
          setEventData((prev) => new Map(prev).set(eventKey, fullEvent));
        } catch (error) {
          console.error("Error fetching event data:", error);
        } finally {
          setLoadingEvents((prev) => {
            const newSet = new Set(prev);
            newSet.delete(eventKey);
            return newSet;
          });
        }
      }
    }

    setExpandedEvents(newExpanded);
  };

  // Use keyboard navigation hook
  useKeyboardNavigation({
    navigationState,
    onNavigationChange: (updates) => setNavigationState(prev => ({ ...prev, ...updates })),
    userAggregates,
    selectedAggregate,
    selectedAggregateInstances,
    events,
    selectedStream,
    aggregateGuid,
    onAggregateSelect: handleAggregateSelect,
    onInstanceSelect: handleInstanceSelect,
    onToggleEvent: toggleEvent,
    onExpandAll: handleExpandAll,
    onTogglePinStream: togglePinStream,
    onShowSuggestionsToggle: () => setShowSuggestions(!showSuggestions),
    getPinnedAggregateInstances,
    guidInputRef,
  });

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
              Aggregates
            </h2>
            <p className="text-muted-foreground">
              Browse aggregates by type and navigate with GUID
            </p>
            <div className="text-xs text-muted-foreground">
              <span className="hidden lg:inline">
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">h/l</kbd>{" "}
                or{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">←→</kbd>{" "}
                switch columns •
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">j/k</kbd>{" "}
                or{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">↑↓</kbd>{" "}
                navigate •
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">g/G</kbd>{" "}
                top/bottom •
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                  Enter
                </kbd>{" "}
                select •
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">p</kbd>{" "}
                pin •
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">r</kbd>{" "}
                recent •
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">/</kbd>{" "}
                filter •
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">e</kbd>{" "}
                expand all
              </span>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1 border-2 border-primary/20 bg-gradient-to-br from-card via-background/50 to-card rounded-3xl shadow-2xl backdrop-blur-sm overflow-hidden"
        >
          {/* Column 1: Aggregate Types */}
          <ResizablePanel defaultSize={20} minSize={20}>
            <AggregateTypesList
              userAggregates={userAggregates}
              onAggregatesChange={saveUserAggregates}
              selectedAggregate={selectedAggregate}
              onAggregateSelect={handleAggregateSelect}
              selectedAggregateIndex={navigationState.selectedAggregateIndex}
              isActiveColumn={navigationState.activeColumn === "aggregates"}
              eventScanCount={eventScanCount}
              onEventScanCountChange={setEventScanCount}
              getAggregatesByType={getAggregatesByType}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Column 2: Recent Instances or GUID Input */}
          <ResizablePanel defaultSize={25} minSize={25}>
            <AggregateInstancesPanel
              selectedAggregate={selectedAggregate}
              aggregateGuid={aggregateGuid}
              onAggregateGuidChange={setAggregateGuid}
              onAggregateSelect={handleAggregateSelect}
              selectedAggregateInstances={selectedAggregateInstances}
              isLoadingInstances={isLoadingInstances}
              pinnedStreams={pinnedStreams}
              onTogglePinStream={togglePinStream}
              onInstanceSelect={handleInstanceSelect}
              onCopyToClipboard={handleCopyToClipboard}
              selectedStream={selectedStream}
              selectedInstanceIndex={navigationState.selectedInstanceIndex}
              isActiveColumn={navigationState.activeColumn === "instances"}
              getPinnedAggregateInstances={getPinnedAggregateInstances}
              updateURL={updateURL}
              guidInputRef={guidInputRef}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Column 3: Events */}
          <ResizablePanel defaultSize={55} minSize={25}>
            <EventsPanel
              selectedStream={selectedStream}
              events={events}
              expandedEvents={expandedEvents}
              eventData={eventData}
              filteredEventData={filteredEventData}
              loadingEvents={loadingEvents}
              selectedEventIndex={navigationState.selectedEventIndex}
              isActiveColumn={navigationState.activeColumn === "events"}
              isExpandingAll={isExpandingAll}
              pinnedStreams={pinnedStreams}
              jsonPathFilter={jsonPathFilter}
              onJsonPathFilterChange={setJsonPathFilter}
              onToggleEvent={toggleEvent}
              onExpandAll={handleExpandAll}
              onTogglePinStream={togglePinStream}
              onFilterFocusChange={(focused) => setNavigationState(prev => ({ ...prev, isFilterFocused: focused }))}
            />
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in-0 duration-300">
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg border border-primary/20 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-white"></div>
                </div>
                <span className="text-sm font-medium">{toastMessage}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}