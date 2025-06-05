import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { projections as projectionsApi } from '@/api/eventstore'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search } from 'lucide-react'

export const Route = createFileRoute('/projections')({
  component: ProjectionsPage,
})

function ProjectionsPage() {
  const [search, setSearch] = useState('')

  const { data: projectionsList, isLoading, error } = useQuery({
    queryKey: ['projections'],
    queryFn: projectionsApi.list,
  })

  const filteredProjections = projectionsList?.filter(proj =>
    proj.name.toLowerCase().includes(search.toLowerCase())
  ) || []

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      'Running': 'default',
      'Stopped': 'destructive',
      'Faulted': 'destructive',
      'Completed': 'secondary',
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  const getModeBadge = (mode: string) => {
    return <Badge variant="outline">{mode}</Badge>
  }

  if (error) {
    return <div>Error loading projections: {(error as Error).message}</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Projections</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projections..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-4">Loading projections...</div>
          ) : (
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
                    <TableCell className="font-medium">{proj.name}</TableCell>
                    <TableCell>{getStatusBadge(proj.status)}</TableCell>
                    <TableCell>{getModeBadge(proj.mode)}</TableCell>
                    <TableCell>{proj.progress}%</TableCell>
                    <TableCell>{proj.eventsProcessedAfterRestart.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  )
}