import {
  ApiOutlined,
  BellOutlined,
  BookOutlined,
  CheckCircleFilled,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
  Spin,
} from 'antd'
import type { TableProps } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import {
  addAiModel,
  addAiModelProvider,
  deleteAiModel,
  deleteAiModelProvider,
  listAiModelProviders,
  setDefaultAiModel,
  testAiModel,
  testAiModelConnection,
  updateAiModel,
  updateAiModelProvider,
} from '@/apis/ai-model'
import type {
  AiModelProvider as ApiAiModelProvider,
  AiModelTestResult,
} from '@/apis/ai-model'
import './index.less'

type ProviderStatus = 'enabled' | 'disabled'
type ModelKind = 'multimodal' | 'text' | 'image' | 'embedding'
type TestType = 'text' | 'image' | 'embedding'

interface ModelItem {
  key: string
  modelPk: number
  name: string
  modelId: string
  kind: ModelKind
  context: string
  isDefault: boolean
  enabled: boolean
}

interface ProviderItem {
  id: string
  providerId: number
  providerCode: string
  name: string
  mark: string
  tone: string
  status: ProviderStatus
  baseUrl: string
  apiKey: string
  defaultModel: string
  models: ModelItem[]
}

const kindMeta: Record<ModelKind, { label: string; color: string }> = {
  multimodal: { label: '多模态', color: 'purple' },
  text: { label: '文本生成', color: 'blue' },
  image: { label: '图片生成', color: 'green' },
  embedding: { label: 'Embedding', color: 'gold' },
}

const testTypeOptions = [
  { label: '文本对话', value: 'text' },
  { label: '图片生成', value: 'image' },
  { label: 'Embeddings', value: 'embedding' },
]

const defaultPrompt =
  '介绍一下人工智能的发展历程。'

const normalStatus = '0'
const disabledStatus = '1'
const yesValue = '1'
const noValue = '0'

const toProviderItem = (provider: ApiAiModelProvider): ProviderItem => ({
  id: String(provider.providerId),
  providerId: provider.providerId,
  providerCode: provider.providerCode,
  name: provider.providerName,
  mark: provider.iconText || provider.providerName.slice(0, 2).toUpperCase(),
  tone: provider.color || 'slate',
  status: provider.status === normalStatus ? 'enabled' : 'disabled',
  baseUrl: provider.baseUrl,
  apiKey: provider.apiKeyMasked || '',
  defaultModel: provider.defaultModelId || '',
  models: (provider.models || []).map((model) => ({
    key: String(model.modelPk),
    modelPk: model.modelPk,
    name: model.modelName,
    modelId: model.modelId,
    kind: model.modelType,
    context: model.contextLength || '-',
    isDefault: model.isDefault === yesValue,
    enabled: model.status === normalStatus,
  })),
})

const buildProviderCode = (name: string) => {
  const code = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return code || `custom-${Date.now()}`
}

const AiModelPage = () => {
  const [providers, setProviders] = useState<ProviderItem[]>([])
  const [activeProviderId, setActiveProviderId] = useState('')
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [configForm] = Form.useForm()
  const [providerForm] = Form.useForm()
  const [modelForm] = Form.useForm()
  const [providerModalOpen, setProviderModalOpen] = useState(false)
  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState<{
    status: 'success' | 'idle'
    latencyMs?: number
    checkedAt?: string
    modelCount?: number
    message?: string
  }>({ status: 'idle' })
  const [editingModel, setEditingModel] = useState<ModelItem>()
  const [testType, setTestType] = useState<TestType>('text')
  const [testPrompt, setTestPrompt] = useState(defaultPrompt)
  const [testModelId, setTestModelId] = useState('')
  const [modelTesting, setModelTesting] = useState(false)
  const [modelResult, setModelResult] = useState<AiModelTestResult>()

  const activeProvider = useMemo(
    () => providers.find((provider) => provider.id === activeProviderId) ?? providers[0],
    [activeProviderId, providers],
  )

  const modelOptions = (activeProvider?.models || []).map((model) => ({
    label: `${model.name} (${model.modelId})`,
    value: model.modelId,
  }))

  const loadProviders = async (nextActiveId?: string) => {
    setLoadingProviders(true)
    try {
      const data = await listAiModelProviders()
      const nextProviders = data.map(toProviderItem)
      setProviders(nextProviders)
      const nextActive =
        nextProviders.find((provider) => provider.id === nextActiveId)?.id ||
        nextProviders.find((provider) => provider.id === activeProviderId)?.id ||
        nextProviders[0]?.id ||
        ''
      setActiveProviderId(nextActive)
      return nextProviders
    } finally {
      setLoadingProviders(false)
    }
  }

  useEffect(() => {
    void loadProviders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activeProvider) return
    configForm.setFieldsValue({
      name: activeProvider.name,
      baseUrl: activeProvider.baseUrl,
      apiKey: activeProvider.apiKey,
      enabled: activeProvider.status === 'enabled',
      defaultModel: activeProvider.defaultModel,
    })
    setTestModelId(activeProvider.defaultModel || activeProvider.models[0]?.modelId || '')
    setConnectionResult({ status: 'idle' })
    setModelResult(undefined)
  }, [activeProvider, configForm])

  const handleSaveConfig = async () => {
    if (!activeProvider) return
    const values = await configForm.validateFields()
    await updateAiModelProvider(activeProvider.providerId, {
      providerName: values.name,
      baseUrl: values.baseUrl,
      apiKey: values.apiKey,
      defaultModelId: values.defaultModel,
      status: values.enabled ? normalStatus : disabledStatus,
    })
    await loadProviders(activeProvider.id)
    message.success('配置已保存')
  }

  const handleConnectionTest = async () => {
    if (!activeProvider) return
    const values = await configForm.validateFields(['baseUrl', 'apiKey'])
    setTestingConnection(true)
    try {
      const result = await testAiModelConnection(activeProvider.providerId, {
        baseUrl: values.baseUrl,
        apiKey: values.apiKey,
      })
      setConnectionResult({
        status: 'success',
        latencyMs: result.latencyMs,
        checkedAt: result.checkedAt,
        modelCount: result.modelCount,
        message: result.message,
      })
      message.success('连接测试通过')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleAddProvider = async () => {
    const values = await providerForm.validateFields()
    const providerCode = buildProviderCode(values.name)
    await addAiModelProvider({
      providerName: values.name,
      providerCode,
      baseUrl: values.baseUrl,
      defaultModelId: values.defaultModel,
      iconText: values.name.slice(0, 2).toUpperCase(),
      status: disabledStatus,
      color: 'slate',
    })
    const nextProviders = await loadProviders()
    const created = nextProviders.find((provider) => provider.providerCode === providerCode)
    if (created) setActiveProviderId(created.id)
    setProviderModalOpen(false)
    providerForm.resetFields()
    message.success('服务商已新增')
  }

  const handleDeleteProvider = (provider: ProviderItem) => {
    Modal.confirm({
      title: '确认删除该服务商？',
      content: `删除后会同时移除 ${provider.name} 下的模型配置。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await deleteAiModelProvider(provider.providerId)
        const remainingProviders = await loadProviders()
        if (provider.id === activeProviderId) {
          setActiveProviderId(remainingProviders[0]?.id || '')
        }
        message.success('服务商已删除')
      },
    })
  }

  const handleSaveModel = async () => {
    if (!activeProvider) return
    const values = await modelForm.validateFields()
    const payload = {
      modelName: values.name,
      modelId: values.modelId,
      modelType: values.kind,
      contextLength: values.context || '-',
      isDefault: values.isDefault ? yesValue : noValue,
      status: values.enabled ? normalStatus : disabledStatus,
    }
    if (editingModel) {
      await updateAiModel(activeProvider.providerId, editingModel.modelPk, payload)
    } else {
      await addAiModel(activeProvider.providerId, payload)
    }
    await loadProviders(activeProvider.id)
    setModelModalOpen(false)
    setEditingModel(undefined)
    modelForm.resetFields()
    message.success(editingModel ? '模型已更新' : '模型已新增')
  }

  const handleModelDefault = async (record: ModelItem) => {
    if (!activeProvider) return
    await setDefaultAiModel(activeProvider.providerId, record.modelPk)
    await loadProviders(activeProvider.id)
    message.success('默认模型已更新')
  }

  const handleModelEnabled = async (record: ModelItem, enabled: boolean) => {
    if (!activeProvider) return
    await updateAiModel(activeProvider.providerId, record.modelPk, {
      status: enabled ? normalStatus : disabledStatus,
    })
    await loadProviders(activeProvider.id)
  }

  const handleDeleteModel = (record: ModelItem) => {
    if (!activeProvider) return
    Modal.confirm({
      title: '确认删除该模型？',
      content: record.name,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await deleteAiModel(activeProvider.providerId, record.modelPk)
        await loadProviders(activeProvider.id)
        message.success('模型已删除')
      },
    })
  }

  const openModelModal = (record?: ModelItem) => {
    setEditingModel(record)
    if (record) {
      modelForm.setFieldsValue({
        name: record.name,
        modelId: record.modelId,
        kind: record.kind,
        context: record.context,
        isDefault: record.isDefault,
        enabled: record.enabled,
      })
    } else {
      modelForm.resetFields()
    }
    setModelModalOpen(true)
  }

  const handleModelTest = async () => {
    if (!activeProvider) return
    if (!testModelId) {
      message.warning('请先选择模型')
      return
    }
    if (!testPrompt.trim()) {
      message.warning('请输入测试内容')
      return
    }
    setModelTesting(true)
    try {
      const result = await testAiModel({
        providerId: activeProvider.providerId,
        modelId: testModelId,
        testType,
        prompt: testPrompt,
      })
      setModelResult(result)
      message.success('模型测试完成')
    } finally {
      setModelTesting(false)
    }
  }

  const columns: TableProps<ModelItem>['columns'] = [
    {
      title: '模型名称',
      dataIndex: 'name',
      width: 170,
      ellipsis: true,
      render: (name: string) => (
        <Typography.Text className="model-cell-text" ellipsis={{ tooltip: name }}>
          {name}
        </Typography.Text>
      ),
    },
    {
      title: '模型 ID',
      dataIndex: 'modelId',
      width: 190,
      ellipsis: true,
      render: (modelId: string) => (
        <Typography.Text className="model-cell-text model-id-text" ellipsis={{ tooltip: modelId }}>
          {modelId}
        </Typography.Text>
      ),
    },
    {
      title: '模型类型',
      dataIndex: 'kind',
      width: 110,
      render: (kind: ModelKind) => (
        <Tag color={kindMeta[kind].color}>{kindMeta[kind].label}</Tag>
      ),
    },
    {
      title: '上下文长度',
      dataIndex: 'context',
      width: 96,
    },
    {
      title: '默认模型',
      dataIndex: 'isDefault',
      width: 112,
      render: (_, record) =>
        record.isDefault ? (
          <Tag color="geekblue">默认</Tag>
        ) : (
          <Button type="link" size="small" onClick={() => handleModelDefault(record)}>
            设为默认
          </Button>
        ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 72,
      render: (_, record) => (
        <Switch
          size="small"
          checked={record.enabled}
          onChange={(checked) => handleModelEnabled(record, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 88,
      render: (_, record) => (
        <Space size={4} className="table-actions">
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openModelModal(record)} />
          </Tooltip>
          <Tooltip title="删除">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteModel(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ]

  if (loadingProviders && !providers.length) {
    return (
      <div className="ai-model-page loading-state">
        <Spin />
      </div>
    )
  }

  if (!activeProvider) {
    return (
      <div className="ai-model-page">
        <Alert type="info" showIcon message="暂无服务商" description="请先新增第三方模型服务商" />
      </div>
    )
  }

  return (
    <div className="ai-model-page">
      <div className="ai-model-topbar">
        <div>
          <Typography.Title level={2}>第三方模型接入</Typography.Title>
          <Typography.Paragraph>
            集成和配置第三方大模型服务，支持多服务商接入与模型管理
          </Typography.Paragraph>
        </div>
        <Space>
          <Button icon={<BookOutlined />}>使用文档</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setProviderModalOpen(true)}>
            新增服务商
          </Button>
        </Space>
      </div>

      <div className="provider-grid">
        {providers.map((provider) => {
          const isActive = activeProviderId === provider.id
          return (
            <div
              role="button"
              tabIndex={0}
              className={`provider-card ${isActive ? 'active' : ''}`}
              key={provider.id}
              onClick={() => setActiveProviderId(provider.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setActiveProviderId(provider.id)
                }
              }}
            >
              <div className="provider-head">
                <span className={`provider-mark ${provider.tone}`}>{provider.mark}</span>
                <span className="provider-main">
                  <strong>{provider.name}</strong>
                  <span className={provider.status === 'enabled' ? 'enabled' : 'disabled'}>
                    {provider.status === 'enabled' ? '已启用' : '未启用'}
                  </span>
                </span>
                <Tooltip title="删除服务商">
                  <Button
                    aria-label={`删除${provider.name}`}
                    className="provider-delete"
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation()
                      handleDeleteProvider(provider)
                    }}
                  />
                </Tooltip>
              </div>
              <div className="provider-meta">
                <span>
                  模型数量：<strong>{provider.models.length}</strong>
                </span>
                <span>
                  默认模型：{provider.defaultModel || '未设置'}
                </span>
              </div>
              {isActive ? <CheckCircleFilled className="provider-check" /> : null}
            </div>
          )
        })}
        <button type="button" className="provider-card add-card" onClick={() => setProviderModalOpen(true)}>
          <PlusOutlined />
          <strong>新增服务商</strong>
        </button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={17}>
          <Card className="ai-panel" bodyStyle={{ padding: 0 }}>
            <Tabs
              className="ai-tabs"
              defaultActiveKey="config"
              items={[
                {
                  key: 'config',
                  label: '服务商配置',
                  children: (
                    <Form
                      form={configForm}
                      className="provider-form"
                      layout="vertical"
                      initialValues={{ enabled: true }}
                    >
                      <div className="config-workbench">
                        <div className="config-fields">
                          <div className="section-title">
                            <strong>基础接入</strong>
                            <span>配置服务商名称、接口地址和默认模型。</span>
                          </div>
                          <Row gutter={14}>
                            <Col xs={24} lg={12}>
                              <Form.Item name="name" label="服务商名称" rules={[{ required: true }]}>
                                <Input placeholder="例如：OpenAI" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} lg={12}>
                              <Form.Item name="enabled" label="接入状态" valuePropName="checked">
                                <Switch checkedChildren="已启用" unCheckedChildren="已停用" />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Form.Item
                            name="baseUrl"
                            label="Base URL / API 地址"
                            rules={[{ required: true, message: '请输入 API 地址' }]}
                          >
                            <Input placeholder="https://api.example.com/v1" />
                          </Form.Item>
                          <Form.Item
                            name="defaultModel"
                            label="默认模型"
                            rules={[{ required: true, message: '请选择默认模型' }]}
                          >
                            <Select options={modelOptions} placeholder="请选择默认模型" />
                          </Form.Item>
                          <div className="section-title secret-title">
                            <strong>密钥</strong>
                            <span>后端仅返回脱敏 Key；如需修改，请输入新的 API Key。</span>
                          </div>
                          <Form.Item
                            name="apiKey"
                            label="API Key"
                            rules={[{ required: true, message: '请输入 API Key' }]}
                          >
                            <Input.Password
                              placeholder="请输入服务商 API Key"
                              addonAfter={
                                <Tooltip title="复制当前字段内容">
                                  <CopyOutlined
                                    onClick={() => {
                                      const value = configForm.getFieldValue('apiKey')
                                      if (value) {
                                        void navigator.clipboard?.writeText(value)
                                        message.success('已复制')
                                      }
                                    }}
                                  />
                                </Tooltip>
                              }
                            />
                          </Form.Item>
                        </div>
                        <aside className="provider-summary">
                          <span className={`provider-mark ${activeProvider.tone}`}>{activeProvider.mark}</span>
                          <strong>{activeProvider.name}</strong>
                          <Tag color={activeProvider.status === 'enabled' ? 'success' : 'default'}>
                            {activeProvider.status === 'enabled' ? '已启用' : '未启用'}
                          </Tag>
                          <div className="summary-list">
                            <span>
                              <small>模型数量</small>
                              <b>{activeProvider.models.length}</b>
                            </span>
                            <span>
                              <small>默认模型</small>
                              <b>{activeProvider.defaultModel || '未设置'}</b>
                            </span>
                            <span>
                              <small>服务商编码</small>
                              <b>{activeProvider.providerCode}</b>
                            </span>
                          </div>
                        </aside>
                      </div>
                      <div className="form-actions">
                        <Button onClick={handleConnectionTest} loading={testingConnection}>
                          测试连接
                        </Button>
                        <Button type="primary" onClick={handleSaveConfig}>
                          保存配置
                        </Button>
                      </div>
                    </Form>
                  ),
                },
                {
                  key: 'models',
                  label: '模型列表',
                  children: (
                    <div className="models-tab">
                      <div className="models-toolbar">
                        <Typography.Title level={5}>模型列表</Typography.Title>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModelModal()}>
                          新增模型
                        </Button>
                      </div>
                      <Table
                        rowKey="key"
                        className="model-table"
                        size="middle"
                        columns={columns}
                        dataSource={activeProvider.models}
                        tableLayout="fixed"
                        pagination={{
                          pageSize: 5,
                          showSizeChanger: false,
                          size: 'small',
                          hideOnSinglePage: activeProvider.models.length <= 5,
                        }}
                      />
                    </div>
                  ),
                },
                {
                  key: 'usage',
                  label: '使用统计',
                  children: (
                    <div className="placeholder-panel">
                      <ApiOutlined />
                      <span>统计数据将在接入真实调用日志后展示。</span>
                    </div>
                  ),
                },
                {
                  key: 'cost',
                  label: '费用统计',
                  children: (
                    <div className="placeholder-panel">
                      <BellOutlined />
                      <span>费用统计将基于 Token 与图片生成计费规则汇总。</span>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} xl={7}>
          <Card className="ai-side-card connection-card" bodyStyle={{ padding: 0 }}>
            <div className="side-card-head">
              <div>
                <Typography.Title level={5}>连接诊断</Typography.Title>
                <span>{activeProvider.name}</span>
              </div>
              <Button
                className="icon-action"
                icon={<ReloadOutlined />}
                onClick={handleConnectionTest}
                loading={testingConnection}
              />
            </div>
            <div className={`connection-state ${connectionResult.status}`}>
              <span className="state-icon">
                <CheckCircleFilled />
              </span>
              <span>
                <strong>{connectionResult.status === 'success' ? '连接正常' : '等待测试'}</strong>
                <small>
                  {connectionResult.status === 'success'
                    ? connectionResult.message || `成功连接到 ${activeProvider.name} API`
                    : '保存配置后发起一次连接测试'}
                </small>
              </span>
            </div>
            <div className="connection-metrics">
              <span>
                <small>响应</small>
                <strong>{connectionResult.latencyMs ? `${connectionResult.latencyMs}ms` : '-'}</strong>
              </span>
              <span>
                <small>模型</small>
                <strong>{connectionResult.modelCount ?? '-'}</strong>
              </span>
              <span>
                <small>时间</small>
                <strong>{connectionResult.checkedAt ? new Date(connectionResult.checkedAt).toLocaleTimeString() : '-'}</strong>
              </span>
            </div>
          </Card>

          <Card className="ai-side-card model-test-card" bodyStyle={{ padding: 0 }}>
            <div className="side-card-head">
              <div>
                <Typography.Title level={5}>模型试运行</Typography.Title>
                <span>验证当前服务商的模型返回</span>
              </div>
            </div>
            <div className="test-stack">
              <Select
                className="test-model-select"
                value={testModelId}
                options={modelOptions}
                onChange={setTestModelId}
                placeholder="请选择模型"
              />
              <Radio.Group
                className="test-type-group"
                optionType="button"
                buttonStyle="solid"
                value={testType}
                options={testTypeOptions}
                onChange={(event) => setTestType(event.target.value)}
              />
              <div className="prompt-box">
                <Input.TextArea
                  value={testPrompt}
                  maxLength={2000}
                  rows={5}
                  bordered={false}
                  onChange={(event) => setTestPrompt(event.target.value)}
                />
                <span className="prompt-count">{testPrompt.length}/2000</span>
              </div>
              <div className="test-actions">
                <Button type="primary" block icon={<SendOutlined />} loading={modelTesting} onClick={handleModelTest}>
                  发送测试
                </Button>
                <Tooltip title="清空提示词">
                  <Button className="clear-action" icon={<DeleteOutlined />} onClick={() => setTestPrompt('')} />
                </Tooltip>
              </div>
              {modelResult ? (
                <div className="test-result">
                  <div className="test-result-head">
                    <span><CheckCircleFilled /> 成功</span>
                    <span>耗时：{modelResult.latencyMs}ms ｜ Token：{modelResult.tokenUsage}</span>
                  </div>
                  {modelResult.imageUrl ? (
                    <img className="image-preview" src={modelResult.imageUrl} alt="模型测试生成结果" />
                  ) : null}
                  <p>{modelResult.output}</p>
                </div>
              ) : (
                <div className="test-result empty-result">
                  <p>结果会显示在这里，包括耗时、Token 和模型输出。</p>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        title="新增服务商"
        open={providerModalOpen}
        onCancel={() => setProviderModalOpen(false)}
        onOk={handleAddProvider}
        destroyOnClose
      >
        <Form form={providerForm} layout="vertical">
          <Form.Item name="name" label="服务商名称" rules={[{ required: true }]}>
            <Input placeholder="例如：Azure OpenAI" />
          </Form.Item>
          <Form.Item name="baseUrl" label="Base URL" rules={[{ required: true }]}>
            <Input placeholder="https://api.example.com/v1" />
          </Form.Item>
          <Form.Item name="defaultModel" label="默认模型">
            <Input placeholder="例如：gpt-4o" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingModel ? '编辑模型' : '新增模型'}
        open={modelModalOpen}
        onCancel={() => {
          setModelModalOpen(false)
          setEditingModel(undefined)
        }}
        onOk={handleSaveModel}
        destroyOnClose
      >
        <Form form={modelForm} layout="vertical" initialValues={{ kind: 'text', enabled: true }}>
          <Form.Item name="name" label="模型名称" rules={[{ required: true }]}>
            <Input placeholder="GPT-4o Image" />
          </Form.Item>
          <Form.Item name="modelId" label="模型 ID" rules={[{ required: true }]}>
            <Input placeholder="gpt-4o-image" />
          </Form.Item>
          <Form.Item name="kind" label="模型类型">
            <Select
              options={Object.entries(kindMeta).map(([value, meta]) => ({
                label: meta.label,
                value,
              }))}
            />
          </Form.Item>
          <Form.Item name="context" label="上下文长度">
            <Input placeholder="128K" />
          </Form.Item>
          <Form.Item name="isDefault" label="设为默认模型" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="enabled" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AiModelPage
