import type { OutfitGeneration } from "../types/outfit";

export interface TuneAction {
  id: string;
  label: string;
  prompt: string;
}

export const tuneActions: TuneAction[] = [
  {
    id: "black-tone",
    label: "换成黑色系",
    prompt: "换成黑色系，保留整体轮廓和场景氛围",
  },
  {
    id: "daily",
    label: "更日常",
    prompt: "调整得更日常、更适合真实出门",
  },
  {
    id: "shoes",
    label: "换鞋子",
    prompt: "重点更换鞋子，让整体更轻松好走",
  },
  {
    id: "slimmer",
    label: "更显瘦",
    prompt: "优化比例和线条，让穿搭更显瘦显高",
  },
  {
    id: "commute",
    label: "更适合通勤",
    prompt: "调整得更适合通勤，保留精致感但更得体耐看",
  },
  {
    id: "photo-ready",
    label: "更适合拍照",
    prompt: "增强拍照出片效果，优化色彩层次和身材比例",
  },
];

export const feedbackActions = [
  "喜欢这套",
  "太成熟",
  "太普通",
  "颜色不适合",
  "想更显瘦",
] as const;

export function buildTuneHref(generation: OutfitGeneration, action: TuneAction) {
  const query = new URLSearchParams({
    autoGenerate: "1",
    screen: "keyword",
    season: generation.season,
    temperature: String(generation.temperature),
    weather: generation.weather,
    location: generation.location,
    occasion: generation.occasion,
    style: buildTunedStyle(generation, action.prompt),
  });

  if (generation.colorPreference) {
    query.set("colorPreference", generation.colorPreference);
  }
  if (generation.genderPreference) {
    query.set("genderPreference", generation.genderPreference);
  }

  return `/?${query.toString()}`;
}

function buildTunedStyle(generation: OutfitGeneration, prompt: string) {
  return [generation.style, prompt]
    .map((item) => item.trim())
    .filter(Boolean)
    .join("，")
    .slice(0, 50);
}
