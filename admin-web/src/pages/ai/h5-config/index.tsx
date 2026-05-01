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
  updateH5ModelConfig,
} from '@/apis/ai-model'
import type {
  AiAppModelConfig,
  AiModelProvider,
  H5LoginConfig,
  H5OutfitOptionConfig,
  H5OutfitOptionItem,
} from '@/apis/ai-model'
import './index.less'

const normalStatus = '0'
const disabledStatus = '1'

type OptionEditorType = 'label' | 'label-value' | 'image' | 'icon' | 'color' | 'model'
type OptionGroupKey = Exclude<
  keyof H5OutfitOptionConfig,
  'dailyFreeGenerationLimit' | 'homeCategories' | 'inspirationKeywords' | 'login'
>
type ConfigSectionKey = 'home' | 'login' | OptionGroupKey

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
  { key: 'home', title: '首页文案', icon: <FireOutlined />, accent: 'orange' },
  { key: 'login', title: '登录页', icon: <LoginOutlined />, accent: 'violet' },
  ...optionGroups.map(({ key, title, icon, accent }) => ({ key, title, icon, accent })),
]

const defaultLoginConfig: H5LoginConfig = {
  heroImage: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=84',
  heroAlt: '浅色衣架上的外套与包袋',
  brandTitle: '云裳 AI 穿搭',
  subtitle: 'AI 智能搭配 · 发现更美的你',
  phonePasswordEnabled: true,
  registerEnabled: true,
  wechatEnabled: true,
}

const emptyOptions: H5OutfitOptionConfig = {
  dailyFreeGenerationLimit: 3,
  login: defaultLoginConfig,
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
      }
      setOptions(nextOptions)
      form.setFieldsValue({
        textModelPk: h5Config.textModelPk,
        keywordImageModelPk: h5Config.keywordImageModelPk,
        photoImageModelPk: h5Config.photoImageModelPk,
        status: h5Config.status === normalStatus,
        dailyFreeGenerationLimit: h5Config.options?.dailyFreeGenerationLimit ?? 3,
        inspirationKeywords: stringifyLines(h5Config.options?.inspirationKeywords || []),
        homeCategories: stringifyLines(h5Config.options?.homeCategories || []),
        loginHeroImage: nextOptions.login.heroImage,
        loginHeroAlt: nextOptions.login.heroAlt,
        loginBrandTitle: nextOptions.login.brandTitle,
        loginSubtitle: nextOptions.login.subtitle,
        loginPhonePasswordEnabled: nextOptions.login.phonePasswordEnabled,
        loginRegisterEnabled: nextOptions.login.registerEnabled,
        loginWechatEnabled: nextOptions.login.wechatEnabled,
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
    const values = await form.validateFields()
    setSaving(true)
    try {
      const nextOptions = {
        ...options,
        dailyFreeGenerationLimit: Number(values.dailyFreeGenerationLimit ?? options.dailyFreeGenerationLimit ?? 3),
        inspirationKeywords: parseLines(values.inspirationKeywords || ''),
        homeCategories: parseLines(values.homeCategories || ''),
        login: {
          ...defaultLoginConfig,
          ...options.login,
          heroImage: String(values.loginHeroImage || '').trim() || defaultLoginConfig.heroImage,
          heroAlt: String(values.loginHeroAlt || '').trim() || defaultLoginConfig.heroAlt,
          brandTitle: String(values.loginBrandTitle || '').trim() || defaultLoginConfig.brandTitle,
          subtitle: String(values.loginSubtitle || '').trim() || defaultLoginConfig.subtitle,
          phonePasswordEnabled: Boolean(values.loginPhonePasswordEnabled),
          registerEnabled: Boolean(values.loginRegisterEnabled),
          wechatEnabled: Boolean(values.loginWechatEnabled),
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
            <Col xs={24} md={14} lg={16}>
              <Typography.Text type="secondary">
                设置为 0 时，H5 用户当天不能免费生成图片；如果一次选择 3 张，会一次性扣 3 张额度。
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
                  ? [
                      form.getFieldValue('loginPhonePasswordEnabled'),
                      form.getFieldValue('loginRegisterEnabled'),
                      form.getFieldValue('loginWechatEnabled'),
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
              <HomeContentEditor />
            ) : activeSection === 'login' ? (
              <LoginContentEditor />
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

function HomeContentEditor() {
  return (
    <section className="home-editor">
      <div className="editor-head">
        <span><FireOutlined /></span>
        <div>
          <strong>首页文案</strong>
          <small>热门推荐标签与灵感关键词会直接影响 H5 首页首屏。</small>
        </div>
      </div>
      <Row gutter={[12, 12]}>
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

function LoginContentEditor() {
  return (
    <section className="login-editor">
      <div className="editor-head">
        <span><LoginOutlined /></span>
        <div>
          <strong>登录页配置</strong>
          <small>封面图、品牌文案和登录方式开关会同步到 H5 登录页。</small>
        </div>
      </div>
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={14}>
          <Form.Item
            name="loginHeroImage"
            label="登录封面图 URL"
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
          </div>
        </Col>
        <Col xs={24} lg={10}>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => (
              <div className="login-cover-preview">
                <img
                  alt={getFieldValue('loginHeroAlt') || '登录封面预览'}
                  src={getFieldValue('loginHeroImage') || defaultLoginConfig.heroImage}
                />
                <div>
                  <strong>{getFieldValue('loginBrandTitle') || defaultLoginConfig.brandTitle}</strong>
                  <span>{getFieldValue('loginSubtitle') || defaultLoginConfig.subtitle}</span>
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
              {type === 'model' ? (
                <Select
                  className="value-input"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="选择模型"
                  value={item.value ? String(item.value) : undefined}
                  options={modelOptions}
                  onChange={(modelPk) => updateItem(index, { value: modelPk })}
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
