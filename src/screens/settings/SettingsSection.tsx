import { useState } from 'react'
import { strings } from '../../strings'
import { BackupScreen } from './BackupScreen'
import { CategoriesScreen } from './CategoriesScreen'
import { ImportListScreen } from './ImportListScreen'
import { UnitsScreen } from './UnitsScreen'

type Section = 'menu' | 'categories' | 'units' | 'import' | 'backup'

export function SettingsSection() {
  const [section, setSection] = useState<Section>('menu')

  if (section === 'categories') return <CategoriesScreen onBack={() => setSection('menu')} />
  if (section === 'units') return <UnitsScreen onBack={() => setSection('menu')} />
  if (section === 'import') return <ImportListScreen onBack={() => setSection('menu')} />
  if (section === 'backup') return <BackupScreen onBack={() => setSection('menu')} />

  return (
    <div>
      <h1 className="screen__title">{strings.settings.screenTitle}</h1>

      <ul className="settings-menu">
        <li>
          <button
            type="button"
            className="settings-menu__item"
            onClick={() => setSection('categories')}
          >
            {strings.settings.categoriesButton}
          </button>
        </li>
        <li>
          <button type="button" className="settings-menu__item" onClick={() => setSection('units')}>
            {strings.settings.unitsButton}
          </button>
        </li>
        <li>
          <button
            type="button"
            className="settings-menu__item"
            onClick={() => setSection('import')}
          >
            {strings.settings.importButton}
          </button>
        </li>
        <li>
          <button
            type="button"
            className="settings-menu__item"
            onClick={() => setSection('backup')}
          >
            {strings.settings.backupHeading}
          </button>
        </li>
      </ul>

      <div className="settings-block">
        <h2 className="settings-block__heading">{strings.settings.aboutHeading}</h2>
        <p className="settings-block__hint">{strings.settings.aboutBody}</p>
      </div>
    </div>
  )
}
