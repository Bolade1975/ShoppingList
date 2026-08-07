import { useState } from 'react'
import { TemplateDetailScreen } from './TemplateDetailScreen'
import { TemplatesHomeScreen } from './TemplatesHomeScreen'

type Mode = { view: 'home' } | { view: 'detail'; templateId: string }

export function TemplatesSection() {
  const [mode, setMode] = useState<Mode>({ view: 'home' })

  if (mode.view === 'detail') {
    return (
      <TemplateDetailScreen templateId={mode.templateId} onBack={() => setMode({ view: 'home' })} />
    )
  }

  return <TemplatesHomeScreen onSelect={(templateId) => setMode({ view: 'detail', templateId })} />
}
