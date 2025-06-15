import { useState } from "react";
import { streams as streamsApi, type Event } from "@/api/eventstore";

export function useEventHandling() {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [eventData, setEventData] = useState<Map<string, Event>>(new Map());
  const [loadingEvents, setLoadingEvents] = useState<Set<string>>(new Set());
  const [isExpandingAll, setIsExpandingAll] = useState(false);
  const [filteredEventData, setFilteredEventData] = useState<Map<string, any>>(new Map());

  const handleExpandAll = async (events: Event[] | null | undefined, selectedStream: string | null) => {
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

  const toggleEvent = async (event: Event, selectedStream: string | null) => {
    if (!selectedStream) return;
    
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
            selectedStream,
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

  const clearEventData = () => {
    setExpandedEvents(new Set());
    setEventData(new Map());
    setLoadingEvents(new Set());
  };

  return {
    // State
    expandedEvents,
    eventData,
    loadingEvents,
    isExpandingAll,
    filteredEventData,
    setFilteredEventData,
    
    // Functions
    handleExpandAll,
    toggleEvent,
    clearEventData,
  };
}