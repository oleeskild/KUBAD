import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { streams as streamsApi } from "@/api/eventstore";
import type { AggregateInstance } from "../types";

interface UseAggregateOperationsProps {
  selectedAggregate: string | null;
  setSelectedAggregate: (aggregate: string | null) => void;
  setSelectedAggregateInstances: (instances: AggregateInstance[]) => void;
  setSelectedStream: (stream: string | null) => void;
  setAggregateGuid: (guid: string) => void;
  setIsLoadingInstances: (loading: boolean) => void;
  clearEventData: () => void;
  updateURL: (newAggregate?: string | null, newGuid?: string, newStream?: string | null) => void;
  eventScanCount: number;
  showSuggestions: boolean;
}

export function useAggregateOperations({
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
}: UseAggregateOperationsProps) {
  const guidInputRef = useRef<HTMLInputElement>(null);

  // Query for streams
  const { data: streams } = useQuery({
    queryKey: ["streams", eventScanCount],
    queryFn: () => streamsApi.list(0, 20, eventScanCount),
    enabled: showSuggestions,
  });

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

  const getPinnedAggregateInstances = (aggregateType: string, pinnedStreams: string[]) => {
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
    guid?: string,
    navigationState?: any,
    setNavigationState?: any
  ) => {
    setSelectedAggregate(aggregateType);
    setSelectedAggregateInstances([]);
    setSelectedStream(null);

    if (!guid) {
      setAggregateGuid("");
    }
    clearEventData();

    if (guid) {
      setAggregateGuid(guid);
      const streamId = `${aggregateType}-${guid}`;
      setSelectedStream(streamId);
      updateURL(aggregateType, guid, streamId);
    } else {
      updateURL(aggregateType, undefined, null);

      setTimeout(() => {
        guidInputRef.current?.focus();
        if (setNavigationState) {
          setNavigationState((prev: any) => ({ ...prev, selectedInstanceIndex: -1 }));
        }
      }, 100);

      setIsLoadingInstances(true);
      try {
        // Use the new $ce-{aggregateType} endpoint to fetch recent aggregate instances
        const instances = await streamsApi.getRecentAggregateInstances(aggregateType, 20);
        setSelectedAggregateInstances(instances);
      } catch (error) {
        console.error("Error loading aggregate instances:", error);
        // Fallback to the old method if the new one fails
        try {
          const instances = getAggregatesByType(aggregateType);
          const sortedInstances = instances
            .sort(
              (a, b) =>
                new Date(b.created).getTime() - new Date(a.created).getTime()
            )
            .slice(0, 20);
          setSelectedAggregateInstances(sortedInstances);
        } catch (fallbackError) {
          console.error("Fallback method also failed:", fallbackError);
          setSelectedAggregateInstances([]);
        }
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

  return {
    streams,
    guidInputRef,
    getAggregatesByType,
    getPinnedAggregateInstances,
    handleAggregateSelect,
    handleInstanceSelect,
  };
}