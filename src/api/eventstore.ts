import axios from 'axios';

export interface EventStoreServer {
  id: string
  name: string
  url: string
  username: string
  password: string
  isDefault?: boolean
  lastTested?: string
  status?: 'online' | 'offline' | 'unknown'
}

// Server management utilities
export const serverManager = {
  getServers: (): EventStoreServer[] => {
    try {
      const saved = localStorage.getItem('eventstore-servers')
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('serverManager.getServers: Error parsing localStorage:', error)
      return []
    }
  },

  getCurrentServer: (): EventStoreServer | null => {
    const servers = serverManager.getServers()
    const currentServerId = localStorage.getItem('eventstore-current-server')
    
    if (currentServerId) {
      const server = servers.find(s => s.id === currentServerId)
      if (server) return server
    }
    
    // Return default server if no current server is set
    return servers.find(s => s.isDefault) || servers[0] || null
  },

  setCurrentServer: (serverId: string) => {
    localStorage.setItem('eventstore-current-server', serverId)
    // Clear old session data when switching servers
    localStorage.removeItem('eventstore_token')
    // Recreate API instance with new server
    updateApiInstance()
  },

  saveServers: (servers: EventStoreServer[]) => {
    localStorage.setItem('eventstore-servers', JSON.stringify(servers))
  }
}

// Create API instance
let eventstoreApi = createApiInstance()

function createApiInstance() {
  const currentServer = serverManager.getCurrentServer()
  const baseURL = currentServer?.url || '/api/eventstore'
  
  const instance = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('eventstore_token')
    if (token) {
      config.headers.Authorization = `Basic ${token}`
    }
    return config
  })

  return instance
}

function updateApiInstance() {
  eventstoreApi = createApiInstance()
}

// Export the API instance
export { eventstoreApi }

export interface Stream {
  streamId: string;
  eventCount: number;
  created: string;
  lastUpdated: string;
}

export interface Event {
  eventId: string;
  eventType: string;
  eventNumber: number;
  data: any;
  metadata: any;
  created: string;
}

export interface PersistentSubscription {
  name: string;
  streamName: string;
  groupName: string;
  status: string;
  averageItemsPerSecond: number;
  totalItemsProcessed: number;
  countSinceLastMeasurement: number;
  liveBufferCount: number;
  parkedMessageCount: number;
  lastCheckpointedEventPosition: string;
  lastKnownEventPosition: string;
}

export interface Projection {
  name: string;
  status: string;
  mode: string;
  position: string;
  progress: number;
  lastCheckpoint: string;
  eventsProcessedAfterRestart: number;
  stateReason: string;
  effectiveName: string;
  writesInProgress: number;
  readsInProgress: number;
  partitionsCached: number;
  epoch: number;
  version: number;
}

export interface Stats {
  proc: {
    startTime: string;
    id: number;
    mem: number;
    cpu: number;
    threadsCount: number;
    contentionsRate: number;
    thrownExceptionsRate: number;
    gc: {
      allocationSpeed: number;
      fragmentation: number;
      gen0ItemsCount: number;
      gen0Size: number;
      gen1ItemsCount: number;
      gen1Size: number;
      gen2ItemsCount: number;
      gen2Size: number;
      largeHeapSize: number;
      timeInGc: number;
      totalBytesInHeaps: number;
    };
    diskIo: {
      readBytes: number;
      writtenBytes: number;
      readOps: number;
      writeOps: number;
    };
    tcp: {
      connections: number;
      receivingSpeed: number;
      sendingSpeed: number;
      inSend: number;
      measureTime: string;
      pendingReceived: number;
      pendingSend: number;
      receivedBytesSinceLastRun: number;
      receivedBytesTotal: number;
      sentBytesSinceLastRun: number;
      sentBytesTotal: number;
    };
  };
  // Alternative naming for process stats
  process?: {
    startTime: string;
    id: number;
    mem: number;
    cpu: number;
    threadsCount: number;
    contentionsRate: number;
    thrownExceptionsRate: number;
  };
  sys: {
    loadavg: {
      '1m': number;
      '5m': number;
      '15m': number;
    };
    freeMem: number;
    totalMem: number;
    drive: {
      [path: string]: {
        availableBytes: number;
        totalBytes: number;
        usage: string;
        usedBytes: number;
      };
    };
  };
  es?: {
    queue?: { [key: string]: { length?: number } };
  };
  queues?: { [key: string]: { length?: number } };
  queue?: { [key: string]: { length?: number } };
}

export const auth = {
  login: async (username?: string, password?: string, serverId?: string) => {
    let server: EventStoreServer | null
    let token: string
    
    if (serverId) {
      // Login to specific server
      const servers = serverManager.getServers()
      server = servers.find(s => s.id === serverId) || null
      if (!server) {
        return { success: false, error: 'Server not found' }
      }
      if (username && password) {
        token = btoa(`${username}:${password}`)
      } else {
        token = btoa(`${server.username}:${server.password}`)
      }
      // Set this as current server
      serverManager.setCurrentServer(serverId)
    } else if (username && password) {
      // Direct login with credentials
      server = serverManager.getCurrentServer()
      if (!server) {
        return { success: false, error: 'No server configured' }
      }
      token = btoa(`${username}:${password}`)
    } else {
      // Login with current server's stored credentials
      server = serverManager.getCurrentServer()
      if (!server) {
        return { success: false, error: 'No server configured' }
      }
      token = btoa(`${server.username}:${server.password}`)
    }

    // Create temporary API instance for this server
    const testApi = axios.create({
      baseURL: server.url,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    try {
      // Try a simpler endpoint first
      const response = await testApi.get('/stats', {
        headers: {
          Authorization: `Basic ${token}`,
          Accept: 'application/json',
        },
      })
      if (response.status === 200) {
        localStorage.setItem('eventstore_token', token)
        updateApiInstance() // Update the main API instance
        return { success: true, server }
      }
    } catch (error: any) {
      console.error('Login error:', error)
      
      // Try alternative endpoints for login validation
      try {
        const response = await testApi.get('/streams/$all/head/backward/1', {
          headers: {
            Authorization: `Basic ${token}`,
            Accept: 'application/json',
          },
        })
        if (response.status === 200) {
          localStorage.setItem('eventstore_token', token)
          updateApiInstance() // Update the main API instance
          return { success: true, server }
        }
      } catch (fallbackError: any) {
        console.error('Fallback login error:', fallbackError)
        return { 
          success: false, 
          error: fallbackError.response?.status === 401 ? 'Invalid credentials' : 'Connection failed' 
        }
      }
      
      return { 
        success: false, 
        error: error.response?.status === 401 ? 'Invalid credentials' : 'Connection failed' 
      }
    }
  },
  
  logout: () => {
    localStorage.removeItem('eventstore_token')
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('eventstore_token') && !!serverManager.getCurrentServer()
  },
  
  getCurrentServer: () => {
    return serverManager.getCurrentServer()
  },
  
  switchServer: async (serverId: string) => {
    const servers = serverManager.getServers()
    const server = servers.find(s => s.id === serverId)
    if (!server) {
      return { success: false, error: 'Server not found' }
    }
    
    // Clear current session
    auth.logout()
    
    // Set new server as current
    serverManager.setCurrentServer(serverId)
    
    // Try to login with stored credentials
    return await auth.login()
  }
}

export const streams = {
  list: async (page = 0, limit = 20, scanCount = 50): Promise<Stream[]> => {
    try {
      // Use /streams/$streams/head/{scanCount} to get recent stream instances
      const response = await eventstoreApi.get(`/streams/$streams/head/${scanCount}?embed=rich`, {
        headers: {
          Accept: 'application/json',
        },
      });
      
      const streamMap = new Map();
      const entries = response.data.entries || [];
      
      // Extract streams from $streams events - each entry represents a new stream instance
      entries.forEach((entry: any) => {
        const streamId = entry.streamId;
        
        // Skip system streams (starting with $) but keep user streams
        if (streamId && !streamId.startsWith('$') && !streamMap.has(streamId)) {
          streamMap.set(streamId, {
            streamId: streamId,
            eventCount: entry.eventNumber + 1, // eventNumber is 0-based, so add 1 for count
            created: entry.updated || new Date().toISOString(),
            lastUpdated: entry.updated || new Date().toISOString(),
          });
        }
      });
      
      return Array.from(streamMap.values()).slice(page * limit, (page + 1) * limit);
    } catch (error) {
      console.error('Error fetching streams from $streams:', error);
      return [];
    }
  },

  getRecentAggregateInstances: async (aggregateType: string, limit = 20): Promise<{ streamId: string; eventCount: number; created: string; lastUpdated: string; guid: string; aggregateType: string; }[]> => {
    try {
      // Use $ce-{aggregateType} endpoint to get recent aggregate instances
      const response = await eventstoreApi.get(`/streams/$ce-${aggregateType}/head/backward/${limit}?embed=tryharder`, {
        headers: {
          Accept: 'application/json',
        },
      });
      
      const entries = response.data.entries || [];
      const aggregateInstances = new Map();
      
      // Extract aggregate IDs from the events
      entries.forEach((entry: any) => {
        try {
          // Parse the streamId to extract the aggregate GUID
          const streamIdFromEvent = entry.streamId;
          if (streamIdFromEvent && streamIdFromEvent.startsWith(`${aggregateType}-`)) {
            const guidMatch = streamIdFromEvent.match(/-([a-f0-9-]{36})$/i);
            if (guidMatch) {
              const guid = guidMatch[1];
              
              // Only add if we haven't seen this aggregate instance yet
              if (!aggregateInstances.has(guid)) {
                aggregateInstances.set(guid, {
                  streamId: streamIdFromEvent,
                  eventCount: (entry.eventNumber || 0) + 1, // eventNumber is 0-based
                  created: entry.updated || new Date().toISOString(),
                  lastUpdated: entry.updated || new Date().toISOString(),
                  guid: guid,
                  aggregateType: aggregateType,
                });
              }
            }
          }
        } catch (error) {
          console.warn('Error parsing entry from $ce stream:', error, entry);
        }
      });
      
      return Array.from(aggregateInstances.values());
    } catch (error) {
      console.error(`Error fetching recent aggregate instances for ${aggregateType} from $ce stream:`, error);
      return [];
    }
  },

  get: async (streamId: string): Promise<Event[]> => {
    try {
      // Fetch events from specific stream
      const response = await eventstoreApi.get(`/streams/${streamId}/head/backward/100`, {
        headers: {
          Accept: 'application/json',
        },
      });
      
      const entries = response.data.entries || [];
      
      return entries.map((entry: any) => {
        // Extract event number from title "eventNumber@streamName"
        const title = entry.title || '';
        const titleParts = title.split('@');
        const eventNumber = titleParts.length > 0 ? parseInt(titleParts[0]) || 0 : 0;
        
        // Extract event ID from the URL path
        const idUrl = entry.id || '';
        const eventId = idUrl.split('/').pop() || crypto.randomUUID();
        
        return {
          eventId: eventId,
          eventType: entry.summary || 'Unknown',
          eventNumber: eventNumber,
          data: entry.content || {},
          metadata: entry.metadata || {},
          created: entry.updated || new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error(`Error fetching events for stream ${streamId}:`, error);
      
      // Fallback to head endpoint
      try {
        const response = await eventstoreApi.get(`/streams/${streamId}/head/100`, {
          headers: {
            Accept: 'application/json',
          },
        });
        
        const entries = response.data.entries || [];
        
        return entries.map((entry: any) => {
          const title = entry.title || '';
          const titleParts = title.split('@');
          const eventNumber = titleParts.length > 0 ? parseInt(titleParts[0]) || 0 : 0;
          const idUrl = entry.id || '';
          const eventId = idUrl.split('/').pop() || crypto.randomUUID();
          
          return {
            eventId: eventId,
            eventType: entry.summary || 'Unknown',
            eventNumber: eventNumber,
            data: entry.content || {},
            metadata: entry.metadata || {},
            created: entry.updated || new Date().toISOString(),
          };
        });
      } catch (fallbackError) {
        console.error(`Fallback fetch failed for stream ${streamId}:`, fallbackError);
        return [];
      }
    }
  },

  getEvent: async (streamId: string, eventNumber: number): Promise<Event> => {
    try {
      // Fetch individual event data
      const response = await eventstoreApi.get(`/streams/${streamId}/${eventNumber}`, {
        headers: {
          Accept: 'application/json',
        },
      });
      
      
      // EventStore individual event response format
      const data = response.data;
      
      return {
        eventId: data.eventId || data.id || `${streamId}-${eventNumber}`,
        eventType: data.eventType || data.type || data.summary || 'Unknown',
        eventNumber: data.eventNumber || data.number || eventNumber,
        data: data.data || data.content || data.payload || data,
        metadata: data.metadata || data.meta || {},
        created: data.created || data.timestamp || data.updated || new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Error fetching event ${eventNumber} from stream ${streamId}:`, error);
      // Return a placeholder event with error info
      return {
        eventId: `${streamId}-${eventNumber}`,
        eventType: 'Error',
        eventNumber: eventNumber,
        data: { error: 'Failed to load event data', details: error },
        metadata: {},
        created: new Date().toISOString(),
      };
    }
  },
};

export const subscriptions = {
  list: async (): Promise<PersistentSubscription[]> => {
    try {
      const response = await eventstoreApi.get('/subscriptions', {
        headers: {
          Accept: 'application/json',
        },
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }
      
      return response.data.map((sub: any) => ({
        name: sub.eventStreamId + '::' + sub.groupName,
        streamName: sub.eventStreamId,
        groupName: sub.groupName,
        status: sub.status,
        averageItemsPerSecond: sub.averageItemsPerSecond || 0,
        totalItemsProcessed: sub.totalItemsProcessed || 0,
        countSinceLastMeasurement: sub.countSinceLastMeasurement || 0,
        liveBufferCount: sub.liveBufferCount || 0,
        parkedMessageCount: sub.parkedMessageCount || 0,
        lastCheckpointedEventPosition: sub.lastCheckpointedEventPosition || '',
        lastKnownEventPosition: sub.lastKnownEventPosition || '',
      }));
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
  },

  get: async (stream: string, group: string): Promise<PersistentSubscription> => {
    const response = await eventstoreApi.get(`/subscriptions/${stream}/${group}/info`);
    return {
      name: response.data.name,
      streamName: response.data.eventStreamId,
      groupName: response.data.groupName,
      status: response.data.status,
      averageItemsPerSecond: response.data.averageItemsPerSecond,
      totalItemsProcessed: response.data.totalItemsProcessed,
      countSinceLastMeasurement: response.data.countSinceLastMeasurement,
      liveBufferCount: response.data.liveBufferCount,
      parkedMessageCount: response.data.parkedMessageCount,
      lastCheckpointedEventPosition: response.data.lastCheckpointedEventPosition,
      lastKnownEventPosition: response.data.lastKnownEventPosition,
    };
  },

  create: async (streamName: string, groupName: string, config: any) => {
    const response = await eventstoreApi.put(
      `/subscriptions/${streamName}/${groupName}`,
      config,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  delete: async (streamName: string, groupName: string) => {
    await eventstoreApi.delete(`/subscriptions/${streamName}/${groupName}`);
  },
};

export const projections = {
  list: async (): Promise<Projection[]> => {
    try {
      const response = await eventstoreApi.get('/projections/any', {
        headers: {
          Accept: 'application/json',
        },
      });
      
      if (!response.data || !response.data.projections) {
        return [];
      }
      
      return response.data.projections.map((proj: any) => ({
        name: proj.name || proj.effectiveName,
        status: proj.status,
        mode: proj.mode,
        position: proj.position || '',
        progress: proj.progress || 0,
        lastCheckpoint: proj.lastCheckpoint || '',
        eventsProcessedAfterRestart: proj.eventsProcessedAfterRestart || 0,
        stateReason: proj.stateReason || '',
        effectiveName: proj.effectiveName || proj.name,
        writesInProgress: proj.writesInProgress || 0,
        readsInProgress: proj.readsInProgress || 0,
        partitionsCached: proj.partitionsCached || 0,
        epoch: proj.epoch || 0,
        version: proj.version || 0,
      }));
    } catch (error) {
      console.error('Error fetching projections:', error);
      return [];
    }
  },

  get: async (name: string): Promise<Projection> => {
    const response = await eventstoreApi.get(`/projection/${name}`);
    return response.data;
  },

  getState: async (name: string): Promise<any> => {
    const response = await eventstoreApi.get(`/projection/${name}/state`);
    return response.data;
  },

  create: async (name: string, query: string, config: any) => {
    const response = await eventstoreApi.post(
      `/projections/continuous`,
      {
        name,
        query,
        ...config,
      },
      {
        params: {
          name,
        },
      }
    );
    return response.data;
  },

  update: async (name: string, query: string) => {
    const response = await eventstoreApi.put(`/projection/${name}/query`, query, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  enable: async (name: string) => {
    await eventstoreApi.post(`/projection/${name}/command/enable`);
  },

  disable: async (name: string) => {
    await eventstoreApi.post(`/projection/${name}/command/disable`);
  },

  reset: async (name: string) => {
    await eventstoreApi.post(`/projection/${name}/command/reset`);
  },

  delete: async (name: string) => {
    await eventstoreApi.delete(`/projection/${name}`);
  },
};

export const stats = {
  get: async (): Promise<Stats> => {
    try {
      const response = await eventstoreApi.get('/stats', {
        headers: {
          Accept: 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Return mock data if stats endpoint fails
      return {
        proc: {
          startTime: new Date().toISOString(),
          id: 0,
          mem: 0,
          cpu: 0,
          threadsCount: 0,
          contentionsRate: 0,
          thrownExceptionsRate: 0,
          gc: {
            allocationSpeed: 0,
            fragmentation: 0,
            gen0ItemsCount: 0,
            gen0Size: 0,
            gen1ItemsCount: 0,
            gen1Size: 0,
            gen2ItemsCount: 0,
            gen2Size: 0,
            largeHeapSize: 0,
            timeInGc: 0,
            totalBytesInHeaps: 0,
          },
          diskIo: {
            readBytes: 0,
            writtenBytes: 0,
            readOps: 0,
            writeOps: 0,
          },
          tcp: {
            connections: 0,
            receivingSpeed: 0,
            sendingSpeed: 0,
            inSend: 0,
            measureTime: new Date().toISOString(),
            pendingReceived: 0,
            pendingSend: 0,
            receivedBytesSinceLastRun: 0,
            receivedBytesTotal: 0,
            sentBytesSinceLastRun: 0,
            sentBytesTotal: 0,
          },
        },
        sys: {
          loadavg: {
            '1m': 0,
            '5m': 0,
            '15m': 0,
          },
          freeMem: 0,
          totalMem: 0,
          drive: {},
        },
        es: {
          queue: {},
        },
      };
    }
  },
};