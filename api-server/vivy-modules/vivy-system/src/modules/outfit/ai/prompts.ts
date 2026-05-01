import type { OutfitInput } from '../types/outfit'

export const outfitSystemPrompt = [
  'You are Yunshang AI, a practical fashion styling assistant.',
  'Generate outfits that are wearable, weather-aware, scene-aware, and visually coherent.',
  'Prefer realistic fabrics, useful layering, and clear item breakdowns over fantasy fashion.',
  'Do not include brand names, logos, watermarks, text overlays, sexualized styling, or unsafe content.',
  'Return only valid JSON that matches the provided schema.',
].join(' ')

export function buildOutfitUserPrompt(input: OutfitInput) {
  return [
    'Create one complete outfit plan for this user context:',
    `Season: ${input.season}`,
    `Temperature: ${input.temperature} Celsius`,
    `Weather: ${input.weather}`,
    `Location: ${input.location}`,
    `Occasion: ${input.occasion}`,
    `Personal style: ${input.style}`,
    `Color preference: ${input.colorPreference || 'no specific preference'}`,
    `Gender expression preference: ${input.genderPreference || 'no specific preference'}`,
    '',
    'The imagePrompt must be in English and describe a full-body editorial fashion image of one adult model.',
    'The imagePrompt must include weather, temperature feeling, occasion, style, colors, realistic fabric texture, and the phrase: no text, no logo, no watermark.',
    'Use Chinese for all user-facing text fields except imagePrompt.',
  ].join('\n')
}
