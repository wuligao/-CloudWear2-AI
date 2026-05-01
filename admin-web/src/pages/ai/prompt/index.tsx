import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FilterOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { saveAs } from 'file-saver'
import type { Key } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  addAiPromptTemplate,
  deleteAiPromptTemplates,
  duplicateAiPromptTemplate,
  listAiPromptTemplates,
  statsAiPromptTemplates,
  updateAiPromptTemplate,
  updateAiPromptTemplateStatus,
  useAiPromptTemplate,
} from '@/apis/ai-prompt'
import type {
  AiPromptTemplateModel,
  AiPromptTemplateStats,
  CreateAiPromptTemplateParams,
  ListAiPromptTemplateParams,
} from '@/apis/ai-prompt'
import './index.less'

const normalStatus = '0'
const disabledStatus = '1'

type FilterState = {
  keyword: string
  scene: string
  promptType: string
  status: string
}

const initialFilters: FilterState = {
  keyword: '',
  scene: 'all',
  promptType: 'all',
  status: 'all',
}

const sceneOptions = [
  { label: '全部场景', value: 'all' },
  { label: '图像生成', value: '图像生成' },
  { label: '商品图', value: '商品图' },
  { label: '人像写真', value: '人像写真' },
  { label: '虚拟试穿', value: '虚拟试穿' },
  { label: '场景图', value: '场景图' },
  { label: '文案生成', value: '文案生成' },
  { label: '穿搭推荐', value: '穿搭推荐' },
  { label: '营销文案', value: '营销文案' },
  { label: '图像编辑', value: '图像编辑' },
  { label: '设计辅助', value: '设计辅助' },
]

const promptTypeOptions = [
  { label: '全部类型', value: 'all' },
  { label: '图像', value: 'image' },
  { label: '文本', value: 'text' },
  { label: '多模态', value: 'multimodal' },
]

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '启用中', value: normalStatus },
  { label: '停用中', value: disabledStatus },
]

const modelOptions = [
  { label: 'Stable Diffusion', value: 'Stable Diffusion' },
  { label: 'Midjourney', value: 'Midjourney' },
  { label: 'DALL-E', value: 'DALL-E' },
  { label: '通义万相', value: '通义万相' },
  { label: 'GPT Image', value: 'GPT Image' },
]

const emptyStats: AiPromptTemplateStats = {
  total: 0,
  enabled: 0,
  disabled: 0,
  sceneCount: 0,
  usageCount: 0,
}

const typeMeta: Record<string, { className: string; label: string }> = {
  image: { className: 'type-image', label: '图像' },
  text: { className: 'type-text', label: '文本' },
  multimodal: { className: 'type-multimodal', label: '多模态' },
}

const formatTime = (value?: string) => {
  if (!value) return '-'
  const date = dayjs(value)
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm') : value
}

const formatNumber = (value?: number) => Number(value || 0).toLocaleString()

const escapeCsvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`

const getPromptTypeLabel = (type: string) => typeMeta[type]?.label || type

const PromptManagementPage = () => {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm<CreateAiPromptTemplateParams>()
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [records, setRecords] = useState<AiPromptTemplateModel[]>([])
  const [stats, setStats] = useState<AiPromptTemplateStats>(emptyStats)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [activeRecord, setActiveRecord] = useState<AiPromptTemplateModel>()
  const [editingRecord, setEditingRecord] = useState<AiPromptTemplateModel>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  const queryParams = useMemo<ListAiPromptTemplateParams>(
    () => ({
      page,
      limit: pageSize,
      keyword: filters.keyword.trim() || undefined,
      scene: filters.scene,
      promptType: filters.promptType,
      status: filters.status,
    }),
    [filters, page, pageSize],
  )

  const loadPrompts = async () => {
    setLoading(true)
    try {
      const { items, meta } = await listAiPromptTemplates(queryParams)
      setRecords(items)
      setTotal(meta.totalItems || 0)
      setActiveRecord((current) => {
        if (current) {
          const latest = items.find((item) => item.promptId === current.promptId)
          if (latest) return latest
        }
        return items[0]
      })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '提示词列表加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      setStats(await statsAiPromptTemplates())
    } catch (error) {
      message.error(error instanceof Error ? error.message : '提示词统计加载失败')
    }
  }

  useEffect(() => {
    void loadPrompts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams])

  useEffect(() => {
    void loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshAll = async () => {
    await Promise.all([loadPrompts(), loadStats()])
  }

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  const resetFilters = () => {
    setFilters(initialFilters)
    setPage(1)
  }

  const openCreate = () => {
    setEditingRecord(undefined)
    form.setFieldsValue({
      promptName: '',
      scene: '图像生成',
      promptType: 'image',
      status: normalStatus,
      description: '',
      promptContent: '',
      usageGuide: '',
      applicableModels: ['Stable Diffusion', 'Midjourney'],
      sortOrder: 0,
    })
    setDrawerOpen(true)
  }

  const openEdit = (record: AiPromptTemplateModel) => {
    setEditingRecord(record)
    form.setFieldsValue({
      promptName: record.promptName,
      scene: record.scene,
      promptType: record.promptType,
      status: record.status,
      description: record.description,
      promptContent: record.promptContent,
      usageGuide: record.usageGuide,
      applicableModels: record.applicableModels,
      sortOrder: record.sortOrder,
    })
    setDrawerOpen(true)
  }

  const openDetail = (record: AiPromptTemplateModel) => {
    setActiveRecord(record)
    setDetailDrawerOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      if (editingRecord) {
        await updateAiPromptTemplate(editingRecord.promptId, values)
        message.success('提示词已更新')
      } else {
        await addAiPromptTemplate(values)
        message.success('提示词已新增')
      }
      setDrawerOpen(false)
      await refreshAll()
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (record: AiPromptTemplateModel, checked: boolean) => {
    await updateAiPromptTemplateStatus(record.promptId, checked ? normalStatus : disabledStatus)
    message.success(checked ? '提示词已启用' : '提示词已停用')
    await refreshAll()
  }

  const handleDuplicate = async (record: AiPromptTemplateModel) => {
    const duplicated = await duplicateAiPromptTemplate(record.promptId)
    message.success('已复制提示词')
    await refreshAll()
    setActiveRecord(duplicated)
  }

  const handleUse = async (record: AiPromptTemplateModel) => {
    const nextRecord = await useAiPromptTemplate(record.promptId)
    setActiveRecord(nextRecord)
    await navigator.clipboard?.writeText(record.promptContent)
    message.success('已复制提示词内容，并记录一次使用')
    await refreshAll()
  }

  const handleDelete = (record: AiPromptTemplateModel) => {
    modal.confirm({
      title: '删除提示词',
      content: `确认删除「${record.promptName}」？删除后不可恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        await deleteAiPromptTemplates([record.promptId])
        message.success('提示词已删除')
        setSelectedRowKeys([])
        await refreshAll()
      },
    })
  }

  const handleBatchDelete = () => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择要删除的提示词')
      return
    }

    modal.confirm({
      title: '批量删除提示词',
      content: `确认删除已选中的 ${selectedRowKeys.length} 个提示词？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        await deleteAiPromptTemplates(selectedRowKeys.map(String))
        message.success('已批量删除提示词')
        setSelectedRowKeys([])
        await refreshAll()
      },
    })
  }

  const handleExport = async () => {
    const { items } = await listAiPromptTemplates({
      ...queryParams,
      page: 1,
      limit: 1000,
    })
    const header = ['ID', '提示词名称', '场景', '类型', '状态', '使用次数', '最后更新', '提示词内容']
    const rows = items.map((record) => [
      record.promptId,
      record.promptName,
      record.scene,
      getPromptTypeLabel(record.promptType),
      record.status === normalStatus ? '启用' : '停用',
      record.usageCount,
      formatTime(record.updateTime),
      record.promptContent,
    ])
    const csv = [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n')
    saveAs(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }), `提示词管理-${dayjs().format('YYYYMMDDHHmmss')}.csv`)
    message.success('已导出当前筛选条件下的前 1000 条提示词')
  }

  const columns = useMemo<ColumnsType<AiPromptTemplateModel>>(
    () => [
      {
        title: '提示词名称',
        dataIndex: 'promptName',
        width: 320,
        render: (_, record) => (
          <button className="prompt-title-cell" type="button" onClick={() => openDetail(record)}>
            <strong>{record.promptName}</strong>
            <span>{record.description || record.promptContent}</span>
          </button>
        ),
      },
      {
        title: '场景',
        dataIndex: 'scene',
        width: 120,
        render: (scene: string) => <Tag className={`prompt-scene scene-${scene}`}>{scene}</Tag>,
      },
      {
        title: '类型',
        dataIndex: 'promptType',
        width: 96,
        render: (type: string) => <Tag className={`prompt-type ${typeMeta[type]?.className || ''}`}>{getPromptTypeLabel(type)}</Tag>,
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 108,
        render: (_, record) => (
          <Switch
            checked={record.status === normalStatus}
            checkedChildren="启用"
            unCheckedChildren="停用"
            onClick={(_, event) => event.stopPropagation()}
            onChange={(checked) => void handleStatusChange(record, checked)}
          />
        ),
      },
      {
        title: '使用次数',
        dataIndex: 'usageCount',
        width: 118,
        render: (count: number) => <span className="usage-count">{formatNumber(count)}</span>,
      },
      {
        title: '最后更新',
        dataIndex: 'updateTime',
        width: 150,
        render: (value: string) => <span className="prompt-time">{formatTime(value)}</span>,
      },
      {
        title: '操作',
        dataIndex: 'action',
        align: 'right',
        width: 178,
        render: (_, record) => (
          <Space size={4} className="prompt-row-actions">
            <Button
              size="small"
              type="link"
              icon={<EyeOutlined />}
              onClick={(event) => {
                event.stopPropagation()
                openDetail(record)
              }}
            >
              查看
            </Button>
            <Button
              size="small"
              type="link"
              onClick={(event) => {
                event.stopPropagation()
                openEdit(record)
              }}
            >
              编辑
            </Button>
            <Button
              size="small"
              type="link"
              onClick={(event) => {
                event.stopPropagation()
                void handleDuplicate(record)
              }}
            >
              复制
            </Button>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [message, modal],
  )

  return (
    <div className="prompt-management-page">
      <header className="prompt-page-header">
        <div>
          <Typography.Title level={3}>提示词管理</Typography.Title>
          <Typography.Text>管理系统默认的提示词模板，可用于多种AI场景，作为生成内容的约束和引导</Typography.Text>
        </div>
        <Space size={10}>
          <Button icon={<PlusOutlined />} type="primary" onClick={openCreate}>
            新建提示词
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => void handleExport()}>
            导出
          </Button>
        </Space>
      </header>

      <section className="prompt-filter-bar">
        <Input
          allowClear
          className="prompt-search"
          prefix={<SearchOutlined />}
          placeholder="搜索提示词名称、摘要或内容"
          value={filters.keyword}
          onChange={(event) => updateFilter('keyword', event.target.value)}
        />
        <div className="prompt-filter-item">
          <span>场景</span>
          <Select value={filters.scene} options={sceneOptions} onChange={(value) => updateFilter('scene', value)} />
        </div>
        <div className="prompt-filter-item">
          <span>类型</span>
          <Select value={filters.promptType} options={promptTypeOptions} onChange={(value) => updateFilter('promptType', value)} />
        </div>
        <div className="prompt-filter-item">
          <span>状态</span>
          <Select value={filters.status} options={statusOptions} onChange={(value) => updateFilter('status', value)} />
        </div>
        <div className="prompt-filter-actions">
          <Button icon={<ReloadOutlined />} onClick={resetFilters}>
            重置
          </Button>
          <Button ghost type="primary" icon={<FilterOutlined />} onClick={() => void refreshAll()}>
            筛选
          </Button>
        </div>
      </section>

      <section className="prompt-board">
        <div className="prompt-summary-tabs">
          <button className={filters.status === 'all' ? 'active' : ''} type="button" onClick={() => updateFilter('status', 'all')}>
            全部提示词 <strong>{formatNumber(stats.total)}</strong>
          </button>
          <button className={filters.status === normalStatus ? 'active' : ''} type="button" onClick={() => updateFilter('status', normalStatus)}>
            启用中 <strong>{formatNumber(stats.enabled)}</strong>
          </button>
          <button className={filters.status === disabledStatus ? 'active' : ''} type="button" onClick={() => updateFilter('status', disabledStatus)}>
            停用中 <strong>{formatNumber(stats.disabled)}</strong>
          </button>
          <span>
            场景数 <strong>{formatNumber(stats.sceneCount)}</strong>
          </span>
          <span>
            使用次数 <strong>{formatNumber(stats.usageCount)}</strong>
          </span>
        </div>

        <div className="prompt-table-panel">
          <Table<AiPromptTemplateModel>
            rowKey="promptId"
            className="prompt-table"
            columns={columns}
            dataSource={records}
            loading={loading}
            scroll={{ x: 980 }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            onRow={(record) => ({
              onClick: () => openDetail(record),
            })}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (count) => `共 ${count} 条`,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage)
                setPageSize(nextPageSize)
              },
            }}
            footer={() => (
              <div className="prompt-table-footer">
                <span>已选择 {selectedRowKeys.length} 条</span>
                <Button danger disabled={!selectedRowKeys.length} icon={<DeleteOutlined />} onClick={handleBatchDelete}>
                  批量删除
                </Button>
              </div>
            )}
          />
        </div>
      </section>

      <Drawer
        destroyOnHidden
        width={520}
        title="提示词详情"
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
      >
        <PromptDetail
          record={activeRecord}
          onDelete={handleDelete}
          onDuplicate={(record) => void handleDuplicate(record)}
          onEdit={openEdit}
          onUse={(record) => void handleUse(record)}
        />
      </Drawer>

      <Drawer
        destroyOnHidden
        width={620}
        title={editingRecord ? '编辑提示词' : '新建提示词'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" loading={saving} onClick={() => void handleSubmit()}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="promptName" label="提示词名称" rules={[{ required: true, message: '请输入提示词名称' }]}>
            <Input maxLength={120} placeholder="例如：高质量图像生成通用提示词" />
          </Form.Item>
          <div className="prompt-form-grid">
            <Form.Item name="scene" label="场景" rules={[{ required: true, message: '请选择场景' }]}>
              <Select options={sceneOptions.filter((item) => item.value !== 'all')} />
            </Form.Item>
            <Form.Item name="promptType" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
              <Select options={promptTypeOptions.filter((item) => item.value !== 'all')} />
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
              <Select options={statusOptions.filter((item) => item.value !== 'all')} />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="description" label="摘要">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} maxLength={500} placeholder="在列表里展示的简短说明" />
          </Form.Item>
          <Form.Item name="promptContent" label="提示词内容" rules={[{ required: true, message: '请输入提示词内容' }]}>
            <Input.TextArea autoSize={{ minRows: 8, maxRows: 14 }} placeholder="请输入完整提示词模板" />
          </Form.Item>
          <Form.Item name="usageGuide" label="使用说明">
            <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} placeholder="说明适用场景、变量替换方式或注意事项" />
          </Form.Item>
          <Form.Item name="applicableModels" label="适用模型">
            <Select mode="tags" options={modelOptions} placeholder="选择或输入适用模型" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

function PromptDetail({
  onDelete,
  onDuplicate,
  onEdit,
  onUse,
  record,
}: {
  onDelete: (record: AiPromptTemplateModel) => void
  onDuplicate: (record: AiPromptTemplateModel) => void
  onEdit: (record: AiPromptTemplateModel) => void
  onUse: (record: AiPromptTemplateModel) => void
  record?: AiPromptTemplateModel
}) {
  if (!record) {
    return null
  }

  return (
    <aside className="prompt-detail-panel">
      <div className="detail-head">
        <div>
          <h3>{record.promptName}</h3>
          <Tag className={record.status === normalStatus ? 'status-enabled' : 'status-disabled'}>
            {record.status === normalStatus ? '启用中' : '停用中'}
          </Tag>
        </div>
        <Button type="text" icon={<DeleteOutlined />} danger onClick={() => onDelete(record)} />
      </div>

      <div className="detail-meta">
        <DetailItem label="场景" value={record.scene} />
        <DetailItem label="类型" value={getPromptTypeLabel(record.promptType)} />
        <DetailItem label="使用次数" value={formatNumber(record.usageCount)} />
        <DetailItem label="创建时间" value={formatTime(record.createTime)} />
        <DetailItem label="最后更新" value={formatTime(record.updateTime)} />
        <DetailItem label="创建人" value={record.createBy || '系统管理员'} />
      </div>

      <DetailBlock title="提示词内容" value={record.promptContent} />
      <DetailBlock title="使用说明" value={record.usageGuide || '暂无使用说明'} />

      <div className="detail-models">
        <strong>适用模型</strong>
        <div>
          {(record.applicableModels || []).length ? (
            record.applicableModels.map((model) => <Tag key={model}>{model}</Tag>)
          ) : (
            <Typography.Text type="secondary">未限制模型</Typography.Text>
          )}
        </div>
      </div>

      <div className="detail-actions">
        <Button icon={<EditOutlined />} onClick={() => onEdit(record)}>
          编辑
        </Button>
        <Button icon={<CopyOutlined />} onClick={() => onDuplicate(record)}>
          复制
        </Button>
        <Button danger icon={<UploadOutlined />} onClick={() => onUse(record)}>
          使用
        </Button>
      </div>
    </aside>
  )
}

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
)

const DetailBlock = ({ title, value }: { title: string; value: string }) => (
  <section className="detail-block">
    <div>
      <strong>{title}</strong>
      <Tooltip title="复制">
        <Button
          size="small"
          icon={<CopyOutlined />}
          onClick={() => {
            void navigator.clipboard?.writeText(value)
          }}
        />
      </Tooltip>
    </div>
    <Typography.Paragraph>{value}</Typography.Paragraph>
  </section>
)

export default PromptManagementPage
