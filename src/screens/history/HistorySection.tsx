import { useState } from 'react'
import { HistoryDetailScreen } from './HistoryDetailScreen'
import { HistoryListScreen } from './HistoryListScreen'

type Mode = { view: 'list' } | { view: 'detail'; listId: string }

export function HistorySection() {
  const [mode, setMode] = useState<Mode>({ view: 'list' })

  if (mode.view === 'detail') {
    return <HistoryDetailScreen listId={mode.listId} onBack={() => setMode({ view: 'list' })} />
  }

  return <HistoryListScreen onSelect={(listId) => setMode({ view: 'detail', listId })} />
}
