import { formatDistanceToNow, format } from 'date-fns'

export const formatRelative = (date: string) =>
  formatDistanceToNow(new Date(date), { addSuffix: true })

export const formatDate = (date: string) => format(new Date(date), 'yyyy-MM-dd HH:mm')
