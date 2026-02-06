export type Folder = {
  id: string
  userId: string
  parentId: string | null
  name: string
  sortIndex: number
  createdAt: string
  updatedAt: string
}

export type Document = {
  id: string
  userId: string
  folderId: string | null
  title: string
  contentMd: string
  contentHtml: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type DocVersion = {
  id: string
  documentId: string
  versionNo: number
  contentMd: string
  createdAt: string
}

export type Share = {
  id: string
  documentId: string
  token: string
  mode: 'read' | 'write'
  createdAt: string
  expiresAt: string | null
}

export type SearchFilters = {
  scope: 'all' | 'title' | 'content'
  dateRange: 'any' | '7d' | '30d'
}
