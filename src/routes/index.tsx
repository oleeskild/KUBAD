import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({
      to: '/aggregates',
      search: {
        aggregate: undefined,
        guid: undefined,
        stream: undefined
      }
    })
  },
  component: () => null,
})