import { ServiceException } from '@vivy-common/core'

export interface H5ChatAssistantOptions {
  enabled: boolean
  welcomeMessage: string
  quickPrompts: string[]
  useStyleProfile: boolean
  useRecentRecords: boolean
  maxHistoryMessages: number
  dailyLimit: number
}

export interface H5ChatProfileContext {
  genderPreference?: string
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
  notes?: string
}

export interface H5ChatRecordContext {
  outfitTitle: string
  summary: string
  occasion?: string
  style?: string
  colorPreference?: string
  weather?: string
  temperature?: number
}

export interface H5ChatOptionContext {
  homeCategories: string[]
  inspirationKeywords: string[]
  styles: string[]
  scenes: string[]
  colors: string[]
  items: string[]
}

export interface H5ChatSystemPromptInput {
  assistant: H5ChatAssistantOptions
  profile?: H5ChatProfileContext | null
  recentRecords?: H5ChatRecordContext[]
  options: H5ChatOptionContext
}

export interface H5ChatSuggestedGenerationInput {
  season?: string
  temperature?: number
  weather?: string
  location?: string
  occasion?: string
  style?: string
  colorPreference?: string
}

export interface H5ChatAssistantResponse {
  reply: string
  quickReplies: string[]
  suggestedGenerationInput?: H5ChatSuggestedGenerationInput
}

export function buildH5ChatSystemPrompt(input: H5ChatSystemPromptInput) {
  const profileBlock = input.assistant.useStyleProfile
    ? buildProfileBlock(input.profile)
    : '风格档案：后台已关闭读取，本轮不要声称了解用户档案。'
  const recentRecordBlock = input.assistant.useRecentRecords
    ? buildRecentRecordBlock(input.recentRecords || [])
    : '最近生成记录：后台已关闭读取，本轮不要引用历史生成。'

  return [
    '你是 CloudWear AI 的穿搭顾问，只回答穿搭、服饰、造型、天气着装、场景搭配、色彩和单品组合相关问题。',
    '不要输出医疗、金融、政治、低俗、违法、仇恨或非穿搭主题内容；遇到非穿搭问题，温和拉回穿搭场景。',
    '回答要具体、简洁、可执行，优先给适合 H5 用户快速生成图片的搭配方向。',
    '如果用户问题适合生成穿搭图，必须给 suggestedGenerationInput；如果只是闲聊或解释，可以省略。',
    '只输出严格 JSON，不要 Markdown，不要代码块。',
    'JSON 结构：{"reply":"中文回答","quickReplies":["短选项1","短选项2"],"suggestedGenerationInput":{"season":"春季","temperature":22,"weather":"多云","location":"上海","occasion":"通勤","style":"浅蓝衬衫，米色半裙，法式通勤","colorPreference":"浅蓝"}}。',
    'quickReplies 最多 3 个，每个不超过 12 个汉字；reply 不超过 220 个汉字。',
    'suggestedGenerationInput.style 要能直接作为生图关键词；不得包含文字、logo、水印等要求。',
    profileBlock,
    recentRecordBlock,
    buildOptionBlock(input.options),
  ].join('\n')
}

export function parseH5ChatAssistantResponse(content: string): H5ChatAssistantResponse {
  const jsonText = extractJsonObject(content)
  if (!jsonText) throw new ServiceException('文本模型未返回有效的顾问 JSON')

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(jsonText) as Record<string, unknown>
  } catch {
    throw new ServiceException('文本模型返回的顾问 JSON 解析失败')
  }

  const reply = readText(payload.reply, 500)
  if (!reply) throw new ServiceException('文本模型未返回顾问回复')

  const quickReplies = Array.isArray(payload.quickReplies)
    ? payload.quickReplies
        .map((item) => readText(item, 12))
        .filter(Boolean)
        .slice(0, 3)
    : []
  const suggestedGenerationInput = normalizeSuggestedGenerationInput(payload.suggestedGenerationInput)

  return {
    reply,
    quickReplies,
    ...(suggestedGenerationInput ? { suggestedGenerationInput } : {}),
  }
}

function buildProfileBlock(profile?: H5ChatProfileContext | null) {
  if (!profile) return '风格档案：用户暂未完善。'

  return [
    '风格档案：',
    `- 性别/穿搭方向：${profile.genderPreference || '未填写'}`,
    `- 身高体重：${[profile.height, profile.weight].filter(Boolean).join(' / ') || '未填写'}`,
    `- 尺码：${[profile.clothingSize, profile.shoeSize].filter(Boolean).join(' / ') || '未填写'}`,
    `- 偏好风格：${joinList(profile.favoriteStyles)}`,
    `- 偏好颜色：${joinList(profile.favoriteColors)}`,
    `- 避开颜色：${joinList(profile.avoidColors)}`,
    `- 常用场景：${joinList(profile.commonOccasions)}`,
    `- 元素偏好：${joinList(profile.elementPreferences)}`,
    `- 版型偏好：${joinList(profile.fitPreferences)}`,
    `- 备注：${profile.notes || '无'}`,
  ].join('\n')
}

function buildRecentRecordBlock(records: H5ChatRecordContext[]) {
  if (!records.length) return '最近生成记录：暂无。'

  return [
    '最近生成记录：',
    ...records.slice(0, 5).map((record, index) =>
      [
        `${index + 1}. ${record.outfitTitle}`,
        record.summary,
        `场景：${record.occasion || '未填写'}`,
        `风格：${record.style || '未填写'}`,
        `颜色：${record.colorPreference || '未填写'}`,
        `天气：${record.temperature ?? ''}${record.temperature === undefined ? '' : '°C'} ${record.weather || ''}`.trim(),
      ].join('；')
    ),
  ].join('\n')
}

function buildOptionBlock(options: H5ChatOptionContext) {
  return [
    'H5 可用配置：',
    `- 首页标签：${joinList(options.homeCategories)}`,
    `- 灵感关键词：${joinList(options.inspirationKeywords)}`,
    `- 风格：${joinList(options.styles)}`,
    `- 场景：${joinList(options.scenes)}`,
    `- 颜色：${joinList(options.colors)}`,
    `- 单品：${joinList(options.items)}`,
  ].join('\n')
}

function normalizeSuggestedGenerationInput(value: unknown): H5ChatSuggestedGenerationInput | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  const suggested: H5ChatSuggestedGenerationInput = {}
  const textFields = ['season', 'weather', 'location', 'occasion', 'style', 'colorPreference'] as const
  for (const field of textFields) {
    const text = readText(record[field], field === 'style' ? 180 : 40)
    if (text) suggested[field] = text
  }
  const temperature = Number(record.temperature)
  if (Number.isFinite(temperature)) suggested.temperature = Math.round(temperature)

  return Object.keys(suggested).length ? suggested : undefined
}

function extractJsonObject(content: string) {
  const trimmed = content.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim()
  if (fenced?.startsWith('{') && fenced.endsWith('}')) return fenced

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return ''
}

function readText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function joinList(value: unknown) {
  if (!Array.isArray(value) || !value.length) return '未填写'
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 8)
    .join('、') || '未填写'
}
