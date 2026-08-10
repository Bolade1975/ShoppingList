import { strings } from '../strings'
import { TABS, type TabId } from './tabs'

type BottomNavProps = {
  activeTab: TabId
  onSelectTab: (tab: TabId) => void
}

export function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label={strings.a11y.mainNav}>
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            type="button"
            className="bottom-nav__item"
            aria-current={isActive ? 'page' : undefined}
            data-active={isActive}
            onClick={() => onSelectTab(tab.id)}
          >
            <Icon className="bottom-nav__icon" />
            <span className="bottom-nav__label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
