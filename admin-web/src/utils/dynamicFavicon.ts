const FAVICON_ID = 'cloudwear-dynamic-favicon'
const FAVICON_HREF = '/favicon.svg?v=cloudwear-20260501'

function getFaviconLink() {
  const current = document.querySelector<HTMLLinkElement>(`link#${FAVICON_ID}`)
  if (current) return current

  const legacyIcons = document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
  legacyIcons.forEach((link) => {
    if (link.id !== FAVICON_ID) link.parentNode?.removeChild(link)
  })

  const link = document.createElement('link')
  link.id = FAVICON_ID
  link.rel = 'icon'
  link.type = 'image/svg+xml'
  document.head.appendChild(link)
  return link
}

export function startDynamicFavicon() {
  if (typeof document === 'undefined') return

  const link = getFaviconLink()
  link.href = FAVICON_HREF
}
