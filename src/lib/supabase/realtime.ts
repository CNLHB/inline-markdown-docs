import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './client'
import type { Document, Folder } from '../../types'

type RemoteDocument = {
  id: string
  user_id: string
  folder_id: string | null
  title: string
  content_md: string
  content_html: string
  tags: string[]
  created_at: string
  updated_at: string
}

type RemoteFolder = {
  id: string
  user_id: string
  parent_id: string | null
  name: string
  sort_index: number
  created_at: string
  updated_at: string
}

const docFromRemote = (row: RemoteDocument): Document => ({
  id: row.id,
  userId: row.user_id,
  folderId: row.folder_id,
  title: row.title,
  contentMd: row.content_md,
  contentHtml: row.content_html,
  tags: row.tags ?? [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const folderFromRemote = (row: RemoteFolder): Folder => ({
  id: row.id,
  userId: row.user_id,
  parentId: row.parent_id,
  name: row.name,
  sortIndex: row.sort_index,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const subscribeRealtime = (
  userId: string,
  handlers: {
    onDocUpsert: (doc: Document) => void
    onDocDelete: (docId: string) => void
    onFolderUpsert: (folder: Folder) => void
    onFolderDelete: (folderId: string) => void
  },
) => {
  if (!supabase) return null

  const channel: RealtimeChannel = supabase.channel(`docs-${userId}`)

  channel
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'documents', filter: `user_id=eq.${userId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          handlers.onDocDelete(payload.old.id as string)
          return
        }
        handlers.onDocUpsert(docFromRemote(payload.new as RemoteDocument))
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'folders', filter: `user_id=eq.${userId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          handlers.onFolderDelete(payload.old.id as string)
          return
        }
        handlers.onFolderUpsert(folderFromRemote(payload.new as RemoteFolder))
      },
    )
    .subscribe()

  return channel
}
