import html2pdf from 'html2pdf.js'

export const downloadHtml = (fileName: string, html: string) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export const downloadPdf = async (fileName: string, html: string) => {
  const container = document.createElement('div')
  container.innerHTML = html
  container.style.padding = '32px'
  container.style.background = '#ffffff'
  container.style.color = '#1b1b1b'
  document.body.appendChild(container)

  await html2pdf()
    .set({
      filename: fileName,
      margin: 10,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(container)
    .save()

  document.body.removeChild(container)
}
