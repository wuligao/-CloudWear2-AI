import type { OutfitRecord } from './entities/outfit-record.entity'

export interface H5ProfileRecordSummary {
  all: number
  running: number
  succeeded: number
  failed: number
}

export interface H5ProfileUserInput {
  displayName?: string
  avatar?: string
  memberLevel?: string
}

export interface H5StyleProfileInput {
  height?: string
  weight?: string
  clothingSize?: string
  shoeSize?: string
  favoriteStyles?: string[]
  favoriteColors?: string[]
  avoidColors?: string[]
  commonOccasions?: string[]
  elementPreferences?: string[]
  fitPreferences?: string[]
  bodyMetrics?: Partial<Record<'shoulder' | 'bust' | 'waist' | 'hip' | 'thigh' | 'calf', string>>
  basePhotos?: Partial<Record<'fullBody' | 'face' | 'makeupFree', { url: string; updatedAt?: string }>>
  analysisReport?: unknown
  recommendedColors?: Array<{ label: string; value: string }>
  recommendedStyles?: Array<{ label: string; description?: string; imageUrl?: string }>
  analysisUpdatedAt?: string
  notes?: string
}

export interface H5ProfileOverviewInput extends H5ProfileUserInput {
  pointsBalance?: number
  dailyLimit?: number
  generatedToday: number
  recordSummary: H5ProfileRecordSummary
  archive: H5StyleArchive
}

export interface H5ProfileMenuItem {
  id: string
  label: string
  icon: string
  href?: string
  badge?: string
  description?: string
}

export interface H5ProfileMenuGroup {
  id: string
  title: string
  layout: 'grid' | 'list'
  items: H5ProfileMenuItem[]
}

export interface H5StylePreferenceItem {
  id: string
  label: string
  percent: number
  imageUrl?: string
}

export interface H5ColorPreferenceItem {
  id: string
  label: string
  value: string
}

export interface H5BodyMetricItem {
  id: string
  label: string
  value: string
}

export interface H5FitTypeItem {
  id: string
  label: string
  description: string
}

export interface H5InspirationItem {
  id: string
  title: string
  imageUrl: string
}

export interface H5StyleArchive {
  profile: {
    displayName: string
    statusLabel: string
    avatar?: string
    height?: string
    weight?: string
    clothingSize?: string
    shoeSize?: string
  }
  summary: {
    recordCount: number
    photoRecordCount: number
    updatedAt?: string
  }
  stylePreferences: H5StylePreferenceItem[]
  colorPreferences: H5ColorPreferenceItem[]
  elementPreferences: string[]
  bodyMetrics: H5BodyMetricItem[]
    fitTypes: H5FitTypeItem[]
    inspiration: H5InspirationItem[]
    valueProps: H5ProfileMenuItem[]
    notes?: string
}

export interface H5ProfileOverview {
  user: {
    displayName: string
    memberLevel: string
    avatar?: string
  }
  stats: {
    pointsBalance: number
    dailyGenerated: number
    dailyLimit: number
    remainingToday: number
  }
  benefits: H5ProfileMenuItem[]
  orderStatuses: Array<H5ProfileMenuItem & { count: number }>
  invite: {
    title: string
    subtitle: string
    rewardPoints: number
  }
  menuGroups: H5ProfileMenuGroup[]
  archive: H5StyleArchive
}

const defaultDailyLimit = 5
const defaultPointsBalance = 0

const colorSwatches: Record<string, string> = {
  黑: '#111111',
  黑色: '#111111',
  白: '#f8f8f5',
  白色: '#f8f8f5',
  灰: '#9b9baa',
  灰色: '#9b9baa',
  蓝: '#8fb6e8',
  蓝色: '#8fb6e8',
  浅蓝: '#9fc4f0',
  燕麦: '#c7b7a2',
  燕麦色: '#c7b7a2',
  米: '#eadfca',
  米色: '#eadfca',
  紫: '#aaa0c4',
  紫色: '#aaa0c4',
  粉: '#e7b7c8',
  粉色: '#e7b7c8',
  绿: '#9dbf9f',
  绿色: '#9dbf9f',
  棕: '#9a765f',
  棕色: '#9a765f',
  卡其: '#c2ad86',
}

export function buildH5ProfileOverview(input: H5ProfileOverviewInput): H5ProfileOverview {
  const dailyLimit = Math.max(1, input.dailyLimit ?? defaultDailyLimit)
  const dailyGenerated = clampCount(input.generatedToday)
  const summary = normalizeSummary(input.recordSummary)

  return {
    user: {
      displayName: input.displayName || '云裳用户',
      memberLevel: input.memberLevel || '风格档案中',
      avatar: input.avatar,
    },
    stats: {
      pointsBalance: Math.max(0, input.pointsBalance ?? defaultPointsBalance),
      dailyGenerated,
      dailyLimit,
      remainingToday: Math.max(0, dailyLimit - dailyGenerated),
    },
    benefits: [
      { id: 'accurate', label: '更懂你', icon: 'target', description: '个性化推荐更精准' },
      { id: 'efficient', label: '更高效', icon: 'shirt', description: '快速找到适合风格' },
      { id: 'confident', label: '更自信', icon: 'heart', description: '穿出属于你的风格' },
      { id: 'growth', label: '可成长', icon: 'chart', description: '档案越完善，推荐越准' },
    ],
    orderStatuses: [
      { id: 'all', label: '全部', icon: 'list', href: '/history?status=all', count: summary.all },
      {
        id: 'running',
        label: '进行中',
        icon: 'refresh-cw',
        href: '/history?status=running',
        count: summary.running,
      },
      {
        id: 'succeeded',
        label: '已完成',
        icon: 'check-square',
        href: '/history?status=succeeded',
        count: summary.succeeded,
      },
      { id: 'failed', label: '已失败', icon: 'x-square', href: '/history?status=failed', count: summary.failed },
    ],
    invite: {
      title: '完善风格档案',
      subtitle: '上传照片与保存记录越多，推荐越贴近你',
      rewardPoints: 0,
    },
    menuGroups: [],
    archive: input.archive,
  }
}

export function buildH5StyleArchive(
  records: OutfitRecord[],
  user: H5ProfileUserInput = {},
  styleProfile: H5StyleProfileInput = {}
): H5StyleArchive {
  const succeededRecords = records.filter((record) => record.recordStatus !== 'failed')
  const latestRecord = succeededRecords[0] || records[0]
  const recordCount = succeededRecords.length
  const displayName = user.displayName || '云裳用户'
  const stylePreferences = styleProfile.favoriteStyles?.length
    ? buildManualStylePreferences(styleProfile.favoriteStyles)
    : buildStylePreferences(succeededRecords)
  const colorPreferences = styleProfile.favoriteColors?.length
    ? buildManualColorPreferences(styleProfile.favoriteColors)
    : buildColorPreferences(succeededRecords)
  const elementPreferences = styleProfile.elementPreferences?.length
    ? styleProfile.elementPreferences
    : buildElementPreferences(succeededRecords)
  const inspiration = succeededRecords
    .filter((record) => Boolean(record.imageUrl))
    .slice(0, 8)
    .map((record) => ({
      id: String(record.recordId),
      title: record.outfitTitle,
      imageUrl: record.imageUrl,
    }))

  return {
    profile: {
      displayName,
      statusLabel: recordCount > 0 ? '风格档案中' : '待生成记录',
      avatar: user.avatar,
      height: styleProfile.height,
      weight: styleProfile.weight,
      clothingSize: styleProfile.clothingSize,
      shoeSize: styleProfile.shoeSize,
    },
    summary: {
      recordCount,
      photoRecordCount: succeededRecords.filter((record) => record.source === 'photo' || record.userPhotoUsed).length,
      updatedAt: latestRecord?.generatedAt?.toISOString?.(),
    },
    stylePreferences,
    colorPreferences,
    elementPreferences,
    bodyMetrics: buildBodyMetrics(styleProfile.bodyMetrics),
    fitTypes: styleProfile.fitPreferences?.length ? buildManualFitTypes(styleProfile.fitPreferences) : buildFitTypes(succeededRecords),
    inspiration,
    valueProps: [
      { id: 'accurate', label: '更懂你', icon: 'target', description: '个性化推荐更精准' },
      { id: 'efficient', label: '更高效', icon: 'shirt', description: '快速找到适合风格' },
      { id: 'confident', label: '更自信', icon: 'heart', description: '穿出属于你的风格' },
      { id: 'growth', label: '可成长', icon: 'chart', description: '档案越完善，推荐越准' },
    ],
    notes: styleProfile.notes,
  }
}

function buildManualStylePreferences(labels: string[]) {
  const total = labels.length
  return labels.slice(0, 4).map((label, index) => ({
    id: `manual-style-${index}-${label}`,
    label,
    percent: Math.max(20, Math.round(((total - index) / total) * 100)),
  }))
}

function buildManualColorPreferences(labels: string[]) {
  return labels.slice(0, 6).map((label, index) => ({
    id: `manual-color-${index}-${label}`,
    label,
    value: resolveColorValue(label),
  }))
}

function buildManualFitTypes(labels: string[]) {
  return labels.slice(0, 5).map((label, index) => ({
    id: `manual-fit-${index}-${label}`,
    label,
    description: '手动设置的版型偏好',
  }))
}

function buildBodyMetrics(metrics: H5StyleProfileInput['bodyMetrics'] = {}) {
  return [
    { id: 'shoulder', label: '肩宽', value: metrics.shoulder || '待完善' },
    { id: 'bust', label: '胸围', value: metrics.bust || '待完善' },
    { id: 'waist', label: '腰围', value: metrics.waist || '待完善' },
    { id: 'hip', label: '臀围', value: metrics.hip || '待完善' },
    { id: 'thigh', label: '大腿围', value: metrics.thigh || '待完善' },
    { id: 'calf', label: '小腿围', value: metrics.calf || '待完善' },
  ]
}

function buildStylePreferences(records: OutfitRecord[]) {
  const counts = new Map<string, { count: number; imageUrl?: string }>()
  records.forEach((record) => {
    const labels = [
      ...parseJson<string[]>(record.styleTags, []),
      ...splitText(record.style),
      ...splitText(record.occasion),
    ].slice(0, 10)

    labels.forEach((label) => {
      const normalized = normalizeLabel(label)
      if (!normalized) return
      const current = counts.get(normalized) || { count: 0, imageUrl: record.imageUrl }
      current.count += 1
      current.imageUrl ||= record.imageUrl
      counts.set(normalized, current)
    })
  })

  const total = Array.from(counts.values()).reduce((sum, item) => sum + item.count, 0)
  return Array.from(counts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4)
    .map(([label, item], index) => ({
      id: `style-${index}-${label}`,
      label,
      percent: total > 0 ? Math.max(5, Math.round((item.count / total) * 100)) : 0,
      imageUrl: item.imageUrl,
    }))
}

function buildColorPreferences(records: OutfitRecord[]) {
  const counts = new Map<string, number>()
  records.forEach((record) => {
    splitText(record.colorPreference).forEach((color) => addCount(counts, normalizeColorLabel(color)))
    parseJson<Array<{ color?: string }>>(record.items, []).forEach((item) => {
      splitText(item.color).forEach((color) => addCount(counts, normalizeColorLabel(color)))
    })
  })

  return Array.from(counts.entries())
    .filter(([label]) => Boolean(label))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label], index) => ({
      id: `color-${index}-${label}`,
      label,
      value: resolveColorValue(label),
    }))
}

function buildElementPreferences(records: OutfitRecord[]) {
  const counts = new Map<string, number>()
  records.forEach((record) => {
    parseJson<Array<{ category?: string; name?: string; material?: string }>>(record.items, []).forEach((item) => {
      addCount(counts, normalizeLabel(item.category))
      addCount(counts, normalizeLabel(item.name))
      addCount(counts, normalizeLabel(item.material))
    })
    parseJson<string[]>(record.styleTags, []).forEach((tag) => addCount(counts, normalizeLabel(tag)))
  })

  return Array.from(counts.entries())
    .filter(([label]) => Boolean(label))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label]) => label)
}

function buildFitTypes(records: OutfitRecord[]) {
  const text = records.map((record) => `${record.summary} ${record.style} ${record.occasion} ${record.items}`).join(' ')
  const candidates = [
    { id: 'straight', label: '直筒', description: '线条利落，适合通勤和日常' },
    { id: 'a-line', label: '高腰A字', description: '强调比例，适合裙装和外套搭配' },
    { id: 'h-line', label: 'H型', description: '轮廓干净，适合简约层次' },
    { id: 'x-line', label: 'X型', description: '突出腰线，适合精致场景' },
    { id: 'relaxed', label: '微宽松', description: '舒适留量，适合休闲与叠穿' },
  ]

  return candidates
    .map((item) => ({
      ...item,
      score: text.includes(item.label) || text.includes(item.description.slice(0, 2)) ? 2 : 1,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ score, ...item }) => item)
}

function splitText(value?: string) {
  if (!value) return []
  return value
    .split(/[，,、/｜|;；\s]+/u)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeLabel(value?: string) {
  if (!value) return ''
  return value.trim().replace(/^偏好[:：]/u, '').slice(0, 8)
}

function normalizeColorLabel(value?: string) {
  return normalizeLabel(value).replace(/[系色调]/gu, '')
}

function resolveColorValue(label: string) {
  if (colorSwatches[label]) return colorSwatches[label]
  const key = Object.keys(colorSwatches).find((color) => label.includes(color))
  return key ? colorSwatches[key] : '#c7cad8'
}

function addCount(counts: Map<string, number>, label: string) {
  if (!label) return
  counts.set(label, (counts.get(label) || 0) + 1)
}

function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function normalizeSummary(summary: H5ProfileRecordSummary): H5ProfileRecordSummary {
  const running = clampCount(summary.running)
  const succeeded = clampCount(summary.succeeded)
  const failed = clampCount(summary.failed)
  const all = Math.max(clampCount(summary.all), running + succeeded + failed)

  return { all, running, succeeded, failed }
}

function clampCount(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}
