export interface H5OptionItem {
  label: string;
  value?: string | number;
  image?: string;
  icon?: string;
  color?: string;
  group?: string;
  supportsPhotoInput?: boolean;
}

export interface H5LoginConfig {
  heroImage: string;
  heroAlt: string;
  brandTitle: string;
  subtitle: string;
  phonePasswordEnabled: boolean;
  registerEnabled: boolean;
  wechatEnabled: boolean;
}

export interface H5OutfitConfigOptions {
  dailyFreeGenerationLimit: number;
  tomorrowRecommendationStartHour: number;
  login: H5LoginConfig;
  inspirationKeywords: string[];
  homeCategories: string[];
  homeLooks: H5OptionItem[];
  seasons: H5OptionItem[];
  weathers: H5OptionItem[];
  temperatures: H5OptionItem[];
  locations: H5OptionItem[];
  styles: H5OptionItem[];
  scenes: H5OptionItem[];
  colors: H5OptionItem[];
  items: H5OptionItem[];
  imageModels: H5OptionItem[];
  generationCounts: H5OptionItem[];
}

export interface H5OutfitConfigResponse {
  code: number;
  message: string;
  data?: {
    status: string;
    options?: Partial<H5OutfitConfigOptions>;
  };
}

export const defaultH5OutfitConfigOptions: H5OutfitConfigOptions = {
  dailyFreeGenerationLimit: 3,
  tomorrowRecommendationStartHour: 20,
  login: {
    heroImage: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=84",
    heroAlt: "浅色衣架上的外套与包袋",
    brandTitle: "云裳 AI 穿搭",
    subtitle: "AI 智能搭配 · 发现更美的你",
    phonePasswordEnabled: true,
    registerEnabled: true,
    wechatEnabled: true,
  },
  inspirationKeywords: [
    "初夏约会",
    "都市通勤",
    "海边度假",
    "复古港风",
    "运动休闲",
    "简约高级感",
  ],
  homeCategories: ["通勤", "法式", "休闲", "简约", "度假"],
  homeLooks: [
    {
      label: "浅奶油通勤",
      image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=82",
    },
    {
      label: "柔雾风衣",
      image: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=82",
    },
    {
      label: "米白度假裙",
      image: "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=900&q=82",
    },
    {
      label: "灰调西装",
      image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=82",
    },
  ],
  seasons: ["春", "夏", "秋", "冬"].map((label) => ({ label })),
  weathers: ["晴天", "多云", "小雨", "大风", "降温"].map((label) => ({ label })),
  temperatures: [8, 15, 22, 28, 34].map((value) => ({ label: `${value}°C`, value })),
  locations: ["城市街拍", "咖啡店", "商场", "办公室", "公园", "海边"].map((label) => ({ label })),
  styles: [
    {
      label: "法式",
      image: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=82",
    },
    {
      label: "韩系",
      image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=82",
    },
    {
      label: "日系",
      image: "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=900&q=82",
    },
    {
      label: "美式",
      image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=82",
    },
    {
      label: "复古",
      image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=82",
    },
    {
      label: "运动",
      image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=82",
    },
  ],
  scenes: [
    { label: "日常通勤", icon: "home" },
    { label: "约会", icon: "heart" },
    { label: "旅行", icon: "plane" },
    { label: "度假", icon: "map-pin" },
    { label: "派对", icon: "sparkles" },
    { label: "逛街", icon: "briefcase" },
  ],
  colors: [
    { label: "粉色", value: "#ff7eac" },
    { label: "奶茶", value: "#dfb785" },
    { label: "浅蓝", value: "#83a8ef" },
    { label: "黑色", value: "#171717" },
    { label: "紫色", value: "#875ef1" },
    { label: "雾蓝", value: "#cbd8ff" },
  ],
  items: ["外套", "上衣", "裤子", "裙子", "鞋子", "包包"].map((label) => ({ label })),
  imageModels: [{ label: "gpt-image-2", value: "gpt-image-2" }],
  generationCounts: [1, 2, 3].map((value) => ({ label: `${value} 张`, value })),
};

export function mergeH5ConfigOptions(options?: Partial<H5OutfitConfigOptions>): H5OutfitConfigOptions {
  const dailyFreeGenerationLimit = normalizeDailyFreeGenerationLimit(
    options?.dailyFreeGenerationLimit,
  );
  const tomorrowRecommendationStartHour = normalizeTomorrowRecommendationStartHour(
    options?.tomorrowRecommendationStartHour,
  );

  return {
    ...defaultH5OutfitConfigOptions,
    ...(options || {}),
    dailyFreeGenerationLimit,
    tomorrowRecommendationStartHour,
    login: {
      ...defaultH5OutfitConfigOptions.login,
      ...(options?.login || {}),
    },
  };
}

export function normalizeDailyFreeGenerationLimit(value: unknown) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return defaultH5OutfitConfigOptions.dailyFreeGenerationLimit;
  }

  return Math.min(100, Math.max(0, Math.round(parsedValue)));
}

export function normalizeTomorrowRecommendationStartHour(value: unknown) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return defaultH5OutfitConfigOptions.tomorrowRecommendationStartHour;
  }

  return Math.min(23, Math.max(0, Math.round(parsedValue)));
}
