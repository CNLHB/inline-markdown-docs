import { useMemo } from 'react'
import MiniSearch from 'minisearch'
import type { Document, SearchFilters } from '../../types'
import { stripMarkdown } from '../../lib/markdown/markdown'

type SearchResult = {
  id: string
  score: number
  title: string
  content: string
  updatedAt: string
}

const buildIndex = (documents: Document[]) => {
  const miniSearch = new MiniSearch({
    fields: ['title', 'content'],
    storeFields: ['title', 'content', 'updatedAt'],
    searchOptions: { prefix: true },
  })

  miniSearch.addAll(
    documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      content: stripMarkdown(doc.contentMd),
      updatedAt: doc.updatedAt,
    })),
  )

  return miniSearch
}

const filterByDate = (dateRange: SearchFilters['dateRange']) => {
  if (dateRange === 'any') return () => true
  const now = Date.now()
  const delta = dateRange === '7d' ? 7 : 30
  return (value: SearchResult) =>
    now - new Date(value.updatedAt).getTime() <= delta * 24 * 60 * 60 * 1000
}

export const useSearch = (
  documents: Document[],
  query: string,
  filters: SearchFilters,
) => {
  return useMemo(() => {
    if (!query.trim()) return []
    const index = buildIndex(documents)
    const fields = filters.scope === 'all' ? undefined : [filters.scope]
    const results = index.search(query, { fields }) as unknown as SearchResult[]
    return results.filter(filterByDate(filters.dateRange))
  }, [documents, query, filters])
}
