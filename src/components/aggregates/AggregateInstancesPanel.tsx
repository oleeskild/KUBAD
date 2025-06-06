import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  Search,
  Copy,
  Pin,
  PinOff,
  ArrowRight,
} from "lucide-react";
import type { AggregateInstance } from "./types";

interface AggregateInstancesPanelProps {
  selectedAggregate: string | null;
  aggregateGuid: string;
  onAggregateGuidChange: (guid: string) => void;
  onAggregateSelect: (aggregateType: string, guid?: string) => void;
  selectedAggregateInstances: AggregateInstance[];
  isLoadingInstances: boolean;
  pinnedStreams: string[];
  onTogglePinStream: (streamId: string) => void;
  onInstanceSelect: (instance: AggregateInstance) => void;
  onCopyToClipboard: (text: string, event: React.MouseEvent) => void;
  selectedStream: string | null;
  selectedInstanceIndex: number;
  isActiveColumn: boolean;
  getPinnedAggregateInstances: (aggregateType: string) => AggregateInstance[];
  updateURL: (newAggregate?: string | null, newGuid?: string, newStream?: string | null) => void;
  guidInputRef: React.RefObject<HTMLInputElement | null>;
}

export function AggregateInstancesPanel({
  selectedAggregate,
  aggregateGuid,
  onAggregateGuidChange,
  onAggregateSelect,
  selectedAggregateInstances,
  isLoadingInstances,
  pinnedStreams,
  onTogglePinStream,
  onInstanceSelect,
  onCopyToClipboard,
  selectedStream,
  selectedInstanceIndex,
  isActiveColumn,
  getPinnedAggregateInstances,
  updateURL,
  guidInputRef,
}: AggregateInstancesPanelProps) {
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const isPinned = (streamId: string) => pinnedStreams.includes(streamId);

  const handleGuidChange = (newGuid: string) => {
    onAggregateGuidChange(newGuid);

    // Update URL with new GUID
    updateURL(
      selectedAggregate,
      newGuid || undefined,
      selectedStream
    );

    // Check if it's a complete GUID (36 characters with hyphens)
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (guidRegex.test(newGuid.trim())) {
      onAggregateSelect(selectedAggregate!, newGuid.trim());
    }
  };

  // Auto-scroll to selected item
  useEffect(() => {
    if (isActiveColumn && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [selectedInstanceIndex, isActiveColumn]);

  if (!selectedAggregate) {
    return (
      <div className="p-4 h-full border-l border-border">
        <div className="flex items-center justify-center h-full text-muted-readable">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-subtitle">Select an aggregate type to view instances</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full border-l border-border">
      <div className="space-y-4 h-full">
        <div>
          <h3 className="text-lg font-semibold text-keyword mb-2">
            {selectedAggregate}
          </h3>
          <div className="space-y-1">
            <div className="flex gap-2">
              <Input
                ref={guidInputRef}
                placeholder="Enter GUID or select from recent..."
                value={aggregateGuid}
                onChange={(e) => handleGuidChange(e.target.value)}
                className={cn(
                  "flex-1 h-8 text-sm bg-muted text-foreground border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/20 rounded-xl shadow-lg transition-all duration-300",
                  // Add visual feedback for valid GUID
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                    aggregateGuid.trim()
                  )
                    ? "border-green-400 bg-green-500/10 text-green-400 ring-2 ring-green-400/20"
                    : "",
                  // Add visual feedback for keyboard navigation
                  isActiveColumn &&
                    selectedInstanceIndex === -1 &&
                    "ring-4 ring-blue-500 ring-offset-2 ring-offset-background shadow-2xl border-blue-400"
                )}
                onFocus={() => {
                  // When focused, ensure navigation knows we're in the input
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && aggregateGuid.trim()) {
                    onAggregateSelect(selectedAggregate, aggregateGuid.trim());
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    guidInputRef.current?.blur();
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (aggregateGuid.trim()) {
                    onAggregateSelect(selectedAggregate, aggregateGuid.trim());
                  }
                }}
                disabled={
                  !aggregateGuid.trim() ||
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                    aggregateGuid.trim()
                  )
                }
                size="sm"
                className={cn(
                  "transition-all duration-300 cursor-pointer",
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                    aggregateGuid.trim()
                  )
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-primary hover:bg-primary/90"
                )}
              >
                {/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  aggregateGuid.trim()
                ) ? (
                  <div className="flex items-center space-x-1">
                    <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium">Auto</span>
                  </div>
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground/70 pt-2 pb-2">
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs mr-1">
                Esc
              </kbd>
              to exit input field
            </div>
          </div>

          <Separator />

          <div className="flex-1 flex flex-col gap-4 h-full">
            {/* Pinned Instances Section - Takes 70% of space */}
            <div className="flex-1" style={{ flex: "0 0 70%" }}>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-highlight">
                <Pin className="h-4 w-4 text-primary" />
                Pinned Instances
              </h4>
              {getPinnedAggregateInstances(selectedAggregate).length > 0 ? (
                <div className="space-y-2 h-[calc(100%-2rem)] overflow-y-auto px-1 pt-1">
                  {getPinnedAggregateInstances(selectedAggregate).map(
                    (instance, pinnedIndex) => {
                      const isSelected =
                        selectedStream === `${selectedAggregate}-${instance.guid}`;
                      const streamId = `${selectedAggregate}-${instance.guid}`;
                      const isKeyboardSelected =
                        isActiveColumn && selectedInstanceIndex === pinnedIndex;
                      return (
                        <div
                          key={instance.guid}
                          ref={isKeyboardSelected ? selectedItemRef : null}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors relative",
                            isSelected
                              ? "border-primary bg-primary/10 shadow-md"
                              : "border-border bg-muted hover:bg-muted/80",
                            isKeyboardSelected &&
                              "ring-4 ring-blue-500 ring-offset-2 ring-offset-background shadow-2xl border-blue-400"
                          )}
                          onClick={() => onInstanceSelect(instance)}
                        >
                          {/* Pinned indicator */}
                          <div className="absolute top-1 right-1">
                            <Pin className="h-3 w-3 text-primary" />
                          </div>
                          <div className="flex items-center justify-between pr-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono bg-background px-1 rounded truncate text-code">
                                  {instance.guid}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) =>
                                    onCopyToClipboard(instance.guid, e)
                                  }
                                  className="h-4 w-4 p-0 cursor-pointer"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTogglePinStream(streamId);
                                  }}
                                  className="h-4 w-4 p-0 cursor-pointer text-primary hover:text-primary/80"
                                >
                                  <PinOff className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {instance.eventCount} events •{" "}
                                {new Date(instance.created).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[calc(100%-2rem)] text-muted-foreground">
                  <div className="text-center">
                    <Pin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No pinned instances yet</p>
                    <p className="text-xs mt-1">
                      Pin instances from the recent list below
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Instances Section - Takes remaining 20% */}
            <div style={{ flex: "0 0 20%" }} className="min-h-0">
              <Separator className="mb-2" />
              <h4 className="text-sm font-medium mb-2">Recent Instances</h4>
              <div className="space-y-2 h-[calc(100%-3rem)] overflow-y-auto px-1 pt-1">
                {isLoadingInstances ? (
                  [...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))
                ) : selectedAggregateInstances.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      No instances found for this aggregate
                    </p>
                  </div>
                ) : (
                  selectedAggregateInstances.map((instance, recentIndex) => {
                    const isSelected =
                      selectedStream === `${selectedAggregate}-${instance.guid}`;
                    const streamId = `${selectedAggregate}-${instance.guid}`;
                    const pinned = isPinned(streamId);
                    const pinnedCount = getPinnedAggregateInstances(selectedAggregate).length;
                    const isKeyboardSelected =
                      isActiveColumn &&
                      selectedInstanceIndex === pinnedCount + recentIndex;

                    return (
                      <div
                        key={instance.guid}
                        ref={isKeyboardSelected ? selectedItemRef : null}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border bg-muted hover:bg-muted/80",
                          isKeyboardSelected &&
                            "ring-4 ring-blue-500 ring-offset-2 ring-offset-background shadow-2xl border-blue-400"
                        )}
                        onClick={() => onInstanceSelect(instance)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono bg-background px-1 rounded truncate">
                                {instance.guid}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) =>
                                  onCopyToClipboard(instance.guid, e)
                                }
                                className="h-4 w-4 p-0 cursor-pointer"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTogglePinStream(streamId);
                                }}
                                className={cn(
                                  "h-4 w-4 p-0 cursor-pointer transition-colors",
                                  pinned
                                    ? "text-primary hover:text-primary/80"
                                    : "text-muted-foreground hover:text-primary"
                                )}
                              >
                                <Pin className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {instance.eventCount} events •{" "}
                              {new Date(instance.created).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}