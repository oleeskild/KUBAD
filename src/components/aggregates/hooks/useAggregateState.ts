import { useState, useEffect } from "react";
import { serverManager } from "@/api/eventstore";
import type { AggregateInstance } from "../types";

export function useAggregateState(
  initialAggregate?: string,
  initialGuid?: string,
  initialStream?: string
) {
  // Main state
  const [selectedStream, setSelectedStream] = useState<string | null>(initialStream || null);
  const [selectedAggregate, setSelectedAggregate] = useState<string | null>(initialAggregate || null);
  const [aggregateGuid, setAggregateGuid] = useState(initialGuid || "");
  const [eventScanCount, setEventScanCount] = useState(200);
  const [selectedAggregateInstances, setSelectedAggregateInstances] = useState<AggregateInstance[]>([]);
  const [isLoadingInstances, setIsLoadingInstances] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [jsonPathFilter, setJsonPathFilter] = useState("");

  // Event display mode setting (global, saved in browser)
  const [isFullEventDisplay, setIsFullEventDisplay] = useState<boolean>(() => {
    const saved = localStorage.getItem("eventstore-full-event-display");
    return saved ? JSON.parse(saved) : false;
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

  // Initialize state from URL on component mount
  useEffect(() => {
    if (initialAggregate && !selectedAggregate) {
      setSelectedAggregate(initialAggregate);
    }
    if (initialGuid && !aggregateGuid) {
      setAggregateGuid(initialGuid);
    }
    if (initialStream && !selectedStream) {
      setSelectedStream(initialStream);
    }
  }, [initialAggregate, initialGuid, initialStream]);

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


  // Save pinned streams to localStorage
  const savePinnedStreams = (streams: string[]) => {
    const currentServer = serverManager.getCurrentServer();
    const serverKey = currentServer
      ? `eventstore-pinned-streams-${currentServer.id}`
      : "eventstore-pinned-streams";
    localStorage.setItem(serverKey, JSON.stringify(streams));
    setPinnedStreams(streams);
  };

  // Save event display mode to localStorage
  const toggleEventDisplayMode = () => {
    const newMode = !isFullEventDisplay;
    setIsFullEventDisplay(newMode);
    localStorage.setItem("eventstore-full-event-display", JSON.stringify(newMode));
  };

  // Pin/unpin stream functionality
  const togglePinStream = (streamId: string) => {
    const newPinnedStreams = pinnedStreams.includes(streamId)
      ? pinnedStreams.filter((id) => id !== streamId)
      : [...pinnedStreams, streamId];
    savePinnedStreams(newPinnedStreams);
  };

  return {
    // State
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
    pinnedStreams,
    
    // Functions
    toggleEventDisplayMode,
    togglePinStream,
  };
}