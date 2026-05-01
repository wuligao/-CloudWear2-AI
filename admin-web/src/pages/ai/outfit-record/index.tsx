import {
  CameraOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  PictureOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  App,
  Avatar,
  Button,
  DatePicker,
  Descriptions,
  Image,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { RangePickerProps } from 'antd/es/date-picker'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { saveAs } from 'file-saver'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { deleteOutfitRecord, listOutfitRecord } from '@/apis/outfit-record'
import type { ListOutfitRecordParams, OutfitRecordModel } from '@/apis/outfit-record'
import './index.less'

const { RangePicker } = DatePicker

type FilterState = {
  source: 'all' | 'keyword' | 'photo'
  status: 'all' | 'running' | 'succeeded' | 'failed'
  keyword: string
  createTime?: string[]
}

type StatKey = 'all' | 'photo' | 'keyword' | 'running' | 'succeeded' | 'failed'

const sourceMeta: Record<string, { className: string; icon: ReactNode; label: string }> = {
  keyword: { className: 'method-keyword', icon: <FileTextOutlined />, label: '提示词生成' },
  photo: { className: 'method-photo', icon: <PictureOutlined />, label: '图片生成' },
}

const statusMeta: Record<string, { className: string; label: string }> = {
  running: { className: 'status-running', label: '处理中' },
  succeeded: { className: 'status-succeeded', label: '已完成' },
  failed: { className: 'status-failed', label: '失败' },
}

const statOptions: Array<{ key: StatKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'photo', label: '图片生成' },
  { key: 'keyword', label: '提示词生成' },
  { key: 'running', label: '处理中' },
  { key: 'succeeded', label: '已完成' },
  { key: 'failed', label: '失败' },
]

const sourceOptions: Array<{ label: string; value: FilterState['source'] }> = [
  { label: '全部', value: 'all' },
  { label: '图片生成', value: 'photo' },
  { label: '提示词生成', value: 'keyword' },
]

const statusOptions: Array<{ label: string; value: FilterState['status'] }> = [
  { label: '全部', value: 'all' },
  { label: '处理中', value: 'running' },
  { label: '已完成', value: 'succeeded' },
  { label: '失败', value: 'failed' },
]

const initialFilters: FilterState = {
  source: 'all',
  status: 'all',
  keyword: '',
}

const avatarColors = ['#6d5dfc', '#3478f6', '#0f8f86', '#d87a16', '#9b4de3', '#344054']

const formatTime = (value?: string, fallback = '-') => {
  if (!value) return fallback
  const date = dayjs(value)
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : value
}

const compactId = (value?: string | number, head = 8, tail = 6) => {
  if (!value) return '-'
  const text = String(value)
  return text.length > head + tail + 3 ? `${text.slice(0, head)}...${text.slice(-tail)}` : text
}

const parseJsonArray = <T,>(value?: string | T[], fallback: T[] = []) => {
  if (!value) return fallback
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as T[]) : fallback
  } catch {
    return fallback
  }
}

const getRecordSource = (record: OutfitRecordModel) => {
  const usedPhoto = record.source === 'photo' || record.userPhotoUsed === true || Number(record.userPhotoUsed) === 1
  return usedPhoto ? 'photo' : 'keyword'
}

const getRecordImages = (record: OutfitRecordModel) => {
  const images = Array.isArray(record.resultImages) ? record.resultImages : []
  return [...images, record.imageUrl].filter(Boolean).filter((url, index, arr) => arr.indexOf(url) === index)
}

const getUserName = (record: OutfitRecordModel) => {
  if (record.nickName) return record.nickName
  if (record.userName) return record.userName
  if (record.userId) return `用户${record.userId}`
  return `用户记录${record.recordId}`
}

const getUserSubId = (record: OutfitRecordModel) => {
  if (record.userId) return `ID：${record.userId}`
  return `记录：${record.recordId}`
}

const getPromptText = (record: OutfitRecordModel) => {
  if (record.imagePrompt) return record.imagePrompt
  if (record.summary) return record.summary
  const items = parseJsonArray<{ name?: string; category?: string }>(record.items)
  return items.map((item) => item.name || item.category).filter(Boolean).slice(0, 8).join(' / ') || '-'
}

const getContentTitle = (record: OutfitRecordModel) => {
  if (record.outfitTitle) return record.outfitTitle
  if (record.occasion || record.style) return [record.occasion, record.style].filter(Boolean).join(' / ')
  return '未命名生成'
}

const getFailureReason = (record: OutfitRecordModel) => record.failReason || record.summary || '生成任务失败，请查看任务日志或稍后重试'

const escapeCsvCell = (value: ReactNode) => {
  const text = String(value ?? '').replace(/"/g, '""')
  return `"${text}"`
}

const downloadImage = (record: OutfitRecordModel) => {
  if (!record.imageUrl) return false
  saveAs(record.imageUrl, `生成记录-${record.recordId}.png`)
  return true
}

const getAvatarStyle = (record: OutfitRecordModel) => {
  const seed = Number(record.userId || record.recordId || 0)
  return { backgroundColor: avatarColors[seed % avatarColors.length] }
}

const UserCell = ({ record }: { record: OutfitRecordModel }) => (
  <div className="record-user-cell">
    <Avatar icon={<UserOutlined />} src={record.avatar} style={getAvatarStyle(record)} />
    <div>
      <strong>{getUserName(record)}</strong>
      <span>{getUserSubId(record)}</span>
    </div>
  </div>
)

const SourceImage = ({ record }: { record: OutfitRecordModel }) => (
  <div className="record-source-cell">
    <span>原图</span>
    {record.userPhotoUrl ? (
      <Image height={74} src={record.userPhotoUrl} width={56} preview={{ mask: '预览' }} />
    ) : (
      <div className="record-image-empty">
        <CameraOutlined />
        <em>{getRecordSource(record) === 'photo' ? '未保存' : '无原图'}</em>
      </div>
    )}
    <small title={getContentTitle(record)}>{getContentTitle(record)}</small>
  </div>
)

const ResultCell = ({ record }: { record: OutfitRecordModel }) => {
  if (record.recordStatus === 'failed') {
    return (
      <div className="record-failed-card">
        <strong>生成失败</strong>
        <span>{getFailureReason(record)}</span>
      </div>
    )
  }

  const images = getRecordImages(record)
  if (!images.length) {
    return <div className="record-result-empty">暂无结果</div>
  }

  return (
    <div className="record-result-cell">
      <Image.PreviewGroup>
        {images.slice(0, 4).map((image, index) => (
          <Image height={74} key={`${record.recordId}-${image}`} src={image} width={56} preview={{ mask: `结果${index + 1}` }} />
        ))}
      </Image.PreviewGroup>
      <span className="record-result-count">共{images.length}张</span>
    </div>
  )
}

const MethodCell = ({ record }: { record: OutfitRecordModel }) => {
  const source = sourceMeta[getRecordSource(record)]
  return (
    <span className={`record-method ${source.className}`}>
      {source.icon}
      {source.label}
    </span>
  )
}

const StatusCell = ({ status }: { status: string }) => {
  const meta = statusMeta[status] || statusMeta.succeeded
  return <span className={`record-status-pill ${meta.className}`}>{meta.label}</span>
}

const OutfitRecordPage = () => {
  const { message, modal } = App.useApp()
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [activeStat, setActiveStat] = useState<StatKey>('all')
  const [records, setRecords] = useState<OutfitRecordModel[]>([])
  const [stats, setStats] = useState<Record<StatKey, number>>({
    all: 0,
    photo: 0,
    keyword: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [detailRecord, setDetailRecord] = useState<OutfitRecordModel>()

  const queryParams = useMemo<ListOutfitRecordParams>(
    () => ({
      page,
      limit: pageSize,
      source: filters.source,
      status: filters.status,
      keyword: filters.keyword.trim() || undefined,
      createTime: filters.createTime,
    }),
    [filters, page, pageSize],
  )

  const loadRecords = async () => {
    setLoading(true)
    try {
      const { items, meta } = await listOutfitRecord(queryParams)
      setRecords(items)
      setTotal(meta.totalItems || 0)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '生成记录加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    const statQueries: Record<StatKey, ListOutfitRecordParams> = {
      all: { page: 1, limit: 1, source: 'all', status: 'all' },
      photo: { page: 1, limit: 1, source: 'photo', status: 'all' },
      keyword: { page: 1, limit: 1, source: 'keyword', status: 'all' },
      running: { page: 1, limit: 1, source: 'all', status: 'running' },
      succeeded: { page: 1, limit: 1, source: 'all', status: 'succeeded' },
      failed: { page: 1, limit: 1, source: 'all', status: 'failed' },
    }

    try {
      const entries = await Promise.all(
        statOptions.map(async ({ key }) => {
          const { meta } = await listOutfitRecord(statQueries[key])
          return [key, meta.totalItems || 0] as const
        }),
      )
      setStats(Object.fromEntries(entries) as Record<StatKey, number>)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '生成记录统计加载失败')
    }
  }

  useEffect(() => {
    void loadRecords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams])

  useEffect(() => {
    void loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setActiveStat('all')
    setPage(1)
  }

  const handleStatChange = (key: StatKey) => {
    setActiveStat(key)
    if (key === 'photo' || key === 'keyword') {
      setFilters((current) => ({ ...current, source: key, status: 'all' }))
    } else if (key === 'running' || key === 'succeeded' || key === 'failed') {
      setFilters((current) => ({ ...current, source: 'all', status: key }))
    } else {
      setFilters((current) => ({ ...current, source: 'all', status: 'all' }))
    }
    setPage(1)
  }

  const handleDateChange: RangePickerProps['onChange'] = (_, dateStrings) => {
    updateFilter('createTime', dateStrings[0] && dateStrings[1] ? [dateStrings[0], dateStrings[1]] : undefined)
  }

  const handleRefresh = async () => {
    await Promise.all([loadRecords(), loadStats()])
    message.success('记录已刷新')
  }

  const handleExport = async () => {
    try {
      const { items } = await listOutfitRecord({
        ...queryParams,
        page: 1,
        limit: 1000,
      })
      const header = ['记录ID', '用户', '用户ID', '任务ID', '生成方式', '提示词', '状态', '创建时间', '生成时间']
      const rows = items.map((record) => [
        record.recordId,
        getUserName(record),
        record.userId || '-',
        record.taskId || record.generationId || '-',
        sourceMeta[getRecordSource(record)].label,
        getPromptText(record),
        (statusMeta[record.recordStatus] || statusMeta.succeeded).label,
        formatTime(record.createTime),
        formatTime(record.generatedAt),
      ])
      const csv = [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n')
      saveAs(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }), `生成记录-${dayjs().format('YYYYMMDDHHmmss')}.csv`)
      message.success('已导出当前筛选条件下的前 1000 条记录')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '生成记录导出失败')
    }
  }

  const handleDelete = (record: OutfitRecordModel) => {
    modal.confirm({
      title: '删除生成记录',
      content: `确认删除「${getContentTitle(record)}」？删除后该记录和已保存图片将不可恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        await deleteOutfitRecord(record.recordId)
        message.success('生成记录已删除')
        await Promise.all([loadRecords(), loadStats()])
      },
    })
  }

  const columns = useMemo<ColumnsType<OutfitRecordModel>>(
    () => [
      {
        title: '用户信息',
        dataIndex: 'userId',
        fixed: 'left',
        width: 178,
        render: (_, record) => <UserCell record={record} />,
      },
      {
        title: '生成内容',
        dataIndex: 'outfitTitle',
        width: 170,
        render: (_, record) => <SourceImage record={record} />,
      },
      {
        title: '生成结果',
        dataIndex: 'imageUrl',
        width: 270,
        render: (_, record) => <ResultCell record={record} />,
      },
      {
        title: '生成方式',
        dataIndex: 'source',
        width: 132,
        render: (_, record) => <MethodCell record={record} />,
      },
      {
        title: '提示词',
        dataIndex: 'imagePrompt',
        width: 280,
        render: (_, record) => (
          <Tooltip placement="topLeft" title={getPromptText(record)}>
            <Typography.Paragraph className="record-prompt" ellipsis={{ rows: 2 }}>
              {getPromptText(record)}
            </Typography.Paragraph>
          </Tooltip>
        ),
      },
      {
        title: '状态',
        dataIndex: 'recordStatus',
        width: 104,
        render: (status: string) => <StatusCell status={status} />,
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        width: 206,
        render: (_, record) => (
          <div className="record-time-cell">
            <strong>{formatTime(record.createTime)}</strong>
            <span>任务ID：{compactId(record.taskId || record.generationId || record.recordId, 9, 8)}</span>
          </div>
        ),
      },
      {
        title: '操作',
        dataIndex: 'action',
        fixed: 'right',
        align: 'right',
        width: 168,
        render: (_, record) => (
          <Space className="record-actions" size={2}>
            <Tooltip title="查看详情">
              <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => setDetailRecord(record)}>
                查看
              </Button>
            </Tooltip>
            <Tooltip title="下载生成结果">
              <Button
                size="small"
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => {
                  if (!downloadImage(record)) message.warning('当前记录暂无可下载图片')
                }}
              >
                下载
              </Button>
            </Tooltip>
            <Tooltip title="删除记录">
              <Button danger size="small" type="link" icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
                删除
              </Button>
            </Tooltip>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [message, modal],
  )

  return (
    <div className="outfit-record-page">
      <header className="record-page-header">
        <div className="record-title-block">
          <Typography.Title level={3}>生成记录</Typography.Title>
          <Typography.Text>管理用户通过上传图片或提示词生成的换装结果</Typography.Text>
        </div>
        <Space className="record-page-actions" size={10}>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
          <Button icon={<DownloadOutlined />} type="primary" onClick={handleExport}>
            导出记录
          </Button>
        </Space>
      </header>

      <section className="record-filter-bar">
        <div className="record-filter-item">
          <span>生成方式</span>
          <Select value={filters.source} options={sourceOptions} onChange={(value) => updateFilter('source', value)} />
        </div>
        <div className="record-filter-item">
          <span>生成状态</span>
          <Select value={filters.status} options={statusOptions} onChange={(value) => updateFilter('status', value)} />
        </div>
        <div className="record-filter-item record-date-filter">
          <span>创建时间</span>
          <RangePicker placeholder={['开始日期', '结束日期']} onChange={handleDateChange} />
        </div>
        <Input
          allowClear
          className="record-search"
          prefix={<SearchOutlined />}
          placeholder="搜索用户ID / 昵称 / 任务ID"
          value={filters.keyword}
          onChange={(event) => updateFilter('keyword', event.target.value)}
        />
      </section>

      <section className="record-board">
        <div className="record-stat-tabs" aria-label="生成记录统计">
          {statOptions.map((item) => (
            <button className={activeStat === item.key ? 'active' : ''} key={item.key} type="button" onClick={() => handleStatChange(item.key)}>
              <span>{item.label}</span>
              <strong>{stats[item.key].toLocaleString()}</strong>
            </button>
          ))}
        </div>

        <Table<OutfitRecordModel>
          className="record-table"
          columns={columns}
          dataSource={records}
          loading={loading}
          rowKey="recordId"
          scroll={{ x: 1536 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (value) => `共 ${value.toLocaleString()} 条`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage)
              setPageSize(nextPageSize)
            },
          }}
          locale={{ emptyText: <div className="record-empty">暂无生成记录</div> }}
        />
      </section>

      <Modal
        open={Boolean(detailRecord)}
        title="生成记录详情"
        width={980}
        footer={null}
        className="outfit-record-detail-modal"
        onCancel={() => setDetailRecord(undefined)}
      >
        {detailRecord ? (
          <Space direction="vertical" size={18} className="record-detail-content">
            <div className="record-detail-heading">
              <div>
                <Typography.Title level={4}>
                  #{detailRecord.recordId} {getContentTitle(detailRecord)}
                </Typography.Title>
                <Typography.Text type="secondary">{formatTime(detailRecord.generatedAt || detailRecord.createTime)}</Typography.Text>
              </div>
              <Space wrap>
                <Tag>{sourceMeta[getRecordSource(detailRecord)].label}</Tag>
                <Tag>{(statusMeta[detailRecord.recordStatus] || statusMeta.succeeded).label}</Tag>
              </Space>
            </div>

            <div className="record-detail-images">
              {detailRecord.userPhotoUrl ? (
                <div className="record-detail-image-card">
                  <Typography.Text type="secondary">用户上传原图</Typography.Text>
                  <Image src={detailRecord.userPhotoUrl} className="record-detail-image" />
                </div>
              ) : null}
              {getRecordImages(detailRecord).map((image) => (
                <div className="record-detail-image-card" key={image}>
                  <Typography.Text type="secondary">AI 生成结果</Typography.Text>
                  <Image src={image} className="record-detail-image" />
                </div>
              ))}
            </div>

            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="记录ID">{detailRecord.recordId}</Descriptions.Item>
              <Descriptions.Item label="任务ID">{detailRecord.taskId || '-'}</Descriptions.Item>
              <Descriptions.Item label="结果ID">{detailRecord.generationId || '-'}</Descriptions.Item>
              <Descriptions.Item label="用户">{getUserName(detailRecord)}</Descriptions.Item>
              <Descriptions.Item label="用户ID" span={2}>{detailRecord.userId || '-'}</Descriptions.Item>
              <Descriptions.Item label="生成方式">{sourceMeta[getRecordSource(detailRecord)].label}</Descriptions.Item>
              <Descriptions.Item label="状态">{(statusMeta[detailRecord.recordStatus] || statusMeta.succeeded).label}</Descriptions.Item>
              <Descriptions.Item label="场景">{detailRecord.occasion || '-'}</Descriptions.Item>
              <Descriptions.Item label="风格">{detailRecord.style || '-'}</Descriptions.Item>
              <Descriptions.Item label="天气">{detailRecord.weather || '-'}</Descriptions.Item>
              <Descriptions.Item label="地点">{detailRecord.location || '-'}</Descriptions.Item>
              <Descriptions.Item label="风格标签" span={2}>
                <Space wrap>
                  {parseJsonArray<string>(detailRecord.styleTags).map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="总结" span={2}>
                {detailRecord.summary || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="图片提示词" span={2}>
                <Typography.Paragraph copyable style={{ marginBottom: 0 }}>
                  {detailRecord.imagePrompt || '-'}
                </Typography.Paragraph>
              </Descriptions.Item>
            </Descriptions>
          </Space>
        ) : null}
      </Modal>
    </div>
  )
}

export default OutfitRecordPage
