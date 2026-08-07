import type { ComponentType } from 'react'
import { strings } from '../strings'
import { ArchiveIcon, HistoryIcon, ListsIcon, SettingsIcon, TemplatesIcon } from './icons'

export type TabId = 'lists' | 'templates' | 'history' | 'archive' | 'settings'

export type TabDefinition = {
  id: TabId
  label: string
  icon: ComponentType<{ className?: string }>
}

export const TABS: readonly TabDefinition[] = [
  { id: 'lists', label: strings.nav.lists, icon: ListsIcon },
  { id: 'templates', label: strings.nav.templates, icon: TemplatesIcon },
  { id: 'history', label: strings.nav.history, icon: HistoryIcon },
  { id: 'archive', label: strings.nav.archive, icon: ArchiveIcon },
  { id: 'settings', label: strings.nav.settings, icon: SettingsIcon },
]
