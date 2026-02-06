import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import Placeholder from '@tiptap/extension-placeholder'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import {
  Eye,
  FileOutput,
  FileText,
  History,
  Image as ImageIcon,
  Link2,
  PenSquare,
  Save,
  Tag,
} from 'lucide-react'
import type { Document } from '../types'
import { supabase } from '../lib/supabase/client'
import { htmlToMd, mdToHtml } from '../lib/markdown/markdown'

type FolderOption = {
  id: string | null
  name: string
}

type EditorPaneProps = {
  doc: Document | null
  editorMode: 'wysiwyg' | 'source'
  folderOptions: FolderOption[]
  onTitleChange: (title: string) => void
  onFolderChange: (folderId: string | null) => void
  onContentChange: (contentMd: string, contentHtml: string) => void
  onToggleMode: (mode: 'wysiwyg' | 'source') => void
  onSaveVersion: () => void
  onOpenVersions: () => void
  onShare: () => void
  onExportHtml: () => void
  onExportPdf: () => void
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  onTogglePreview: () => void
}

const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
) => {
  const timeoutRef = useRef<number | null>(null)
  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => callback(...args), delay)
    },
    [callback, delay],
  )
}

const EditorPane = ({
  doc,
  editorMode,
  folderOptions,
  onTitleChange,
  onFolderChange,
  onContentChange,
  onToggleMode,
  onSaveVersion,
  onOpenVersions,
  onShare,
  onExportHtml,
  onExportPdf,
  onAddTag,
  onRemoveTag,
  onTogglePreview,
}: EditorPaneProps) => {
  const { t, i18n } = useTranslation()
  const [tagInput, setTagInput] = useState('')
  const [sourceValue, setSourceValue] = useState(doc?.contentMd ?? '')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const debouncedUpdate = useDebouncedCallback((markdownValue: string): void => {
    const html = mdToHtml(markdownValue)
    onContentChange(markdownValue, html)
  }, 500)

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Link.configure({ openOnClick: false }),
        Image.configure({ inline: false }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Placeholder.configure({
          placeholder: t('editor.placeholder'),
        }),
      ],
      content: doc ? mdToHtml(doc.contentMd) : '',
      editable: Boolean(doc),
      onUpdate: ({ editor }) => {
        if (!doc) return
        const html = editor.getHTML()
        debouncedUpdate(htmlToMd(html))
      },
    },
    [doc?.id, i18n.language],
  )

  useEffect(() => {
    if (!doc) return
    setSourceValue(doc.contentMd)
    if (editor) {
      const html = mdToHtml(doc.contentMd)
      if (editor.getHTML() !== html) {
        editor.commands.setContent(html, false)
      }
    }
  }, [doc?.id, doc?.contentMd, editor])

  const tags = useMemo(() => doc?.tags ?? [], [doc?.tags])

  const handleInsertImage = () => {
    const url = window.prompt(t('placeholders.imageUrl'))
    if (!url) return
    if (editorMode === 'wysiwyg' && editor) {
      editor.chain().focus().setImage({ src: url }).run()
      return
    }
    const next = `${sourceValue}\n\n![](${url})\n`
    setSourceValue(next)
    debouncedUpdate(next)
  }

  const handleUploadImage = async (file?: File | null) => {
    if (!file || !doc) return
    let url = ''
    if (supabase) {
      const path = `${doc.userId}/${doc.id}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('assets').upload(path, file, {
        upsert: true,
      })
      if (error) {
        window.alert(t('messages.uploadFailed', { message: error.message }))
        return
      }
      const { data } = supabase.storage.from('assets').getPublicUrl(path)
      url = data.publicUrl
    } else {
      url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
    }

    if (editorMode === 'wysiwyg' && editor) {
      editor.chain().focus().setImage({ src: url }).run()
      return
    }
    const next = `${sourceValue}\n\n![](${url})\n`
    setSourceValue(next)
    debouncedUpdate(next)
  }

  if (!doc) {
    return (
      <div className="editor-pane empty">
        <div className="empty-state">
          <FileText size={32} />
          <div>{t('messages.selectDocument')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-pane">
      <div className="editor-toolbar">
        <div className="editor-header">
          <input
            className="doc-title-input"
            value={doc.title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={t('placeholders.untitledDoc')}
          />
          <div className="doc-meta-row">
            <label className="field inline">
              <span>{t('fields.folder')}</span>
              <select
                value={doc.folderId ?? ''}
                onChange={(event) => onFolderChange(event.target.value || null)}
              >
                {folderOptions.map((option) => (
                  <option key={option.id ?? 'root'} value={option.id ?? ''}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="tag-editor">
              <Tag size={14} />
              {tags.map((tag) => (
                <span key={tag} className="tag-pill">
                  {tag}
                  <button type="button" onClick={() => onRemoveTag(tag)}>
                    x
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && tagInput.trim()) {
                    onAddTag(tagInput.trim())
                    setTagInput('')
                  }
                }}
                placeholder={t('placeholders.addTag')}
              />
            </div>
          </div>
        </div>
        <div className="editor-actions">
          <button
            className={`ghost-btn ${editorMode === 'wysiwyg' ? 'active' : ''}`}
            onClick={() => onToggleMode('wysiwyg')}
          >
            <PenSquare size={14} />
            {t('editor.wysiwyg')}
          </button>
          <button
            className={`ghost-btn ${editorMode === 'source' ? 'active' : ''}`}
            onClick={() => onToggleMode('source')}
          >
            <FileText size={14} />
            {t('editor.source')}
          </button>
          <button className="ghost-btn" onClick={onTogglePreview}>
            <Eye size={14} />
            {t('editor.preview')}
          </button>
          <button className="ghost-btn" onClick={onSaveVersion}>
            <Save size={14} />
            {t('editor.saveVersion')}
          </button>
          <button className="ghost-btn" onClick={handleInsertImage}>
            <ImageIcon size={14} />
            {t('editor.insertImage')}
          </button>
          <button className="ghost-btn" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon size={14} />
            {t('editor.uploadImage')}
          </button>
          <button className="ghost-btn" onClick={onOpenVersions}>
            <History size={14} />
            {t('editor.history')}
          </button>
          <button className="ghost-btn" onClick={onShare}>
            <Link2 size={14} />
            {t('editor.share')}
          </button>
          <button className="ghost-btn" onClick={onExportHtml}>
            <FileOutput size={14} />
            {t('editor.exportHtml')}
          </button>
          <button className="ghost-btn" onClick={onExportPdf}>
            <FileOutput size={14} />
            {t('editor.exportPdf')}
          </button>
        </div>
      </div>

      <div className="editor-body">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(event) => {
            handleUploadImage(event.target.files?.[0] ?? null)
            event.currentTarget.value = ''
          }}
        />
        {editorMode === 'wysiwyg' ? (
          <div className="tiptap-shell">
            <EditorContent editor={editor} />
          </div>
        ) : (
          <CodeMirror
            value={sourceValue}
            height="100%"
            extensions={[markdown()]}
            theme={oneDark}
            onChange={(value) => {
              setSourceValue(value)
              debouncedUpdate(value)
            }}
          />
        )}
      </div>
    </div>
  )
}

export default EditorPane
