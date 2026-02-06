import { formatRelative } from '../lib/utils/format'

type PreviewPaneProps = {
  open: boolean
  html: string
  title: string
  updatedAt?: string
}

const PreviewPane = ({ open, html, title, updatedAt }: PreviewPaneProps) => {
  return (
    <aside className={`preview-pane ${open ? '' : 'collapsed'}`}>
      <div className="preview-header">
        <div>
          <div className="preview-title">{title}</div>
          {updatedAt ? <div className="muted">{formatRelative(updatedAt)}</div> : null}
        </div>
      </div>
      <div className="preview-body" dangerouslySetInnerHTML={{ __html: html }} />
    </aside>
  )
}

export default PreviewPane
