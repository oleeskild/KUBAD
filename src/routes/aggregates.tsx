import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { streams as streamsApi, type Event } from "@/api/eventstore";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AggregateTypesList,
  AggregateInstancesPanel,
  EventsPanel,
  AggregatesPageHeader,
  ToastNotification,
  useKeyboardNavigation,
  useAggregateState,
  useEventHandling,
  useAggregateOperations,
  useToastNotification,
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

  // Use custom hooks for state management
  const {
    selectedStream,
    setSelectedStream,
    selectedAggregate,
    setSelectedAggregate,
    aggregateGuid,
    setAggregateGuid,
    eventScanCount,
    setEventScanCount,
    selectedAggregateInstances,
    setSelectedAggregateInstances,
    isLoadingInstances,
    setIsLoadingInstances,
    showSuggestions,
    setShowSuggestions,
    jsonPathFilter,
    setJsonPathFilter,
    isFullEventDisplay,
    userAggregates,
    pinnedStreams,
    saveUserAggregates,
    toggleEventDisplayMode,
    togglePinStream,
  } = useAggregateState(aggregate, guid, stream);

  // Use event handling hook
  const {
    expandedEvents,
    eventData,
    loadingEvents,
    isExpandingAll,
    filteredEventData,
    setFilteredEventData,
    handleExpandAll,
    toggleEvent,
    clearEventData,
  } = useEventHandling();

  // Use toast notification hook
  const { toastMessage, showToast, hideToast } = useToastNotification();

  // Keyboard navigation state
  const [navigationState, setNavigationState] = useState<KeyboardNavigationState>({
    activeColumn: "aggregates",
    selectedAggregateIndex: 0,
    selectedInstanceIndex: 0,
    selectedEventIndex: 0,
    isFilterFocused: false,
  });

  // Fullscreen state
  const [isEventsFullscreen, setIsEventsFullscreen] = useState(false);

  // Update URL helper
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

  // Use aggregate operations hook
  const {
    streams: _streams,
    guidInputRef,
    getAggregatesByType: _getAggregatesByType,
    getPinnedAggregateInstances,
    handleAggregateSelect,
    handleInstanceSelect,
  } = useAggregateOperations({
    selectedAggregate,
    setSelectedAggregate,
    setSelectedAggregateInstances,
    setSelectedStream,
    setAggregateGuid,
    setIsLoadingInstances,
    clearEventData,
    updateURL,
    eventScanCount,
    showSuggestions,
  });

  // Query for events
  const { data: events } = useQuery({
    queryKey: ["stream", selectedStream],
    queryFn: () => (selectedStream ? streamsApi.get(selectedStream) : null),
    enabled: !!selectedStream,
    refetchInterval: selectedStream ? 10000 : false,
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

  // Handle clipboard copy
  const handleCopyToClipboard = (text: string, event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard");
  };

  // Wrapped handlers for keyboard navigation
  const wrappedHandleAggregateSelect = (aggregateType: string, guid?: string) => {
    handleAggregateSelect(aggregateType, guid, navigationState, setNavigationState);
  };

  const wrappedHandleExpandAll = () => {
    handleExpandAll(events, selectedStream);
  };

  const wrappedToggleEvent = (event: Event) => {
    toggleEvent(event, selectedStream);
  };

  // Fullscreen toggle handlers
  const toggleEventsFullscreen = () => {
    setIsEventsFullscreen(!isEventsFullscreen);
  };

  // Keyboard shortcut for fullscreen (ESC to exit)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isEventsFullscreen) {
        setIsEventsFullscreen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isEventsFullscreen]);

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
    onAggregateSelect: wrappedHandleAggregateSelect,
    onInstanceSelect: handleInstanceSelect,
    onToggleEvent: wrappedToggleEvent,
    onExpandAll: wrappedHandleExpandAll,
    onTogglePinStream: togglePinStream,
    onShowSuggestionsToggle: () => setShowSuggestions(!showSuggestions),
    getPinnedAggregateInstances: (aggregateType) => getPinnedAggregateInstances(aggregateType, pinnedStreams),
    guidInputRef,
  });

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full p-6">
        <AggregatesPageHeader />

        {/* Fullscreen Events Panel */}
        {isEventsFullscreen ? (
          <div className="fixed inset-0 z-50 bg-background">
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
              isFullEventDisplay={isFullEventDisplay}
              isFullscreen={isEventsFullscreen}
              onJsonPathFilterChange={setJsonPathFilter}
              onToggleEvent={wrappedToggleEvent}
              onExpandAll={wrappedHandleExpandAll}
              onTogglePinStream={togglePinStream}
              onToggleEventDisplayMode={toggleEventDisplayMode}
              onToggleFullscreen={toggleEventsFullscreen}
              onFilterFocusChange={(focused) => setNavigationState(prev => ({ ...prev, isFilterFocused: focused }))}
            />
          </div>
        ) : (
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
                onAggregateSelect={wrappedHandleAggregateSelect}
                selectedAggregateIndex={navigationState.selectedAggregateIndex}
                isActiveColumn={navigationState.activeColumn === "aggregates"}
                eventScanCount={eventScanCount}
                onEventScanCountChange={setEventScanCount}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Column 2: Recent Instances or GUID Input */}
            <ResizablePanel defaultSize={25} minSize={25}>
              <AggregateInstancesPanel
                selectedAggregate={selectedAggregate}
                aggregateGuid={aggregateGuid}
                onAggregateGuidChange={setAggregateGuid}
                onAggregateSelect={wrappedHandleAggregateSelect}
                selectedAggregateInstances={selectedAggregateInstances}
                isLoadingInstances={isLoadingInstances}
                pinnedStreams={pinnedStreams}
                onTogglePinStream={togglePinStream}
                onInstanceSelect={handleInstanceSelect}
                onCopyToClipboard={handleCopyToClipboard}
                selectedStream={selectedStream}
                selectedInstanceIndex={navigationState.selectedInstanceIndex}
                isActiveColumn={navigationState.activeColumn === "instances"}
                getPinnedAggregateInstances={(aggregateType) => getPinnedAggregateInstances(aggregateType, pinnedStreams)}
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
                isFullEventDisplay={isFullEventDisplay}
                isFullscreen={isEventsFullscreen}
                onJsonPathFilterChange={setJsonPathFilter}
                onToggleEvent={wrappedToggleEvent}
                onExpandAll={wrappedHandleExpandAll}
                onTogglePinStream={togglePinStream}
                onToggleEventDisplayMode={toggleEventDisplayMode}
                onToggleFullscreen={toggleEventsFullscreen}
                onFilterFocusChange={(focused) => setNavigationState(prev => ({ ...prev, isFilterFocused: focused }))}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {/* Toast Notification */}
        <ToastNotification 
          message={toastMessage} 
          onClose={hideToast}
        />
      </div>
    </TooltipProvider>
  );
}