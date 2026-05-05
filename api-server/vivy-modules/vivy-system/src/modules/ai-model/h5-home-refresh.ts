import type { H5OutfitOptionItem } from './h5-outfit-options'

export interface H5HomeLookBrief {
  label: string
  imagePrompt: string
}

const defaultHomeLookLabels = ['轻薄通勤', '柔雾风衣', '周末牛仔', '晚宴黑裙']

export function buildH5HomeLookBriefs(
  generatedLooks: unknown,
  currentLooks: H5OutfitOptionItem[],
  homeCategories: string[],
  inspirationKeywords: string[]
): H5HomeLookBrief[] {
  const generated = Array.isArray(generatedLooks)
    ? generatedLooks
        .map((item) => normalizeGeneratedLook(item))
        .filter((item): item is H5HomeLookBrief => Boolean(item))
    : []

  const labels = [
    ...currentLooks.map((item) => item.label),
    ...homeCategories,
    ...inspirationKeywords,
    ...defaultHomeLookLabels,
  ]
  const uniqueLabels = Array.from(
    new Set(
      labels
        .map((label) => String(label || '').trim())
        .filter(Boolean)
    )
  ).slice(0, 4)

  return dedupeLookBriefs([
    ...generated,
    ...uniqueLabels.map((label) => ({
      label,
      imagePrompt: buildDefaultLookPrompt(label),
    })),
  ]).slice(0, 4)
}

export function buildH5HomeLookImagePrompt(brief: H5HomeLookBrief) {
  return [
    'Premium fashion editorial look card for CloudWear AI homepage.',
    `Daily look: ${brief.label}.`,
    brief.imagePrompt,
    'Full-body outfit, wearable daily styling, refined fabric texture, natural posture.',
    '4:5 portrait mobile card composition, no text, no logo, no watermark.',
  ].join(' ')
}

function normalizeGeneratedLook(value: unknown): H5HomeLookBrief | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const label = String(record.label || record.title || '').trim().slice(0, 12)
  const imagePrompt = String(record.imagePrompt || record.prompt || '').trim()
  if (!label || !isFashionRelatedText(`${label} ${imagePrompt}`)) return null

  return {
    label,
    imagePrompt: imagePrompt && isFashionRelatedText(imagePrompt)
      ? imagePrompt.slice(0, 1400)
      : buildDefaultLookPrompt(label),
  }
}

function dedupeLookBriefs(briefs: H5HomeLookBrief[]) {
  const seen = new Set<string>()
  return briefs.filter((brief) => {
    if (seen.has(brief.label)) return false
    seen.add(brief.label)
    return true
  })
}

function buildDefaultLookPrompt(label: string) {
  return [
    `Fashion editorial full-body outfit inspired by ${label}.`,
    'Layered daily styling, refined color palette, premium fabric texture, realistic model.',
    'Clean mobile look-card composition, no text, no logo, no watermark.',
  ].join(' ')
}

function isFashionRelatedText(value: string) {
  const text = value.toLowerCase()
  return [
    '穿',
    '搭',
    '衣',
    '服',
    '装',
    '造型',
    '风格',
    '通勤',
    '约会',
    '外套',
    '裙',
    '裤',
    '鞋',
    '包',
    '风衣',
    '牛仔',
    '西装',
    '度假',
    'fashion',
    'outfit',
    'styling',
    'wear',
    'clothing',
    'wardrobe',
    'editorial',
  ].some((keyword) => text.includes(keyword))
}
