import type { Document, DocVersion, Folder, Share } from '../../types'
import { supabase } from './client'

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

type RemoteShare = {
  id: string
  document_id: string
  token: string
  mode: 'read' | 'write'
  created_at: string
  expires_at: string | null
  user_id: string
}

type RemoteVersion = {
  id: string
  document_id: string
  user_id: string
  version_no: number
  content_md: string
  created_at: string
}

const mapDocToRemote = (doc: Document): RemoteDocument => ({
  id: doc.id,
  user_id: doc.userId,
  folder_id: doc.folderId,
  title: doc.title,
  content_md: doc.contentMd,
  content_html: doc.contentHtml,
  tags: doc.tags,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
})

const mapDocFromRemote = (row: RemoteDocument): Document => ({
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

const mapFolderToRemote = (folder: Folder): RemoteFolder => ({
  id: folder.id,
  user_id: folder.userId,
  parent_id: folder.parentId,
  name: folder.name,
  sort_index: folder.sortIndex,
  created_at: folder.createdAt,
  updated_at: folder.updatedAt,
})

const mapFolderFromRemote = (row: RemoteFolder): Folder => ({
  id: row.id,
  userId: row.user_id,
  parentId: row.parent_id,
  name: row.name,
  sortIndex: row.sort_index,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const mapShareToRemote = (share: Share, userId: string): RemoteShare => ({
  id: share.id,
  document_id: share.documentId,
  token: share.token,
  mode: share.mode,
  created_at: share.createdAt,
  expires_at: share.expiresAt,
  user_id: userId,
})

const mapShareFromRemote = (row: RemoteShare): Share => ({
  id: row.id,
  documentId: row.document_id,
  token: row.token,
  mode: row.mode,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
})

const mapVersionToRemote = (version: DocVersion, userId: string): RemoteVersion => ({
  id: version.id,
  document_id: version.documentId,
  user_id: userId,
  version_no: version.versionNo,
  content_md: version.contentMd,
  created_at: version.createdAt,
})

const mapVersionFromRemote = (row: RemoteVersion): DocVersion => ({
  id: row.id,
  documentId: row.document_id,
  versionNo: row.version_no,
  contentMd: row.content_md,
  createdAt: row.created_at,
})

export const pullRemoteData = async (userId: string) => {
  if (!supabase) return { folders: [], documents: [], shares: [], versions: [] }

  const [foldersRes, docsRes, sharesRes, versionsRes] = await Promise.all([
    supabase.from('folders').select('*').eq('user_id', userId),
    supabase.from('documents').select('*').eq('user_id', userId),
    supabase.from('shares').select('*').eq('user_id', userId),
    supabase.from('doc_versions').select('*').eq('user_id', userId),
  ])

  if (foldersRes.error || docsRes.error || sharesRes.error || versionsRes.error) {
    throw foldersRes.error ?? docsRes.error ?? sharesRes.error ?? versionsRes.error
  }

  return {
    folders: (foldersRes.data ?? []).map(mapFolderFromRemote),
    documents: (docsRes.data ?? []).map(mapDocFromRemote),
    shares: (sharesRes.data ?? []).map(mapShareFromRemote),
    versions: (versionsRes.data ?? []).map(mapVersionFromRemote),
  }
}

export const pushRemoteData = async (
  userId: string,
  folders: Folder[],
  documents: Document[],
  shares: Share[],
  versions: DocVersion[],
) => {
  if (!supabase) return

  const [foldersRes, docsRes, sharesRes, versionsRes] = await Promise.all([
    supabase.from('folders').upsert(folders.map(mapFolderToRemote)),
    supabase.from('documents').upsert(documents.map(mapDocToRemote)),
    supabase
      .from('shares')
      .upsert(shares.map((share) => mapShareToRemote(share, userId))),
    supabase
      .from('doc_versions')
      .upsert(versions.map((version) => mapVersionToRemote(version, userId))),
  ])

  if (foldersRes.error || docsRes.error || sharesRes.error || versionsRes.error) {
    throw foldersRes.error ?? docsRes.error ?? sharesRes.error ?? versionsRes.error
  }
}

export const mergeRemote = (
  localFolders: Folder[],
  localDocs: Document[],
  localShares: Share[],
  localVersions: DocVersion[],
  remote: { folders: Folder[]; documents: Document[]; shares: Share[]; versions: DocVersion[] },
) => {
  const folderMap = new Map(localFolders.map((folder) => [folder.id, folder]))
  remote.folders.forEach((folder) => {
    const local = folderMap.get(folder.id)
    if (!local || new Date(folder.updatedAt) > new Date(local.updatedAt)) {
      folderMap.set(folder.id, folder)
    }
  })

  const docMap = new Map(localDocs.map((doc) => [doc.id, doc]))
  remote.documents.forEach((doc) => {
    const local = docMap.get(doc.id)
    if (!local || new Date(doc.updatedAt) > new Date(local.updatedAt)) {
      docMap.set(doc.id, doc)
    }
  })

  const shareMap = new Map(localShares.map((share) => [share.id, share]))
  remote.shares.forEach((share) => {
    shareMap.set(share.id, share)
  })

  const versionMap = new Map(localVersions.map((version) => [version.id, version]))
  remote.versions.forEach((version) => {
    versionMap.set(version.id, version)
  })

  return {
    folders: Array.from(folderMap.values()),
    documents: Array.from(docMap.values()),
    shares: Array.from(shareMap.values()),
    versions: Array.from(versionMap.values()),
  }
}
