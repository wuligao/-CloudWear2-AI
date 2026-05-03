import type { OutfitRecommendationContext } from "../types/outfit";

export interface ScenarioTaskPreset {
  season?: string;
  temperature?: number;
  weather?: string;
  location?: string;
  occasion: string;
  style: string;
  colorPreference?: string;
}

export interface ScenarioTask {
  id: string;
  title: string;
  subtitle: string;
  tone: string;
  icon: "briefcase" | "heart" | "camera" | "cloud" | "plane" | "sparkles" | "shirt";
  preset: ScenarioTaskPreset;
}

export interface DailyWeatherContext {
  season: string;
  temperature: number;
  highTemperature?: number;
  lowTemperature?: number;
  precipitationProbability?: number;
  weather: string;
  location: string;
  forecastDateKey?: string;
  periodLabel?: "今日" | "明日";
  sourceLabel?: string;
}

export interface DailyScenarioProfile {
  favoriteStyles?: string[];
  favoriteColors?: string[];
  commonOccasions?: string[];
  elementPreferences?: string[];
  fitPreferences?: string[];
  notes?: string;
}

export interface DailyScenarioTaskInput {
  date?: Date | string;
  weather?: DailyWeatherContext | null;
  profile?: DailyScenarioProfile | null;
  count?: number;
}

export const scenarioTasks: ScenarioTask[] = [
  {
    id: "commute-30s",
    title: "30 秒通勤不出错",
    subtitle: "清爽利落，不用纠结",
    tone: "清爽通勤",
    icon: "briefcase",
    preset: {
      occasion: "日常通勤",
      style: "简约通勤，清爽利落，不随便",
      location: "办公室",
      colorPreference: "黑白灰",
    },
  },
  {
    id: "date-friday",
    title: "周五约会温柔一点",
    subtitle: "有细节，但不甜腻",
    tone: "约会轻精致",
    icon: "heart",
    preset: {
      occasion: "约会",
      style: "法式韩系，温柔但不甜腻，有精致细节",
      location: "咖啡店",
      colorPreference: "奶茶",
    },
  },
  {
    id: "coffee-photo",
    title: "周末咖啡店拍照",
    subtitle: "松弛出片，比例更好",
    tone: "拍照显比例",
    icon: "camera",
    preset: {
      occasion: "拍照打卡",
      style: "日系复古，松弛显高，适合咖啡店拍照",
      location: "咖啡店",
      colorPreference: "奶茶",
    },
  },
  {
    id: "cool-down",
    title: "降温也不臃肿",
    subtitle: "保暖、有层次、显瘦",
    tone: "轻暖叠穿",
    icon: "cloud",
    preset: {
      temperature: 15,
      weather: "降温",
      occasion: "日常通勤",
      style: "保暖叠穿，显瘦不臃肿，有清晰层次",
      location: "城市街拍",
      colorPreference: "黑色",
    },
  },
  {
    id: "beach-trip",
    title: "海边旅行三套灵感",
    subtitle: "清爽轻盈，拍照好看",
    tone: "度假出片",
    icon: "plane",
    preset: {
      season: "夏",
      temperature: 28,
      weather: "晴天",
      occasion: "度假",
      style: "法式度假，清爽轻盈，适合海边旅行拍照",
      location: "海边",
      colorPreference: "浅蓝",
    },
  },
  {
    id: "party-polished",
    title: "派对亮眼不夸张",
    subtitle: "有记忆点，也能真实出门",
    tone: "轻派对感",
    icon: "sparkles",
    preset: {
      occasion: "派对",
      style: "轻奢甜酷，有记忆点但不过度夸张",
      location: "商场",
      colorPreference: "紫色",
    },
  },
];

const defaultDailyWeatherContext: DailyWeatherContext = {
  season: "春",
  temperature: 22,
  weather: "多云",
  location: "城市街拍",
  periodLabel: "今日",
  sourceLabel: "默认天气",
};

export function buildDailyScenarioTasks({
  count = 6,
  date = new Date(),
  profile,
  weather,
}: DailyScenarioTaskInput = {}): ScenarioTask[] {
  const weatherContext = normalizeWeatherContext(weather);
  const profileContext = normalizeProfile(profile);
  const theme = getWeatherTheme(weatherContext);
  const seed = [
    normalizeSeedKey(date),
    weatherContext.weather,
    weatherContext.temperature,
    weatherContext.location,
    profileContext.style,
    profileContext.color,
    profileContext.occasion,
  ].join("|");
  const candidates = buildDailyCandidates(weatherContext, profileContext, theme);
  const [primary, ...rest] = candidates;
  const shuffledRest = seededShuffle(rest, hashString(seed));

  return [primary, ...shuffledRest].slice(0, Math.max(1, Math.min(8, count)));
}

export function buildScenarioTaskSummary({
  profile,
  weather,
}: Pick<DailyScenarioTaskInput, "profile" | "weather"> = {}) {
  const weatherContext = normalizeWeatherContext(weather);
  const profileContext = normalizeProfile(profile);
  const forecastText = buildForecastSummary(weatherContext);
  const preferences = [profileContext.style, profileContext.color]
    .filter(Boolean)
    .join(" / ");
  const periodLabel = weatherContext.periodLabel || "今日";
  const suffix = preferences
    ? `，结合你的${preferences}偏好生成`
    : `，为你生成${periodLabel}推荐`;

  return `根据${weatherContext.sourceLabel || "今日天气"}：${forecastText}${suffix}`;
}

export function buildScenarioTaskHref(
  task: ScenarioTask,
  options: {
    autoGenerate?: boolean;
    recommendationContext?: OutfitRecommendationContext | null;
    weather?: DailyWeatherContext | null;
  } = {},
) {
  const query = new URLSearchParams({
    screen: "keyword",
    scenarioTaskId: task.id,
    occasion: task.preset.occasion,
    style: task.preset.style,
  });

  appendOptionalParam(query, "season", task.preset.season);
  appendOptionalParam(query, "temperature", task.preset.temperature);
  appendOptionalParam(query, "weather", task.preset.weather);
  appendOptionalParam(query, "location", task.preset.location);
  appendOptionalParam(query, "colorPreference", task.preset.colorPreference);

  appendRecommendationContextParams(
    query,
    options.recommendationContext ||
      (options.weather ? buildScenarioRecommendationContext(task, options.weather) : null),
  );

  if (options.autoGenerate) {
    query.set("autoGenerate", "1");
  }

  return `/?${query.toString()}`;
}

export function buildScenarioRecommendationContext(
  task: ScenarioTask,
  weather: DailyWeatherContext | null | undefined,
): OutfitRecommendationContext {
  const weatherContext = normalizeWeatherContext(weather);

  return {
    kind: "weather",
    periodLabel: weatherContext.periodLabel || "今日",
    sourceLabel: weatherContext.sourceLabel,
    forecastDateKey: weatherContext.forecastDateKey,
    summary: buildForecastSummary(weatherContext),
    weather: task.preset.weather || weatherContext.weather,
    temperature: task.preset.temperature ?? weatherContext.temperature,
    highTemperature: weatherContext.highTemperature,
    lowTemperature: weatherContext.lowTemperature,
    precipitationProbability: weatherContext.precipitationProbability,
    location: task.preset.location || weatherContext.location,
    scenarioTaskId: task.id,
    title: task.title,
  };
}

export function appendRecommendationContextParams(
  query: URLSearchParams,
  context: OutfitRecommendationContext | null | undefined,
) {
  if (!context || context.kind !== "weather") return;

  query.set("recommendationSource", "weather");
  query.set("recommendationPeriod", context.periodLabel);
  appendOptionalParam(query, "recommendationSourceLabel", context.sourceLabel);
  appendOptionalParam(query, "recommendationDate", context.forecastDateKey);
  appendOptionalParam(query, "recommendationSummary", context.summary);
  appendOptionalParam(query, "recommendationWeather", context.weather);
  appendOptionalParam(query, "recommendationTemperature", context.temperature);
  appendOptionalParam(query, "recommendationHighTemperature", context.highTemperature);
  appendOptionalParam(query, "recommendationLowTemperature", context.lowTemperature);
  appendOptionalParam(
    query,
    "recommendationPrecipitation",
    context.precipitationProbability,
  );
  appendOptionalParam(query, "recommendationLocation", context.location);
  appendOptionalParam(query, "recommendationScenarioTaskId", context.scenarioTaskId);
  appendOptionalParam(query, "recommendationTitle", context.title);
}

export function parseRecommendationContextFromSearchParams(
  params: Pick<URLSearchParams, "get">,
): OutfitRecommendationContext | undefined {
  if (params.get("recommendationSource") !== "weather") return undefined;

  const periodLabel = params.get("recommendationPeriod") === "明日" ? "明日" : "今日";
  return {
    kind: "weather",
    periodLabel,
    sourceLabel: normalizeOptionalText(params.get("recommendationSourceLabel")),
    forecastDateKey: normalizeOptionalText(params.get("recommendationDate")),
    summary: normalizeOptionalText(params.get("recommendationSummary")),
    weather: normalizeOptionalText(params.get("recommendationWeather")),
    temperature: parseOptionalNumber(params.get("recommendationTemperature")),
    highTemperature: parseOptionalNumber(params.get("recommendationHighTemperature")),
    lowTemperature: parseOptionalNumber(params.get("recommendationLowTemperature")),
    precipitationProbability: parseOptionalNumber(params.get("recommendationPrecipitation")),
    location: normalizeOptionalText(params.get("recommendationLocation")),
    scenarioTaskId: normalizeOptionalText(params.get("recommendationScenarioTaskId")),
    title: normalizeOptionalText(params.get("recommendationTitle")),
  };
}

export function getRecommendationContextLabel(
  context: OutfitRecommendationContext | undefined,
) {
  if (!context) return "";
  return `${context.periodLabel}天气推荐`;
}

export function getRecommendationContextDetail(
  context: OutfitRecommendationContext | undefined,
) {
  if (!context) return "";

  const temperatures =
    typeof context.lowTemperature === "number" &&
    typeof context.highTemperature === "number"
      ? `${context.lowTemperature}-${context.highTemperature}°C`
      : typeof context.temperature === "number"
        ? `${context.temperature}°C`
        : "";
  const rain =
    typeof context.precipitationProbability === "number"
      ? `降水概率${context.precipitationProbability}%`
      : "";

  return [context.location, temperatures, context.weather, rain]
    .filter(Boolean)
    .join(" · ");
}

function appendOptionalParam(
  query: URLSearchParams,
  key: string,
  value: number | string | undefined,
) {
  if (value === undefined || value === "") return;
  query.set(key, String(value));
}

function normalizeOptionalText(value: string | null) {
  const text = value?.trim();
  return text || undefined;
}

function parseOptionalNumber(value: string | null) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function buildDailyCandidates(
  weather: DailyWeatherContext,
  profile: Required<Pick<DailyScenarioProfile, "favoriteStyles" | "favoriteColors" | "commonOccasions" | "elementPreferences" | "fitPreferences">> & {
    style: string;
    color: string;
    occasion: string;
    element: string;
    fit: string;
  },
  theme: "cold" | "hot" | "mild" | "rainy" | "windy",
): ScenarioTask[] {
  const style = profile.style || "简约";
  const color = profile.color || pickColorByTheme(theme);
  const occasion = profile.occasion || "日常通勤";
  const element = profile.element;
  const fit = profile.fit;
  const base = `${style}${color ? `，${color}色系` : ""}`;
  const detail = [element, fit].filter(Boolean).join("，");
  const weatherStyle = buildWeatherStyle(theme, weather);
  const shared = {
    season: weather.season,
    temperature: weather.temperature,
    weather: weather.weather,
    colorPreference: color,
  };

  const weatherPrimary = buildWeatherPrimaryTask(theme, weather, {
    base,
    color,
    detail,
    occasion,
    shared,
    style,
  });

  return [
    weatherPrimary,
    {
      id: `daily-${theme}-commute`,
      title: `${weather.temperature}°C ${occasion}不出错`,
      subtitle: `按${weather.weather}和你的偏好搭好`,
      tone: "今日场景",
      icon: "briefcase",
      preset: {
        ...shared,
        location: weather.location,
        occasion,
        style: joinPrompt([base, weatherStyle, detail, "真实出门、不费力"]),
      },
    },
    {
      id: `daily-${theme}-photo`,
      title: `${weather.location}拍照更出片`,
      subtitle: "保留个人风格，优化比例",
      tone: "拍照灵感",
      icon: "camera",
      preset: {
        ...shared,
        location: weather.location,
        occasion: "拍照打卡",
        style: joinPrompt([base, weatherStyle, detail, "显高出片，有画面层次"]),
      },
    },
    {
      id: `daily-${theme}-date`,
      title: "今天约会温柔一点",
      subtitle: `${weather.weather}也有精致感`,
      tone: "约会微调",
      icon: "heart",
      preset: {
        ...shared,
        location: "咖啡店",
        occasion: "约会",
        style: joinPrompt([base, weatherStyle, "温柔但不甜腻", detail]),
      },
    },
    {
      id: `daily-${theme}-walk`,
      title: "逛街好走又好看",
      subtitle: "舒适优先，也不普通",
      tone: "轻松出门",
      icon: "shirt",
      preset: {
        ...shared,
        location: "商场",
        occasion: "逛街",
        style: joinPrompt([base, weatherStyle, "舒适好走，显比例", detail]),
      },
    },
    {
      id: `daily-${theme}-weekend`,
      title: "周末松弛但有型",
      subtitle: "适合临时出门和见朋友",
      tone: "周末灵感",
      icon: "sparkles",
      preset: {
        ...shared,
        location: weather.location,
        occasion: "日常休闲",
        style: joinPrompt([base, weatherStyle, "松弛自然，有个人辨识度", detail]),
      },
    },
    {
      id: `daily-${theme}-trip`,
      title: "顺手存一套旅行灵感",
      subtitle: "天气适配，拍照也稳",
      tone: "旅行备选",
      icon: "plane",
      preset: {
        ...shared,
        location: weather.location,
        occasion: "旅行",
        style: joinPrompt([base, weatherStyle, "轻便易搭，适合旅行拍照", detail]),
      },
    },
  ];
}

function buildWeatherPrimaryTask(
  theme: "cold" | "hot" | "mild" | "rainy" | "windy",
  weather: DailyWeatherContext,
  context: {
    base: string;
    color: string;
    detail: string;
    occasion: string;
    shared: Pick<ScenarioTaskPreset, "colorPreference" | "season" | "temperature" | "weather">;
    style: string;
  },
): ScenarioTask {
  if (theme === "rainy") {
    return {
      id: "daily-rainy-primary",
      title: `${weather.weather}出门不狼狈`,
      subtitle: "防泼水、好走，也要好看",
      tone: "天气推荐",
      icon: "cloud",
      preset: {
        ...context.shared,
        location: weather.location,
        occasion: context.occasion,
        style: joinPrompt([context.base, "雨天友好，防泼水，好走不狼狈", context.detail]),
      },
    };
  }

  if (theme === "hot") {
    return {
      id: "daily-hot-primary",
      title: "高温天清爽不闷",
      subtitle: "轻薄、防晒、颜色更干净",
      tone: "天气推荐",
      icon: "cloud",
      preset: {
        ...context.shared,
        location: weather.location,
        occasion: context.occasion,
        style: joinPrompt([context.base, "高温清爽，轻薄透气，防晒不闷", context.detail]),
      },
    };
  }

  if (theme === "cold") {
    return {
      id: "daily-cold-primary",
      title: "降温也不臃肿",
      subtitle: "保暖、有层次、显瘦",
      tone: "天气推荐",
      icon: "cloud",
      preset: {
        ...context.shared,
        location: weather.location,
        occasion: context.occasion,
        style: joinPrompt([context.base, "降温保暖，叠穿有层次，不臃肿", context.detail]),
      },
    };
  }

  if (theme === "windy") {
    return {
      id: "daily-windy-primary",
      title: "大风天利落不凌乱",
      subtitle: "线条更稳，行动更方便",
      tone: "天气推荐",
      icon: "cloud",
      preset: {
        ...context.shared,
        location: weather.location,
        occasion: context.occasion,
        style: joinPrompt([context.base, "大风天利落抗风，廓形稳定，不拖沓", context.detail]),
      },
    };
  }

  return {
    id: "daily-mild-primary",
    title: "今天轻松穿得刚刚好",
    subtitle: "不冷不热，适合做层次",
    tone: "天气推荐",
    icon: "sparkles",
    preset: {
      ...context.shared,
      location: weather.location,
      occasion: context.occasion,
      style: joinPrompt([context.base, "体感舒适，轻层次，适合全天出门", context.detail]),
    },
  };
}

function normalizeWeatherContext(weather?: DailyWeatherContext | null): DailyWeatherContext {
  if (!weather) return defaultDailyWeatherContext;
  return {
    season: weather.season || defaultDailyWeatherContext.season,
    temperature: Number.isFinite(weather.temperature)
      ? Math.round(weather.temperature)
      : defaultDailyWeatherContext.temperature,
    highTemperature: normalizeOptionalNumber(weather.highTemperature),
    lowTemperature: normalizeOptionalNumber(weather.lowTemperature),
    precipitationProbability: normalizeOptionalNumber(weather.precipitationProbability),
    weather: weather.weather || defaultDailyWeatherContext.weather,
    location: weather.location || defaultDailyWeatherContext.location,
    forecastDateKey: weather.forecastDateKey,
    periodLabel: weather.periodLabel || defaultDailyWeatherContext.periodLabel,
    sourceLabel: weather.sourceLabel || defaultDailyWeatherContext.sourceLabel,
  };
}

function buildForecastSummary(weather: DailyWeatherContext) {
  const highTemperature = weather.highTemperature;
  const lowTemperature = weather.lowTemperature;
  const precipitationProbability = weather.precipitationProbability;
  const temperatureRange =
    isFiniteNumber(lowTemperature) && isFiniteNumber(highTemperature)
      ? `${lowTemperature}-${highTemperature}°C`
      : `${weather.temperature}°C`;
  const rain =
    isFiniteNumber(precipitationProbability) && precipitationProbability > 0
      ? `，降水概率${precipitationProbability}%`
      : "";

  return `${temperatureRange} ${weather.weather}${rain}`;
}

function normalizeOptionalNumber(value?: number) {
  return isFiniteNumber(value) ? Math.round(value) : undefined;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeProfile(profile?: DailyScenarioProfile | null) {
  const favoriteStyles = normalizeList(profile?.favoriteStyles);
  const favoriteColors = normalizeList(profile?.favoriteColors);
  const commonOccasions = normalizeList(profile?.commonOccasions);
  const elementPreferences = normalizeList(profile?.elementPreferences);
  const fitPreferences = normalizeList(profile?.fitPreferences);

  return {
    favoriteStyles,
    favoriteColors,
    commonOccasions,
    elementPreferences,
    fitPreferences,
    style: favoriteStyles[0] || "",
    color: favoriteColors[0] || "",
    occasion: commonOccasions[0] || "",
    element: elementPreferences[0] || "",
    fit: fitPreferences[0] || "",
  };
}

function normalizeList(value?: string[]) {
  return (value || []).map((item) => item.trim()).filter(Boolean);
}

function getWeatherTheme(weather: DailyWeatherContext) {
  if (/雨|雪|阵雨|雷/u.test(weather.weather)) return "rainy";
  if (/风/u.test(weather.weather)) return "windy";
  if (/冷|降温|寒/u.test(weather.weather) || weather.temperature <= 12) return "cold";
  if (/热|晴/u.test(weather.weather) && weather.temperature >= 28) return "hot";
  if (weather.temperature >= 30) return "hot";
  return "mild";
}

function buildWeatherStyle(
  theme: "cold" | "hot" | "mild" | "rainy" | "windy",
  weather: DailyWeatherContext,
) {
  const styles = {
    cold: `${weather.temperature}°C ${weather.weather}，保暖但不臃肿`,
    hot: `${weather.temperature}°C ${weather.weather}，清爽防晒不闷`,
    mild: `${weather.temperature}°C ${weather.weather}，轻层次全天舒适`,
    rainy: `${weather.temperature}°C ${weather.weather}，雨天友好好走`,
    windy: `${weather.temperature}°C ${weather.weather}，抗风利落不凌乱`,
  };
  return styles[theme];
}

function pickColorByTheme(theme: "cold" | "hot" | "mild" | "rainy" | "windy") {
  const colors = {
    cold: "黑色",
    hot: "浅蓝",
    mild: "奶茶",
    rainy: "黑色",
    windy: "黑色",
  };
  return colors[theme];
}

function joinPrompt(parts: Array<string | undefined>) {
  return parts
    .map((item) => item?.trim())
    .filter(Boolean)
    .join("，")
    .slice(0, 80);
}

function normalizeSeedKey(value: Date | string) {
  if (typeof value === "string") return value.trim() || new Date().toISOString().slice(0, 10);
  if (Number.isNaN(value.getTime())) return new Date().toISOString().slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededShuffle<T>(items: T[], seed: number) {
  const shuffled = [...items];
  let state = seed || 1;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
