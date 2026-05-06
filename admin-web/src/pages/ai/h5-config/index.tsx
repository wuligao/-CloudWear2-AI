import {
  AppstoreOutlined,
  BgColorsOutlined,
  CloudOutlined,
  DeleteOutlined,
  FireOutlined,
  FormatPainterOutlined,
  GlobalOutlined,
  LoginOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'
import { Button, Card, Col, Empty, Form, Input, InputNumber, Row, Select, Space, Spin, Switch, Tag, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import {
  infoH5ModelConfig,
  listAiModelProviders,
  refreshH5HomeContent,
  refreshH5LoginContent,
  updateH5ModelConfig,
} from '@/apis/ai-model'
import type {
  AiAppModelConfig,
  AiModelProvider,
  H5ChatAssistantConfig,
  H5HomeDailyRefreshConfig,
  H5HomeHeroConfig,
  H5LoginConfig,
  H5LoginDailyRefreshConfig,
  H5LoginHeroImageConfig,
  H5LoginPoemConfig,
  H5OutfitOptionConfig,
  H5OutfitOptionItem,
} from '@/apis/ai-model'
import './index.less'

const normalStatus = '0'
const disabledStatus = '1'

type OptionEditorType = 'label' | 'label-value' | 'image' | 'icon' | 'color' | 'model'
type OptionGroupKey = Exclude<
  keyof H5OutfitOptionConfig,
  | 'dailyFreeGenerationLimit'
  | 'tomorrowRecommendationStartHour'
  | 'homeCategories'
  | 'inspirationKeywords'
  | 'login'
  | 'homeHero'
  | 'homeDailyRefresh'
  | 'loginDailyRefresh'
  | 'chatAssistant'
>
type ConfigSectionKey = 'home' | 'chat' | 'login' | OptionGroupKey

const optionGroups: Array<{
  accent: string
  icon: ReactNode
  key: OptionGroupKey
  title: string
  type: OptionEditorType
}> = [
  { key: 'homeLooks', title: '首页图片', type: 'image', icon: <PictureOutlined />, accent: 'cyan' },
  { key: 'seasons', title: '季节', type: 'label', icon: <CloudOutlined />, accent: 'blue' },
  { key: 'weathers', title: '天气', type: 'label', icon: <CloudOutlined />, accent: 'blue' },
  { key: 'temperatures', title: '温度', type: 'label-value', icon: <ThunderboltOutlined />, accent: 'orange' },
  { key: 'locations', title: '地点', type: 'label', icon: <GlobalOutlined />, accent: 'teal' },
  { key: 'styles', title: '风格图片', type: 'image', icon: <PictureOutlined />, accent: 'violet' },
  { key: 'scenes', title: '场景图标', type: 'icon', icon: <AppstoreOutlined />, accent: 'indigo' },
  { key: 'colors', title: '颜色', type: 'color', icon: <BgColorsOutlined />, accent: 'rose' },
  { key: 'items', title: '单品', type: 'label', icon: <FormatPainterOutlined />, accent: 'slate' },
  { key: 'imageModels', title: 'H5生图模型', type: 'model', icon: <ThunderboltOutlined />, accent: 'cyan' },
  { key: 'generationCounts', title: '生成张数', type: 'label-value', icon: <ThunderboltOutlined />, accent: 'orange' },
]

const sectionNav: Array<{
  icon: ReactNode
  key: ConfigSectionKey
  title: string
  accent: string
}> = [
  { key: 'home', title: '首页图文', icon: <FireOutlined />, accent: 'orange' },
  { key: 'chat', title: 'AI顾问', icon: <ThunderboltOutlined />, accent: 'cyan' },
  { key: 'login', title: '登录页', icon: <LoginOutlined />, accent: 'violet' },
  ...optionGroups.map(({ key, title, icon, accent }) => ({ key, title, icon, accent })),
]

const defaultLoginConfig: H5LoginConfig = {
  heroImage: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=84',
  heroAlt: '浅色衣架上的外套与包袋',
  heroImages: [
    {
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=84',
      alt: '浅色衣架上的外套与包袋',
    },
    {
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=84',
      alt: '时装秀场上的摩登穿搭',
    },
    {
      image: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=84',
      alt: '城市街头的轻熟穿搭',
    },
  ],
  brandTitle: '云裳 AI 穿搭',
  subtitle: 'AI 智能搭配 · 发现更美的你',
  poems: [
    {
      kicker: '东方衣境',
      line1: '云想衣裳花想容',
      line2: '春风拂槛露华浓',
      footer: '登录后同步衣橱偏好与历史方案',
    },
    {
      kicker: '今日灵感',
      line1: '衣随心动，风格自成',
      line2: '让每一次出门都有答案',
      footer: '登录后为你保留专属穿搭记忆',
    },
    {
      kicker: 'AI 衣橱',
      line1: '看见自己，也看见风格',
      line2: '从一张照片开始变美',
      footer: '登录后解锁照片换搭与每日推荐',
    },
  ],
  phonePasswordEnabled: true,
  registerEnabled: true,
  wechatEnabled: true,
  guestEnabled: true,
}

const defaultHomeHeroConfig: H5HomeHeroConfig = {
  kicker: 'AI STYLING STUDIO',
  titleLine1: '今日穿搭',
  titleLine2: '交给云裳 AI',
  subtitle: '从关键词到本人照片，快速生成更适合场景、天气和个人风格的完整穿搭。',
  primaryAction: '上传照片',
  secondaryAction: '写关键词',
  lensText: '智能搭配中',
  backgroundImage: '',
  backgroundAlt: 'AI 穿搭首页背景图',
}

const defaultHomeDailyRefreshConfig: H5HomeDailyRefreshConfig = {
  enabled: false,
  refreshHour: 6,
}

const defaultLoginDailyRefreshConfig: H5LoginDailyRefreshConfig = {
  enabled: false,
  refreshHour: 6,
}

const defaultChatAssistantConfig: H5ChatAssistantConfig = {
  enabled: true,
  welcomeMessage: '我是你的 AI 穿搭顾问，可以结合风格档案、天气和历史生成记录，帮你把想法整理成可生成的穿搭方案。',
  quickPrompts: ['明天通勤怎么穿', '按我的档案推荐', '换一套更显高的'],
  useStyleProfile: true,
  useRecentRecords: true,
  dailyLimit: 30,
  maxHistoryMessages: 8,
}

const emptyOptions: H5OutfitOptionConfig = {
  dailyFreeGenerationLimit: 3,
  tomorrowRecommendationStartHour: 20,
  login: defaultLoginConfig,
  homeHero: defaultHomeHeroConfig,
  homeDailyRefresh: defaultHomeDailyRefreshConfig,
  loginDailyRefresh: defaultLoginDailyRefreshConfig,
  chatAssistant: defaultChatAssistantConfig,
  inspirationKeywords: [],
  homeCategories: [],
  homeLooks: [],
  seasons: [],
  weathers: [],
  temperatures: [],
  locations: [],
  styles: [],
  scenes: [],
  colors: [],
  items: [],
  imageModels: [],
  generationCounts: [],
}

const toProviderOptions = (providers: AiModelProvider[], types: string[]) =>
  providers.flatMap((provider) =>
    (provider.models || [])
      .filter((model) => model.status === normalStatus && types.includes(model.modelType))
      .map((model) => ({
        label: `${provider.providerName} / ${model.modelName}`,
        value: model.modelPk,
      })),
  )

const toModelIdOptions = (providers: AiModelProvider[], types: string[]) =>
  providers.flatMap((provider) =>
    (provider.models || [])
      .filter((model) => model.status === normalStatus && types.includes(model.modelType))
      .map((model) => ({
        label: `${provider.providerName} / ${model.modelName}`,
        value: model.modelId,
      })),
  )

const parseLines = (value: string) =>
  value
    .split(/\n|,|，/)
    .map((item) => item.trim())
    .filter(Boolean)

const stringifyLines = (value: string[]) => value.join('\n')

const readTextSetting = (value: unknown, fallback: string) =>
  value === undefined ? fallback : String(value || '').trim() || fallback

const readBooleanSetting = (value: unknown, fallback: boolean) =>
  value === undefined ? fallback : Boolean(value)

const readLinesSetting = (value: unknown, fallback: string[]) =>
  value === undefined ? fallback : parseLines(String(value || ''))

const stringifyLoginHeroImages = (value: H5LoginHeroImageConfig[]) =>
  value.map((item) => `${item.image || ''}｜${item.alt || ''}`).join('\n')

const parseLoginHeroImages = (value: unknown, fallback: H5LoginHeroImageConfig[]) => {
  const text = String(value || '').trim()
  if (!text) return fallback

  const items = text
    .split('\n')
    .map((line) => {
      const [image, alt] = line.split('｜').map((item) => item.trim())
      if (!image) return null
      return { image, alt: alt || fallback[0]?.alt || defaultLoginConfig.heroAlt }
    })
    .filter((item): item is H5LoginHeroImageConfig => Boolean(item))

  return items.length ? items.slice(0, 12) : fallback
}

const stringifyLoginPoems = (value: H5LoginPoemConfig[]) =>
  value.map((item) => `${item.kicker || ''}｜${item.line1 || ''}｜${item.line2 || ''}｜${item.footer || ''}`).join('\n')

const parseLoginPoems = (value: unknown, fallback: H5LoginPoemConfig[]) => {
  const text = String(value || '').trim()
  if (!text) return fallback
  const fallbackPoem = fallback[0] || defaultLoginConfig.poems[0]

  const items = text
    .split('\n')
    .map((line) => {
      const [kicker, line1, line2, footer] = line.split('｜').map((item) => item.trim())
      if (!kicker && !line1 && !line2 && !footer) return null
      return {
        kicker: kicker || fallbackPoem.kicker,
        line1: line1 || fallbackPoem.line1,
        line2: line2 || '',
        footer: footer || fallbackPoem.footer,
      }
    })
    .filter((item): item is H5LoginPoemConfig => Boolean(item))

  return items.length ? items.slice(0, 12) : fallback
}

const createOption = (type: OptionEditorType): H5OutfitOptionItem => {
  if (type === 'color') return { label: '新颜色', value: '#4f6bff' }
  if (type === 'icon') return { label: '新场景', icon: 'sparkles' }
  if (type === 'image') return { label: '新图片', image: '' }
  if (type === 'model') return { label: '新模型', value: '' }
  if (type === 'label-value') return { label: '新选项', value: '' }
  return { label: '新选项' }
}

const isOptionGroupKey = (key: ConfigSectionKey): key is OptionGroupKey => key !== 'home' && key !== 'login'

const H5ConfigPage = () => {
  const [form] = Form.useForm()
  const [providers, setProviders] = useState<AiModelProvider[]>([])
  const [config, setConfig] = useState<AiAppModelConfig>()
  const [options, setOptions] = useState<H5OutfitOptionConfig>(emptyOptions)
  const [activeSection, setActiveSection] = useState<ConfigSectionKey>('home')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshingHome, setRefreshingHome] = useState(false)
  const [refreshingLogin, setRefreshingLogin] = useState(false)

  const textModelOptions = useMemo(() => toProviderOptions(providers, ['text', 'multimodal']), [providers])
  const imageModelOptions = useMemo(() => toProviderOptions(providers, ['image', 'multimodal']), [providers])
  const h5ImageModelOptions = useMemo(() => toModelIdOptions(providers, ['image', 'multimodal']), [providers])
  const activeGroup = optionGroups.find((group) => group.key === activeSection)
  const totalOptionCount = optionGroups.reduce((total, group) => total + ((options[group.key] as H5OutfitOptionItem[]) || []).length, 0)

  const loadData = async () => {
    setLoading(true)
    try {
      const [providerList, h5Config] = await Promise.all([listAiModelProviders(), infoH5ModelConfig()])
      setProviders(providerList)
      setConfig(h5Config)
      const nextOptions = {
        ...emptyOptions,
        ...h5Config.options,
        login: {
          ...defaultLoginConfig,
          ...(h5Config.options?.login || {}),
        },
        homeHero: {
          ...defaultHomeHeroConfig,
          ...(h5Config.options?.homeHero || {}),
        },
        homeDailyRefresh: {
          ...defaultHomeDailyRefreshConfig,
          ...(h5Config.options?.homeDailyRefresh || {}),
        },
        loginDailyRefresh: {
          ...defaultLoginDailyRefreshConfig,
          ...(h5Config.options?.loginDailyRefresh || {}),
        },
        chatAssistant: {
          ...defaultChatAssistantConfig,
          ...(h5Config.options?.chatAssistant || {}),
        },
      }
      setOptions(nextOptions)
      form.setFieldsValue({
        textModelPk: h5Config.textModelPk,
        keywordImageModelPk: h5Config.keywordImageModelPk,
        photoImageModelPk: h5Config.photoImageModelPk,
        status: h5Config.status === normalStatus,
        dailyFreeGenerationLimit: h5Config.options?.dailyFreeGenerationLimit ?? 3,
        tomorrowRecommendationStartHour: h5Config.options?.tomorrowRecommendationStartHour ?? 20,
        inspirationKeywords: stringifyLines(h5Config.options?.inspirationKeywords || []),
        homeCategories: stringifyLines(h5Config.options?.homeCategories || []),
        homeHeroKicker: nextOptions.homeHero.kicker,
        homeHeroTitleLine1: nextOptions.homeHero.titleLine1,
        homeHeroTitleLine2: nextOptions.homeHero.titleLine2,
        homeHeroSubtitle: nextOptions.homeHero.subtitle,
        homeHeroPrimaryAction: nextOptions.homeHero.primaryAction,
        homeHeroSecondaryAction: nextOptions.homeHero.secondaryAction,
        homeHeroLensText: nextOptions.homeHero.lensText,
        homeHeroBackgroundImage: nextOptions.homeHero.backgroundImage,
        homeHeroBackgroundAlt: nextOptions.homeHero.backgroundAlt,
        homeDailyRefreshEnabled: nextOptions.homeDailyRefresh.enabled,
        homeDailyRefreshHour: nextOptions.homeDailyRefresh.refreshHour,
        loginDailyRefreshEnabled: nextOptions.loginDailyRefresh.enabled,
        loginDailyRefreshHour: nextOptions.loginDailyRefresh.refreshHour,
        chatAssistantEnabled: nextOptions.chatAssistant.enabled,
        chatAssistantWelcomeMessage: nextOptions.chatAssistant.welcomeMessage,
        chatAssistantQuickPrompts: stringifyLines(nextOptions.chatAssistant.quickPrompts || []),
        chatAssistantUseStyleProfile: nextOptions.chatAssistant.useStyleProfile,
        chatAssistantUseRecentRecords: nextOptions.chatAssistant.useRecentRecords,
        chatAssistantDailyLimit: nextOptions.chatAssistant.dailyLimit,
        chatAssistantMaxHistoryMessages: nextOptions.chatAssistant.maxHistoryMessages,
        loginHeroImage: nextOptions.login.heroImage,
        loginHeroAlt: nextOptions.login.heroAlt,
        loginHeroImages: stringifyLoginHeroImages(nextOptions.login.heroImages || []),
        loginBrandTitle: nextOptions.login.brandTitle,
        loginSubtitle: nextOptions.login.subtitle,
        loginPoems: stringifyLoginPoems(nextOptions.login.poems || []),
        loginPhonePasswordEnabled: nextOptions.login.phonePasswordEnabled,
        loginRegisterEnabled: nextOptions.login.registerEnabled,
        loginWechatEnabled: nextOptions.login.wechatEnabled,
        loginGuestEnabled: nextOptions.login.guestEnabled,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateGroup = (key: keyof H5OutfitOptionConfig, next: H5OutfitOptionItem[]) => {
    setOptions((current) => ({ ...current, [key]: next }))
  }

  const handleSave = async () => {
    await form.validateFields()
    const values = form.getFieldsValue(true)
    setSaving(true)
    try {
      const currentLogin = {
        ...defaultLoginConfig,
        ...(options.login || {}),
      }
      const currentHomeHero = {
        ...defaultHomeHeroConfig,
        ...(options.homeHero || {}),
      }
      const currentHomeDailyRefresh = {
        ...defaultHomeDailyRefreshConfig,
        ...(options.homeDailyRefresh || {}),
      }
      const currentLoginDailyRefresh = {
        ...defaultLoginDailyRefreshConfig,
        ...(options.loginDailyRefresh || {}),
      }
      const currentChatAssistant = {
        ...defaultChatAssistantConfig,
        ...(options.chatAssistant || {}),
      }
      const nextOptions = {
        ...options,
        dailyFreeGenerationLimit: Number(values.dailyFreeGenerationLimit ?? options.dailyFreeGenerationLimit ?? 3),
        tomorrowRecommendationStartHour: Number(
          values.tomorrowRecommendationStartHour ?? options.tomorrowRecommendationStartHour ?? 20,
        ),
        inspirationKeywords: readLinesSetting(values.inspirationKeywords, options.inspirationKeywords || []),
        homeCategories: readLinesSetting(values.homeCategories, options.homeCategories || []),
        homeHero: {
          ...currentHomeHero,
          kicker: readTextSetting(values.homeHeroKicker, currentHomeHero.kicker),
          titleLine1: readTextSetting(values.homeHeroTitleLine1, currentHomeHero.titleLine1),
          titleLine2: readTextSetting(values.homeHeroTitleLine2, currentHomeHero.titleLine2),
          subtitle: readTextSetting(values.homeHeroSubtitle, currentHomeHero.subtitle),
          primaryAction: readTextSetting(values.homeHeroPrimaryAction, currentHomeHero.primaryAction),
          secondaryAction: readTextSetting(values.homeHeroSecondaryAction, currentHomeHero.secondaryAction),
          lensText: readTextSetting(values.homeHeroLensText, currentHomeHero.lensText),
          backgroundImage: readTextSetting(values.homeHeroBackgroundImage, currentHomeHero.backgroundImage),
          backgroundAlt: readTextSetting(values.homeHeroBackgroundAlt, currentHomeHero.backgroundAlt),
        },
        homeDailyRefresh: {
          ...currentHomeDailyRefresh,
          enabled: readBooleanSetting(values.homeDailyRefreshEnabled, currentHomeDailyRefresh.enabled),
          refreshHour: Number(values.homeDailyRefreshHour ?? currentHomeDailyRefresh.refreshHour ?? 6),
        },
        loginDailyRefresh: {
          ...currentLoginDailyRefresh,
          enabled: readBooleanSetting(values.loginDailyRefreshEnabled, currentLoginDailyRefresh.enabled),
          refreshHour: Number(values.loginDailyRefreshHour ?? currentLoginDailyRefresh.refreshHour ?? 6),
        },
        chatAssistant: {
          ...currentChatAssistant,
          enabled: readBooleanSetting(values.chatAssistantEnabled, currentChatAssistant.enabled),
          welcomeMessage: readTextSetting(values.chatAssistantWelcomeMessage, currentChatAssistant.welcomeMessage),
          quickPrompts: readLinesSetting(values.chatAssistantQuickPrompts, currentChatAssistant.quickPrompts || []),
          useStyleProfile: readBooleanSetting(
            values.chatAssistantUseStyleProfile,
            currentChatAssistant.useStyleProfile,
          ),
          useRecentRecords: readBooleanSetting(
            values.chatAssistantUseRecentRecords,
            currentChatAssistant.useRecentRecords,
          ),
          dailyLimit: Number(values.chatAssistantDailyLimit ?? currentChatAssistant.dailyLimit ?? 30),
          maxHistoryMessages: Number(values.chatAssistantMaxHistoryMessages ?? currentChatAssistant.maxHistoryMessages ?? 8),
        },
        login: {
          ...currentLogin,
          heroImage: readTextSetting(values.loginHeroImage, currentLogin.heroImage),
          heroAlt: readTextSetting(values.loginHeroAlt, currentLogin.heroAlt),
          heroImages: parseLoginHeroImages(values.loginHeroImages, currentLogin.heroImages || []),
          brandTitle: readTextSetting(values.loginBrandTitle, currentLogin.brandTitle),
          subtitle: readTextSetting(values.loginSubtitle, currentLogin.subtitle),
          poems: parseLoginPoems(values.loginPoems, currentLogin.poems || []),
          phonePasswordEnabled: readBooleanSetting(
            values.loginPhonePasswordEnabled,
            currentLogin.phonePasswordEnabled,
          ),
          registerEnabled: readBooleanSetting(values.loginRegisterEnabled, currentLogin.registerEnabled),
          wechatEnabled: readBooleanSetting(values.loginWechatEnabled, currentLogin.wechatEnabled),
          guestEnabled: readBooleanSetting(values.loginGuestEnabled, currentLogin.guestEnabled),
        },
      }
      await updateH5ModelConfig({
        textModelPk: values.textModelPk,
        keywordImageModelPk: values.keywordImageModelPk,
        photoImageModelPk: values.photoImageModelPk,
        status: values.status ? normalStatus : disabledStatus,
        options: nextOptions,
      })
      message.success('H5配置已保存')
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const handleRefreshHomeContent = async () => {
    setRefreshingHome(true)
    try {
      const refreshedConfig = await refreshH5HomeContent()
      const runningMessage = refreshedConfig?.options?.homeDailyRefresh?.runningMessage
      if (refreshedConfig?.options?.homeDailyRefresh?.isRefreshing) {
        message.warning(runningMessage || '首页图文与图片正在生成，请稍后刷新查看')
        return
      }
      message.success('首页图文与图片已重新生成')
      if (refreshedConfig) {
        await loadData()
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '首页图文与图片生成失败')
    } finally {
      setRefreshingHome(false)
    }
  }

  const handleRefreshLoginContent = async () => {
    setRefreshingLogin(true)
    try {
      const refreshedConfig = await refreshH5LoginContent()
      const runningMessage = refreshedConfig?.options?.loginDailyRefresh?.runningMessage
      if (refreshedConfig?.options?.loginDailyRefresh?.isRefreshing) {
        message.warning(runningMessage || '登录页图文正在生成，请稍后刷新查看')
        return
      }
      message.success('登录页封面图与底部文案已重新生成')
      if (refreshedConfig) {
        await loadData()
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录页图文生成失败')
    } finally {
      setRefreshingLogin(false)
    }
  }

  if (loading) {
    return (
      <div className="h5-config-page loading-state">
        <div className="h5-config-loader">
          <i />
          <span>同步 H5 配置</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h5-config-page">
      <div className="h5-console-hero">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="pulse-dot" />
            CloudWear AI Console
          </div>
          <Typography.Title level={2}>H5 配置中心</Typography.Title>
          <Typography.Paragraph>统一维护 H5 端模型、标签、图片、颜色与场景配置。</Typography.Paragraph>
          <div className="hero-metrics">
            <span>{providers.length} 个厂商</span>
            <span>{totalOptionCount} 个选项</span>
            <span>{h5ImageModelOptions.length} 个图片模型</span>
          </div>
        </div>
        <AnimatedOrbit />
        <div className="hero-actions">
          <Tag className={config?.status === normalStatus ? 'status-tag active' : 'status-tag'}>
            {config?.status === normalStatus ? '运行中' : '停用'}
          </Tag>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
          <Button className="save-button" type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            保存更改
          </Button>
        </div>
      </div>

      <Form form={form} layout="vertical" initialValues={{ status: true }}>
        <Card className="console-card model-card">
          <div className="section-title">
            <span><CloudOutlined /></span>
            <div>
              <strong>模型路由</strong>
              <small>文本、关键词生图、照片生图分别独立配置。</small>
            </div>
          </div>
          <Row gutter={[12, 12]} align="bottom">
            <Col xs={24} lg={7}>
              <Form.Item name="textModelPk" label="文本方案模型" rules={[{ required: true, message: '请选择文本方案模型' }]}>
                <Select showSearch optionFilterProp="label" options={textModelOptions} placeholder="选择文本或多模态模型" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={7}>
              <Form.Item name="keywordImageModelPk" label="关键词默认生图模型" rules={[{ required: true, message: '请选择关键词默认生图模型' }]}>
                <Select showSearch optionFilterProp="label" options={imageModelOptions} placeholder="未指定时使用的默认模型" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={7}>
              <Form.Item name="photoImageModelPk" label="照片默认生图模型" rules={[{ required: true, message: '请选择照片默认生图模型' }]}>
                <Select showSearch optionFilterProp="label" options={imageModelOptions} placeholder="未指定时使用的默认模型" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={3}>
              <Form.Item name="status" label="配置状态" valuePropName="checked">
                <Switch checkedChildren="启用" unCheckedChildren="停用" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card className="console-card quota-card">
          <div className="section-title">
            <span><ThunderboltOutlined /></span>
            <div>
              <strong>免费生成额度</strong>
              <small>控制 H5 登录用户每天可以免费生成的图片张数，服务端会按用户账号自动校验。</small>
            </div>
          </div>
          <Row gutter={[12, 12]} align="bottom">
            <Col xs={24} md={10} lg={8}>
              <Form.Item
                name="dailyFreeGenerationLimit"
                label="每日免费生成图片数"
                rules={[{ required: true, message: '请输入每日免费生成图片数' }]}
              >
                <InputNumber min={0} max={100} precision={0} addonAfter="张/天" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={10} lg={8}>
              <Form.Item
                name="tomorrowRecommendationStartHour"
                label="明日推荐开始时间"
                rules={[{ required: true, message: '请输入明日推荐开始时间' }]}
              >
                <InputNumber min={0} max={23} precision={0} addonAfter="点后" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={14} lg={16}>
              <Typography.Text type="secondary">
                设置为 0 时，H5 用户当天不能免费生成图片；明日推荐开始时间用于控制 H5 首页几点后改用明天天气。
              </Typography.Text>
            </Col>
          </Row>
        </Card>

        <div className="config-workbench">
          <aside className="config-nav">
            {sectionNav.map((section) => {
              const count = section.key === 'home'
                ? parseLines(form.getFieldValue('homeCategories') || '').length + parseLines(form.getFieldValue('inspirationKeywords') || '').length
                : section.key === 'login'
                  ? (options.login.heroImages?.length || 0) + (options.login.poems?.length || 0) + [
                      form.getFieldValue('loginPhonePasswordEnabled'),
                      form.getFieldValue('loginRegisterEnabled'),
                      form.getFieldValue('loginWechatEnabled'),
                      form.getFieldValue('loginGuestEnabled'),
                    ].filter(Boolean).length
                : ((options[section.key] as H5OutfitOptionItem[]) || []).length
              return (
                <button
                  className={activeSection === section.key ? `active accent-${section.accent}` : `accent-${section.accent}`}
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                >
                  <i>{section.icon}</i>
                  <span>{section.title}</span>
                  <em>{count}</em>
                </button>
              )
            })}
          </aside>

          <Card className="console-card editor-card">
            {activeSection === 'home' ? (
              <HomeContentEditor
                options={options}
                refreshing={refreshingHome}
                onRefresh={handleRefreshHomeContent}
              />
            ) : activeSection === 'login' ? (
              <LoginContentEditor
                options={options}
                refreshing={refreshingLogin}
                onRefresh={handleRefreshLoginContent}
              />
            ) : activeSection === 'chat' ? (
              <ChatAssistantEditor />
            ) : activeGroup && isOptionGroupKey(activeSection) ? (
              <OptionEditor
                key={activeSection}
                title={activeGroup.title}
                icon={activeGroup.icon}
                type={activeGroup.type}
                value={(options[activeSection] as H5OutfitOptionItem[]) || []}
                modelOptions={h5ImageModelOptions}
                onChange={(next) => updateGroup(activeSection, next)}
              />
            ) : null}
          </Card>
        </div>
      </Form>
    </div>
  )
}

function HomeContentEditor({
  onRefresh,
  options,
  refreshing,
}: {
  onRefresh: () => void
  options: H5OutfitOptionConfig
  refreshing: boolean
}) {
  return (
    <section className="home-editor">
      <div className="editor-head">
        <span><FireOutlined /></span>
        <div>
          <strong>首页图文</strong>
          <small>首屏背景、今日灵感图片、标签和文案可以每天由 AI 自动生成，提示词已限制为穿搭主题。</small>
        </div>
        <Button icon={<ReloadOutlined />} loading={refreshing} onClick={onRefresh}>
          立即生成首页图文
        </Button>
      </div>
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={14}>
          <div className="home-hero-form">
            <Row gutter={[12, 12]}>
              <Col xs={24} md={12}>
                <Form.Item name="homeHeroKicker" label="首屏角标">
                  <Input placeholder="AI STYLING STUDIO" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="homeHeroPrimaryAction" label="主按钮">
                  <Input placeholder="上传照片" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="homeHeroSecondaryAction" label="次按钮">
                  <Input placeholder="写关键词" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="homeHeroTitleLine1" label="标题第一行">
                  <Input placeholder="今日穿搭" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="homeHeroTitleLine2" label="标题第二行">
                  <Input placeholder="交给云裳 AI" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="homeHeroSubtitle" label="首屏描述">
                  <Input.TextArea autoSize={{ minRows: 2 }} placeholder="一句话说明 H5 穿搭生成价值" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="homeHeroBackgroundImage" label="首页背景图 URL">
                  <Input placeholder="/uploads/outfit-records/..." />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="homeHeroBackgroundAlt" label="背景图说明">
                  <Input placeholder="用于图片说明" />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item name="homeHeroLensText" label="浮层文案">
                  <Input placeholder="智能搭配中" />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Col>
        <Col xs={24} lg={10}>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => (
              <div className="home-hero-preview">
                <img
                  alt={getFieldValue('homeHeroBackgroundAlt') || '首页背景图预览'}
                  src={getFieldValue('homeHeroBackgroundImage') || defaultHomeHeroConfig.backgroundImage || defaultLoginConfig.heroImage}
                />
                <div>
                  <small>{getFieldValue('homeHeroKicker') || defaultHomeHeroConfig.kicker}</small>
                  <strong>
                    {getFieldValue('homeHeroTitleLine1') || defaultHomeHeroConfig.titleLine1}
                    <br />
                    {getFieldValue('homeHeroTitleLine2') || defaultHomeHeroConfig.titleLine2}
                  </strong>
                  <span>{getFieldValue('homeHeroSubtitle') || defaultHomeHeroConfig.subtitle}</span>
                </div>
              </div>
            )}
          </Form.Item>
        </Col>
        <Col xs={24}>
          <div className="daily-refresh-panel">
            <Form.Item name="homeDailyRefreshEnabled" label="每日自动生成首页图片" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
            <Form.Item name="homeDailyRefreshHour" label="每日生成时间">
              <InputNumber min={0} max={23} precision={0} addonAfter="点后" style={{ width: 160 }} />
            </Form.Item>
            <Typography.Text type={options.homeDailyRefresh.lastError ? 'danger' : 'secondary'}>
              {options.homeDailyRefresh.lastError
                ? `上次失败：${options.homeDailyRefresh.lastError}`
                : options.homeDailyRefresh.lastRefreshAt
                  ? `上次生成：${options.homeDailyRefresh.lastRefreshAt}`
                  : '启用后服务端每天按配置时间生成一次首页背景、灵感图片和穿搭文案。'}
            </Typography.Text>
          </div>
        </Col>
        <Col xs={24} lg={10}>
          <Form.Item name="homeCategories" label="热门推荐标签">
            <Input.TextArea autoSize={{ minRows: 10 }} placeholder="每行一个标签，如：通勤" />
          </Form.Item>
        </Col>
        <Col xs={24} lg={14}>
          <Form.Item name="inspirationKeywords" label="灵感关键词">
            <Input.TextArea autoSize={{ minRows: 10 }} placeholder="每行一个关键词，如：初夏约会" />
          </Form.Item>
        </Col>
      </Row>
    </section>
  )
}

function ChatAssistantEditor() {
  return (
    <section className="chat-editor">
      <div className="editor-head">
        <span><ThunderboltOutlined /></span>
        <div>
          <strong>AI 穿搭顾问</strong>
          <small>控制 H5 对话入口、开场白、快捷问题和可读取的个性化上下文。</small>
        </div>
      </div>
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={14}>
          <div className="chat-switch-panel">
            <Form.Item name="chatAssistantEnabled" label="启用对话顾问" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
            <Form.Item name="chatAssistantUseStyleProfile" label="读取风格档案" valuePropName="checked">
              <Switch checkedChildren="读取" unCheckedChildren="关闭" />
            </Form.Item>
            <Form.Item name="chatAssistantUseRecentRecords" label="读取生成历史" valuePropName="checked">
              <Switch checkedChildren="读取" unCheckedChildren="关闭" />
            </Form.Item>
          </div>
          <Form.Item name="chatAssistantWelcomeMessage" label="顾问开场白">
            <Input.TextArea autoSize={{ minRows: 3 }} placeholder="进入对话页时展示给用户的第一句话" />
          </Form.Item>
          <Form.Item name="chatAssistantQuickPrompts" label="快捷问题">
            <Input.TextArea autoSize={{ minRows: 5 }} placeholder="每行一个问题，如：明天通勤怎么穿" />
          </Form.Item>
        </Col>
        <Col xs={24} lg={10}>
          <div className="chat-limit-panel">
            <Form.Item name="chatAssistantDailyLimit" label="每日对话次数">
              <InputNumber min={0} max={500} precision={0} addonAfter="次/人" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="chatAssistantMaxHistoryMessages" label="上下文消息数">
              <InputNumber min={2} max={20} precision={0} addonAfter="条" style={{ width: '100%' }} />
            </Form.Item>
            <div>
              <strong>建议策略</strong>
              <span>首版保持 6-10 条上下文更稳，既能延续聊天，也不会把历史噪声带进生成建议。</span>
            </div>
          </div>
        </Col>
      </Row>
    </section>
  )
}

function LoginContentEditor({
  onRefresh,
  options,
  refreshing,
}: {
  onRefresh: () => void
  options: H5OutfitOptionConfig
  refreshing: boolean
}) {
  return (
    <section className="login-editor">
      <div className="editor-head">
        <span><LoginOutlined /></span>
        <div>
          <strong>登录页配置</strong>
          <small>封面图、品牌文案和登录方式开关会同步到 H5 登录页，也可以每天由 AI 自动刷新。</small>
        </div>
        <Button icon={<ReloadOutlined />} loading={refreshing} onClick={onRefresh}>
          立即生成登录页图文
        </Button>
      </div>
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={14}>
          <div className="daily-refresh-panel login-refresh-panel">
            <Form.Item name="loginDailyRefreshEnabled" label="每日自动生成登录页图文" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
            <Form.Item name="loginDailyRefreshHour" label="每日生成时间">
              <InputNumber min={0} max={23} precision={0} addonAfter="点后" style={{ width: 160 }} />
            </Form.Item>
            <Typography.Text type={options.loginDailyRefresh.lastError ? 'danger' : 'secondary'}>
              {options.loginDailyRefresh.lastError
                ? `上次失败：${options.loginDailyRefresh.lastError}`
                : options.loginDailyRefresh.lastRefreshAt
                  ? `上次生成：${options.loginDailyRefresh.lastRefreshAt}`
                  : '启用后服务端每天按配置时间生成登录页封面图池和底部文案池。'}
            </Typography.Text>
          </div>
          <Form.Item
            name="loginHeroImages"
            label="随机封面图池"
            extra="每行一张：图片URL｜图片说明。H5 登录页每次进入会随机取一张。"
          >
            <Input.TextArea
              autoSize={{ minRows: 4 }}
              placeholder="https://example.com/login-cover.jpg｜浅色衣架上的外套与包袋"
            />
          </Form.Item>
          <Form.Item
            name="loginHeroImage"
            label="兼容封面图 URL"
            rules={[{ required: true, message: '请输入登录封面图 URL' }]}
          >
            <Input placeholder="https://example.com/login-cover.jpg" />
          </Form.Item>
          <Form.Item name="loginHeroAlt" label="封面图说明">
            <Input placeholder="用于图片 alt 文案" />
          </Form.Item>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="loginBrandTitle"
                label="封面标题"
                rules={[{ required: true, message: '请输入封面标题' }]}
              >
                <Input placeholder="云裳 AI 穿搭" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="loginSubtitle" label="封面副标题">
                <Input placeholder="AI 智能搭配 · 发现更美的你" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="loginPoems"
            label="底部随机文案池"
            extra="每行一组：角标｜第一行｜第二行｜底部说明。可填诗句，也可填品牌文案。"
          >
            <Input.TextArea
              autoSize={{ minRows: 4 }}
              placeholder="东方衣境｜云想衣裳花想容｜春风拂槛露华浓｜登录后同步衣橱偏好与历史方案"
            />
          </Form.Item>
          <div className="login-method-switches">
            <Form.Item name="loginPhonePasswordEnabled" label="手机号密码登录" valuePropName="checked">
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
            <Form.Item name="loginRegisterEnabled" label="注册入口" valuePropName="checked">
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
            <Form.Item name="loginWechatEnabled" label="微信登录入口" valuePropName="checked">
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
            <Form.Item name="loginGuestEnabled" label="游客登录入口" valuePropName="checked">
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
          </div>
        </Col>
        <Col xs={24} lg={10}>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => (
              <div className="login-preview-stack">
                <div className="login-cover-preview">
                  <img
                    alt={getFieldValue('loginHeroAlt') || '登录封面预览'}
                    src={parseLoginHeroImages(
                      getFieldValue('loginHeroImages'),
                      defaultLoginConfig.heroImages,
                    )[0]?.image || getFieldValue('loginHeroImage') || defaultLoginConfig.heroImage}
                  />
                  <div>
                    <strong>{getFieldValue('loginBrandTitle') || defaultLoginConfig.brandTitle}</strong>
                    <span>{getFieldValue('loginSubtitle') || defaultLoginConfig.subtitle}</span>
                  </div>
                </div>
                <div className="login-poem-preview">
                  {(() => {
                    const poem = parseLoginPoems(getFieldValue('loginPoems'), defaultLoginConfig.poems)[0]
                    return (
                      <>
                        <small>{poem.kicker}</small>
                        <strong>
                          {poem.line1}
                          {poem.line2 ? <><br />{poem.line2}</> : null}
                        </strong>
                        <span>{poem.footer}</span>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </Form.Item>
        </Col>
      </Row>
    </section>
  )
}

function OptionEditor({
  icon,
  modelOptions = [],
  onChange,
  title,
  type,
  value,
}: {
  icon: ReactNode
  modelOptions?: Array<{ label: string; value: string }>
  onChange: (next: H5OutfitOptionItem[]) => void
  title: string
  type: OptionEditorType
  value: H5OutfitOptionItem[]
}) {
  const selectedModelIds = value.map((item) => String(item.value || '')).filter(Boolean)
  const modelSelectOptions = [
    ...modelOptions,
    ...value
      .filter((item) => item.value && !modelOptions.some((option) => option.value === String(item.value)))
      .map((item) => ({
        label: item.label || String(item.value),
        value: String(item.value),
      })),
  ]

  const updateItem = (index: number, patch: Partial<H5OutfitOptionItem>) => {
    onChange(value.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))
  }

  const removeItem = (index: number) => {
    onChange(value.filter((_, itemIndex) => itemIndex !== index))
  }

  const updateModelSelection = (modelIds: string[]) => {
    onChange(
      modelIds.map((modelId) => {
        const current = value.find((item) => String(item.value) === modelId)
        const option = modelSelectOptions.find((item) => item.value === modelId)
        return {
          ...current,
          label: current?.label || option?.label || modelId,
          value: modelId,
        }
      }),
    )
  }

  if (type === 'model') {
    return (
      <section className="option-editor model-select-editor">
        <div className="editor-head">
          <span>{icon}</span>
          <div>
            <strong>{title}</strong>
            <small>多选后会展示到 H5，用户选择哪个就用哪个模型生成。</small>
          </div>
        </div>
        <Select
          className="model-multi-select"
          mode="multiple"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="多选 H5 端可展示的生图模型"
          value={selectedModelIds}
          options={modelSelectOptions}
          onChange={updateModelSelection}
        />
        {value.length ? (
          <div className="selected-model-list">
            {value.map((item) => (
              <span key={String(item.value || item.label)}>
                <ThunderboltOutlined />
                {item.label}
                <button
                  type="button"
                  aria-label={`移除${item.label}`}
                  onClick={() => updateModelSelection(selectedModelIds.filter((modelId) => modelId !== String(item.value)))}
                >
                  <DeleteOutlined />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择至少一个 H5 生图模型" />
        )}
      </section>
    )
  }

  return (
    <section className="option-editor">
      <div className="editor-head">
        <span>{icon}</span>
        <div>
          <strong>{title}</strong>
          <small>{value.length} 个配置项</small>
        </div>
        <Button type="primary" ghost icon={<PlusOutlined />} onClick={() => onChange([...value, createOption(type)])}>
          新增
        </Button>
      </div>

      {value.length ? (
        <div className="option-editor-list">
          {value.map((item, index) => (
            <div className={`option-editor-row option-editor-row-${type}`} key={`${title}-${index}`}>
              {type === 'image' ? <ImagePreview image={item.image} /> : null}
              {type === 'color' ? <span className="color-preview" style={{ background: String(item.value || item.color || '#4f6bff') }} /> : null}
              <Input
                className="label-input"
                placeholder="显示文案"
                value={item.label}
                onChange={(event) => updateItem(index, { label: event.target.value })}
              />
              {type === 'label-value' ? (
                <Input
                  className="value-input"
                  placeholder="值"
                  value={String(item.value ?? '')}
                  onChange={(event) => updateItem(index, { value: event.target.value })}
                />
              ) : null}
              {type === 'image' ? (
                <Input
                  className="wide-input"
                  placeholder="图片 URL"
                  value={item.image}
                  onChange={(event) => updateItem(index, { image: event.target.value })}
                />
              ) : null}
              {type === 'icon' ? (
                <Select
                  className="value-input"
                  value={item.icon}
                  options={[
                    { label: 'home', value: 'home' },
                    { label: 'heart', value: 'heart' },
                    { label: 'plane', value: 'plane' },
                    { label: 'map-pin', value: 'map-pin' },
                    { label: 'sparkles', value: 'sparkles' },
                    { label: 'briefcase', value: 'briefcase' },
                  ]}
                  onChange={(selectedIcon) => updateItem(index, { icon: selectedIcon })}
                />
              ) : null}
              {type === 'color' ? (
                <Input
                  className="value-input"
                  type="color"
                  value={String(item.value || item.color || '#4f6bff')}
                  onChange={(event) => updateItem(index, { value: event.target.value })}
                />
              ) : null}
              <Button
                className="delete-button"
                danger
                shape="circle"
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => removeItem(index)}
              />
            </div>
          ))}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无配置项"
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={() => onChange([createOption(type)])}>
            新增第一项
          </Button>
        </Empty>
      )}
    </section>
  )
}

function ImagePreview({ image }: { image?: string }) {
  return image ? (
    <img className="image-preview" src={image} alt="" />
  ) : (
    <span className="image-preview empty">
      <PictureOutlined />
    </span>
  )
}

function AnimatedOrbit() {
  return (
    <svg className="hero-orbit" viewBox="0 0 160 160" role="img" aria-label="CloudWear AI">
      <defs>
        <linearGradient id="orbitGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#28d4ff" />
          <stop offset="52%" stopColor="#5b5ff5" />
          <stop offset="100%" stopColor="#9d7cff" />
        </linearGradient>
      </defs>
      <circle className="orbit-ring ring-one" cx="80" cy="80" r="54" />
      <circle className="orbit-ring ring-two" cx="80" cy="80" r="38" />
      <path className="orbit-line" d="M33 82c18-34 72-47 98-14 11 14 5 35-10 42-26 13-65 4-84-17" />
      <circle className="orbit-core" cx="80" cy="80" r="18" />
      <path className="orbit-spark" d="M80 58l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" />
    </svg>
  )
}

export default H5ConfigPage
