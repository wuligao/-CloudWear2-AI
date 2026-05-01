import { AppRouteMenu } from '../types'

export const RootRoute: AppRouteMenu[] = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    name: '首页',
    path: '/home',
    component: 'home/index',
    icon: 'ant-design:home-outlined',
  },
]

export const LoginRoute: AppRouteMenu = {
  name: '登录',
  path: '/login',
  component: 'login/index',
  layout: false,
  hideInMenu: true,
}

export const NotFoundRoute: AppRouteMenu = {
  path: '*',
  component: '404',
  hideInMenu: true,
}

export const AccountRoute: AppRouteMenu = {
  name: '账号管理',
  path: '/account',
  hideInMenu: true,
  children: [
    {
      name: '个人中心',
      path: 'center',
      component: 'account/center/index',
    },
  ],
}

export const StyleProfileRoute: AppRouteMenu = {
  name: '风格档案查询',
  path: '/ai/style-profile',
  component: 'ai/style-profile/index',
  icon: 'ant-design:idcard-outlined',
  hideInMenu: true,
}

export const AiPromptRoute: AppRouteMenu = {
  name: '提示词管理',
  path: '/ai/prompt',
  component: 'ai/prompt/index',
  icon: 'ant-design:form-outlined',
  hideInMenu: true,
}

export const localRoutes: AppRouteMenu[] = [...RootRoute, LoginRoute, AccountRoute, StyleProfileRoute, AiPromptRoute, NotFoundRoute]
