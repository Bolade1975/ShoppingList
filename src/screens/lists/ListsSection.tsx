import { useState } from 'react'
import { ListDetailScreen } from './ListDetailScreen'
import { ListsHomeScreen } from './ListsHomeScreen'

type Mode = { view: 'home' } | { view: 'detail'; listId: string }

export function ListsSection() {
  const [mode, setMode] = useState<Mode>({ view: 'home' })

  if (mode.view === 'detail') {
    return <ListDetailScreen listId={mode.listId} onBack={() => setMode({ view: 'home' })} />
  }

  return <ListsHomeScreen onSelect={(listId) => setMode({ view: 'detail', listId })} />
}
