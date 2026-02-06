import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearch } from '../features/search/useSearch'
import { useAuth } from '../features/auth/useAuth'
import { isSupabaseConfigured, supabase } from '../lib/supabase/client'
import { subscribeRealtime } from '../lib/supabase/realtime'
import { downloadHtml, downloadPdf } from '../lib/export/exporters'
import { mdToHtml } from '../lib/markdown/markdown'
import { formatRelative } from '../lib/utils/format'
import Modal from '../components/Modal'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import EditorPane from '../components/EditorPane'
import PreviewPane from '../components/PreviewPane'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import type { Folder } from '../types'

type WorkspaceProps = {
  userId: string
}

const getSnippet = (content: string, query: string) => {
  const lower = content.toLowerCase()
  const index = lower.indexOf(query.toLowerCase())
  if (index === -1) return content.slice(0, 140)
  const start = Math.max(0, index - 60)
  const end = Math.min(content.length, index + 80)
  return `${start > 0 ? '...' : ''}${content.slice(start, end)}${end < content.length ? '...' : ''}`
}

const Workspace = ({ userId }: WorkspaceProps) => {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const {
    folders,
    documents,
    versions,
    shares,
    activeDocId,
    activeFolderId,
    editorMode,
    searchQuery,
    searchFilters,
    hydrated,
    syncStatus,
    syncError,
    setUserId,
    loadWorkspace,
    setActiveFolder,
    setActiveDoc,
    setEditorMode,
    setSearchQuery,
    setSearchFilters,
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    createDocument,
    updateDocument,
    deleteDocument,
    saveVersion,
    restoreVersion,
    addTag,
    removeTag,
    createShare,
    deleteShare,
    syncNow,
    applyRemoteDoc,
    removeRemoteDoc,
    applyRemoteFolder,
    removeRemoteFolder,
  } = useWorkspaceStore()

  const [previewOpen, setPreviewOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [shareOpen, setShareOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [moveFolderTarget, setMoveFolderTarget] = useState<Folder | null>(null)
  const [pendingShareLink, setPendingShareLink] = useState<string | null>(null)

  useEffect(() => {
    setUserId(userId)
    loadWorkspace(userId)
  }, [userId, setUserId, loadWorkspace])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined
    const channel = subscribeRealtime(userId, {
      onDocUpsert: (doc) => applyRemoteDoc(doc),
      onDocDelete: (docId) => removeRemoteDoc(docId),
      onFolderUpsert: (folder) => applyRemoteFolder(folder),
      onFolderDelete: (folderId) => removeRemoteFolder(folderId),
    })
    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId, applyRemoteDoc, removeRemoteDoc, applyRemoteFolder, removeRemoteFolder])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (isSupabaseConfigured) {
          syncNow()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [syncNow, isSupabaseConfigured])

  const activeDoc = documents.find((doc) => doc.id === activeDocId) ?? null
  const searchResults = useSearch(documents, searchQuery, searchFilters)
  const searchMatches = useMemo(
    () =>
      searchResults.map((result) => {
        const doc = documents.find((item) => item.id === result.id)
        return {
          id: result.id,
          title: doc?.title ?? result.title,
          updatedAt: doc?.updatedAt ?? result.updatedAt,
          snippet: getSnippet(result.content, searchQuery),
        }
      }),
    [documents, searchResults, searchQuery],
  )

  const filteredDocs = useMemo(() => {
    if (searchQuery.trim()) {
      return documents.filter((doc) => searchMatches.some((item) => item.id === doc.id))
    }
    if (!activeFolderId) return documents
    return documents.filter((doc) => doc.folderId === activeFolderId)
  }, [documents, activeFolderId, searchQuery, searchMatches])

  const folderOptions = useMemo(
    () => [
      { id: null, name: t('labels.folderRoot') },
      ...folders.map((folder) => ({ id: folder.id, name: folder.name })),
    ],
    [folders, t],
  )

  const handleShare = async () => {
    if (!activeDoc) return
    const existing = shares.find((share) => share.documentId === activeDoc.id)
    const share = existing ?? (await createShare(activeDoc.id))
    const link = `${window.location.origin}/share/${share.token}`
    setPendingShareLink(link)
    setShareOpen(true)
  }

  const previewHtml = activeDoc?.contentHtml || (activeDoc ? mdToHtml(activeDoc.contentMd) : '')

  return (
    <div
      className={`app-shell ${previewOpen ? '' : 'preview-collapsed'} ${
        sidebarOpen ? '' : 'sidebar-collapsed'
      }`}
    >
      <Sidebar
        open={sidebarOpen}
        folders={folders}
        documents={filteredDocs}
        activeFolderId={activeFolderId}
        activeDocId={activeDocId}
        searchQuery={searchQuery}
        searchResults={searchMatches}
        onSelectFolder={setActiveFolder}
        onSelectDoc={setActiveDoc}
        onCreateFolder={createFolder}
        onRenameFolder={renameFolder}
        onMoveFolder={(folder) => setMoveFolderTarget(folder)}
        onDeleteFolder={deleteFolder}
        onCreateDoc={() => createDocument(t('placeholders.untitledDoc'), activeFolderId)}
        onRenameDoc={(docId, title) => updateDocument(docId, { title })}
        onDeleteDoc={deleteDocument}
        onToggleSidebar={() => setSidebarOpen((value) => !value)}
      />

      <section className="workspace">
        <TopBar
          searchQuery={searchQuery}
          searchFilters={searchFilters}
          syncStatus={syncStatus}
          syncError={syncError}
          syncEnabled={isSupabaseConfigured}
          onSearchQuery={setSearchQuery}
          onSearchFilters={setSearchFilters}
          onTogglePreview={() => setPreviewOpen((value) => !value)}
          onToggleSidebar={() => setSidebarOpen((value) => !value)}
          onSync={syncNow}
          onSignOut={isSupabaseConfigured ? signOut : undefined}
        />

        <div className="workspace-body">
          <EditorPane
            doc={activeDoc}
            editorMode={editorMode}
            folderOptions={folderOptions}
            onTitleChange={(title) => activeDoc && updateDocument(activeDoc.id, { title })}
            onFolderChange={(folderId) =>
              activeDoc && updateDocument(activeDoc.id, { folderId })
            }
            onContentChange={(contentMd, contentHtml) =>
              activeDoc && updateDocument(activeDoc.id, { contentMd, contentHtml })
            }
            onToggleMode={setEditorMode}
            onSaveVersion={() => activeDoc && saveVersion(activeDoc.id)}
            onOpenVersions={() => setVersionsOpen(true)}
            onShare={handleShare}
            onExportHtml={() =>
              activeDoc &&
              updateDocument(activeDoc.id, { contentHtml: previewHtml }).then(() => {
                const fileName = `${activeDoc.title || t('placeholders.untitledDoc')}.html`
                const html = `<article>${previewHtml}</article>`
                downloadHtml(fileName, html)
              })
            }
            onExportPdf={() =>
              activeDoc &&
              updateDocument(activeDoc.id, { contentHtml: previewHtml }).then(() => {
                const fileName = `${activeDoc.title || t('placeholders.untitledDoc')}.pdf`
                const html = `<article>${previewHtml}</article>`
                downloadPdf(fileName, html)
              })
            }
            onAddTag={(tag) => activeDoc && addTag(activeDoc.id, tag)}
            onRemoveTag={(tag) => activeDoc && removeTag(activeDoc.id, tag)}
            onTogglePreview={() => setPreviewOpen((value) => !value)}
          />
          <PreviewPane
            open={previewOpen}
            html={previewHtml}
            title={activeDoc?.title ?? t('actions.preview')}
            updatedAt={activeDoc?.updatedAt}
          />
        </div>
      </section>

      <Modal open={shareOpen} title={t('dialogs.shareDoc')} onClose={() => setShareOpen(false)}>
        <div className="share-panel">
          {pendingShareLink ? (
            <>
              <div className="share-link">{pendingShareLink}</div>
              <button
                className="primary-btn"
                onClick={() => navigator.clipboard.writeText(pendingShareLink)}
              >
                {t('actions.copyLink')}
              </button>
            </>
          ) : (
            <div className="muted">{t('messages.createShareFirst')}</div>
          )}
        </div>
      </Modal>

      <Modal
        open={versionsOpen}
        title={t('dialogs.versionHistory')}
        onClose={() => setVersionsOpen(false)}
      >
        <div className="version-list">
          {activeDoc
            ? versions
                .filter((version) => version.documentId === activeDoc.id)
                .map((version) => (
                  <div key={version.id} className="version-item">
                    <div>
                      <div className="version-title">
                        {t('version.item', { number: version.versionNo })}
                      </div>
                      <div className="muted">{formatRelative(version.createdAt)}</div>
                    </div>
                    <button
                      className="ghost-btn"
                      onClick={() => restoreVersion(version.id)}
                    >
                      {t('actions.restore')}
                    </button>
                  </div>
                ))
            : null}
          {activeDoc && versions.filter((version) => version.documentId === activeDoc.id).length === 0
            ? t('messages.noVersions')
            : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(moveFolderTarget)}
        title={t('dialogs.moveFolder')}
        onClose={() => setMoveFolderTarget(null)}
      >
        {moveFolderTarget ? (
          <div className="move-panel">
            <label className="field">
              <span>{t('fields.parentFolder')}</span>
              <select
                value={moveFolderTarget.parentId ?? ''}
                onChange={(event) =>
                  moveFolder(moveFolderTarget.id, event.target.value || null).then(() =>
                    setMoveFolderTarget(null),
                  )
                }
              >
                <option value="">{t('labels.folderRoot')}</option>
                {folders
                  .filter((folder) => folder.id !== moveFolderTarget.id)
                  .map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        ) : null}
      </Modal>

      {!hydrated ? <div className="loading-overlay">{t('messages.loadingWorkspace')}</div> : null}
    </div>
  )
}

export default Workspace
