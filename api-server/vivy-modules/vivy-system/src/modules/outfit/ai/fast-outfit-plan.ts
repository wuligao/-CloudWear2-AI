import type { OutfitInput, OutfitPlan } from '../types/outfit'

export function buildFastOutfitPlan(input: OutfitInput): OutfitPlan {
  const styleTags = splitPhrases(input.style).slice(0, 6)
  const primaryStyle = styleTags[0] || input.style.trim()
  const colorText = input.colorPreference?.trim()
  const genderText = input.genderPreference?.trim()
  const imagePrompt = [
    'Full-body realistic fashion editorial image of one adult model.',
    `Outfit keywords from the user: ${input.style}.`,
    `Season: ${input.season}.`,
    `Temperature feeling: ${input.temperature} Celsius.`,
    `Weather: ${input.weather}.`,
    `Location atmosphere: ${input.location}.`,
    `Occasion: ${input.occasion}.`,
    colorText ? `Color preference: ${colorText}.` : '',
    genderText ? `Gender expression preference: ${genderText}.` : '',
    'Create wearable clothing, shoes, and accessories that match the keywords and context.',
    'Use realistic fabric texture, natural lighting, clean composition, no text, no logo, no watermark.',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    outfitTitle: `${primaryStyle}${input.season}穿搭`,
    summary: `根据“${input.style}”直接生成适合${input.temperature}度${input.weather}、${input.location}${input.occasion}的穿搭图片。`,
    styleTags,
    temperatureAdvice: `${input.temperature}度${input.weather}，图片会优先呈现与体感匹配的厚薄和层次。`,
    occasionReason: `整体造型围绕${input.location}${input.occasion}与关键词“${input.style}”生成。`,
    items: [],
    imagePrompt,
  }
}

function splitPhrases(value: string) {
  const phrases = value
    .split(/[，,、\s]+/)
    .map((phrase) => phrase.trim())
    .filter(Boolean)

  return Array.from(new Set(phrases))
}
