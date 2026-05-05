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
    buildStyleProfilePrompt(input),
    '',
    input.styleProfileContext
      ? 'If style profile guidance conflicts with the current generation request, prioritize the current request and use the style profile only to personalize fit, colors, details, and wearability.'
      : '',
    'The imagePrompt must be in English and describe a full-body editorial fashion image of one adult model.',
    'The imagePrompt must include weather, temperature feeling, occasion, style, colors, realistic fabric texture, and the phrase: no text, no logo, no watermark.',
    'Use Chinese for all user-facing text fields except imagePrompt.',
  ].join('\n')
}

function buildStyleProfilePrompt(input: OutfitInput) {
  const profile = input.styleProfileContext
  if (!profile) return 'Style profile guidance: not enabled'

  const lines = [
    'Style profile guidance enabled. Personalize the outfit with:',
    profile.genderPreference ? `- Outfit gender/expression: ${profile.genderPreference}` : '',
    profile.bodySummary ? `- Body and sizing: ${profile.bodySummary}` : '',
    formatProfileList('Favorite styles', profile.favoriteStyles),
    formatProfileList('Favorite colors', profile.favoriteColors),
    formatProfileList('Avoid colors', profile.avoidColors),
    formatProfileList('Common occasions', profile.commonOccasions),
    formatProfileList('Preferred elements', profile.elementPreferences),
    formatProfileList('Preferred fit/silhouette', profile.fitPreferences),
    profile.notes ? `- User notes: ${profile.notes}` : '',
  ].filter(Boolean)

  return lines.length > 1 ? lines.join('\n') : 'Style profile guidance: enabled, but no detailed profile data was provided'
}

function formatProfileList(label: string, values?: string[]) {
  const list = values?.map((item) => item.trim()).filter(Boolean).slice(0, 8)
  return list?.length ? `- ${label}: ${list.join(', ')}` : ''
}
