import type { OutfitStyleProfileContext } from "../types/outfit";
import type { H5StyleArchive } from "../types/profile";

const emptyValues = new Set(["", "待完善", "保存更多记录后生成推荐"]);

export function buildStyleProfileGenerationContext(
  archive: H5StyleArchive | null | undefined,
): OutfitStyleProfileContext {
  if (!archive) return {};

  const bodySummary = [
    formatProfileMetric("身高", archive.profile.height),
    formatProfileMetric("体重", archive.profile.weight),
    formatProfileMetric("服装尺码", archive.profile.clothingSize),
    formatProfileMetric("鞋码", archive.profile.shoeSize),
    ...archive.bodyMetrics
      .map((item) => formatProfileMetric(item.label, item.value))
      .filter(Boolean)
      .slice(0, 6),
  ]
    .filter(Boolean)
    .join("，")
    .slice(0, 180);

  return {
    genderPreference: normalizeText(archive.profile.genderPreference),
    bodySummary: bodySummary || undefined,
    favoriteStyles: uniqueList(archive.stylePreferences.map((item) => item.label)),
    favoriteColors: uniqueList(archive.colorPreferences.map((item) => item.label)),
    avoidColors: uniqueList(archive.avoidColors),
    commonOccasions: uniqueList(archive.commonOccasions),
    elementPreferences: uniqueList(archive.elementPreferences),
    fitPreferences: uniqueList(
      archive.fitTypes
        .filter((item) => !emptyValues.has(item.description.trim()))
        .map((item) => item.label),
    ),
    notes: normalizeText(archive.notes)?.slice(0, 500),
  };
}

export function hasStyleProfileGenerationContext(
  context: OutfitStyleProfileContext | null | undefined,
) {
  if (!context) return false;

  return Boolean(
    normalizeText(context.genderPreference) ||
      normalizeText(context.bodySummary) ||
      context.favoriteStyles?.length ||
      context.favoriteColors?.length ||
      context.avoidColors?.length ||
      context.commonOccasions?.length ||
      context.elementPreferences?.length ||
      context.fitPreferences?.length ||
      normalizeText(context.notes),
  );
}

function formatProfileMetric(label: string, value?: string) {
  const text = normalizeText(value);
  return text ? `${label} ${text}` : "";
}

function normalizeText(value?: string) {
  const text = value?.trim();
  if (!text || emptyValues.has(text)) return undefined;
  return text;
}

function uniqueList(values?: string[]) {
  return Array.from(
    new Set((values || []).map((item) => normalizeText(item)).filter(Boolean) as string[]),
  ).slice(0, 8);
}
