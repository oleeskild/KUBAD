import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  streams as streamsApi,
  subscriptions as subscriptionsApi,
  projections as projectionsApi,
  stats as statsApi,
  type Event,
} from "@/api/eventstore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Database,
  Radio,
  Activity,
  LogOut,
  Search,
  ChevronDown,
  ChevronRight,
  Settings,
  User,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Layers,
  GitBranch,
  Zap,
  Globe,
  Package,
  ArrowRight,
  Copy,
  Plus,
  Trash2,
  Lightbulb,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [eventData, setEventData] = useState<Map<string, Event>>(new Map());
  const [loadingEvents, setLoadingEvents] = useState<Set<string>>(new Set());
  const [selectedAggregate, setSelectedAggregate] = useState<string | null>(
    null
  );
  const [aggregateGuid, setAggregateGuid] = useState("");
  const [eventScanCount, setEventScanCount] = useState(200);
  const [userAggregates, setUserAggregates] = useState<string[]>(() => {
    const saved = localStorage.getItem("eventstore-aggregates");
    return saved ? JSON.parse(saved) : [];
  });
  const [newAggregateName, setNewAggregateName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAggregateInstances, setSelectedAggregateInstances] = useState<
    Array<{
      streamId: string;
      eventCount: number;
      created: string;
      lastUpdated: string;
      guid: string;
      aggregateType: string;
    }>
  >([]);
  const [isLoadingInstances, setIsLoadingInstances] = useState(false);
  const [isExpandingAll, setIsExpandingAll] = useState(false);
  const [pinnedStreams, setPinnedStreams] = useState<string[]>(() => {
    const saved = localStorage.getItem("eventstore-pinned-streams");
    return saved ? JSON.parse(saved) : [];
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Clear event data when switching streams
  const handleStreamSelect = (streamId: string) => {
    setSelectedStream(streamId);
    setExpandedEvents(new Set());
    setEventData(new Map());
    setLoadingEvents(new Set());
  };

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: statsApi.get,
    refetchInterval: 5000,
  });

  const { data: streams, isLoading: streamsLoading } = useQuery({
    queryKey: ["streams", eventScanCount],
    queryFn: () => streamsApi.list(0, 20, eventScanCount),
    enabled:
      activeTab === "streams" ||
      (activeTab === "aggregates" && showSuggestions),
  });

  const { data: events } = useQuery({
    queryKey: ["stream", selectedStream],
    queryFn: () => (selectedStream ? streamsApi.get(selectedStream) : null),
    enabled: !!selectedStream,
  });

  const { data: subscriptions } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: subscriptionsApi.list,
    enabled: activeTab === "subscriptions",
  });

  const { data: projections } = useQuery({
    queryKey: ["projections"],
    queryFn: projectionsApi.list,
    enabled: activeTab === "projections",
  });

  const filteredStreams =
    streams?.filter((stream) =>
      stream.streamId.toLowerCase().includes(search.toLowerCase())
    ) || [];

  const filteredSubscriptions =
    subscriptions?.filter(
      (sub) =>
        sub.name.toLowerCase().includes(search.toLowerCase()) ||
        sub.streamName.toLowerCase().includes(search.toLowerCase())
    ) || [];

  const filteredProjections =
    projections?.filter((proj) =>
      proj.name.toLowerCase().includes(search.toLowerCase())
    ) || [];

  // Save user aggregates to localStorage
  const saveUserAggregates = (aggregates: string[]) => {
    localStorage.setItem("eventstore-aggregates", JSON.stringify(aggregates));
    setUserAggregates(aggregates);
  };

  // Save pinned streams to localStorage
  const savePinnedStreams = (streams: string[]) => {
    localStorage.setItem("eventstore-pinned-streams", JSON.stringify(streams));
    setPinnedStreams(streams);
  };

  // Pin/unpin stream functionality
  const togglePinStream = (streamId: string) => {
    const newPinnedStreams = pinnedStreams.includes(streamId)
      ? pinnedStreams.filter((id) => id !== streamId)
      : [...pinnedStreams, streamId];
    savePinnedStreams(newPinnedStreams);
  };

  const isPinned = (streamId: string) => pinnedStreams.includes(streamId);

  // Toast functionality
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000); // Hide after 3 seconds
  };

  const handleCopyToClipboard = (text: string, event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard");
  };

  // Add new user aggregate
  const addUserAggregate = (aggregateName: string) => {
    const trimmed = aggregateName.trim();
    if (trimmed && !userAggregates.includes(trimmed)) {
      const newAggregates = [...userAggregates, trimmed].sort();
      saveUserAggregates(newAggregates);
      setNewAggregateName("");
    }
  };

  // Remove user aggregate
  const removeUserAggregate = (aggregateName: string) => {
    const newAggregates = userAggregates.filter(
      (name) => name !== aggregateName
    );
    saveUserAggregates(newAggregates);
  };

  // Get suggested aggregates from recent events
  const getSuggestedAggregates = () => {
    if (!streams) return [];

    const suggestedTypes = new Set<string>();
    streams.forEach((stream) => {
      const match = stream.streamId.match(/^([^-]+)-[a-f0-9-]{36}$/i);
      if (match) {
        suggestedTypes.add(match[1]);
      }
    });

    // Only return suggestions that aren't already added by user
    return Array.from(suggestedTypes)
      .filter((type) => !userAggregates.includes(type))
      .sort();
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

        // Try to find the stream in the current streams data
        const stream = streams?.find((s) => s.streamId === streamId);

        if (stream) {
          // Use the actual stream data if available
          return {
            ...stream,
            guid,
            aggregateType,
          };
        } else {
          // Create a placeholder instance for pinned streams not in current data
          return {
            streamId,
            eventCount: 0, // We don't know the actual count
            created: new Date().toISOString(), // Placeholder date
            lastUpdated: new Date().toISOString(), // Placeholder date
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
    setAggregateGuid("");
    setExpandedEvents(new Set());
    setEventData(new Map());
    setLoadingEvents(new Set());

    if (guid) {
      // Direct GUID selection
      setAggregateGuid(guid);
      const streamId = `${aggregateType}-${guid}`;
      handleStreamSelect(streamId);
    } else {
      // Load recent instances for this aggregate type
      setIsLoadingInstances(true);
      try {
        // Get all instances of this aggregate type
        const instances = getAggregatesByType(aggregateType);
        // Sort by most recent and take top 20
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

  const handleInstanceSelect = (instance: {
    streamId: string;
    eventCount: number;
    created: string;
    lastUpdated: string;
    guid: string;
    aggregateType: string;
  }) => {
    setAggregateGuid(instance.guid);
    const streamId = `${selectedAggregate}-${instance.guid}`;
    handleStreamSelect(streamId);
  };

  const handleExpandAll = async () => {
    if (!events || !selectedStream) return;

    setIsExpandingAll(true);
    const allExpanded = events.every((event) =>
      expandedEvents.has(`${selectedStream}-${event.eventNumber}`)
    );

    if (allExpanded) {
      // Collapse all
      setExpandedEvents(new Set());
    } else {
      // Expand all
      const newExpanded = new Set<string>();
      const newEventData = new Map(eventData);
      const newLoadingEvents = new Set<string>();

      for (const event of events) {
        const eventKey = `${selectedStream}-${event.eventNumber}`;
        newExpanded.add(eventKey);

        // Load event data if not already loaded
        if (!eventData.has(eventKey)) {
          newLoadingEvents.add(eventKey);
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

      // Fetch event data if not already loaded
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { variant: "default" | "secondary" | "destructive"; className: string }
    > = {
      Live: {
        variant: "default",
        className:
          "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md",
      },
      Running: {
        variant: "default",
        className:
          "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md",
      },
      Paused: {
        variant: "secondary",
        className:
          "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-md",
      },
      Stopped: {
        variant: "destructive",
        className:
          "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md",
      },
      Faulted: {
        variant: "destructive",
        className:
          "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md",
      },
    };
    const config = statusConfig[status] || {
      variant: "outline" as const,
      className:
        "bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md",
    };
    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card shadow-sm">
          <div className="flex h-16 items-center px-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="bg-primary p-2 rounded-lg">
                  <Database className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    KUBAD
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Kurrent UI But Actually Decent
                  </p>
                </div>
              </div>
            </div>

            <div className="ml-auto flex items-center space-x-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh Data</p>
                </TooltipContent>
              </Tooltip>

              <ThemeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Admin User
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        admin@eventstore.com
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="container mx-auto py-6 px-6">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Event Store Dashboard
                </h1>
                <p className="text-muted-foreground">
                  Monitor and manage your EventStore instance
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-muted-foreground">Connected</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Online</span>
                </div>
              </div>
            </div>
            <Separator className="mt-6" />
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-8"
          >
            <div className="flex items-center justify-center">
              <TabsList className="grid w-full grid-cols-5 max-w-2xl">
                <TabsTrigger
                  value="dashboard"
                  className="flex items-center space-x-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Dashboard</span>
                </TabsTrigger>
                <TabsTrigger
                  value="streams"
                  className="flex items-center space-x-2"
                >
                  <Layers className="h-4 w-4" />
                  <span>Streams</span>
                </TabsTrigger>
                <TabsTrigger
                  value="subscriptions"
                  className="flex items-center space-x-2"
                >
                  <GitBranch className="h-4 w-4" />
                  <span>Subscriptions</span>
                </TabsTrigger>
                <TabsTrigger
                  value="projections"
                  className="flex items-center space-x-2"
                >
                  <Zap className="h-4 w-4" />
                  <span>Projections</span>
                </TabsTrigger>
                <TabsTrigger
                  value="aggregates"
                  className="flex items-center space-x-2"
                >
                  <Package className="h-4 w-4" />
                  <span>Aggregates</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statsLoading ? (
                  // Loading skeletons
                  [...Array(4)].map((_, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-4" />
                      </div>
                      <Skeleton className="h-6 w-16 mb-2" />
                      <Skeleton className="h-2 w-full mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </Card>
                  ))
                ) : (
                  // Actual data cards
                  <>
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">CPU Usage</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {stats?.proc?.cpu !== undefined
                            ? `${stats.proc.cpu.toFixed(1)}%`
                            : "N/A"}
                        </span>
                      </div>
                      {stats?.proc?.cpu !== undefined && (
                        <div className="space-y-2">
                          <Progress value={stats.proc.cpu} className="h-2" />
                          <div className="text-xs text-muted-foreground">
                            {stats.proc.cpu > 80
                              ? "High usage"
                              : stats.proc.cpu > 50
                                ? "Active"
                                : "Normal"}
                          </div>
                        </div>
                      )}
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Memory Usage
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {stats?.proc?.mem
                            ? `${(stats.proc.mem / 1024 / 1024 / 1024).toFixed(1)} GB`
                            : "N/A"}
                        </span>
                      </div>
                      {stats?.proc?.mem && stats?.sys?.totalMem && (
                        <div className="space-y-2">
                          <Progress
                            value={(stats.proc.mem / stats.sys.totalMem) * 100}
                            className="h-2"
                          />
                          <div className="text-xs text-muted-foreground">
                            of{" "}
                            {(stats.sys.totalMem / 1024 / 1024 / 1024).toFixed(
                              1
                            )}{" "}
                            GB total
                          </div>
                        </div>
                      )}
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Active Queues
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {(() => {
                            if (!stats) return 0;
                            const queues =
                              stats.es?.queue || stats.queues || stats.queue;
                            return queues ? Object.keys(queues).length : 0;
                          })()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Processing queues
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Radio className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Queue Items
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {(() => {
                            if (!stats) return 0;
                            const queues =
                              stats.es?.queue || stats.queues || stats.queue;
                            return queues
                              ? Object.values(queues).reduce(
                                  (sum: number, q: any) =>
                                    sum + (q.length || 0),
                                  0
                                )
                              : 0;
                          })()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Pending items
                      </div>
                    </Card>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="streams" className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Layers className="h-6 w-6 text-primary" />
                    </div>
                    Event Streams
                  </h2>
                  <p className="text-muted-foreground">
                    Browse and explore your event streams
                  </p>
                </div>
                {selectedStream && (
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer"
                    onClick={() => {
                      setSelectedStream(null);
                      setExpandedEvents(new Set());
                      setEventData(new Map());
                      setLoadingEvents(new Set());
                    }}
                  >
                    Back to Streams
                  </Button>
                )}
              </div>

              <Separator />

              {!selectedStream ? (
                <Card className="shadow-lg border border-border bg-card">
                  <CardHeader className="bg-muted border border-border border-b border-border">
                    <CardTitle className="text-primary font-semibold">
                      Event Streams
                    </CardTitle>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-primary/60" />
                      <Input
                        placeholder="Search streams..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 border-primary/30 focus:border-primary focus:ring-primary/20"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {streamsLoading ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center space-x-4">
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-8 w-24" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Stream ID</TableHead>
                            <TableHead>Event Count</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStreams.map((stream) => (
                            <TableRow key={stream.streamId}>
                              <TableCell className="font-medium">
                                {stream.streamId}
                              </TableCell>
                              <TableCell>{stream.eventCount}</TableCell>
                              <TableCell>
                                {new Date(stream.created).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer"
                                  onClick={() =>
                                    handleStreamSelect(stream.streamId)
                                  }
                                >
                                  View Events
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-lg border border-border bg-card">
                  <CardHeader className="bg-muted border border-border border-b border-border">
                    <CardTitle className="text-primary font-semibold flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      {selectedStream} - Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {events && events.length > 0 ? (
                      <div className="space-y-4">
                        {events.map((event) => (
                          <div
                            key={event.eventId}
                            className="border border-border bg-card shadow-lg rounded-lg p-4 bg-muted border border-border"
                          >
                            <div
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => toggleEvent(event)}
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-mono text-muted-foreground">
                                  #{event.eventNumber}
                                </span>
                                <span className="font-medium">
                                  {event.eventType}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(event.created).toLocaleString()}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="cursor-pointer"
                              >
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
                              <div className="mt-4">
                                <h4 className="text-sm font-medium mb-2">
                                  Event Data
                                </h4>
                                {loadingEvents.has(
                                  `${selectedStream}-${event.eventNumber}`
                                ) ? (
                                  <div className="bg-muted p-3 rounded-md text-sm text-center">
                                    Loading event data...
                                  </div>
                                ) : (
                                  <SyntaxHighlighter
                                    language="json"
                                    style={vscDarkPlus}
                                    className="rounded-md text-sm"
                                    customStyle={{
                                      margin: 0,
                                      background: "hsl(var(--muted))",
                                      fontSize: "0.875rem",
                                    }}
                                  >
                                    {JSON.stringify(
                                      eventData.get(
                                        `${selectedStream}-${event.eventNumber}`
                                      )?.data || "No data available",
                                      null,
                                      2
                                    )}
                                  </SyntaxHighlighter>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No events found in this stream
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="subscriptions" className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <GitBranch className="h-6 w-6 text-primary" />
                  </div>
                  Persistent Subscriptions
                </h2>
                <p className="text-muted-foreground">
                  Manage persistent subscriptions and their status
                </p>
              </div>

              <Separator />

              <Card className="shadow-lg border border-border bg-card">
                <CardHeader className="bg-muted border border-border border-b border-border space-y-4">
                  <CardTitle className="text-primary font-semibold flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    Active Subscriptions
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-primary/60" />
                    <Input
                      placeholder="Search subscriptions..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 border-primary/30 focus:border-primary focus:ring-primary/20 h-10"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Stream</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Messages/sec</TableHead>
                        <TableHead>Parked Messages</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscriptions.map((sub) => (
                        <TableRow key={`${sub.streamName}-${sub.groupName}`}>
                          <TableCell className="font-medium">
                            {sub.name}
                          </TableCell>
                          <TableCell>{sub.streamName}</TableCell>
                          <TableCell>{getStatusBadge(sub.status)}</TableCell>
                          <TableCell>
                            {sub.averageItemsPerSecond.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {sub.parkedMessageCount > 0 ? (
                              <span className="text-destructive font-medium">
                                {sub.parkedMessageCount}
                              </span>
                            ) : (
                              "0"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projections" className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  Projections
                </h2>
                <p className="text-muted-foreground">
                  Monitor and control event projections
                </p>
              </div>

              <Separator />

              <Card className="shadow-lg border border-border bg-card">
                <CardHeader className="bg-muted border border-border border-b border-border space-y-4">
                  <CardTitle className="text-primary font-semibold flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Event Projections
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-primary/60" />
                    <Input
                      placeholder="Search projections..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 border-primary/30 focus:border-primary focus:ring-primary/20 h-10"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Events Processed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjections.map((proj) => (
                        <TableRow key={proj.name}>
                          <TableCell className="font-medium">
                            {proj.name}
                          </TableCell>
                          <TableCell>{getStatusBadge(proj.status)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{proj.mode}</Badge>
                          </TableCell>
                          <TableCell>{proj.progress}%</TableCell>
                          <TableCell>
                            {proj.eventsProcessedAfterRestart.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="aggregates" className="space-y-8">
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
                </div>
                {selectedAggregate && selectedStream && (
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer"
                    onClick={() => {
                      setSelectedAggregate(null);
                      setSelectedStream(null);
                      setAggregateGuid("");
                      setExpandedEvents(new Set());
                      setEventData(new Map());
                      setLoadingEvents(new Set());
                    }}
                  >
                    Back to Aggregates
                  </Button>
                )}
              </div>

              <Separator />

              <ResizablePanelGroup
                direction="horizontal"
                className="min-h-[700px] border-2 border-primary/20 bg-gradient-to-br from-card via-background/50 to-card rounded-3xl shadow-2xl backdrop-blur-sm overflow-hidden"
              >
                {/* Column 1: Aggregate Types */}
                <ResizablePanel defaultSize={30} minSize={20}>
                  <div className="p-4 h-full">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent flex items-center gap-3 mb-4">
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
                            onChange={(e) =>
                              setNewAggregateName(e.target.value)
                            }
                            className="flex-1 h-10 text-sm bg-gradient-to-r from-background to-background/80 border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/20 rounded-xl shadow-lg transition-all duration-300"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                addUserAggregate(newAggregateName);
                              }
                            }}
                          />
                          <Button
                            onClick={() => addUserAggregate(newAggregateName)}
                            disabled={!newAggregateName.trim()}
                            className="h-10 w-10 bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 rounded-xl cursor-pointer disabled:opacity-50 disabled:scale-100"
                          >
                            <Plus className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {userAggregates.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No aggregates added yet</p>
                          </div>
                        ) : (
                          userAggregates.map((aggregateType) => {
                            const instances =
                              getAggregatesByType(aggregateType);
                            const isSelected =
                              selectedAggregate === aggregateType;
                            return (
                              <div
                                key={aggregateType}
                                className={cn(
                                  "p-3 rounded-lg border cursor-pointer transition-colors",
                                  isSelected
                                    ? "border-primary bg-primary/10 shadow-md"
                                    : "border-border bg-muted hover:bg-muted/80"
                                )}
                                onClick={() =>
                                  handleAggregateSelect(aggregateType)
                                }
                              >
                                <div className="flex items-center justify-between">
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-medium text-sm truncate">
                                      {aggregateType}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                      {instances.length} instance
                                      {instances.length !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeUserAggregate(aggregateType);
                                    }}
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive cursor-pointer"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <Separator />

                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSuggestions(!showSuggestions)}
                          className="w-full cursor-pointer"
                        >
                          <Lightbulb className="h-4 w-4 mr-2" />
                          {showSuggestions
                            ? "Hide Suggestions"
                            : "Find Suggestions"}
                        </Button>

                        {showSuggestions && (
                          <div className="mt-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="50"
                                max="2000"
                                step="50"
                                value={eventScanCount}
                                onChange={(e) =>
                                  setEventScanCount(
                                    parseInt(e.target.value) || 200
                                  )
                                }
                                className="w-16 h-7 text-center text-xs"
                              />
                              <span className="text-xs text-muted-foreground">
                                events
                              </span>
                            </div>

                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {streamsLoading ? (
                                [...Array(2)].map((_, i) => (
                                  <Skeleton key={i} className="h-8 w-full" />
                                ))
                              ) : getSuggestedAggregates().length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                  No suggestions found
                                </p>
                              ) : (
                                getSuggestedAggregates().map(
                                  (aggregateType) => (
                                    <div
                                      key={aggregateType}
                                      className="flex items-center justify-between p-2 rounded border border-border bg-muted/50"
                                    >
                                      <span className="text-xs font-medium truncate">
                                        {aggregateType}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          addUserAggregate(aggregateType)
                                        }
                                        className="h-6 w-6 p-0 cursor-pointer"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Column 2: Recent Instances or GUID Input */}
                <ResizablePanel defaultSize={35} minSize={25}>
                  <div className="p-4 h-full border-l border-border">
                    {!selectedAggregate ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Select an aggregate type to view instances</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 h-full">
                        <div>
                          <h3 className="text-lg font-semibold text-primary mb-2">
                            {selectedAggregate}
                          </h3>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter GUID or select from recent..."
                              value={aggregateGuid}
                              onChange={(e) => {
                                const newGuid = e.target.value;
                                setAggregateGuid(newGuid);

                                // Check if it's a complete GUID (36 characters with hyphens)
                                const guidRegex =
                                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                                if (guidRegex.test(newGuid.trim())) {
                                  handleAggregateSelect(
                                    selectedAggregate,
                                    newGuid.trim()
                                  );
                                }
                              }}
                              className={cn(
                                "flex-1 h-8 text-sm bg-gradient-to-r from-background to-background/80 border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/20 rounded-xl shadow-lg transition-all duration-300",
                                // Add visual feedback for valid GUID
                                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                                  aggregateGuid.trim()
                                )
                                  ? "border-green-400 bg-gradient-to-r from-green-50 to-green-100 ring-2 ring-green-200"
                                  : ""
                              )}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && aggregateGuid.trim()) {
                                  handleAggregateSelect(
                                    selectedAggregate,
                                    aggregateGuid.trim()
                                  );
                                }
                              }}
                            />
                            <Button
                              onClick={() => {
                                if (aggregateGuid.trim()) {
                                  handleAggregateSelect(
                                    selectedAggregate,
                                    aggregateGuid.trim()
                                  );
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
                                  <span className="text-xs font-medium">
                                    Auto
                                  </span>
                                </div>
                              ) : (
                                <ArrowRight className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <Separator />

                        <div className="flex-1 space-y-4">
                          {/* Pinned Instances Section */}
                          {getPinnedAggregateInstances(selectedAggregate)
                            .length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                <Pin className="h-4 w-4 text-primary" />
                                Pinned Instances
                              </h4>
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {getPinnedAggregateInstances(
                                  selectedAggregate
                                ).map((instance) => {
                                  const isSelected =
                                    selectedStream ===
                                    `${selectedAggregate}-${instance.guid}`;
                                  const streamId = `${selectedAggregate}-${instance.guid}`;
                                  return (
                                    <div
                                      key={instance.guid}
                                      className={cn(
                                        "p-3 rounded-lg border cursor-pointer transition-colors relative",
                                        isSelected
                                          ? "border-primary bg-primary/10 shadow-md"
                                          : "border-border bg-muted hover:bg-muted/80"
                                      )}
                                      onClick={() =>
                                        handleInstanceSelect(instance)
                                      }
                                    >
                                      {/* Pinned indicator */}
                                      <div className="absolute top-1 right-1">
                                        <Pin className="h-3 w-3 text-primary" />
                                      </div>
                                      <div className="flex items-center justify-between pr-4">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <code className="text-xs font-mono bg-background px-1 rounded truncate">
                                              {instance.guid}
                                            </code>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) =>
                                                handleCopyToClipboard(
                                                  instance.guid,
                                                  e
                                                )
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
                                                togglePinStream(streamId);
                                              }}
                                              className="h-4 w-4 p-0 cursor-pointer text-primary hover:text-primary/80"
                                            >
                                              <PinOff className="h-3 w-3" />
                                            </Button>
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {instance.eventCount} events •{" "}
                                            {new Date(
                                              instance.created
                                            ).toLocaleDateString()}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              <Separator className="my-4" />
                            </div>
                          )}

                          {/* Recent Instances Section */}
                          <div>
                            <h4 className="text-sm font-medium mb-3">
                              Recent Instances
                            </h4>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
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
                                selectedAggregateInstances.map((instance) => {
                                  const isSelected =
                                    selectedStream ===
                                    `${selectedAggregate}-${instance.guid}`;
                                  const streamId = `${selectedAggregate}-${instance.guid}`;
                                  const pinned = isPinned(streamId);

                                  return (
                                    <div
                                      key={instance.guid}
                                      className={cn(
                                        "p-3 rounded-lg border cursor-pointer transition-colors",
                                        isSelected
                                          ? "border-primary bg-primary/10 shadow-md"
                                          : "border-border bg-muted hover:bg-muted/80"
                                      )}
                                      onClick={() =>
                                        handleInstanceSelect(instance)
                                      }
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
                                                handleCopyToClipboard(
                                                  instance.guid,
                                                  e
                                                )
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
                                                togglePinStream(streamId);
                                              }}
                                              className={cn(
                                                "h-4 w-4 p-0 cursor-pointer transition-colors",
                                                pinned
                                                  ? "text-primary hover:text-primary/80"
                                                  : "text-muted-foreground hover:text-primary"
                                              )}
                                            >
                                              {pinned ? (
                                                <Pin className="h-3 w-3" />
                                              ) : (
                                                <Pin className="h-3 w-3" />
                                              )}
                                            </Button>
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {instance.eventCount} events •{" "}
                                            {new Date(
                                              instance.created
                                            ).toLocaleDateString()}
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
                    )}
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Column 3: Events */}
                <ResizablePanel defaultSize={35} minSize={25}>
                  <div className="p-4 h-full border-l border-border">
                    {!selectedStream ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Select an instance to view events</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 h-full">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-primary">
                              Events
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {selectedStream}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Pin button for current stream */}
                            {selectedStream && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => togglePinStream(selectedStream)}
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
                                    <span className="text-xs font-medium">
                                      Unpin
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Pin className="h-3 w-3" />
                                    <span className="text-xs font-medium">
                                      Pin
                                    </span>
                                  </>
                                )}
                              </Button>
                            )}
                            {events && events.length > 0 && (
                              <Button
                                onClick={handleExpandAll}
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
                                    expandedEvents.has(
                                      `${selectedStream}-${event.eventNumber}`
                                    )
                                  ) ? (
                                  <div className="flex items-center space-x-2">
                                    <Minimize2 className="h-3 w-3 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-medium">
                                      Collapse All
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <Maximize2 className="h-3 w-3 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-medium">
                                      Expand All
                                    </span>
                                  </div>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>

                        <Separator />

                        <div className="flex-1 overflow-y-auto">
                          {events && events.length > 0 ? (
                            <div className="space-y-3">
                              {events.map((event) => (
                                <div
                                  key={event.eventId}
                                  className="border border-border bg-muted rounded-lg"
                                >
                                  <div
                                    className="flex items-center justify-between p-3 cursor-pointer"
                                    onClick={() => toggleEvent(event)}
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
                                        {new Date(
                                          event.created
                                        ).toLocaleString()}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="cursor-pointer"
                                    >
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
                                      <h5 className="text-xs font-medium mb-2">
                                        Event Data
                                      </h5>
                                      {loadingEvents.has(
                                        `${selectedStream}-${event.eventNumber}`
                                      ) ? (
                                        <div className="bg-background p-3 rounded text-xs text-center">
                                          Loading event data...
                                        </div>
                                      ) : (
                                        <SyntaxHighlighter
                                          language="json"
                                          style={vscDarkPlus}
                                          className="rounded text-xs max-h-64 overflow-y-auto"
                                          customStyle={{
                                            margin: 0,
                                            background:
                                              "hsl(var(--background))",
                                            fontSize: "0.75rem",
                                          }}
                                        >
                                          {JSON.stringify(
                                            eventData.get(
                                              `${selectedStream}-${event.eventNumber}`
                                            )?.data || "No data available",
                                            null,
                                            2
                                          )}
                                        </SyntaxHighlighter>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-muted-foreground">
                              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No events found</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </TabsContent>

            <TabsContent value="subscriptions" className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <GitBranch className="h-6 w-6 text-primary" />
                  </div>
                  Persistent Subscriptions
                </h2>
                <p className="text-muted-foreground">
                  Manage persistent subscriptions and their status
                </p>
              </div>

              <Separator />

              <Card className="shadow-lg border border-border bg-card">
                <CardHeader className="bg-muted/50 border-b border-border space-y-4">
                  <CardTitle className="text-primary font-semibold flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    Active Subscriptions
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-primary/60" />
                    <Input
                      placeholder="Search subscriptions..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 border-primary/30 focus:border-primary focus:ring-primary/20 h-10"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Stream</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Messages/sec</TableHead>
                        <TableHead>Parked Messages</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscriptions.map((sub) => (
                        <TableRow key={`${sub.streamName}-${sub.groupName}`}>
                          <TableCell className="font-medium">
                            {sub.name}
                          </TableCell>
                          <TableCell>{sub.streamName}</TableCell>
                          <TableCell>{getStatusBadge(sub.status)}</TableCell>
                          <TableCell>
                            {sub.averageItemsPerSecond.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {sub.parkedMessageCount > 0 ? (
                              <span className="text-destructive font-medium">
                                {sub.parkedMessageCount}
                              </span>
                            ) : (
                              "0"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projections" className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  Projections
                </h2>
                <p className="text-muted-foreground">
                  Monitor and control event projections
                </p>
              </div>

              <Separator />

              <Card className="shadow-lg border border-border bg-card">
                <CardHeader className="bg-muted/50 border-b border-border space-y-4">
                  <CardTitle className="text-primary font-semibold flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Event Projections
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-primary/60" />
                    <Input
                      placeholder="Search projections..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 border-primary/30 focus:border-primary focus:ring-primary/20 h-10"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Events Processed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjections.map((proj) => (
                        <TableRow key={proj.name}>
                          <TableCell className="font-medium">
                            {proj.name}
                          </TableCell>
                          <TableCell>{getStatusBadge(proj.status)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{proj.mode}</Badge>
                          </TableCell>
                          <TableCell>{proj.progress}%</TableCell>
                          <TableCell>
                            {proj.eventsProcessedAfterRestart.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

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
