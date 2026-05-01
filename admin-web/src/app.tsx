import '@ant-design/v5-patch-for-react-19'
import { BellOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SearchOutlined } from '@ant-design/icons'
import type { Settings as LayoutSettings, ProLayoutProps } from '@ant-design/pro-components'
import { history, Link } from '@umijs/max'
import type { RuntimeConfig, RunTimeLayoutConfig, RequestConfig, RequestOptions } from '@umijs/max'
import { Badge, Tooltip } from 'antd'
import { getUserInfo, getUserRouters } from '@/apis/auth/login'
import { App, Modal, Message } from '@/components/App'
import { PageEnum } from '@/enums/pageEnum'
import { AvatarName, AvatarDropdown } from '@/layouts/default'
import VisitedTabs from '@/layouts/default/visited-tabs/VisitedTabs'
import { getToken, removeToken } from '@/utils/auth'
import { startDynamicFavicon } from '@/utils/dynamicFavicon'
import { getThemeSetting } from '@/utils/setting'
import defaultSettings from '../config/setting'
import { buildMenus, renderMenuTitle } from './router/helper/menu'
import { buildRoutes } from './router/helper/route'
import { RootRoute } from './router/routes'

/**
 * @name InitialState 全局初始化数据配置用于 Layout 用户信息和权限初始化
 * @doc https://umijs.org/docs/api/runtime-config#getinitialstate
 */
interface InitialState {
  settings?: Partial<LayoutSettings & { token: ProLayoutProps['token'] }>
  token?: string
  roles?: string[]
  permissions?: string[]
  userInfo?: UserInfo
  isDarkMode?: boolean
  fetchUserInfo?: () => Promise<
    | {
        roles?: string[]
        permissions?: string[]
        userInfo?: UserInfo
      }
    | undefined
  >
}
export async function getInitialState(): Promise<InitialState> {
  const token = getToken()
  const location = history.location
  const defaultSettings = getThemeSetting()
  const fetchUserInfo = async () => {
    try {
      const { roles, permissions, sysUser } = await getUserInfo()
      return {
        roles,
        permissions,
        userInfo: sysUser,
      }
    } catch (error) {
      removeToken()
      history.push(PageEnum.BASE_LOGIN)
      throw error
    }
  }
  if (token && location.pathname !== PageEnum.BASE_LOGIN) {
    const userInfo = await fetchUserInfo()
    return {
      fetchUserInfo,
      ...userInfo,
      settings: defaultSettings as Partial<LayoutSettings>,
      isDarkMode: defaultSettings?.navTheme === 'realDark',
    }
  } else {
    if (location.pathname !== PageEnum.BASE_LOGIN) {
      removeToken()
      history.push(PageEnum.BASE_LOGIN)
    }
  }

  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  }
}

/**
 * @name ProLayout 运行时布局配置
 * @doc https://procomponents.ant.design/components/layout#prolayout
 */
export const layout: RunTimeLayoutConfig = ({ initialState, setInitialState }) => {
  const user = initialState?.userInfo
  const keepSelectedSubMenuOpen = (event: any) => {
    const submenuTitle = event.target?.closest?.('.ant-menu-submenu-title')
    const submenu = submenuTitle?.closest?.('.ant-menu-submenu')
    if (submenu?.classList?.contains('ant-menu-submenu-open') && submenu.classList.contains('ant-menu-submenu-selected')) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
  const renderBrand = (logo: React.ReactNode, title?: React.ReactNode) => (
    <span className="cw-header-brand">
      <span className="cw-header-brand-icon">{logo}</span>
      <span className="cw-header-brand-title">{typeof title === 'string' ? title : defaultSettings.title}</span>
    </span>
  )

  return {
    avatarProps: {
      src: user?.avatar,
      title: <AvatarName name={user?.nickName || ''} />,
      render: (_, children) => {
        return <AvatarDropdown>{children}</AvatarDropdown>
      },
    },
    bgLayoutImgList: [
      {
        src: '/bg/1.png',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: '/bg/2.png',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: '/bg/3.png',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    postMenuData(menuData) {
      return buildMenus(menuData!)
    },
    subMenuItemRender: (menuItemProps) => {
      return renderMenuTitle(menuItemProps as any)
    },
    menuProps: {
      onClickCapture: keepSelectedSubMenuOpen,
    },
    menuItemRender: (menuItemProps) => {
      const title = renderMenuTitle(menuItemProps as any)
      if (menuItemProps.isUrl || menuItemProps.children) {
        return title
      }

      const itemPath = (menuItemProps as any).itemPath || menuItemProps.path
      if (itemPath && history.location.pathname !== itemPath) {
        return (
          <Link to={String(itemPath).replace('/*', '')} target={menuItemProps.target}>
            {title}
          </Link>
        )
      }

      return title
    },
    collapsedButtonRender: false,
    headerContentRender: (props: any) => {
      const collapsed = props?.collapsed
      return (
        <div className="cw-header-left-tools">
          <Tooltip title={collapsed ? '展开侧栏' : '收起侧栏'}>
            <span
              className="cw-header-collapse-action"
              onClick={() => {
                props?.onCollapse?.(!collapsed)
              }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
          </Tooltip>
        </div>
      )
    },
    actionsRender: () => {
      return [
        <div key="search" className="cw-header-search">
          <SearchOutlined />
          <span>搜索功能、数据、内容...</span>
        </div>,
        <Tooltip key="notice" title="通知中心">
          <Badge count={12} size="small" offset={[1, -1]}>
            <span className="cw-header-bell">
              <BellOutlined />
            </span>
          </Badge>
        </Tooltip>,
      ]
    },
    childrenRender: (children) => {
      return (
        <App>
          <VisitedTabs menus={[...RootRoute, ...dynamicRoutes]}>{children}</VisitedTabs>
        </App>
      )
    },
    ...initialState?.settings,
    headerTitleRender: (logo, title) => renderBrand(logo, title),
    menuHeaderRender: (logo, title, props) => {
      if (props) {
        return null
      }
      return renderBrand(logo, title)
    },
    menu: {
      ...(initialState?.settings as any)?.menu,
      defaultOpenAll: false,
      ignoreFlatMenu: true,
    },
    title: defaultSettings.title,
    logo: defaultSettings.logo,
  }
}

/**
 * @name Request 运行时请求配置
 * @doc https://umijs.org/docs/max/request
 */
const status = { isOpen: true }
export const request: RequestConfig = {
  timeout: 1000 * 60,
  requestInterceptors: [
    [
      (config: any) => {
        const token = getToken()
        const isToken = config.isToken === false
        if (token && !isToken) {
          config.headers.Authorization = 'Bearer ' + token
        }
        config.url = `${BASE_URL}${config.url}`
        return config
      },
      (error: any) => {
        return Promise.reject(error)
      },
    ],
  ],
  responseInterceptors: [
    [
      (response: any) => {
        const code = response.data.code || 200
        const message = response.data.message || '系统未知错误，请反馈给管理员'
        const config = response.config as RequestOptions

        // 跳过错误
        if (config.skipErrorHandler) {
          if (code !== 200) {
            return Promise.reject(new Error(message))
          }
        }
        // 权限判断
        else if (code === 401) {
          if (status.isOpen) {
            status.isOpen = false
            Modal.confirm({
              title: '系统提示',
              content: '登录状态已过期，您可以继续留在该页面，或者重新登录',
              cancelText: '取消',
              okText: '重新登录',
              onOk() {
                status.isOpen = true
                removeToken()
                history.push(PageEnum.BASE_LOGIN)
              },
              onCancel() {
                status.isOpen = true
              },
            })
          }
          return Promise.reject(new Error(message))
        }
        // 错误判断
        else if (code !== 200) {
          Message.error(message)
          return Promise.reject(new Error(message))
        }

        return config.getResponse || config.getAjaxResponse ? response : response.data
      },
      (error: any) => {
        const config = error.config as RequestOptions
        if (config.skipErrorHandler) {
          return Promise.reject(error)
        }

        Message.error('系统未知错误，请反馈给管理员')
        return Promise.reject(error)
      },
    ],
  ],
}

let dynamicRoutes: any[] = []
/**
 * @name patchClientRoutes 修改路由表
 * @doc https://umijs.org/docs/api/runtime-config#patchclientroutes-routes-
 */
export const patchClientRoutes: RuntimeConfig['patchClientRoutes'] = async ({ routes }) => {
  buildRoutes(routes, dynamicRoutes)
}

/**
 * @name render 覆写渲染函数
 * @doc https://umijs.org/docs/api/runtime-config#renderoldrender-function
 */
export const render: RuntimeConfig['render'] = (oldRender) => {
  startDynamicFavicon()
  const token = getToken()
  if (token) {
    getUserRouters()
      .then((data) => {
        dynamicRoutes = data
      })
      .catch(() => {
        removeToken()
        history.push(PageEnum.BASE_LOGIN)
      })
      .finally(() => {
        oldRender()
      })
  } else {
    dynamicRoutes = []
    oldRender()
  }
}
