import { buildColorPreference } from "./outfit-preferences.ts";
import type { H5OutfitConfigOptions } from "./h5-config";
import type { OutfitInput } from "../types/outfit";

export const defaultGenerationCount = 1;

export function buildGenerationInput({
  configDefaults,
  customColor,
  generationCount,
  imageModel,
  keywordText,
  photoDataUrl,
  selectedColor,
  selectedItems,
  selectedLocation,
  selectedScenes,
  selectedSeason,
  selectedStyles,
  selectedTemperature,
  selectedWeather,
  source,
}: {
  configDefaults: OutfitInput;
  customColor: string;
  generationCount: number;
  imageModel: string;
  keywordText: string;
  photoDataUrl?: string;
  selectedColor: string | null;
  selectedItems: string[];
  selectedLocation: string | null;
  selectedScenes: string[];
  selectedSeason: string | null;
  selectedStyles: string[];
  selectedTemperature: number | null;
  selectedWeather: string | null;
  source: "keyword" | "photo";
}): OutfitInput {
  const styleText = selectedStyles.join("，");
  const sceneText = selectedScenes.join("，");
  const itemsText = selectedItems.join("，");
  const location = selectedLocation || "不限地点";

  return {
    ...configDefaults,
    season: selectedSeason || "不限季节",
    temperature: selectedTemperature ?? configDefaults.temperature,
    weather: selectedWeather || "不限天气",
    location: source === "photo" ? `上传照片，${location}` : location,
    occasion: sceneText || "不限场景",
    style:
      [keywordText, styleText, itemsText]
        .filter(Boolean)
        .join("，")
        .slice(0, 80) || "自由发挥",
    colorPreference: selectedColor
      ? buildColorPreference(selectedColor, customColor)
      : undefined,
    generationCount: normalizeGenerationCount(generationCount),
    imageModel,
    userPhotoDataUrl: source === "photo" ? photoDataUrl : undefined,
  };
}

export function normalizeGenerationCount(value: number) {
  if (!Number.isFinite(value)) return defaultGenerationCount;
  return Math.min(4, Math.max(1, Math.round(value)));
}

export function buildGenerationCountOptions(
  options: H5OutfitConfigOptions,
): number[] {
  const configured = options.generationCounts
    ?.map((item) => Number(item.value ?? item.label))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 4);

  return configured?.length ? Array.from(new Set(configured)) : [1, 2, 4];
}
