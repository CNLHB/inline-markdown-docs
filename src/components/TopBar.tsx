import { Filter, RefreshCcw, PanelRight, PanelLeft, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SearchFilters } from '../types'

type TopBarProps = {
  searchQuery: string
  searchFilters: SearchFilters
  syncStatus: 'idle' | 'syncing' | 'error'
  syncError: string | null
  syncEnabled: boolean
  onSearchQuery: (value: string) => void
  onSearchFilters: (filters: SearchFilters) => void
  onTogglePreview: () => void
  onToggleSidebar: () => void
  onSync: () => void
  onSignOut?: () => void
}

const TopBar = ({
  searchQuery,
  searchFilters,
  syncStatus,
  syncError,
  syncEnabled,
  onSearchQuery,
  onSearchFilters,
  onTogglePreview,
  onToggleSidebar,
  onSync,
  onSignOut,
}: TopBarProps) => {
  const { t, i18n } = useTranslation()
  return (
    <div className="topbar">
      <div className="topbar-left">
        <button
          className="icon-btn"
          onClick={onToggleSidebar}
          aria-label={t('a11y.toggleSidebar')}
        >
          <PanelLeft size={18} />
        </button>
        <div className="search-input">
          <Filter size={14} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQuery(event.target.value)}
            placeholder={t('placeholders.search')}
          />
        </div>
        <select
          value={searchFilters.scope}
          onChange={(event) =>
            onSearchFilters({ ...searchFilters, scope: event.target.value as SearchFilters['scope'] })
          }
        >
          <option value="all">{t('filters.titleContent')}</option>
          <option value="title">{t('filters.titleOnly')}</option>
          <option value="content">{t('filters.contentOnly')}</option>
        </select>
        <select
          value={searchFilters.dateRange}
          onChange={(event) =>
            onSearchFilters({
              ...searchFilters,
              dateRange: event.target.value as SearchFilters['dateRange'],
            })
          }
        >
          <option value="any">{t('filters.anyTime')}</option>
          <option value="7d">{t('filters.last7')}</option>
          <option value="30d">{t('filters.last30')}</option>
        </select>
      </div>
      <div className="topbar-right">
        {syncEnabled ? (
          <>
            <div className={`sync-chip ${syncStatus}`}>
              {syncStatus === 'syncing'
                ? t('status.syncing')
                : syncStatus === 'error'
                  ? t('status.syncError')
                  : t('status.synced')}
            </div>
            {syncError ? <span className="muted">{syncError}</span> : null}
            <button className="ghost-btn" onClick={onSync} title={t('messages.syncShortcut')}>
              <RefreshCcw size={14} />
              {t('actions.syncNow')}
            </button>
          </>
        ) : (
          <div className="sync-chip">{t('status.localOnly')}</div>
        )}
        <select
          className="lang-select"
          value={i18n.language.startsWith('zh') ? 'zh' : 'en'}
          onChange={(event) => {
            const next = event.target.value
            i18n.changeLanguage(next)
            window.localStorage.setItem('inkline-lang', next)
          }}
          aria-label={t('labels.language')}
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
        {onSignOut && (
          <button className="ghost-btn" onClick={onSignOut}>
            <LogOut size={14} />
            {t('actions.signOut')}
          </button>
        )}
        <button
          className="icon-btn"
          onClick={onTogglePreview}
          aria-label={t('a11y.togglePreview')}
        >
          <PanelRight size={18} />
        </button>
      </div>
    </div>
  )
}

export default TopBar
