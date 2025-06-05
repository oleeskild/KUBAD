export interface AggregateInstance {
  streamId: string;
  eventCount: number;
  created: string;
  lastUpdated: string;
  guid: string;
  aggregateType: string;
}

export type ActiveColumn = "aggregates" | "instances" | "events";

export interface KeyboardNavigationState {
  activeColumn: ActiveColumn;
  selectedAggregateIndex: number;
  selectedInstanceIndex: number;
  selectedEventIndex: number;
  isFilterFocused: boolean;
}