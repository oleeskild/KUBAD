import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { serverManager } from '@/api/eventstore'

export interface SavedAggregate {
  id: string
  name: string
  streamPrefix: string
  description?: string
  dateAdded: string
  serverId?: string
}

interface SavedAggregatesContextType {
  savedAggregates: SavedAggregate[]
  addAggregate: (aggregate: Omit<SavedAggregate, 'id' | 'dateAdded'>) => void
  removeAggregate: (id: string) => void
  updateAggregate: (id: string, updates: Partial<SavedAggregate>) => void
  getStreamName: (aggregateId: string) => string
  isLoading: boolean
}

const SavedAggregatesContext = createContext<SavedAggregatesContextType | null>(null)

export function SavedAggregatesProvider({ children }: { children: ReactNode }) {
  const [savedAggregates, setSavedAggregates] = useState<SavedAggregate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load saved aggregates from localStorage
  useEffect(() => {
    const loadSavedAggregates = () => {
      try {
        const currentServer = serverManager.getCurrentServer()
        const serverKey = currentServer
          ? `eventstore-saved-aggregates-${currentServer.id}`
          : 'eventstore-saved-aggregates'
        
        const saved = localStorage.getItem(serverKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          setSavedAggregates(parsed)
        } else {
          // Migrate from old userAggregates format if it exists
          const oldAggregates = localStorage.getItem('eventstore-aggregates')
          if (oldAggregates) {
            const oldParsed = JSON.parse(oldAggregates)
            const migrated = oldParsed.map((name: string, index: number) => ({
              id: `migrated-${index}`,
              name,
              streamPrefix: `$ce-${name}`,
              description: `Migrated from previous aggregates`,
              dateAdded: new Date().toISOString(),
              serverId: currentServer?.id
            }))
            setSavedAggregates(migrated)
            localStorage.setItem(serverKey, JSON.stringify(migrated))
          }
        }
      } catch (error) {
        console.error('Error loading saved aggregates:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSavedAggregates()
  }, [])

  // Save aggregates to localStorage
  const saveToPersistence = (aggregates: SavedAggregate[]) => {
    try {
      const currentServer = serverManager.getCurrentServer()
      const serverKey = currentServer
        ? `eventstore-saved-aggregates-${currentServer.id}`
        : 'eventstore-saved-aggregates'
      
      localStorage.setItem(serverKey, JSON.stringify(aggregates))
    } catch (error) {
      console.error('Error saving aggregates:', error)
    }
  }

  const addAggregate = (aggregate: Omit<SavedAggregate, 'id' | 'dateAdded'>) => {
    const newAggregate: SavedAggregate = {
      ...aggregate,
      id: `agg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dateAdded: new Date().toISOString(),
      serverId: serverManager.getCurrentServer()?.id
    }
    
    const updated = [...savedAggregates, newAggregate]
    setSavedAggregates(updated)
    saveToPersistence(updated)
  }

  const removeAggregate = (id: string) => {
    const updated = savedAggregates.filter(agg => agg.id !== id)
    setSavedAggregates(updated)
    saveToPersistence(updated)
  }

  const updateAggregate = (id: string, updates: Partial<SavedAggregate>) => {
    const updated = savedAggregates.map(agg => 
      agg.id === id ? { ...agg, ...updates } : agg
    )
    setSavedAggregates(updated)
    saveToPersistence(updated)
  }

  const getStreamName = (aggregateId: string) => {
    const aggregate = savedAggregates.find(agg => agg.id === aggregateId)
    return aggregate?.streamPrefix || ''
  }

  const value: SavedAggregatesContextType = {
    savedAggregates,
    addAggregate,
    removeAggregate,
    updateAggregate,
    getStreamName,
    isLoading
  }

  return (
    <SavedAggregatesContext.Provider value={value}>
      {children}
    </SavedAggregatesContext.Provider>
  )
}

export function useSavedAggregates() {
  const context = useContext(SavedAggregatesContext)
  if (!context) {
    throw new Error('useSavedAggregates must be used within a SavedAggregatesProvider')
  }
  return context
}