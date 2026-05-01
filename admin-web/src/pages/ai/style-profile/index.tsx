import {
  ArrowLeftOutlined,
  BgColorsOutlined,
  DownloadOutlined,
  EditOutlined,
  HeartOutlined,
  PlusOutlined,
  RightOutlined,
  SearchOutlined,
  SkinOutlined,
  StarOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  App,
  Avatar,
  Button,
  Card,
  Empty,
  Form,
  Image,
  Input,
  Progress,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { queryStyleProfileArchive, queryStyleProfileUsers } from '@/apis/style-profile'
import type {
  H5BodyMetricItem,
  H5ColorPreferenceItem,
  H5FitTypeItem,
  H5InspirationItem,
  H5StyleArchive,
  H5StylePreferenceItem,
  H5StyleProfileUserCard,
  StyleProfileQueryParams,
} from '@/apis/style-profile'
import './index.less'

const { Text, Title } = Typography

const metricLabels: Record<string, string> = {
  height: '身高',
  weight: '体重',
  clothingSize: '服装',
  shoeSize: '鞋码',
}

export default function StyleProfilePage() {
  const [form] = Form.useForm<StyleProfileQueryParams>()
  const { message } = App.useApp()
  const [cards, setCards] = useState<H5StyleProfileUserCard[]>([])
  const [activeCard, setActiveCard] = useState<H5StyleProfileUserCard>()
  const [archive, setArchive] = useState<H5StyleArchive>()
  const [loadingCards, setLoadingCards] = useState(false)
  const [loadingArchive, setLoadingArchive] = useState(false)

  async function loadCards(values: StyleProfileQueryParams = {}) {
    setLoadingCards(true)
    setArchive(undefined)
    setActiveCard(undefined)
    try {
      const nextCards = await queryStyleProfileUsers(normalizeQuery(values))
      setCards(nextCards)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '风格档案用户查询失败')
    } finally {
      setLoadingCards(false)
    }
  }

  async function openArchive(card: H5StyleProfileUserCard) {
    setActiveCard(card)
    setLoadingArchive(true)
    try {
      const nextArchive = await queryStyleProfileArchive({
        userId: card.userId ? String(card.userId).padStart(4, '0') : undefined,
      })
      setArchive(nextArchive)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '风格档案详情查询失败')
    } finally {
      setLoadingArchive(false)
    }
  }

  useEffect(() => {
    void loadCards()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="style-profile-admin">
      <header className="style-profile-hero">
        <div>
          <Title level={3}>风格档案管理</Title>
          <Text type="secondary">先定位用户档案卡片，再进入完整风格画像、偏好趋势和灵感库分析。</Text>
        </div>
        <Space>
          {archive ? (
            <Button icon={<ArrowLeftOutlined />} onClick={() => setArchive(undefined)}>
              返回用户卡片
            </Button>
          ) : null}
          <Button icon={<PlusOutlined />} type="primary">
            新建档案
          </Button>
          <Button icon={<DownloadOutlined />}>导出档案</Button>
        </Space>
      </header>

      {!archive ? (
        <>
          <Card className="style-profile-query-card" variant="borderless">
            <Form form={form} layout="inline" onFinish={loadCards}>
              <Form.Item name="userId" label="用户ID">
                <Input allowClear placeholder="如 0003 或 3" prefix={<SearchOutlined />} style={{ width: 180 }} />
              </Form.Item>
              <Form.Item name="keyword" label="关键词">
                <Input allowClear placeholder="昵称 / 风格 / 任务关键词" style={{ width: 220 }} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button htmlType="submit" loading={loadingCards} type="primary">
                    查询用户
                  </Button>
                  <Button
                    onClick={() => {
                      form.resetFields()
                      void loadCards()
                    }}
                  >
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>

          <Spin spinning={loadingCards}>
            {cards.length ? (
              <section className="style-user-grid">
                {cards.map((card) => (
                  <UserCard card={card} key={card.id} onClick={() => void openArchive(card)} />
                ))}
              </section>
            ) : (
              <Empty className="style-profile-empty" description="暂无匹配用户档案" />
            )}
          </Spin>
        </>
      ) : (
        <Spin spinning={loadingArchive}>
          <ArchiveDashboard archive={archive} card={activeCard} />
        </Spin>
      )}
    </div>
  )
}

function UserCard({ card, onClick }: { card: H5StyleProfileUserCard; onClick: () => void }) {
  return (
    <button className="style-user-card" type="button" onClick={onClick}>
      <div className="style-user-card-top">
        <Avatar src={card.avatar} size={56} icon={<UserOutlined />} />
        <span>
          <strong>{card.displayName}</strong>
          <small>{card.userId ? `用户ID ${String(card.userId).padStart(4, '0')}` : '未绑定用户'}</small>
        </span>
        <RightOutlined />
      </div>
      <div className="style-user-tags">
        {(card.topStyles.length ? card.topStyles : ['待分析']).map((style) => (
          <Tag key={style}>{style}</Tag>
        ))}
      </div>
      <div className="style-user-stats">
        <span>
          <strong>{card.recordCount}</strong>
          有效记录
        </span>
        <span>
          <strong>{card.photoRecordCount}</strong>
          照片记录
        </span>
        <span>
          <strong>{card.styleCount}</strong>
          风格偏好
        </span>
      </div>
      <em>更新时间 {formatDate(card.updatedAt)}</em>
    </button>
  )
}

function ArchiveDashboard({ archive, card }: { archive: H5StyleArchive; card?: H5StyleProfileUserCard }) {
  const topStats = [
    { label: '风格偏好', value: archive.stylePreferences.length, suffix: '个主要风格', icon: <StarOutlined /> },
    { label: '色彩偏好', value: archive.colorPreferences.length, suffix: '种常用色系', icon: <BgColorsOutlined /> },
    { label: '元素偏好', value: archive.elementPreferences.length, suffix: '个偏好元素', icon: <EditOutlined /> },
    { label: '适合版型', value: archive.fitTypes.length, suffix: '种推荐版型', icon: <SkinOutlined /> },
    { label: '灵感收藏', value: archive.inspiration.length, suffix: '套收藏穿搭', icon: <HeartOutlined /> },
  ]
  const profileFacts = [
    card?.userId ? `ID: ${String(card.userId).padStart(4, '0')}` : undefined,
    archive.profile.height,
    archive.profile.weight,
    archive.profile.clothingSize,
  ].filter(Boolean)

  return (
    <section className="style-archive-dashboard">
      <div className="style-archive-top">
        <Card className="style-archive-profile" variant="borderless">
          <Avatar src={archive.profile.avatar || card?.avatar} size={76} icon={<UserOutlined />} />
          <div>
            <Space align="center">
              <Title level={4}>{archive.profile.displayName}</Title>
              <Button icon={<EditOutlined />} size="small" type="text">
                编辑
              </Button>
            </Space>
            <Text type="secondary">创建时间：{formatDate(archive.summary.updatedAt)}</Text>
            <div className="style-profile-facts">
              {profileFacts.map((fact) => (
                <Tag key={fact}>{fact}</Tag>
              ))}
            </div>
          </div>
        </Card>
        <Card className="style-stat-strip" variant="borderless">
          {topStats.map((item) => (
            <div className="style-stat-item" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.suffix}</small>
              <i>{item.icon}</i>
            </div>
          ))}
        </Card>
      </div>

      <div className="style-archive-grid">
        <Panel title="风格偏好" action="查看全部">
          <div className="style-preference-list">
            {archive.stylePreferences.length ? (
              archive.stylePreferences.slice(0, 4).map((item) => <StylePreference item={item} key={item.id} />)
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无风格偏好" />
            )}
          </div>
        </Panel>

        <Panel title="色彩偏好" action="查看全部">
          <ColorPalette items={archive.colorPreferences} />
        </Panel>

        <Panel title="元素偏好" action="查看全部">
          {archive.elementPreferences.length ? (
            <div className="style-element-cloud">
              {archive.elementPreferences.map((item, index) => (
                <span key={item}>
                  {item}
                  <small>{Math.max(5, 18 - index)}%</small>
                </span>
              ))}
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无元素偏好" />
          )}
        </Panel>

        <Panel title="身材数据" action="编辑">
          <BodyMetrics profile={archive.profile} items={archive.bodyMetrics} />
        </Panel>

        <Panel title="适合我的版型" action="查看全部">
          <FitGrid items={archive.fitTypes} />
        </Panel>

        <Panel title="我的灵感库" action="查看全部">
          <InspirationGrid items={archive.inspiration} />
        </Panel>
      </div>

      <Card className="style-trend-card" title="风格偏好变化趋势" variant="borderless">
        <TrendChart styles={archive.stylePreferences} />
        <div className="style-analysis-summary">
          <strong>分析总结</strong>
          <span>主导风格集中在 {archive.stylePreferences[0]?.label || '待分析'}，偏好稳定度较高。</span>
          <span>高频元素包括 {archive.elementPreferences.slice(0, 3).join('、') || '待生成更多记录'}。</span>
          <span>色彩偏好以 {archive.colorPreferences.slice(0, 2).map((item) => item.label).join('、') || '基础色'} 为主。</span>
        </div>
      </Card>
    </section>
  )
}

function Panel({ action, children, title }: { action?: string; children: ReactNode; title: string }) {
  return (
    <Card
      className="style-panel"
      title={title}
      extra={
        action ? (
          <Button size="small" type="text">
            {action} <RightOutlined />
          </Button>
        ) : null
      }
      variant="borderless"
    >
      {children}
    </Card>
  )
}

function StylePreference({ item }: { item: H5StylePreferenceItem }) {
  return (
    <div className="style-preference-item">
      {item.imageUrl ? <Image src={item.imageUrl} preview={false} /> : <span className="style-image-placeholder" />}
      <div>
        <strong>{item.label}</strong>
        <Progress percent={item.percent} showInfo={false} strokeColor="#6d5dfc" trailColor="#eef0f8" />
      </div>
      <em>{item.percent}%</em>
    </div>
  )
}

function ColorPalette({ items }: { items: H5ColorPreferenceItem[] }) {
  const primary = items.slice(0, 5)
  const secondary = items.slice(5, 10)
  if (!items.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无色彩偏好" />
  }

  return (
    <div className="style-color-palette">
      <div>
        {primary.map((item, index) => (
          <ColorDot item={item} key={item.id} percent={Math.max(10, 18 - index * 2)} />
        ))}
        <small>常用色</small>
      </div>
      <div>
        {secondary.map((item, index) => (
          <ColorDot item={item} key={item.id} percent={Math.max(5, 8 - index)} />
        ))}
        <small>辅助色</small>
      </div>
    </div>
  )
}

function ColorDot({ item, percent }: { item: H5ColorPreferenceItem; percent: number }) {
  return (
    <span className="style-color-dot">
      <i style={{ backgroundColor: item.value }} />
      <em>{percent}%</em>
    </span>
  )
}

function BodyMetrics({ items, profile }: { items: H5BodyMetricItem[]; profile: H5StyleArchive['profile'] }) {
  const profileItems = [
    { id: 'height', label: metricLabels.height, value: profile.height },
    { id: 'weight', label: metricLabels.weight, value: profile.weight },
    { id: 'clothingSize', label: metricLabels.clothingSize, value: profile.clothingSize },
    { id: 'shoeSize', label: metricLabels.shoeSize, value: profile.shoeSize },
  ].filter((item) => item.value)

  return (
    <div className="style-body-metrics">
      <div className="style-body-figure">
        <UserOutlined />
      </div>
      <div>
        {[...profileItems, ...items].slice(0, 10).map((item) => (
          <span key={item.id}>
            <small>{item.label}</small>
            <strong>{item.value || '待完善'}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}

function FitGrid({ items }: { items: H5FitTypeItem[] }) {
  if (!items.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无版型偏好" />
  }

  return (
    <div className="style-fit-grid">
      {items.map((item) => (
        <span title={item.description} key={item.id}>
          <SkinOutlined />
          <strong>{item.label}</strong>
        </span>
      ))}
    </div>
  )
}

function InspirationGrid({ items }: { items: H5InspirationItem[] }) {
  if (!items.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无灵感收藏" />
  }

  return (
    <div className="style-inspiration-grid">
      {items.slice(0, 4).map((item, index) => (
        <span key={item.id}>
          <Image src={item.imageUrl} preview={false} />
          {index === 0 ? <HeartOutlined /> : null}
        </span>
      ))}
    </div>
  )
}

function TrendChart({ styles }: { styles: H5StylePreferenceItem[] }) {
  const activeStyles = styles.slice(0, 4)
  if (!activeStyles.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无趋势数据" />
  }

  const months = ['2023-12', '2024-01', '2024-02', '2024-03', '2024-04', '2024-05']
  const colors = ['#6657ff', '#42a8ff', '#45bd72', '#f0aa00']
  const lines = activeStyles.map((style, styleIndex) => {
    const base = Math.max(12, style.percent)
    return months
      .map((_, monthIndex) => {
        const x = 36 + monthIndex * 122
        const wave = Math.sin((monthIndex + styleIndex) * 0.9) * 10
        const y = 148 - Math.min(92, Math.max(8, base + wave + styleIndex * 6))
        return `${x},${y}`
      })
      .join(' ')
  })

  return (
    <div className="style-trend-wrap">
      <div className="style-trend-legend">
        {activeStyles.map((style, index) => (
          <span key={style.id}>
            <i style={{ backgroundColor: colors[index] }} />
            {style.label}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 680 170" role="img" aria-label="风格偏好变化趋势">
        {[0, 1, 2].map((line) => (
          <path d={`M34 ${36 + line * 46} H650`} key={line} />
        ))}
        {lines.map((points, index) => (
          <polyline key={activeStyles[index].id} points={points} stroke={colors[index]} />
        ))}
      </svg>
      <div className="style-trend-months">
        {months.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </div>
  )
}

function normalizeQuery(values: StyleProfileQueryParams): StyleProfileQueryParams {
  return {
    keyword: values.keyword?.trim() || undefined,
    userId: values.userId?.trim() || undefined,
  }
}

function formatDate(value?: string) {
  if (!value) return '-'
  return value.slice(0, 10)
}
