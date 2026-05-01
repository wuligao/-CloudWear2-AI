import React from 'react'
import { Icon } from '@umijs/max'
import { AppRouteMenu } from '../types'

const defaultMenuIcon = 'ant-design:appstore-outlined'

export const menuNameAlias: Record<string, string> = {
  AI管理: 'AI模型管理',
  AI配置: 'AI模型管理',
  模型接入: '第三方模型',
  系统监控: '系统监控',
  操作日志: '操作日志',
  登录日志: '登录日志',
  在线用户: '在线用户',
  定时任务: '定时任务',
  缓存列表: '缓存列表',
}

export const getMenuDisplayName = (name?: React.ReactNode) => {
  const menuName = typeof name === 'string' || typeof name === 'number' ? String(name) : ''
  return menuNameAlias[menuName] || menuName
}

const menuIconMap: Record<string, string> = {
  首页: 'ant-design:home-outlined',
  系统管理: 'ant-design:setting-outlined',
  用户管理: 'ant-design:user-outlined',
  角色管理: 'ant-design:team-outlined',
  菜单管理: 'ant-design:menu-outlined',
  部门管理: 'ant-design:apartment-outlined',
  岗位管理: 'ant-design:idcard-outlined',
  字典管理: 'ant-design:book-outlined',
  字典数据: 'ant-design:profile-outlined',
  参数配置: 'ant-design:control-outlined',
  通知公告: 'ant-design:notification-outlined',
  操作日志: 'ant-design:file-search-outlined',
  登录日志: 'ant-design:login-outlined',
  在线用户: 'ant-design:desktop-outlined',
  系统监控: 'ant-design:monitor-outlined',
  定时任务: 'ant-design:schedule-outlined',
  任务日志: 'ant-design:history-outlined',
  缓存列表: 'ant-design:database-outlined',
  系统工具: 'ant-design:tool-outlined',
  代码生成: 'ant-design:code-outlined',
  文件上传: 'ant-design:upload-outlined',
  系统接口: 'ant-design:api-outlined',
  AI模型管理: 'ant-design:robot-outlined',
  AI管理: 'ant-design:robot-outlined',
  AI配置: 'ant-design:robot-outlined',
  模型接入: 'ant-design:cluster-outlined',
  第三方模型: 'ant-design:cluster-outlined',
  H5配置: 'ant-design:mobile-outlined',
  风格档案查询: 'ant-design:idcard-outlined',
  提示词管理: 'ant-design:form-outlined',
  生成记录: 'ant-design:history-outlined',
  H5生成记录: 'ant-design:history-outlined',
}

export const getMenuIconName = (menu: AppRouteMenu) => {
  if (typeof menu.icon === 'string') {
    const icon = menu.icon.trim()
    if (icon) {
      return icon
    }
  }
  return menuIconMap[String(menu.name)] || defaultMenuIcon
}

export const renderMenuIcon = (menu: AppRouteMenu) => {
  if (React.isValidElement(menu.icon)) {
    return React.cloneElement(menu.icon as React.ReactElement<{ className?: string }>, {
      className: 'cw-menu-icon',
    })
  }

  return <Icon className="cw-menu-icon" icon={getMenuIconName(menu) as any} />
}

export const renderMenuTitle = (menu: AppRouteMenu) => {
  const displayName = getMenuDisplayName(menu.name)
  return (
    <span className="cw-menu-title">
      {renderMenuIcon(menu)}
      <span className="cw-menu-text">{displayName}</span>
    </span>
  )
}

/**
 * 构建菜单
 * @param rawMenus 原始菜单
 * @returns 构建后的菜单
 */
export const buildMenus = (rawMenus: AppRouteMenu[]): AppRouteMenu[] => {
  return rawMenus.map((menu) => ({
    ...menu,
    icon: renderMenuIcon(menu),
    name: getMenuDisplayName(menu.name),
    children: menu.children ? buildMenus(menu.children) : undefined,
  }))
}
