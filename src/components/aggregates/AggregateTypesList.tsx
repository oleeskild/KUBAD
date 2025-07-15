import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { streams as streamsApi } from "@/api/eventstore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Plus, Trash2 } from "lucide-react";
import { useSavedAggregates } from "@/contexts/SavedAggregatesContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AggregateTypesListProps {
  selectedAggregate: string | null;
  onAggregateSelect: (aggregateType: string) => void;
  selectedAggregateIndex: number;
  isActiveColumn: boolean;
  eventScanCount: number;
  onEventScanCountChange: (count: number) => void;
  isSearchFocused: boolean;
  onSearchFocusChange: (focused: boolean) => void;
}

export function AggregateTypesList({
  selectedAggregate,
  onAggregateSelect,
  selectedAggregateIndex,
  isActiveColumn,
  eventScanCount,
  onEventScanCountChange,
  isSearchFocused,
  onSearchFocusChange,
}: AggregateTypesListProps) {
  const [newAggregateName, setNewAggregateName] = useState("");
  const [pendingScanCount, setPendingScanCount] = useState(eventScanCount);
  const [searchQuery, setSearchQuery] = useState("");
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Saved aggregates context
  const { savedAggregates, addAggregate, removeAggregate } = useSavedAggregates();

  // Auto-load streams on mount
  const { data: streams, isLoading: streamsLoading } = useQuery({
    queryKey: ["streams", eventScanCount],
    queryFn: () => streamsApi.list(0, 20, eventScanCount),
    enabled: true, // Always enabled to auto-load
  });

  // Auto-load 200 streams on component mount
  useEffect(() => {
    if (eventScanCount !== 200) {
      onEventScanCountChange(200);
    }
  }, []);

  // Add new aggregate
  const addNewAggregate = (aggregateName: string) => {
    const trimmed = aggregateName.trim();
    if (trimmed && !savedAggregates.some(agg => agg.name === trimmed)) {
      addAggregate({
        name: trimmed,
        streamPrefix: `$ce-${trimmed}`,
        description: 'Added from aggregates view',
      });
      setNewAggregateName("");
    }
  };


  // Get suggested aggregates from recent events
  const getSuggestedAggregates = () => {
    if (!streams) return [];

    const suggestedTypes = new Set<string>();
    streams.forEach((stream) => {
      // Extract aggregate type from streamId pattern: "Prefix.AggregateType-guid"
      const match = stream.streamId.match(/^(.+?)-[a-f0-9-]{36}$/i);
      if (match) {
        const aggregateType = match[1]; // Keep the full name including dots

        suggestedTypes.add(aggregateType);
      }
    });

    // Only return suggestions that aren't already added
    return Array.from(suggestedTypes)
      .filter((type) => !savedAggregates.some(agg => agg.name === type))
      .sort();
  };

  // Filter aggregates based on search query
  const getFilteredAggregates = () => {
    if (!searchQuery.trim()) return savedAggregates;
    
    const query = searchQuery.toLowerCase();
    return savedAggregates.filter((aggregate) =>
      aggregate.name.toLowerCase().includes(query) ||
      (aggregate.description && aggregate.description.toLowerCase().includes(query))
    );
  };

  // Handle search input focus/blur
  useEffect(() => {
    if (isSearchFocused && searchInputRef.current) {
      searchInputRef.current.focus();
      onSearchFocusChange(true);
    }
  }, [isSearchFocused, onSearchFocusChange]);

  // Clear search when escape is pressed
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setSearchQuery("");
      searchInputRef.current?.blur();
      onSearchFocusChange(false);
    }
  };

  // Auto-scroll to selected item
  useEffect(() => {
    if (isActiveColumn && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [selectedAggregateIndex, isActiveColumn]);

  return (
    <div className="p-4 h-full overflow-hidden">
      <div className="space-y-4 h-full flex flex-col">
        <div>
          <h3 className="text-xl font-bold text-keyword flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md"></div>
              <div className="relative bg-gradient-to-br from-primary to-primary/90 p-2 rounded-xl shadow-lg">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            My Aggregates
          </h3>
          <div className="flex gap-2">
            <Input
              placeholder="Add aggregate..."
              value={newAggregateName}
              onChange={(e) => setNewAggregateName(e.target.value)}
              className="flex-1 h-10 text-sm bg-gradient-to-r from-background to-background/80 border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/20 rounded-xl shadow-lg transition-all duration-300"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addNewAggregate(newAggregateName);
                }
              }}
            />
            <Button
              onClick={() => addNewAggregate(newAggregateName)}
              disabled={!newAggregateName.trim()}
              className="h-10 w-10 bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 rounded-xl cursor-pointer disabled:opacity-50 disabled:scale-100"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Search input */}
        <div className="space-y-2">
          <Input
            ref={searchInputRef}
            placeholder="Search aggregates... (press / to focus)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => onSearchFocusChange(true)}
            onBlur={() => onSearchFocusChange(false)}
            className="h-9 text-sm bg-gradient-to-r from-background to-background/80 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all duration-200"
          />
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto px-1 pt-1">
          {savedAggregates.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-readable">
                No aggregates added yet
              </p>
            </div>
          ) : getFilteredAggregates().length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-readable">
                No aggregates match "{searchQuery}"
              </p>
            </div>
          ) : (
            getFilteredAggregates().map((aggregate, index) => {
              const isSelected = selectedAggregate === aggregate.name;
              const isKeyboardSelected =
                isActiveColumn && selectedAggregateIndex === index;
              return (
                <div
                  key={aggregate.id}
                  ref={isKeyboardSelected ? selectedItemRef : null}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border bg-muted hover:bg-muted/80",
                    isKeyboardSelected &&
                      "ring-4 ring-blue-500 ring-offset-2 ring-offset-background shadow-2xl border-blue-400"
                  )}
                  onClick={() => onAggregateSelect(aggregate.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm truncate text-info">
                        {aggregate.name}
                      </h4>
                      {aggregate.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {aggregate.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAggregate(aggregate.id);
                            }}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Remove from saved aggregates
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Separator />

        {/* Suggested Aggregates - always visible */}
        <div className="space-y-3">
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {streamsLoading ? (
              [...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))
            ) : getSuggestedAggregates().length === 0 ? (
              <p className="text-xs text-muted-readable text-center py-2">
                No new categories found
              </p>
            ) : (
              getSuggestedAggregates().map((aggregateType) => (
                <div
                  key={aggregateType}
                  className="flex items-center justify-between p-2 rounded border border-border bg-muted/50"
                >
                  <span className="text-xs font-medium truncate text-string">
                    {aggregateType}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addNewAggregate(aggregateType)}
                    className="h-6 w-6 p-0 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Simple scan count controls at bottom */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="50"
                max="2000"
                step="50"
                value={pendingScanCount}
                onChange={(e) =>
                  setPendingScanCount(parseInt(e.target.value) || 200)
                }
                className="w-20 h-7 text-center text-xs"
              />
              <span className="text-xs text-muted-readable flex-1">
                streams
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEventScanCountChange(pendingScanCount)}
                disabled={
                  eventScanCount === pendingScanCount || streamsLoading
                }
                className="h-7 px-2 text-xs cursor-pointer"
              >
                {streamsLoading ? "Loading..." : "Load"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
