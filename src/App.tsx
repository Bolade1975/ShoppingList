import { useState } from 'react'
import { BottomNav } from './navigation/BottomNav'
import type { TabId } from './navigation/tabs'
import { ArchiveSection } from './screens/archive/ArchiveSection'
import { HistorySection } from './screens/history/HistorySection'
import { ListsSection } from './screens/lists/ListsSection'
import { SettingsSection } from './screens/settings/SettingsSection'
import { TemplatesSection } from './screens/templates/TemplatesSection'
import { strings } from './strings'

function ActiveScreen({ tab }: { tab: TabId }) {
  switch (tab) {
    case 'lists':
      return <ListsSection />
    case 'templates':
      return <TemplatesSection />
    case 'history':
      return <HistorySection />
    case 'archive':
      return <ArchiveSection />
    case 'settings':
      return <SettingsSection />
  }
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('lists')

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-header__title">{strings.appName}</span>
      </header>
      <main className="app-content">
        <ActiveScreen tab={activeTab} />
      </main>
      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  )
}

export default App
