import { CloseOutlined, DownOutlined, PushpinFilled } from '@ant-design/icons'
import { history, useLocation } from '@umijs/max'
import { Dropdown, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { getMenuDisplayName } from '@/router/helper/menu'
import type { AppRouteMenu } from '@/router/types'

type VisitedTab = {
  path: string
  title: string
  affix?: boolean
}

type VisitedTabsProps = {
  children: React.ReactNode
  menus: AppRouteMenu[]
}

const STORAGE_KEY = 'cloudwear-admin-visited-tabs'
const HOME_PATH = '/home'
const HOME_TAB: VisitedTab = { path: HOME_PATH, title: '首页', affix: true }
const MAX_VISITED_TABS = 12

const normalizePath = (path: string) => {
  const value = path || HOME_PATH
  const [pathname, search = ''] = value.split('?')
  const normalizedPath = pathname.replace(/\/+$/, '') || HOME_PATH
  const finalPath = normalizedPath === '/' ? HOME_PATH : normalizedPath
  return search ? `${finalPath}?${search}` : finalPath
}

const getPathname = (path: string) => normalizePath(path).split('?')[0]

const joinPath = (parentPath: string, childPath?: string) => {
  if (!childPath) return parentPath
  if (childPath.startsWith('/')) return childPath
  return `${parentPath.replace(/\/+$/, '')}/${childPath}`.replace(/\/+/g, '/')
}

const buildTitleMap = (menus: AppRouteMenu[]) => {
  const titleMap = new Map<string, string>()

  const collect = (items: AppRouteMenu[], parentPath = '') => {
    items.forEach((item) => {
      const fullPath = normalizePath(joinPath(parentPath, item.path))
      const displayName = getMenuDisplayName(item.name)
      if (typeof displayName === 'string' && displayName.trim()) {
        titleMap.set(getPathname(fullPath), displayName)
      }
      if (item.children?.length) {
        collect(item.children, fullPath)
      }
    })
  }

  collect(menus)
  titleMap.set(HOME_PATH, HOME_TAB.title)
  return titleMap
}

const getDocumentTitle = () => {
  if (typeof document === 'undefined') return ''
  return document.title.replace(/\s-\s云裳 AI 织境中枢$/, '').trim()
}

const readStoredTabs = () => {
  if (typeof window === 'undefined') return [HOME_TAB]
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return [HOME_TAB]
    const parsed = JSON.parse(stored) as VisitedTab[]
    if (!Array.isArray(parsed)) return [HOME_TAB]
    return normalizeTabs(parsed)
  } catch {
    return [HOME_TAB]
  }
}

const normalizeTabs = (tabs: VisitedTab[]) => {
  const tabMap = new Map<string, VisitedTab>()
  tabMap.set(HOME_PATH, HOME_TAB)

  tabs.forEach((tab) => {
    const path = normalizePath(tab.path)
    if (!path || path === '/login') return
    const title = tab.title?.trim() || HOME_TAB.title
    tabMap.set(path, { ...tab, path, title, affix: path === HOME_PATH || tab.affix })
  })

  const normalized = Array.from(tabMap.values())
  const homeIndex = normalized.findIndex((tab) => tab.path === HOME_PATH)
  if (homeIndex > 0) {
    const [home] = normalized.splice(homeIndex, 1)
    normalized.unshift(home)
  }

  return normalized.slice(0, MAX_VISITED_TABS)
}

const resolveTabTitle = (path: string, titleMap: Map<string, string>) => {
  const pathname = getPathname(path)
  return titleMap.get(pathname) || getDocumentTitle() || pathname.split('/').filter(Boolean).pop() || HOME_TAB.title
}

const VisitedTabs: React.FC<VisitedTabsProps> = ({ children, menus }) => {
  const location = useLocation()
  const [tabs, setTabs] = useState<VisitedTab[]>(readStoredTabs)
  const titleMap = useMemo(() => buildTitleMap(menus), [menus])
  const activePath = normalizePath(`${location.pathname}${location.search || ''}`)

  useEffect(() => {
    const path = activePath === '/login' ? HOME_PATH : activePath
    const fallbackTitle = resolveTabTitle(path, titleMap)

    const addOrUpdateTab = (title: string) => {
      setTabs((currentTabs) => {
        const exists = currentTabs.some((tab) => tab.path === path)
        const nextTabs = exists
          ? currentTabs.map((tab) => (tab.path === path ? { ...tab, title } : tab))
          : [...currentTabs, { path, title, affix: path === HOME_PATH }]
        return normalizeTabs(nextTabs)
      })
    }

    addOrUpdateTab(fallbackTitle)

    const timer = window.setTimeout(() => {
      const title = resolveTabTitle(path, titleMap) || fallbackTitle
      addOrUpdateTab(title)
    })

    return () => window.clearTimeout(timer)
  }, [activePath, titleMap])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs))
  }, [tabs])

  const navigateTo = (path: string) => {
    if (path !== activePath) {
      history.push(path)
    }
  }

  const closeTab = (targetPath: string) => {
    const target = tabs.find((tab) => tab.path === targetPath)
    if (!target || target.affix) return

    const targetIndex = tabs.findIndex((tab) => tab.path === targetPath)
    const nextTabs = normalizeTabs(tabs.filter((tab) => tab.path !== targetPath))
    setTabs(nextTabs)

    if (targetPath === activePath) {
      const nextActive = nextTabs[Math.min(targetIndex, nextTabs.length - 1)] || nextTabs[targetIndex - 1] || HOME_TAB
      navigateTo(nextActive.path)
    }
  }

  const closeOthers = (targetPath = activePath) => {
    const target = tabs.find((tab) => tab.path === targetPath)
    const nextTabs = normalizeTabs(tabs.filter((tab) => tab.affix || tab.path === targetPath))
    setTabs(nextTabs)

    if (!nextTabs.some((tab) => tab.path === activePath)) {
      navigateTo(target?.path || HOME_PATH)
    }
  }

  const closeSide = (targetPath: string, side: 'left' | 'right') => {
    const targetIndex = tabs.findIndex((tab) => tab.path === targetPath)
    if (targetIndex < 0) return

    const nextTabs = normalizeTabs(
      tabs.filter((tab, index) => tab.affix || (side === 'left' ? index >= targetIndex : index <= targetIndex)),
    )
    setTabs(nextTabs)

    if (!nextTabs.some((tab) => tab.path === activePath)) {
      navigateTo(targetPath)
    }
  }

  const closeAll = () => {
    setTabs([HOME_TAB])
    navigateTo(HOME_PATH)
  }

  const getOperationItems = (targetPath = activePath): MenuProps['items'] => {
    const target = tabs.find((tab) => tab.path === targetPath)
    const targetIndex = tabs.findIndex((tab) => tab.path === targetPath)
    const hasLeft = tabs.some((tab, index) => index < targetIndex && !tab.affix)
    const hasRight = tabs.some((tab, index) => index > targetIndex && !tab.affix)
    const closableTabs = tabs.filter((tab) => !tab.affix)
    const hasOtherClosable = tabs.some((tab) => !tab.affix && tab.path !== targetPath)

    return [
      {
        key: 'close',
        label: '关闭当前',
        disabled: !target || target.affix,
      },
      {
        key: 'closeOthers',
        label: '关闭其他',
        disabled: !hasOtherClosable,
      },
      {
        key: 'closeLeft',
        label: '关闭左侧',
        disabled: !hasLeft,
      },
      {
        key: 'closeRight',
        label: '关闭右侧',
        disabled: !hasRight,
      },
      {
        type: 'divider',
      },
      {
        key: 'closeAll',
        label: '关闭全部',
        disabled: closableTabs.length === 0,
      },
    ]
  }

  const handleOperation = (targetPath: string): MenuProps['onClick'] => {
    return ({ key }) => {
      if (key === 'close') closeTab(targetPath)
      if (key === 'closeOthers') closeOthers(targetPath)
      if (key === 'closeLeft') closeSide(targetPath, 'left')
      if (key === 'closeRight') closeSide(targetPath, 'right')
      if (key === 'closeAll') closeAll()
    }
  }

  return (
    <>
      <div className="cw-visited-tabs">
        <div className="cw-visited-tabs-scroll">
          {tabs.map((tab) => {
            const isActive = tab.path === activePath
            return (
              <Dropdown
                key={tab.path}
                menu={{ items: getOperationItems(tab.path), onClick: handleOperation(tab.path) }}
                trigger={['contextMenu']}
              >
                <button className={isActive ? 'cw-visited-tab active' : 'cw-visited-tab'} type="button" onClick={() => navigateTo(tab.path)}>
                  <span className="cw-visited-tab-dot" />
                  <span className="cw-visited-tab-title">{tab.title}</span>
                  {tab.affix ? (
                    <Tooltip title="固定页签">
                      <PushpinFilled className="cw-visited-tab-pin" />
                    </Tooltip>
                  ) : (
                    <span
                      className="cw-visited-tab-close"
                      onClick={(event) => {
                        event.stopPropagation()
                        closeTab(tab.path)
                      }}
                    >
                      <CloseOutlined />
                    </span>
                  )}
                </button>
              </Dropdown>
            )
          })}
        </div>
        <Dropdown menu={{ items: getOperationItems(activePath), onClick: handleOperation(activePath) }} placement="bottomRight">
          <button className="cw-visited-tabs-more" type="button">
            <span className="cw-visited-tabs-more-text">页签操作</span>
            <DownOutlined />
          </button>
        </Dropdown>
      </div>
      {children}
    </>
  )
}

export default VisitedTabs
