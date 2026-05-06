import type { OutfitInput } from '../types/outfit'

const neutralGenderPattern = /^(不限|不限定|无|无偏好|保密|none|any|all|unisex|neutral|no specific preference)$/i
const maleGenderPattern = /(男|男性|男士|男生|先生|\bmale\b|\bman\b|\bmen\b|masculine|masc)/i
const femaleGenderPattern = /(女|女性|女士|女生|小姐|\bfemale\b|\bwoman\b|\bwomen\b|feminine|fem)/i

export function resolveSpecificGenderPreference(input: OutfitInput) {
  return firstSpecificGenderPreference(
    input.genderPreference,
    input.styleProfileContext?.genderPreference
  )
}

export function firstSpecificGenderPreference(...values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = normalizeGenderPreference(value)
    if (normalized) return normalized
  }

  return ''
}

export function buildImageSubjectDirective(genderPreference?: string) {
  const normalized = normalizeGenderPreference(genderPreference)

  if (isMalePreference(normalized)) {
    return [
      'one adult male model',
      'with clearly masculine gender presentation',
      'avoid feminizing the person, dresses, skirts, high heels, makeup-heavy styling, and other overtly feminine-coded styling unless the user explicitly requests them',
    ].join('; ')
  }

  if (isFemalePreference(normalized)) {
    return [
      'one adult female model',
      'with clearly feminine gender presentation',
      'avoid masculinizing the person unless the user explicitly requests androgynous or masculine styling',
    ].join('; ')
  }

  return ''
}

function normalizeGenderPreference(value?: string) {
  const text = value?.trim()
  if (!text || neutralGenderPattern.test(text)) return ''
  return text
}

function isMalePreference(value: string) {
  return maleGenderPattern.test(value) && !femaleGenderPattern.test(value)
}

function isFemalePreference(value: string) {
  return femaleGenderPattern.test(value) && !maleGenderPattern.test(value)
}
