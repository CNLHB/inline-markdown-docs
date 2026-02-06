import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { localDb } from '../lib/storage/localDb'
import { mdToHtml } from '../lib/markdown/markdown'
import type { Document } from '../types'

type RemoteDocument = {
  id: string
  title: string
  content_md: string
  content_html: string
  updated_at: string
}

const mapDocFromRemote = (row: RemoteDocument): Document => ({
  id: row.id,
  userId: 'shared',
  folderId: null,
  title: row.title,
  contentMd: row.content_md,
  contentHtml: row.content_html,
  tags: [],
  createdAt: row.updated_at,
  updatedAt: row.updated_at,
})

const ShareView = () => {
  const { t, i18n } = useTranslation()
  const { token } = useParams()
  const [doc, setDoc] = useState<Document | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    if (!token) return
    const load = async () => {
      if (supabase) {
        const docRes = await supabase
          .rpc('get_shared_document', { share_token: token })
          .maybeSingle()
        if (docRes.error || !docRes.data) {
          setStatus('missing')
          return
        }
        setDoc(mapDocFromRemote(docRes.data))
        setStatus('ready')
        return
      }

      const share = await localDb.getShareByToken(token)
      if (!share) {
        setStatus('missing')
        return
      }
      const docs = await localDb.getAll<Document>('documents')
      const found = docs.find((item) => item.id === share.documentId) ?? null
      setDoc(found)
      setStatus(found ? 'ready' : 'missing')
    }

    load()
  }, [token])

  if (status === 'loading') {
    return <div className="share-shell">{t('messages.loadingShared')}</div>
  }

  if (status === 'missing' || !doc) {
    return <div className="share-shell">{t('messages.shareUnavailable')}</div>
  }

  const html = doc.contentHtml || mdToHtml(doc.contentMd)

  return (
    <div className="share-shell">
      <article className="share-article">
        <div className="share-article-header">
          <h1>{doc.title}</h1>
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
        </div>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </div>
  )
}

export default ShareView
