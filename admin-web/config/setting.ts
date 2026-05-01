import { ProLayoutProps } from '@ant-design/pro-components'

/**
 * @name ProLayout 默认设置
 * @doc https://procomponents.ant.design/components/layout#api
 */
const Setting: ProLayoutProps = {
  title: '云裳 AI 织境中枢',
  logo: '/logo.svg',
  layout: 'mix',
  navTheme: 'light',
  siderWidth: 260,
  contentWidth: 'Fluid',
  fixedHeader: false,
  fixSiderbar: true,
  colorWeak: false,
  menu: {
    defaultOpenAll: false,
    ignoreFlatMenu: true,
  },
  token: {
    // https://procomponents.ant.design/components/layout#%E9%80%9A%E8%BF%87-token-%E4%BF%AE%E6%94%B9%E6%A0%B7%E5%BC%8F
    header: {
      colorBgHeader: 'rgba(255, 255, 255, 0.9)',
      colorHeaderTitle: '#162033',
      colorTextMenu: '#536176',
      colorTextMenuSelected: '#2e5bff',
      colorBgMenuItemSelected: 'rgba(46, 91, 255, 0.09)',
    },
    sider: {
      colorMenuBackground: '#f7f9fd',
      colorTextMenu: '#4b5870',
      colorTextMenuSelected: '#2e5bff',
      colorTextMenuActive: '#172033',
      colorBgMenuItemHover: 'rgba(37, 49, 73, 0.05)',
      colorBgMenuItemSelected: 'rgba(46, 91, 255, 0.1)',
      colorBgCollapsedButton: '#ffffff',
      colorTextCollapsedButton: '#2e5bff',
      colorTextCollapsedButtonHover: '#ffffff',
    },
  },
}

export default Setting
