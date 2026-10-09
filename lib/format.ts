// Shared formatting helpers.

export const formatPrice = (n: number): string =>
  '₹' + n.toLocaleString('en-IN')

const DATE_FORMAT = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatDate = (iso: string): string => DATE_FORMAT.format(new Date(iso))

export const formatDateTime = (iso: string): string =>
  DATE_TIME_FORMAT.format(new Date(iso))
