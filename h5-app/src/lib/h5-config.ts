import { outfitApiEndpoints } from "./api-endpoints.ts";
import { fetchWithTimeout } from "./request-timeout.ts";

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
  heroImages: H5LoginHeroImageConfig[];
  brandTitle: string;
  subtitle: string;
  poems: H5LoginPoemConfig[];
  phonePasswordEnabled: boolean;
  registerEnabled: boolean;
  wechatEnabled: boolean;
  guestEnabled: boolean;
}

export interface H5LoginHeroImageConfig {
  image: string;
  alt: string;
}

export interface H5LoginPoemConfig {
  kicker: string;
  line1: string;
  line2: string;
  footer: string;
}

export interface H5HomeHeroConfig {
  kicker: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  primaryAction: string;
  secondaryAction: string;
  lensText: string;
  backgroundImage: string;
  backgroundAlt: string;
  generatedAt?: string;
}

export interface H5HomeDailyRefreshConfig {
  enabled: boolean;
  refreshHour: number;
  lastRefreshDateKey?: string;
  lastRefreshAt?: string;
  lastError?: string;
  isRefreshing?: boolean;
  runningMessage?: string;
}

export interface H5LoginDailyRefreshConfig {
  enabled: boolean;
  refreshHour: number;
  lastRefreshDateKey?: string;
  lastRefreshAt?: string;
  lastError?: string;
  isRefreshing?: boolean;
  runningMessage?: string;
}

export interface H5ChatAssistantConfig {
  enabled: boolean;
  welcomeMessage: string;
  quickPrompts: string[];
  useStyleProfile: boolean;
  useRecentRecords: boolean;
  dailyLimit: number;
  maxHistoryMessages: number;
}

export interface H5OutfitConfigOptions {
  dailyFreeGenerationLimit: number;
  tomorrowRecommendationStartHour: number;
  login: H5LoginConfig;
  homeHero: H5HomeHeroConfig;
  homeDailyRefresh: H5HomeDailyRefreshConfig;
  loginDailyRefresh: H5LoginDailyRefreshConfig;
  chatAssistant: H5ChatAssistantConfig;
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

const h5OutfitConfigPreloadCacheKey = "cloudwear.h5-config-preload.v1";
const h5OutfitConfigPreloadMaxAgeMs = 1000 * 60 * 5;

export const defaultH5OutfitConfigOptions: H5OutfitConfigOptions = {
  dailyFreeGenerationLimit: 3,
  tomorrowRecommendationStartHour: 20,
  login: {
    heroImage: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=84",
    heroAlt: "浅色衣架上的外套与包袋",
    heroImages: [
      {
        image: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=84",
        alt: "浅色衣架上的外套与包袋",
      },
      {
        image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=84",
        alt: "时装秀场上的摩登穿搭",
      },
      {
        image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=84",
        alt: "城市街头的轻熟穿搭",
      },
    ],
    brandTitle: "云裳 AI 穿搭",
    subtitle: "AI 智能搭配 · 发现更美的你",
    poems: [
      {
        kicker: "东方衣境",
        line1: "云想衣裳花想容",
        line2: "春风拂槛露华浓",
        footer: "登录后同步衣橱偏好与历史方案",
      },
      {
        kicker: "今日灵感",
        line1: "衣随心动，风格自成",
        line2: "让每一次出门都有答案",
        footer: "登录后为你保留专属穿搭记忆",
      },
      {
        kicker: "AI 衣橱",
        line1: "看见自己，也看见风格",
        line2: "从一张照片开始变美",
        footer: "登录后解锁照片换搭与每日推荐",
      },
    ],
    phonePasswordEnabled: true,
    registerEnabled: true,
    wechatEnabled: true,
    guestEnabled: true,
  },
  homeHero: {
    kicker: "AI STYLING STUDIO",
    titleLine1: "今日穿搭",
    titleLine2: "交给云裳 AI",
    subtitle: "从关键词到本人照片，快速生成更适合场景、天气和个人风格的完整穿搭。",
    primaryAction: "上传照片",
    secondaryAction: "写关键词",
    lensText: "智能搭配中",
    backgroundImage: "",
    backgroundAlt: "AI 穿搭首页背景图",
  },
  homeDailyRefresh: {
    enabled: false,
    refreshHour: 6,
  },
  loginDailyRefresh: {
    enabled: false,
    refreshHour: 6,
  },
  chatAssistant: {
    enabled: true,
    welcomeMessage:
      "我是你的 AI 穿搭顾问，可以结合风格档案、天气和历史生成记录，帮你把想法整理成可生成的穿搭方案。",
    quickPrompts: ["明天通勤怎么穿", "按我的档案推荐", "换一套更显高的"],
    useStyleProfile: true,
    useRecentRecords: true,
    dailyLimit: 30,
    maxHistoryMessages: 8,
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

export async function fetchH5OutfitConfigOptions({
  timeoutMs = 5000,
}: {
  timeoutMs?: number;
} = {}) {
  const response = await fetchWithTimeout(
    outfitApiEndpoints.h5Config(),
    {
      cache: "no-store",
    },
    timeoutMs,
  );
  const payload = (await response.json().catch(() => null)) as
    | H5OutfitConfigResponse
    | null;
  if (!response.ok || !payload || payload.code !== 200) {
    throw new Error(payload?.message || "H5配置读取失败。");
  }

  const options = mergeH5ConfigOptions(payload.data?.options);
  writeCachedH5OutfitConfigOptions(options);
  return options;
}

export function readCachedH5OutfitConfigOptions({
  maxAgeMs = h5OutfitConfigPreloadMaxAgeMs,
}: {
  maxAgeMs?: number;
} = {}) {
  if (typeof window === "undefined") return null;

  try {
    const snapshot = window.sessionStorage.getItem(h5OutfitConfigPreloadCacheKey);
    if (!snapshot) return null;

    const payload = JSON.parse(snapshot) as {
      cachedAt?: string;
      options?: Partial<H5OutfitConfigOptions>;
    };
    const cachedAt = payload.cachedAt ? new Date(payload.cachedAt).getTime() : Number.NaN;
    if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > maxAgeMs) {
      window.sessionStorage.removeItem(h5OutfitConfigPreloadCacheKey);
      return null;
    }

    return mergeH5ConfigOptions(payload.options);
  } catch {
    return null;
  }
}

export function writeCachedH5OutfitConfigOptions(options: H5OutfitConfigOptions) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      h5OutfitConfigPreloadCacheKey,
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        options,
      }),
    );
  } catch {
    // Config preload is an optimization; the live request path still handles failures.
  }
}

export function mergeH5ConfigOptions(options?: Partial<H5OutfitConfigOptions>): H5OutfitConfigOptions {
  const dailyFreeGenerationLimit = normalizeDailyFreeGenerationLimit(
    options?.dailyFreeGenerationLimit,
  );
  const tomorrowRecommendationStartHour = normalizeTomorrowRecommendationStartHour(
    options?.tomorrowRecommendationStartHour,
  );
  const refreshHour = normalizeTomorrowRecommendationStartHour(
    options?.homeDailyRefresh?.refreshHour,
    defaultH5OutfitConfigOptions.homeDailyRefresh.refreshHour,
  );
  const loginRefreshHour = normalizeTomorrowRecommendationStartHour(
    options?.loginDailyRefresh?.refreshHour,
    defaultH5OutfitConfigOptions.loginDailyRefresh.refreshHour,
  );
  const chatDailyLimit = normalizeChatDailyLimit(options?.chatAssistant?.dailyLimit);
  const chatMaxHistoryMessages = normalizeChatMaxHistoryMessages(
    options?.chatAssistant?.maxHistoryMessages,
  );
  const mergedLogin = {
    ...defaultH5OutfitConfigOptions.login,
    ...(options?.login || {}),
  };
  const normalizedLoginHeroImages = normalizeLoginHeroImages(
    mergedLogin.heroImages,
    mergedLogin.heroImage,
    mergedLogin.heroAlt,
  );
  const normalizedLoginPoems = normalizeLoginPoems(mergedLogin.poems);

  return {
    ...defaultH5OutfitConfigOptions,
    ...(options || {}),
    dailyFreeGenerationLimit,
    tomorrowRecommendationStartHour,
    login: {
      ...mergedLogin,
      heroImage: normalizedLoginHeroImages[0]?.image || mergedLogin.heroImage,
      heroAlt: normalizedLoginHeroImages[0]?.alt || mergedLogin.heroAlt,
      heroImages: normalizedLoginHeroImages,
      poems: normalizedLoginPoems,
    },
    homeHero: {
      ...defaultH5OutfitConfigOptions.homeHero,
      ...(options?.homeHero || {}),
    },
    homeDailyRefresh: {
      ...defaultH5OutfitConfigOptions.homeDailyRefresh,
      ...(options?.homeDailyRefresh || {}),
      refreshHour,
    },
    loginDailyRefresh: {
      ...defaultH5OutfitConfigOptions.loginDailyRefresh,
      ...(options?.loginDailyRefresh || {}),
      refreshHour: loginRefreshHour,
    },
    chatAssistant: {
      ...defaultH5OutfitConfigOptions.chatAssistant,
      ...(options?.chatAssistant || {}),
      quickPrompts: normalizeChatQuickPrompts(options?.chatAssistant?.quickPrompts),
      dailyLimit: chatDailyLimit,
      maxHistoryMessages: chatMaxHistoryMessages,
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

export function normalizeTomorrowRecommendationStartHour(
  value: unknown,
  fallback = defaultH5OutfitConfigOptions.tomorrowRecommendationStartHour,
) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(23, Math.max(0, Math.round(parsedValue)));
}

function normalizeChatDailyLimit(value: unknown) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return defaultH5OutfitConfigOptions.chatAssistant.dailyLimit;
  }

  return Math.min(500, Math.max(0, Math.round(parsedValue)));
}

function normalizeChatMaxHistoryMessages(value: unknown) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return defaultH5OutfitConfigOptions.chatAssistant.maxHistoryMessages;
  }

  return Math.min(20, Math.max(2, Math.round(parsedValue)));
}

function normalizeChatQuickPrompts(value: unknown) {
  const list = Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : defaultH5OutfitConfigOptions.chatAssistant.quickPrompts;

  return list.slice(0, 6).map((item) => item.slice(0, 18));
}

function normalizeLoginHeroImages(
  value: unknown,
  fallbackImage: string,
  fallbackAlt: string,
) {
  const list = Array.isArray(value)
    ? value
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const image = String((item as Partial<H5LoginHeroImageConfig>).image || "").trim();
          if (!image) return null;
          const alt =
            String((item as Partial<H5LoginHeroImageConfig>).alt || "").trim() ||
            fallbackAlt;
          return { image, alt };
        })
        .filter((item): item is H5LoginHeroImageConfig => Boolean(item))
    : [];

  if (list.length) return list.slice(0, 12);
  return [{ image: fallbackImage, alt: fallbackAlt }];
}

function normalizeLoginPoems(value: unknown) {
  const list = Array.isArray(value)
    ? value
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const kicker = String((item as Partial<H5LoginPoemConfig>).kicker || "").trim();
          const line1 = String((item as Partial<H5LoginPoemConfig>).line1 || "").trim();
          const line2 = String((item as Partial<H5LoginPoemConfig>).line2 || "").trim();
          const footer = String((item as Partial<H5LoginPoemConfig>).footer || "").trim();
          if (!kicker && !line1 && !line2 && !footer) return null;
          return {
            kicker: kicker || defaultH5OutfitConfigOptions.login.poems[0].kicker,
            line1: line1 || defaultH5OutfitConfigOptions.login.poems[0].line1,
            line2,
            footer: footer || defaultH5OutfitConfigOptions.login.poems[0].footer,
          };
        })
        .filter((item): item is H5LoginPoemConfig => Boolean(item))
    : [];

  return (list.length ? list : defaultH5OutfitConfigOptions.login.poems).slice(0, 12);
}
