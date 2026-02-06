import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Folder, FolderPlus, PanelLeftClose, Search } from 'lucide-react'
import type { Document, Folder as FolderType } from '../types'
import { formatRelative } from '../lib/utils/format'
import Modal from './Modal'

type SearchItem = {
  id: string
  title: string
  updatedAt: string
  snippet: string
}

type SidebarProps = {
  open: boolean
  folders: FolderType[]
  documents: Document[]
  activeFolderId: string | null
  activeDocId: string | null
  searchQuery: string
  searchResults: SearchItem[]
  onSelectFolder: (folderId: string | null) => void
  onSelectDoc: (docId: string) => void
  onCreateFolder: (name: string, parentId: string | null) => void
  onRenameFolder: (folderId: string, name: string) => void
  onMoveFolder: (folder: FolderType) => void
  onDeleteFolder: (folderId: string) => void
  onCreateDoc: () => void
  onRenameDoc: (docId: string, title: string) => void
  onDeleteDoc: (docId: string) => void
  onToggleSidebar: () => void
}

type DialogState =
  | { type: 'new-folder'; parentId: string | null }
  | { type: 'rename-folder'; folderId: string }
  | { type: 'rename-doc'; docId: string }
  | null

const highlightText = (text: string, query: string) => {
  if (!query.trim()) return text
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(safe, 'gi'), (match) => `<mark>${match}</mark>`)
}

const Sidebar = ({
  open,
  folders,
  documents,
  activeFolderId,
  activeDocId,
  searchQuery,
  searchResults,
  onSelectFolder,
  onSelectDoc,
  onCreateFolder,
  onRenameFolder,
  onMoveFolder,
  onDeleteFolder,
  onCreateDoc,
  onRenameDoc,
  onDeleteDoc,
  onToggleSidebar,
}: SidebarProps) => {
  const { t } = useTranslation()
  const [dialog, setDialog] = useState<DialogState>(null)
  const [dialogValue, setDialogValue] = useState('')
  const [dialogParent, setDialogParent] = useState<string | null>(activeFolderId)

  const folderMap = useMemo(() => {
    const map = new Map<string | null, FolderType[]>()
    folders.forEach((folder) => {
      const parentKey = folder.parentId ?? null
      const list = map.get(parentKey) ?? []
      list.push(folder)
      map.set(parentKey, list)
    })
    return map
  }, [folders])

  const folderOptions = useMemo(
    () => [
      { id: null, name: t('labels.folderRoot') },
      ...folders.map((folder) => ({ id: folder.id, name: folder.name })),
    ],
    [folders, t],
  )

  const openNewFolder = () => {
    setDialog({ type: 'new-folder', parentId: activeFolderId })
    setDialogParent(activeFolderId)
    setDialogValue('')
  }

  const openRenameFolder = (folder: FolderType) => {
    setDialog({ type: 'rename-folder', folderId: folder.id })
    setDialogValue(folder.name)
  }

  const openRenameDoc = (doc: Document) => {
    setDialog({ type: 'rename-doc', docId: doc.id })
    setDialogValue(doc.title)
  }

  const closeDialog = () => {
    setDialog(null)
    setDialogValue('')
  }

  const submitDialog = () => {
    const value = dialogValue.trim()
    if (!dialog || !value) return
    if (dialog.type === 'new-folder') {
      onCreateFolder(value, dialogParent ?? null)
    }
    if (dialog.type === 'rename-folder') {
      onRenameFolder(dialog.folderId, value)
    }
    if (dialog.type === 'rename-doc') {
      onRenameDoc(dialog.docId, value)
    }
    closeDialog()
  }

  const renderTree = (parentId: string | null, depth: number) => {
    const list = folderMap.get(parentId) ?? []
    return list.map((folder) => (
      <div key={folder.id} className="folder-node" style={{ paddingLeft: `${depth * 12}px` }}>
        <button
          className={`folder-row ${activeFolderId === folder.id ? 'active' : ''}`}
          onClick={() => onSelectFolder(folder.id)}
        >
          <Folder size={16} />
          <span>{folder.name}</span>
        </button>
        <div className="folder-actions">
          <button className="ghost-btn" onClick={() => openRenameFolder(folder)}>
            {t('actions.rename')}
          </button>
          <button className="ghost-btn" onClick={() => onMoveFolder(folder)}>
            {t('actions.move')}
          </button>
          <button className="ghost-btn danger" onClick={() => onDeleteFolder(folder.id)}>
            {t('actions.delete')}
          </button>
        </div>
        {renderTree(folder.id, depth + 1)}
      </div>
    ))
  }

  return (
    <aside className={`sidebar ${open ? '' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-mark">{t('brand.name')}</div>
          <span className="brand-caption">{t('brand.subtitle')}</span>
        </div>
        <button
          className="icon-btn"
          onClick={onToggleSidebar}
          aria-label={t('a11y.toggleSidebar')}
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      <div className="sidebar-actions">
        <button className="primary-btn" onClick={onCreateDoc}>
          <FileText size={16} />
          {t('actions.newDoc')}
        </button>
        <button className="ghost-btn" onClick={openNewFolder}>
          <FolderPlus size={16} />
          {t('actions.newFolder')}
        </button>
      </div>

      <div className="sidebar-section">
        <div className="section-title">
          <Search size={14} />
          {searchQuery.trim() ? t('labels.searchResults') : t('labels.folders')}
        </div>
        {searchQuery.trim() ? (
          <div className="search-results">
            {searchResults.map((result) => (
              <button
                key={result.id}
                className={`doc-row ${activeDocId === result.id ? 'active' : ''}`}
                onClick={() => onSelectDoc(result.id)}
              >
                <div className="doc-title">{result.title}</div>
                <div
                  className="doc-snippet"
                  dangerouslySetInnerHTML={{
                    __html: highlightText(result.snippet, searchQuery),
                  }}
                />
                <div className="doc-meta">{formatRelative(result.updatedAt)}</div>
              </button>
            ))}
            {searchResults.length === 0 ? (
              <div className="muted">{t('messages.noResults')}</div>
            ) : null}
          </div>
        ) : (
          <div className="folder-tree">
            <button
              className={`folder-row ${activeFolderId === null ? 'active' : ''}`}
              onClick={() => onSelectFolder(null)}
            >
              <Folder size={16} />
              <span>{t('labels.allDocuments')}</span>
            </button>
            {renderTree(null, 0)}
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <div className="section-title">{t('labels.documents')}</div>
        <div className="doc-list">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`doc-row ${activeDocId === doc.id ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDoc(doc.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSelectDoc(doc.id)
              }}
            >
              <div className="doc-title">{doc.title}</div>
              <div className="doc-meta">{formatRelative(doc.updatedAt)}</div>
              <div className="doc-actions">
                <button
                  className="ghost-btn"
                  onClick={(event) => {
                    event.stopPropagation()
                    openRenameDoc(doc)
                  }}
                >
                  {t('actions.rename')}
                </button>
                <button
                  className="ghost-btn danger"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteDoc(doc.id)
                  }}
                >
                  {t('actions.delete')}
                </button>
              </div>
            </div>
          ))}
          {documents.length === 0 ? (
            <div className="muted">{t('messages.noDocuments')}</div>
          ) : null}
        </div>
      </div>

      <Modal
        open={dialog !== null}
        title={
          dialog?.type === 'new-folder'
            ? t('dialogs.newFolder')
            : dialog?.type === 'rename-folder'
              ? t('dialogs.renameFolder')
              : t('dialogs.renameDoc')
        }
        onClose={closeDialog}
      >
        <div className="dialog-body">
          {dialog?.type === 'new-folder' ? (
            <label className="field">
              <span>{t('fields.parentFolder')}</span>
              <select
                value={dialogParent ?? ''}
                onChange={(event) => setDialogParent(event.target.value || null)}
              >
                {folderOptions.map((option) => (
                  <option key={option.id ?? 'root'} value={option.id ?? ''}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="field">
            <span>{t('fields.name')}</span>
            <input
              value={dialogValue}
              onChange={(event) => setDialogValue(event.target.value)}
              placeholder={
                dialog?.type === 'new-folder'
                  ? t('placeholders.folderName')
                  : t('placeholders.newName')
              }
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitDialog()
              }}
            />
          </label>
          <div className="modal-actions">
            <button className="ghost-btn" onClick={closeDialog}>
              {t('actions.cancel')}
            </button>
            <button className="primary-btn" onClick={submitDialog} disabled={!dialogValue.trim()}>
              {t('actions.save')}
            </button>
          </div>
        </div>
      </Modal>
    </aside>
  )
}

export default Sidebar
