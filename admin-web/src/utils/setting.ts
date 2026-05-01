import type { Settings as LayoutSettings } from '@ant-design/pro-components'
import defaultSettings from '../../config/setting'

const TokenKey = 'Vivy-Theme-Setting'

function normalizeThemeSetting(setting: Partial<LayoutSettings>): Partial<LayoutSettings> {
  return {
    ...setting,
    title: defaultSettings.title,
    logo: defaultSettings.logo,
  }
}

export function getThemeSetting(): Partial<LayoutSettings> {
  const value = localStorage.getItem(TokenKey)
  if (value) {
    const setting = normalizeThemeSetting({
        ...defaultSettings,
        ...JSON.parse(value),
      })
    localStorage.setItem(TokenKey, JSON.stringify(setting))
    return setting
  }

  return defaultSettings as LayoutSettings
}

export function setThemeSetting(setting: Partial<LayoutSettings>) {
  const normalizedSetting = normalizeThemeSetting(setting)
  localStorage.setItem(TokenKey, JSON.stringify(normalizedSetting))
  document.querySelector('body')!.classList.remove('dark', 'light')
  document.querySelector('body')!.classList.add(normalizedSetting.navTheme === 'realDark' ? 'dark' : 'light')
}
