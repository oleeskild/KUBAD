import { useEffect } from "react";
import type { Event } from "@/api/eventstore";
import type { KeyboardNavigationState, AggregateInstance } from "./types";

interface UseKeyboardNavigationProps {
  navigationState: KeyboardNavigationState;
  onNavigationChange: (state: Partial<KeyboardNavigationState>) => void;
  userAggregates: string[];
  selectedAggregate: string | null;
  selectedAggregateInstances: AggregateInstance[];
  events: Event[] | null | undefined;
  selectedStream: string | null;
  aggregateGuid: string;
  onAggregateSelect: (aggregateType: string, guid?: string) => void;
  onInstanceSelect: (instance: AggregateInstance) => void;
  onToggleEvent: (event: Event) => void;
  onExpandAll: () => void;
  onTogglePinStream: (streamId: string) => void;
  onShowSuggestionsToggle: () => void;
  onToggleFullscreen?: () => void;
  getPinnedAggregateInstances: (aggregateType: string) => AggregateInstance[];
  guidInputRef: React.RefObject<HTMLInputElement | null>;
  isAggregateSearchFocused: boolean;
  onAggregateSearchFocusChange: (focused: boolean) => void;
}

export function useKeyboardNavigation({
  navigationState,
  onNavigationChange,
  userAggregates,
  selectedAggregate,
  selectedAggregateInstances,
  events,
  selectedStream,
  aggregateGuid,
  onAggregateSelect,
  onInstanceSelect,
  onToggleEvent,
  onExpandAll,
  onTogglePinStream,
  onShowSuggestionsToggle,
  onToggleFullscreen,
  getPinnedAggregateInstances,
  guidInputRef,
  isAggregateSearchFocused,
  onAggregateSearchFocusChange,
}: UseKeyboardNavigationProps) {
  const {
    activeColumn,
    selectedAggregateIndex,
    selectedInstanceIndex,
    selectedEventIndex,
    isFilterFocused,
  } = navigationState;

  // Keyboard navigation helper functions
  const handleAggregatesKeyNav = (e: KeyboardEvent) => {
    const maxIndex = userAggregates.length - 1;

    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = Math.min(selectedAggregateIndex + 1, maxIndex);
      onNavigationChange({ selectedAggregateIndex: newIndex });
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = Math.max(selectedAggregateIndex - 1, 0);
      onNavigationChange({ selectedAggregateIndex: newIndex });
    } else if (e.key === "g") {
      e.preventDefault();
      onNavigationChange({ selectedAggregateIndex: 0 });
    } else if (e.key === "G") {
      e.preventDefault();
      onNavigationChange({ selectedAggregateIndex: maxIndex });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (userAggregates[selectedAggregateIndex]) {
        onAggregateSelect(userAggregates[selectedAggregateIndex]);
        onNavigationChange({
          activeColumn: "instances",
          selectedInstanceIndex: -1, // Start at GUID input
        });
      }
    } else if (e.key === "r") {
      e.preventDefault();
      onShowSuggestionsToggle();
    }
  };

  const handleInstancesKeyNav = (e: KeyboardEvent) => {
    const allInstances = [
      ...getPinnedAggregateInstances(selectedAggregate || ""),
      ...selectedAggregateInstances,
    ];
    const maxIndex = allInstances.length - 1;

    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      if (selectedInstanceIndex === -1) {
        // From GUID input, move to first instance
        onNavigationChange({ selectedInstanceIndex: 0 });
        guidInputRef.current?.blur();
      } else {
        const newIndex = Math.min(selectedInstanceIndex + 1, maxIndex);
        onNavigationChange({ selectedInstanceIndex: newIndex });
      }
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      if (selectedInstanceIndex === 0) {
        // From first instance, move to GUID input
        onNavigationChange({ selectedInstanceIndex: -1 });
        guidInputRef.current?.focus();
      } else if (selectedInstanceIndex === -1) {
        // Already at GUID input, stay there
        guidInputRef.current?.focus();
      } else {
        const newIndex = Math.max(selectedInstanceIndex - 1, 0);
        onNavigationChange({ selectedInstanceIndex: newIndex });
      }
    } else if (e.key === "g") {
      e.preventDefault();
      onNavigationChange({ selectedInstanceIndex: -1 });
      guidInputRef.current?.focus();
    } else if (e.key === "G") {
      e.preventDefault();
      onNavigationChange({ selectedInstanceIndex: maxIndex });
      guidInputRef.current?.blur();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (selectedInstanceIndex === -1) {
        // Enter pressed on GUID input - trigger search if valid GUID
        if (aggregateGuid.trim()) {
          onAggregateSelect(selectedAggregate!, aggregateGuid.trim());
        }
      } else if (allInstances[selectedInstanceIndex]) {
        onInstanceSelect(allInstances[selectedInstanceIndex]);
        onNavigationChange({
          activeColumn: "events",
          selectedEventIndex: 0,
        });
      }
    } else if (e.key === "p") {
      e.preventDefault();
      if (allInstances[selectedInstanceIndex] && selectedAggregate) {
        const streamId = `${selectedAggregate}-${allInstances[selectedInstanceIndex].guid}`;
        onTogglePinStream(streamId);
      }
    }
  };

  const handleEventsKeyNav = (e: KeyboardEvent) => {
    if (!events) return;
    const maxIndex = events.length - 1;

    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = Math.min(selectedEventIndex + 1, maxIndex);
      onNavigationChange({ selectedEventIndex: newIndex });
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = Math.max(selectedEventIndex - 1, 0);
      onNavigationChange({ selectedEventIndex: newIndex });
    } else if (e.key === "g") {
      e.preventDefault();
      onNavigationChange({ selectedEventIndex: 0 });
    } else if (e.key === "G") {
      e.preventDefault();
      onNavigationChange({ selectedEventIndex: maxIndex });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (events[selectedEventIndex]) {
        onToggleEvent(events[selectedEventIndex]);
      }
    } else if (e.key === "e") {
      e.preventDefault();
      onExpandAll();
    } else if (e.key === "/") {
      e.preventDefault();
      if (activeColumn === "aggregates") {
        // Focus aggregates search
        onAggregateSearchFocusChange(true);
        setTimeout(() => {
          const aggregateSearchInput = document.querySelector(
            'input[placeholder*="Search aggregates"]'
          ) as HTMLInputElement;
          aggregateSearchInput?.focus();
        }, 0);
      } else {
        // Focus events filter
        onNavigationChange({ isFilterFocused: true });
        setTimeout(() => {
          const filterInput = document.querySelector(
            'input[placeholder*="$.propertyName"]'
          ) as HTMLInputElement;
          filterInput?.focus();
        }, 0);
      }
    } else if (e.key === "p") {
      e.preventDefault();
      if (selectedStream) {
        onTogglePinStream(selectedStream);
      }
    } else if (e.key === "f") {
      e.preventDefault();
      if (onToggleFullscreen) {
        onToggleFullscreen();
      }
    }
  };

  // Main keyboard navigation effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard navigation when filter is focused or in input fields
      if (
        isFilterFocused ||
        isAggregateSearchFocused ||
        (e.target as HTMLElement)?.tagName === "INPUT" ||
        (e.target as HTMLElement)?.tagName === "TEXTAREA" ||
        (e.target as HTMLElement)?.contentEditable === "true"
      ) {
        return;
      }

      // Special case: if we're on the GUID input and it's focused, don't intercept
      if (guidInputRef.current && document.activeElement === guidInputRef.current) {
        return;
      }

      // Global shortcuts (work in any column)
      if (e.key === "Escape") {
        e.preventDefault();
        onNavigationChange({
          activeColumn: "aggregates",
          selectedAggregateIndex: 0,
          selectedInstanceIndex: 0,
          selectedEventIndex: 0,
        });
        return;
      }

      // Column switching (h/l for vim, Left/Right for standard)
      if (e.key === "h" || e.key === "ArrowLeft") {
        e.preventDefault();
        if (activeColumn === "events") {
          onNavigationChange({ 
            activeColumn: "instances",
            selectedInstanceIndex: 0 // Start at first instance, not GUID input
          });
        } else if (activeColumn === "instances") {
          onNavigationChange({ activeColumn: "aggregates" });
        }
        return;
      }

      if (e.key === "l" || e.key === "ArrowRight") {
        e.preventDefault();
        if (activeColumn === "aggregates" && selectedAggregate) {
          onNavigationChange({ 
            activeColumn: "instances",
            selectedInstanceIndex: 0 // Start at first instance, not GUID input
          });
        } else if (activeColumn === "instances" && selectedStream) {
          onNavigationChange({ activeColumn: "events" });
        }
        return;
      }

      // Navigation within columns
      if (activeColumn === "aggregates") {
        handleAggregatesKeyNav(e);
      } else if (activeColumn === "instances") {
        handleInstancesKeyNav(e);
      } else if (activeColumn === "events") {
        handleEventsKeyNav(e);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    activeColumn,
    selectedAggregateIndex,
    selectedInstanceIndex,
    selectedEventIndex,
    userAggregates,
    selectedAggregateInstances,
    events,
    isFilterFocused,
    selectedAggregate,
    selectedStream,
    aggregateGuid,
  ]);

  // Reset selections when data changes
  useEffect(() => {
    onNavigationChange({ selectedAggregateIndex: 0 });
  }, [userAggregates]);

  useEffect(() => {
    onNavigationChange({ selectedInstanceIndex: 0 });
  }, [selectedAggregateInstances, selectedAggregate]);

  useEffect(() => {
    onNavigationChange({ selectedEventIndex: 0 });
  }, [events]);
}