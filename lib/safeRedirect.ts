// Only allow same-site relative paths after sign-in. Anything else (absolute
// URLs, protocol-relative "//host", backslash tricks) falls back to `fallback`.
export function safeRedirect(value: string | null | undefined, fallback = '/account'): string {
  if (!value) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.includes('\\')) return fallback
  return value
}
