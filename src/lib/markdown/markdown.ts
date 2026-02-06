import MarkdownIt from 'markdown-it'
// @ts-ignore - turndown types not available
import TurndownService from 'turndown'

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

const turndown = new TurndownService({
  codeBlockStyle: 'fenced',
  headingStyle: 'atx',
  emDelimiter: '*',
})

turndown.addRule('preserveLineBreaks', {
  filter: 'br',
  replacement: () => '\n',
})

export const mdToHtml = (content: string) => markdown.render(content)

export const htmlToMd = (content: string) => turndown.turndown(content)

export const stripMarkdown = (content: string) =>
  content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*?\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]*?\]\([^)]+\)/g, ' ')
    .replace(/[#>*_~`-]/g, ' ')
