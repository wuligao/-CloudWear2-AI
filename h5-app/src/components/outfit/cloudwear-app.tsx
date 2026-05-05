"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties, ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  ChevronLeft,
  Cloud,
  CloudRain,
  Cloudy,
  CloudSun,
  Droplets,
  Flame,
  Heart,
  Home,
  ImagePlus,
  MapPin,
  Moon,
  Plane,
  RefreshCw,
  Shirt,
  Snowflake,
  Sparkles,
  Sun,
  Thermometer,
  Umbrella,
  X,
} from "lucide-react";
import {
  GlobalBottomNav,
} from "@/components/outfit/global-navigation";
import {
  buildH5LoginHref,
  getH5AuthHeader,
  readH5AuthSession,
} from "@/lib/auth";
import { writeOutfitResultSession } from "@/lib/result-session";
import {
  addCustomSelectable,
  toggleSelectable,
} from "@/lib/outfit-preferences";
import {
  buildPhotoModeStyle,
  defaultPhotoModeId,
  getPhotoModeById,
  photoModes,
  type PhotoMode,
} from "@/lib/photo-modes";
import {
  buildGenerationCountOptions,
  buildGenerationInput,
  defaultGenerationCount,
} from "@/lib/generation-input";
import {
  buildScenarioTaskHref,
  buildDailyScenarioTasks,
  buildScenarioTaskSummary,
  buildScenarioRecommendationContext,
  getRecommendationContextDetail,
  getRecommendationContextLabel,
  parseRecommendationContextFromSearchParams,
  type DailyScenarioProfile,
  type DailyWeatherContext,
  type ScenarioTask,
} from "@/lib/scenario-tasks";
import {
  buildPendingDailyWeatherContext,
  fetchDailyWeatherContext,
  readCachedDailyWeatherContext,
} from "@/lib/daily-weather";
import {
  defaultH5ProfileOverview,
  fetchH5ProfileOverview,
  readCachedH5ProfileOverview,
} from "@/lib/profile-overview";
import {
  buildStyleProfileGenerationContext,
  hasStyleProfileGenerationContext,
} from "@/lib/style-profile-generation";
import {
  type ActiveGenerationTask,
  type GenerateSource,
  countCompletedGenerationImages,
  getGenerationTaskElapsedSeconds,
  readActiveGenerationTask,
  readActiveGenerationTasks,
  readDailyGenerationCount,
  removeActiveGenerationTask,
  removeAutoGenerateFlagFromUrl,
  writeActiveGenerationTask,
} from "@/lib/generation-task-state";
import { outfitApiEndpoints, resolveBackendAssetUrl } from "@/lib/api-endpoints";
import {
  defaultH5OutfitConfigOptions,
  fetchH5OutfitConfigOptions,
  normalizeDailyFreeGenerationLimit,
  readCachedH5OutfitConfigOptions,
} from "@/lib/h5-config";
import type {
  H5HomeHeroConfig,
  H5OptionItem,
  H5OutfitConfigOptions,
} from "@/lib/h5-config";
import type {
  ApiErrorResponse,
  GenerateOutfitTaskSnapshot,
  GenerateOutfitResponse,
  OutfitGeneration,
  OutfitInput,
  OutfitPlan,
  OutfitRecommendationContext,
  OutfitStyleProfileContext,
} from "@/types/outfit";
import type { H5StyleArchive } from "@/types/profile";

type Screen = "home" | "keyword" | "photo";
const defaultInputFallback: OutfitInput = {
  season: defaultH5OutfitConfigOptions.seasons[0]?.label || "不限",
  temperature: Number(
    defaultH5OutfitConfigOptions.temperatures[2]?.value || 22,
  ),
  weather: defaultH5OutfitConfigOptions.weathers[1]?.label || "不限",
  location: defaultH5OutfitConfigOptions.locations[0]?.label || "不限",
  occasion: defaultH5OutfitConfigOptions.scenes[0]?.label || "不限",
  style: defaultH5OutfitConfigOptions.styles[0]?.label || "不限",
  colorPreference: defaultH5OutfitConfigOptions.colors[0]?.label || "不限",
  genderPreference: "不限",
};

const defaultImageModel = String(
  defaultH5OutfitConfigOptions.imageModels[0]?.value || "gpt-image-2",
);
const defaultPhotoImageModel = defaultImageModel;
const fallbackOutfitImage =
  defaultH5OutfitConfigOptions.homeLooks[0]?.image ||
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=82";
const uploadedPhotoMaxBytes = 6 * 1024 * 1024;
const keywordPlaceholder = "输入想要的提示词";
const loginRedirectDelayMs = 1200;
const generationExpectedSeconds = 5 * 60;

function logGenerationTrace(event: string, payload: Record<string, unknown> = {}) {
  console.info("[CloudWear:H5Generation]", {
    event,
    ...payload,
    at: new Date().toISOString(),
  });
}

const sceneIconMap = {
  home: Home,
  heart: Heart,
  plane: Plane,
  "map-pin": MapPin,
  sparkles: Sparkles,
  briefcase: BriefcaseBusiness,
};

const scenarioTaskIconMap = {
  briefcase: BriefcaseBusiness,
  camera: Camera,
  cloud: CloudSun,
  heart: Heart,
  plane: Plane,
  shirt: Shirt,
  sparkles: Sparkles,
};

function getDailyWeatherVisualTheme(weather: DailyWeatherContext) {
  const currentHour = new Date().getHours();
  if (/夜|晚/u.test(weather.weather)) return "night";
  if (
    weather.periodLabel === "今日" &&
    (currentHour >= 18 || currentHour < 6) &&
    /晴|云/u.test(weather.weather)
  ) return "night";
  if (/雪|冷|降温|寒/u.test(weather.weather) || weather.temperature <= 6) return "snowy";
  if (/雨|阵雨|雷/u.test(weather.weather)) return "rainy";
  if (/阴|雾|霾/u.test(weather.weather)) return "overcast";
  if (/风/u.test(weather.weather)) return "windy";
  if (/晴|热/u.test(weather.weather) || weather.temperature >= 30) return "sunny";
  if (/云|雾|阴/u.test(weather.weather)) return "cloudy";
  if (/冷|降温|寒/u.test(weather.weather) || weather.temperature <= 12) return "snowy";
  return "mild";
}

function getDailyWeatherFooter(theme: string) {
  if (theme === "rainy") return "雨天出行记得带伞，安全第一";
  if (theme === "snowy") return "雪天保暖，鞋底抓地更安心";
  if (theme === "night") return "夜晚出行注意保暖，享受美好时光";
  if (theme === "overcast") return "阴天舒适，层次感穿搭更显精神";
  if (theme === "sunny") return "每日清晨为你更新，穿得舒服，也更合你心意";
  return "每日清晨为你更新，穿得舒服，也更合你心意";
}

function renderDailyWeatherIcon(theme: string, size = 50) {
  if (theme === "sunny") return <Sun size={size} />;
  if (theme === "rainy") return <CloudRain size={size} />;
  if (theme === "snowy") return <Snowflake size={size} />;
  if (theme === "night") return <Moon size={size} />;
  if (theme === "overcast") return <Cloud size={size} />;
  if (theme === "cloudy" || theme === "windy") return <Cloudy size={size} />;
  return <CloudSun size={size} />;
}

function firstLabel(options: H5OptionItem[], fallback: string) {
  return options.find((option) => option.label)?.label || fallback;
}

function firstNumber(options: H5OptionItem[], fallback: number) {
  const option = options.find((item) => item.value !== undefined || item.label);
  const value = Number(
    option?.value ?? String(option?.label || "").replace(/[^\d.-]/g, ""),
  );
  return Number.isNaN(value) ? fallback : value;
}

function splitInitialTags(value: string) {
  return value
    .split(/[，,、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildDefaultInput(options: H5OutfitConfigOptions): OutfitInput {
  return {
    ...defaultInputFallback,
    season: firstLabel(options.seasons, defaultInputFallback.season),
    temperature: firstNumber(
      options.temperatures,
      defaultInputFallback.temperature,
    ),
    weather: firstLabel(options.weathers, defaultInputFallback.weather),
    location: firstLabel(options.locations, defaultInputFallback.location),
    occasion: firstLabel(options.scenes, defaultInputFallback.occasion),
    style: firstLabel(options.styles, defaultInputFallback.style),
    colorPreference: firstLabel(
      options.colors,
      defaultInputFallback.colorPreference || "不限",
    ),
  };
}

function buildDailyScenarioProfile(archive: H5StyleArchive): DailyScenarioProfile {
  return {
    genderPreference: archive.profile.genderPreference,
    favoriteStyles: archive.stylePreferences.map((item) => item.label),
    favoriteColors: archive.colorPreferences.map((item) => item.label),
    elementPreferences: archive.elementPreferences,
    fitPreferences: archive.fitTypes
      .filter((item) => !item.description.includes("保存更多记录"))
      .map((item) => item.label),
    notes: archive.notes,
  };
}

function buildLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function CloudWearApp({ initialScreen = "home" }: { initialScreen?: Screen } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const latestAutoGenerateRef = useRef<() => void>(() => undefined);
  const lastAutoGenerateAtRef = useRef(0);
  const authRedirectTimerRef = useRef<number | undefined>(undefined);
  const activeTaskRef = useRef<ActiveGenerationTask | null>(null);
  const screen = initialScreen;
  const progressTaskId = searchParams.get("taskId");
  const initialStyleText = searchParams.get("style") || "";
  const initialOccasionText = searchParams.get("occasion") || "";
  const initialTemperature = Number(searchParams.get("temperature"));
  const initialRecommendationContext =
    parseRecommendationContextFromSearchParams(searchParams);
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const [keywordText, setKeywordText] = useState(initialStyleText);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedScenes, setSelectedScenes] = useState<string[]>(
    splitInitialTags(initialOccasionText),
  );
  const [selectedSeason, setSelectedSeason] = useState<string | null>(
    searchParams.get("season"),
  );
  const [selectedWeather, setSelectedWeather] = useState<string | null>(
    searchParams.get("weather"),
  );
  const [selectedTemperature, setSelectedTemperature] = useState<number | null>(
    Number.isFinite(initialTemperature) ? initialTemperature : null,
  );
  const [selectedLocation, setSelectedLocation] = useState<string | null>(
    searchParams.get("location"),
  );
  const [selectedColor, setSelectedColor] = useState(
    searchParams.get("colorPreference"),
  );
  const [selectedGenerationCount, setSelectedGenerationCount] = useState(
    defaultGenerationCount,
  );
  const [customColor, setCustomColor] = useState("#cbd8ff");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedKeywordImageModel, setSelectedKeywordImageModel] =
    useState(defaultImageModel);
  const [selectedPhotoImageModel, setSelectedPhotoImageModel] = useState(
    defaultPhotoImageModel,
  );
  const [selectedPhotoModeId, setSelectedPhotoModeId] =
    useState(defaultPhotoModeId);
  const [customStyles, setCustomStyles] = useState<string[]>([]);
  const [customScenes, setCustomScenes] = useState<string[]>([]);
  const [customLocations, setCustomLocations] = useState<string[]>([]);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [dailyGenerationCount, setDailyGenerationCount] = useState(
    readDailyGenerationCount,
  );
  const [status, setStatus] = useState<"idle" | "loading" | "saved">("idle");
  const [error, setError] = useState("");
  const [rotation, setRotation] = useState(0);
  const [dailyTaskRotation, setDailyTaskRotation] = useState(0);
  const [dailyWeather, setDailyWeather] =
    useState<DailyWeatherContext>(
      () => readCachedDailyWeatherContext() || buildPendingDailyWeatherContext(),
    );
  const [dailyScenarioProfile, setDailyScenarioProfile] =
    useState<DailyScenarioProfile | null>(null);
  const [styleProfileContext, setStyleProfileContext] =
    useState<OutfitStyleProfileContext>({});
  const [useStyleProfile, setUseStyleProfile] = useState(true);
  const [activeRecommendationContext, setActiveRecommendationContext] =
    useState<OutfitRecommendationContext | undefined>(
      initialRecommendationContext,
    );
  const [activeTask, setActiveTask] = useState<ActiveGenerationTask | null>(
    null,
  );
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState("");
  const [generationPlanPreview, setGenerationPlanPreview] =
    useState<OutfitPlan | null>(null);
  const [h5Options, setH5Options] = useState<H5OutfitConfigOptions>(
    () => readCachedH5OutfitConfigOptions() || defaultH5OutfitConfigOptions,
  );
  const [h5ConfigResolved, setH5ConfigResolved] = useState(
    () => Boolean(readCachedH5OutfitConfigOptions()),
  );

  const configuredImageModels = useMemo(
    () =>
      h5Options.imageModels.filter((option) => option.label && option.value),
    [h5Options.imageModels],
  );
  const activeImageModels = configuredImageModels.length
    ? configuredImageModels
    : defaultH5OutfitConfigOptions.imageModels;
  const activeImageModelIds = useMemo(
    () => activeImageModels.map((option) => String(option.value)),
    [activeImageModels],
  );
  const defaultActiveImageModel = activeImageModelIds[0] || defaultImageModel;
  const effectiveKeywordImageModel = activeImageModelIds.includes(
    selectedKeywordImageModel,
  )
    ? selectedKeywordImageModel
    : defaultActiveImageModel;
  const effectivePhotoImageModel = activeImageModelIds.includes(
    selectedPhotoImageModel,
  )
    ? selectedPhotoImageModel
    : defaultActiveImageModel;
  const selectedPhotoMode = getPhotoModeById(selectedPhotoModeId) || photoModes[0];
  const activeColorOptions = h5Options.colors.length
    ? h5Options.colors
    : defaultH5OutfitConfigOptions.colors;
  const effectiveSelectedColor =
    selectedColor === "自定义" ||
    activeColorOptions.some((color) => color.label === selectedColor)
      ? selectedColor
      : null;
  const generationCountOptions = useMemo(
    () => buildGenerationCountOptions(h5Options),
    [h5Options],
  );
  const effectiveGenerationCount = generationCountOptions.includes(
    selectedGenerationCount,
  )
    ? selectedGenerationCount
    : generationCountOptions[0] || defaultGenerationCount;
  const dailyGenerationLimit = normalizeDailyFreeGenerationLimit(
    h5Options.dailyFreeGenerationLimit,
  );
  const rotatedKeywords = useMemo(
    () =>
      rotateItems(
        h5Options.inspirationKeywords.length
          ? h5Options.inspirationKeywords
          : defaultH5OutfitConfigOptions.inspirationKeywords,
        rotation,
      ),
    [h5Options.inspirationKeywords, rotation],
  );
  const dailyTaskDateKey = useMemo(() => buildLocalDateKey(), []);
  const dailyRecommendationDateKey = dailyWeather.forecastDateKey || dailyTaskDateKey;
  const dailyRecommendationTitle = `${dailyWeather.periodLabel || "今日"}穿搭推荐`;
  const dailyScenarioTasks = useMemo(
    () =>
      buildDailyScenarioTasks({
        count: 6,
        date: `${dailyRecommendationDateKey}-${dailyTaskRotation}`,
        profile: dailyScenarioProfile,
        weather: dailyWeather,
      }),
    [dailyScenarioProfile, dailyRecommendationDateKey, dailyTaskRotation, dailyWeather],
  );
  const dailyScenarioTaskSummary = useMemo(
    () =>
      buildScenarioTaskSummary({
        profile: dailyScenarioProfile,
        weather: dailyWeather,
      }),
    [dailyScenarioProfile, dailyWeather],
  );
  const styleProfileReady = useMemo(
    () => hasStyleProfileGenerationContext(styleProfileContext),
    [styleProfileContext],
  );
  const styleProfileSummary = useMemo(
    () => buildStyleProfileSummary(styleProfileContext),
    [styleProfileContext],
  );
  const remainingGenerations = Math.max(
    0,
    dailyGenerationLimit - dailyGenerationCount,
  );

  const navigateToScreen = useCallback(
    (nextScreen: Screen, replace = false) => {
      const href = nextScreen === "home" ? "/" : `/?screen=${nextScreen}`;
      if (replace) {
        router.replace(href, { scroll: false });
        return;
      }

      router.push(href, { scroll: false });
    },
    [router],
  );

  const showLoginRequired = useCallback(
    (redirectTo?: string, replace = false) => {
      if (readH5AuthSession()) {
        setAuthPromptVisible(false);
        if (authRedirectTimerRef.current) {
          window.clearTimeout(authRedirectTimerRef.current);
          authRedirectTimerRef.current = undefined;
        }
        return;
      }

      setAuthPromptVisible(true);
      if (authRedirectTimerRef.current) {
        window.clearTimeout(authRedirectTimerRef.current);
      }

      authRedirectTimerRef.current = window.setTimeout(() => {
        if (readH5AuthSession()) {
          setAuthPromptVisible(false);
          authRedirectTimerRef.current = undefined;
          return;
        }

        const loginHref = buildH5LoginHref(redirectTo);
        if (replace) {
          window.location.replace(loginHref);
        } else {
          window.location.assign(loginHref);
        }
      }, loginRedirectDelayMs);
    },
    [],
  );

  useEffect(() => {
    if (!readH5AuthSession()) return;

    const timer = window.setTimeout(() => {
      setAuthPromptVisible(false);
      if (authRedirectTimerRef.current) {
        window.clearTimeout(authRedirectTimerRef.current);
        authRedirectTimerRef.current = undefined;
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [screen]);

  useEffect(() => {
    return () => {
      if (authRedirectTimerRef.current) {
        window.clearTimeout(authRedirectTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (h5ConfigResolved) return;
    let cancelled = false;

    async function loadH5Config() {
      try {
        const options = await fetchH5OutfitConfigOptions();
        if (!cancelled) {
          setH5Options(options);
        }
      } catch (caughtError) {
        console.warn(
          caughtError instanceof Error
            ? caughtError.message
            : "H5配置读取失败。",
        );
      } finally {
        if (!cancelled) {
          setH5ConfigResolved(true);
        }
      }
    }

    void loadH5Config();
    return () => {
      cancelled = true;
    };
  }, [h5ConfigResolved]);

  useEffect(() => {
    if (!h5ConfigResolved) return;
    let cancelled = false;

    async function loadDailyContext() {
      const cachedWeather = readCachedDailyWeatherContext({
        tomorrowRecommendationStartHour:
          h5Options.tomorrowRecommendationStartHour,
      });
      const cachedOverview = readCachedH5ProfileOverview();
      const [weatherResult, profileResult] = await Promise.allSettled([
        cachedWeather
          ? Promise.resolve(cachedWeather)
          : fetchDailyWeatherContext({
              tomorrowRecommendationStartHour:
                h5Options.tomorrowRecommendationStartHour,
            }),
        cachedOverview ? Promise.resolve(cachedOverview) : fetchH5ProfileOverview(),
      ]);

      if (cancelled) return;

      if (weatherResult.status === "fulfilled") {
        setDailyWeather(weatherResult.value);
      }

      const overview =
        profileResult.status === "fulfilled"
          ? profileResult.value
          : defaultH5ProfileOverview;
      setDailyScenarioProfile(buildDailyScenarioProfile(overview.archive));
      setStyleProfileContext(buildStyleProfileGenerationContext(overview.archive));
    }

    void loadDailyContext();
    return () => {
      cancelled = true;
    };
  }, [h5ConfigResolved, h5Options.tomorrowRecommendationStartHour]);

  useEffect(() => {
    const nextContext = parseRecommendationContextFromSearchParams(searchParams);
    if (nextContext) {
      queueMicrotask(() => setActiveRecommendationContext(nextContext));
      return;
    }

    if (screen !== "keyword") {
      queueMicrotask(() => setActiveRecommendationContext(undefined));
    }
  }, [screen, searchParams]);

  useEffect(() => {
    activeTaskRef.current = activeTask;
  }, [activeTask]);

  useEffect(() => {
    if (screen === "home" || readH5AuthSession()) return;

    const timer = window.setTimeout(() => {
      showLoginRequired(
        screen === "photo" ? "/?screen=photo" : "/?screen=keyword",
        true,
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [screen, showLoginRequired]);

  const completeGeneration = useCallback(
    (
      generation: GenerateOutfitResponse,
      generations: OutfitGeneration[] = [generation],
    ) => {
      const taskId = generation.taskId || generation.id;
      const completedTask =
        readActiveGenerationTasks().find((task) => task.taskId === taskId) ||
        activeTaskRef.current;
      const recommendationContext =
        generation.recommendationContext ||
        completedTask?.input?.recommendationContext;
      const photoMode = generation.photoMode || completedTask?.input?.photoMode;
      const hydratedGenerations =
        recommendationContext || photoMode
          ? generations.map((item) => ({
              ...item,
              recommendationContext:
                item.recommendationContext || recommendationContext,
              photoMode: item.photoMode || photoMode,
            }))
          : generations;
      logGenerationTrace("task.complete", {
        resultCount: hydratedGenerations.length,
        source: completedTask?.source,
        taskId,
      });

      setDailyGenerationCount((current) => {
        const nextCount = countCompletedGenerationImages(
          generation,
          hydratedGenerations,
          dailyGenerationLimit,
        );
        return nextCount === current ? current : nextCount;
      });
      removeActiveGenerationTask(taskId);
      setActiveTask(null);
      setGenerationProgress(0);
      setGenerationMessage("");
      setGenerationPlanPreview(null);
      setStatus("idle");
      writeOutfitResultSession({
        taskId,
        source: completedTask?.source,
        createdAt: new Date().toISOString(),
        recommendationContext,
        results: hydratedGenerations,
      });
      router.push("/result");
    },
    [dailyGenerationLimit, router],
  );

  const applyTaskSnapshot = useCallback(
    (task: GenerateOutfitTaskSnapshot) => {
      logGenerationTrace("task.snapshot.apply", {
        hasResult: Boolean(task.result),
        progress: task.progress,
        resultCount: task.results?.length || (task.result ? 1 : 0),
        status: task.status,
        taskId: task.taskId,
      });
      setGenerationProgress(task.progress);
      setGenerationMessage(task.message);
      setGenerationPlanPreview(task.planPreview || null);

      if (task.status === "queued" || task.status === "running") {
        setStatus("loading");
        return;
      }

      if (task.status === "succeeded" && task.result) {
        completeGeneration(
          task.result,
          task.results?.length ? task.results : [task.result],
        );
        return;
      }

      if (task.status === "failed") {
        logGenerationTrace("task.failed", {
          error: task.error,
          taskId: task.taskId,
        });
        removeActiveGenerationTask(task.taskId);
        setActiveTask(null);
        setGenerationProgress(0);
        setGenerationMessage("");
        setGenerationPlanPreview(null);
        setError(task.error || "生成失败，请稍后再试。");
        setStatus("idle");
      }
    },
    [completeGeneration],
  );

  const restoreGenerationTask = useCallback(
    async (task: ActiveGenerationTask) => {
      logGenerationTrace("task.restore.start", {
        source: task.source,
        taskId: task.taskId,
      });
      if (screen !== task.source) {
        router.replace(`/?screen=${task.source}&taskId=${encodeURIComponent(task.taskId)}`, {
          scroll: false,
        });
      }
      setStatus("loading");
      setError("");

      try {
        const response = await fetch(
          outfitApiEndpoints.generationTask(task.taskId),
          {
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as
          | GenerateOutfitTaskSnapshot
          | ApiErrorResponse;

        if (!response.ok) {
          throw new Error(
            "error" in payload ? payload.error : "生成任务恢复失败。",
          );
        }
        logGenerationTrace("task.restore.response", {
          httpStatus: response.status,
          source: task.source,
          status: (payload as GenerateOutfitTaskSnapshot).status,
          taskId: task.taskId,
        });

        const restoredTask = {
          ...task,
          createdAt:
            task.createdAt || (payload as GenerateOutfitTaskSnapshot).createdAt,
        };
        if (restoredTask.createdAt !== task.createdAt) {
          writeActiveGenerationTask(restoredTask, { syncUrl: false });
        }

        setActiveTask((current) =>
          current?.taskId === task.taskId &&
          current.source === task.source &&
          current.createdAt === restoredTask.createdAt
            ? current
            : restoredTask,
        );
        applyTaskSnapshot(payload as GenerateOutfitTaskSnapshot);
      } catch (caughtError) {
        logGenerationTrace("task.restore.failed", {
          error:
            caughtError instanceof Error
              ? caughtError.message
              : "生成任务恢复失败。",
          taskId: task.taskId,
        });
        removeActiveGenerationTask(task.taskId);
        setActiveTask(null);
        setGenerationProgress(0);
        setGenerationMessage("");
        setGenerationPlanPreview(null);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "生成任务恢复失败。",
        );
        setStatus("idle");
      }
    },
    [applyTaskSnapshot, router, screen],
  );

  useEffect(() => {
    if (!progressTaskId) {
      queueMicrotask(() => {
        setActiveTask(null);
        setGenerationProgress(0);
        setGenerationMessage("");
        setGenerationPlanPreview(null);
        setStatus("idle");
      });
      return;
    }

    const task = readActiveGenerationTask();
    if (!task || task.taskId !== progressTaskId) return;

    queueMicrotask(() => {
      void restoreGenerationTask(task);
    });
  }, [progressTaskId, restoreGenerationTask]);

	  useEffect(() => {
	    if (!activeTask) return;

	    logGenerationTrace("task.sse.open", {
	      source: activeTask.source,
	      taskId: activeTask.taskId,
	    });
	    const eventSource = new EventSource(
      outfitApiEndpoints.generationEvents(activeTask.taskId),
    );

	    function handleStatus(event: MessageEvent<string>) {
	      const task = JSON.parse(event.data) as GenerateOutfitTaskSnapshot;
	      logGenerationTrace("task.sse.status", {
	        progress: task.progress,
	        status: task.status,
	        taskId: task.taskId,
	      });
	      applyTaskSnapshot(task);
	    }

    eventSource.addEventListener("status", handleStatus);
	    eventSource.onerror = () => {
	      logGenerationTrace("task.sse.error", {
	        taskId: activeTask.taskId,
	      });
	      setGenerationMessage("连接中断，正在重新连接。");
	    };

	    return () => {
	      eventSource.removeEventListener("status", handleStatus);
	      eventSource.close();
	      logGenerationTrace("task.sse.close", {
	        taskId: activeTask.taskId,
	      });
	    };
  }, [activeTask, applyTaskSnapshot]);

  useEffect(() => {
    function restoreWhenVisible() {
      if (!progressTaskId) return;

      const task = readActiveGenerationTask();
      if (!task || task.taskId !== progressTaskId) return;
      void restoreGenerationTask(task);
    }

    function handleVisibilityChange() {
      if (!document.hidden) restoreWhenVisible();
    }

    window.addEventListener("online", restoreWhenVisible);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", restoreWhenVisible);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [progressTaskId, restoreGenerationTask]);

  useEffect(() => {
    latestAutoGenerateRef.current = () => {
      const now = Date.now();
      if (now - lastAutoGenerateAtRef.current < 1000) return;

      if (!readH5AuthSession()) {
        showLoginRequired();
        return;
      }

      removeAutoGenerateFlagFromUrl();

      if (activeTask || status === "loading") {
        return;
      }

      lastAutoGenerateAtRef.current = now;
      navigateToScreen("keyword", true);
      setError("");
      void generateOutfit("keyword");
    };
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("autoGenerate") !== "1") return;

    latestAutoGenerateRef.current();
  }, []);

  function goHome() {
    setError("");
    setActiveRecommendationContext(undefined);
    navigateToScreen("home");
  }

  function openScreen(nextScreen: Screen) {
    if (nextScreen !== "home" && !readH5AuthSession()) {
      showLoginRequired(
        nextScreen === "photo" ? "/?screen=photo" : "/?screen=keyword",
      );
      return;
    }

    setError("");
    setActiveRecommendationContext(undefined);
    navigateToScreen(nextScreen);
  }

  function openScenarioTask(task: ScenarioTask) {
    const recommendationContext = buildScenarioRecommendationContext(
      task,
      dailyWeather,
    );
    const href = buildScenarioTaskHref(task, { recommendationContext });

    if (!readH5AuthSession()) {
      showLoginRequired(href);
      return;
    }

    setError("");
    setKeywordText(task.preset.style);
    setSelectedScenes(splitInitialTags(task.preset.occasion));
    setSelectedSeason(task.preset.season || null);
    setSelectedWeather(task.preset.weather || null);
    setSelectedTemperature(task.preset.temperature ?? null);
    setSelectedLocation(task.preset.location || null);
    setSelectedColor(task.preset.colorPreference || null);
    setActiveRecommendationContext(recommendationContext);
    router.push(href, { scroll: false });
  }

  function toggleSelection(
    value: string,
    values: string[],
    setter: (next: string[]) => void,
  ) {
    setter(toggleSelectable(value, values));
  }

  function addCustomSelection(
    value: string,
    values: string[],
    setter: (next: string[]) => void,
  ) {
    setter(addCustomSelectable(value, values));
  }

  function addKeyword(keyword: string) {
    if (!readH5AuthSession()) {
      showLoginRequired("/?screen=keyword");
      return;
    }

    setKeywordText((current) => {
      const parts = current
        .split(/[，,]/)
        .map((part) => part.trim())
        .filter(Boolean);

      if (parts.includes(keyword)) {
        return current;
      }

      return [...parts, keyword].join("，");
    });
  }

  function shuffleLooks() {
    setRotation((current) => current + 1);
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    if (!readH5AuthSession()) {
      event.target.value = "";
      showLoginRequired("/?screen=photo");
      return;
    }

    const file = event.target.files?.[0];
    setError("");
    setPhotoError("");
    if (!file) return;
    event.target.value = "";

    if (!/^image\/(png|jpeg|jpg|webp)$/.test(file.type)) {
      setPhotoError("请上传 JPG、PNG 或 WebP 图片。");
      return;
    }

    if (file.size > uploadedPhotoMaxBytes) {
      setPhotoError("图片不能超过 6MB。");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(String(reader.result || ""));
      setPhotoName(file.name);
      setPhotoError("");
    };
    reader.onerror = () => setPhotoError("读取图片失败，请重新选择。");
    reader.readAsDataURL(file);
  }

  async function generateOutfit(source: GenerateSource) {
    if (status === "loading" && activeTask) return;

    if (!readH5AuthSession()) {
      showLoginRequired(
        source === "photo" ? "/?screen=photo" : "/?screen=keyword",
      );
      return;
    }

    if (remainingGenerations <= 0) {
      setError("今日免费生成图片数已用完，请明天再试。");
      return;
    }

    if (effectiveGenerationCount > remainingGenerations) {
      setError(`今日还剩 ${remainingGenerations} 张免费图片，请减少生成张数。`);
      return;
    }

    if (source === "photo" && !photoDataUrl) {
      setPhotoError("请先上传一张清晰全身或半身照片。");
      return;
    }

    setStatus("loading");
    setError("");
    setPhotoError("");
    setGenerationPlanPreview(null);

    try {
      const generationInput = buildInput(source);
      logGenerationTrace("task.create.request", {
        generationCount: generationInput.generationCount,
        hasPhoto: Boolean(generationInput.userPhotoDataUrl),
        imageModel: generationInput.imageModel,
        source,
      });
      const response = await fetch(outfitApiEndpoints.createGeneration(), {
        method: "POST",
        headers: {
          ...getH5AuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...generationInput,
        }),
      });
      const payload = (await response.json()) as
        | GenerateOutfitTaskSnapshot
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : "生成失败");
      }

      const task = payload as GenerateOutfitTaskSnapshot;
      logGenerationTrace("task.create.accepted", {
        httpStatus: response.status,
        progress: task.progress,
        source,
        status: task.status,
        taskId: task.taskId,
      });
      const taskCreatedAt = task.createdAt || new Date().toISOString();
      const activeGenerationTask = {
        taskId: task.taskId,
        source,
        createdAt: taskCreatedAt,
        input: generationInput,
      };
      const isPendingTask = task.status === "queued" || task.status === "running";
      writeActiveGenerationTask(activeGenerationTask, { syncUrl: isPendingTask });
      setActiveTask(activeGenerationTask);
      applyTaskSnapshot(task);
      if (
        progressTaskId !== task.taskId &&
        isPendingTask
      ) {
        router.replace(
          `/?screen=${source}&taskId=${encodeURIComponent(task.taskId)}`,
          { scroll: false },
        );
      }
    } catch (caughtError) {
      logGenerationTrace("task.create.failed", {
        error: caughtError instanceof Error ? caughtError.message : "生成失败",
        source,
      });
      setError(caughtError instanceof Error ? caughtError.message : "生成失败");
      setGenerationPlanPreview(null);
      setStatus("idle");
    }
  }

  function buildInput(source: GenerateSource): OutfitInput {
    const configDefaults = buildDefaultInput(h5Options);

    const input = buildGenerationInput({
      configDefaults,
      customColor,
      generationCount: effectiveGenerationCount,
      imageModel:
        source === "photo"
          ? effectivePhotoImageModel
          : effectiveKeywordImageModel,
      keywordText:
        source === "photo"
          ? buildPhotoModeStyle(keywordText, selectedPhotoMode)
          : keywordText,
      photoDataUrl,
      selectedColor: effectiveSelectedColor,
      selectedItems,
      selectedLocation,
      selectedScenes,
      selectedSeason,
      selectedStyles,
      selectedTemperature,
      selectedWeather,
      source,
    });

    const profileContext =
      useStyleProfile && styleProfileReady ? styleProfileContext : undefined;
    const inputWithProfile = {
      ...input,
      genderPreference:
        normalizeGenerationGenderPreference(profileContext?.genderPreference) ||
        input.genderPreference,
      styleProfileContext: profileContext,
    };

    if (source === "keyword" && activeRecommendationContext) {
      return {
        ...inputWithProfile,
        recommendationContext: activeRecommendationContext,
      };
    }

    if (source === "photo" && selectedPhotoMode) {
      return {
        ...inputWithProfile,
        photoMode: {
          id: selectedPhotoMode.id,
          label: selectedPhotoMode.label,
          prompt: selectedPhotoMode.prompt,
        },
      };
    }

    return inputWithProfile;
  }

  return (
    <div className="cw-app">
      {screen === "home" ? (
        <HomeScreen
          categories={h5Options.homeCategories}
          dailyTaskSummary={dailyScenarioTaskSummary}
          dailyTasks={dailyScenarioTasks}
          dailyTaskTitle={dailyRecommendationTitle}
          dailyWeather={dailyWeather}
          dailyWeatherTheme={getDailyWeatherVisualTheme(dailyWeather)}
          homeHero={h5Options.homeHero}
          homeLooks={h5Options.homeLooks}
          keywords={rotatedKeywords}
          onAddKeyword={addKeyword}
          onOpenKeyword={() => openScreen("keyword")}
          onOpenPhoto={() => openScreen("photo")}
          onOpenScenarioTask={openScenarioTask}
          onShuffleDailyTasks={() => setDailyTaskRotation((current) => current + 1)}
          onShuffle={shuffleLooks}
        />
      ) : null}

      {screen === "keyword" ? (
        <GenerateScreen
          customLocations={customLocations}
          customScenes={customScenes}
          customColor={customColor}
          customStyles={customStyles}
          error={error}
          generationMessage={generationMessage}
          generationPlanPreview={generationPlanPreview}
          generationProgress={generationProgress}
          generationCount={effectiveGenerationCount}
          generationCountOptions={generationCountOptions}
          dailyGenerationLimit={dailyGenerationLimit}
          keywordText={keywordText}
          remainingGenerations={remainingGenerations}
          recommendationContext={activeRecommendationContext}
          screen="keyword"
          styleProfileReady={styleProfileReady}
          styleProfileSummary={styleProfileSummary}
          useStyleProfile={useStyleProfile}
          taskStartedAt={activeTask?.createdAt}
          configOptions={h5Options}
          imageModelOptions={activeImageModels}
          selectedColor={effectiveSelectedColor}
          selectedItems={selectedItems}
          selectedImageModel={effectiveKeywordImageModel}
          selectedLocation={selectedLocation}
          selectedScenes={selectedScenes}
          selectedSeason={selectedSeason}
          selectedStyles={selectedStyles}
          selectedTemperature={selectedTemperature}
          selectedWeather={selectedWeather}
          status={status}
          onBack={goHome}
          onGenerate={() => generateOutfit("keyword")}
          onToggleUseStyleProfile={setUseStyleProfile}
          onSelectLocation={setSelectedLocation}
          onSelectSeason={setSelectedSeason}
          onSelectTemperature={setSelectedTemperature}
          onSelectWeather={setSelectedWeather}
          onSelectColor={setSelectedColor}
          onSelectGenerationCount={setSelectedGenerationCount}
          onSelectImageModel={setSelectedKeywordImageModel}
          onAddCustomLocation={(location) => {
            setCustomLocations((current) =>
              addCustomSelectable(location, current),
            );
            setSelectedLocation(location.trim());
          }}
          onAddCustomItem={(item) =>
            addCustomSelection(item, selectedItems, setSelectedItems)
          }
          onAddCustomScene={(scene) => {
            setCustomScenes((current) => addCustomSelectable(scene, current));
            addCustomSelection(scene, selectedScenes, setSelectedScenes);
          }}
          onAddCustomStyle={(style) => {
            setCustomStyles((current) => addCustomSelectable(style, current));
            addCustomSelection(style, selectedStyles, setSelectedStyles);
          }}
          onCustomColorChange={setCustomColor}
          onTextChange={setKeywordText}
          onToggleItem={(item) =>
            toggleSelection(item, selectedItems, setSelectedItems)
          }
          onToggleScene={(scene) =>
            toggleSelection(scene, selectedScenes, setSelectedScenes)
          }
          onToggleStyle={(style) =>
            toggleSelection(style, selectedStyles, setSelectedStyles)
          }
        />
      ) : null}

      {screen === "photo" ? (
        <GenerateScreen
          customLocations={customLocations}
          customScenes={customScenes}
          customColor={customColor}
          customStyles={customStyles}
          error={error}
          generationMessage={generationMessage}
          generationPlanPreview={generationPlanPreview}
          generationProgress={generationProgress}
          generationCount={effectiveGenerationCount}
          generationCountOptions={generationCountOptions}
          dailyGenerationLimit={dailyGenerationLimit}
          keywordText={keywordText}
          photoDataUrl={photoDataUrl}
          photoModes={photoModes}
          photoName={photoName}
          remainingGenerations={remainingGenerations}
          recommendationContext={undefined}
          screen="photo"
          styleProfileReady={styleProfileReady}
          styleProfileSummary={styleProfileSummary}
          useStyleProfile={useStyleProfile}
          taskStartedAt={activeTask?.createdAt}
          configOptions={h5Options}
          imageModelOptions={activeImageModels}
          selectedColor={effectiveSelectedColor}
          selectedItems={selectedItems}
          selectedImageModel={effectivePhotoImageModel}
          selectedLocation={selectedLocation}
          selectedPhotoModeId={selectedPhotoMode?.id || ""}
          selectedScenes={selectedScenes}
          selectedSeason={selectedSeason}
          selectedStyles={selectedStyles}
          selectedTemperature={selectedTemperature}
          selectedWeather={selectedWeather}
          status={status}
          onBack={goHome}
          onClearPhoto={() => {
            setPhotoDataUrl("");
            setPhotoName("");
            setPhotoError("");
          }}
          photoError={photoError}
          onGenerate={() => generateOutfit("photo")}
          onToggleUseStyleProfile={setUseStyleProfile}
          onPhotoChange={handlePhotoChange}
          onSelectPhotoMode={setSelectedPhotoModeId}
          onSelectLocation={setSelectedLocation}
          onSelectSeason={setSelectedSeason}
          onSelectTemperature={setSelectedTemperature}
          onSelectWeather={setSelectedWeather}
          onSelectColor={setSelectedColor}
          onSelectGenerationCount={setSelectedGenerationCount}
          onSelectImageModel={setSelectedPhotoImageModel}
          onAddCustomLocation={(location) => {
            setCustomLocations((current) =>
              addCustomSelectable(location, current),
            );
            setSelectedLocation(location.trim());
          }}
          onAddCustomItem={(item) =>
            addCustomSelection(item, selectedItems, setSelectedItems)
          }
          onAddCustomScene={(scene) => {
            setCustomScenes((current) => addCustomSelectable(scene, current));
            addCustomSelection(scene, selectedScenes, setSelectedScenes);
          }}
          onAddCustomStyle={(style) => {
            setCustomStyles((current) => addCustomSelectable(style, current));
            addCustomSelection(style, selectedStyles, setSelectedStyles);
          }}
          onCustomColorChange={setCustomColor}
          onTextChange={setKeywordText}
          onToggleItem={(item) =>
            toggleSelection(item, selectedItems, setSelectedItems)
          }
          onToggleScene={(scene) =>
            toggleSelection(scene, selectedScenes, setSelectedScenes)
          }
          onToggleStyle={(style) =>
            toggleSelection(style, selectedStyles, setSelectedStyles)
          }
        />
      ) : null}

      {authPromptVisible ? <LoginRequiredPrompt /> : null}
      {screen === "home" ? <GlobalBottomNav /> : null}
    </div>
  );
}

function normalizeGenerationGenderPreference(value?: string) {
  const text = value?.trim();
  if (!text) return "";
  return text === "不限定" ? "不限" : text;
}

function buildStyleProfileSummary(context: OutfitStyleProfileContext) {
  const summary = [
    normalizeGenerationGenderPreference(context.genderPreference),
    context.favoriteStyles?.[0],
    context.favoriteColors?.[0],
    context.fitPreferences?.[0],
  ]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(" · ");

  return summary || "完善风格档案后可用";
}

function LoginRequiredPrompt() {
  return (
    <div className="cw-auth-redirect-toast" role="status" aria-live="polite">
      <div>
        <Sparkles size={18} />
      </div>
      <strong>请先登录</strong>
      <span>正在为你跳转到登录页面...</span>
    </div>
  );
}

function HomeScreen({
  categories,
  dailyTaskSummary,
  dailyTasks,
  dailyTaskTitle,
  dailyWeather,
  dailyWeatherTheme,
  homeHero,
  homeLooks,
  keywords,
  onAddKeyword,
  onOpenKeyword,
  onOpenPhoto,
  onOpenScenarioTask,
  onShuffleDailyTasks,
  onShuffle,
}: {
  categories: readonly string[];
  dailyTaskSummary: string;
  dailyTasks: readonly ScenarioTask[];
  dailyTaskTitle: string;
  dailyWeather: DailyWeatherContext;
  dailyWeatherTheme: string;
  homeHero: H5HomeHeroConfig;
  homeLooks: readonly H5OptionItem[];
  keywords: readonly string[];
  onAddKeyword: (keyword: string) => void;
  onOpenKeyword: () => void;
  onOpenPhoto: () => void;
  onOpenScenarioTask: (task: ScenarioTask) => void;
  onShuffleDailyTasks: () => void;
  onShuffle: () => void;
}) {
  const [copiedKeyword, setCopiedKeyword] = useState("");

  async function handleKeywordClick(keyword: string) {
    onAddKeyword(keyword);

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(keyword);
      } catch (caughtError) {
        console.warn(
          caughtError instanceof Error
            ? caughtError.message
            : "关键词复制失败。",
        );
      }
    }

    setCopiedKeyword(keyword);
    window.setTimeout(() => {
      setCopiedKeyword((current) => (current === keyword ? "" : current));
    }, 1200);
  }

  const featuredLooks = (
    homeLooks.length ? homeLooks : defaultH5OutfitConfigOptions.homeLooks
  ).slice(0, 4);
  const heroConfig = {
    ...defaultH5OutfitConfigOptions.homeHero,
    ...homeHero,
  };
  const heroBackgroundImage = resolveBackendAssetUrl(heroConfig.backgroundImage);
  const visibleCategories = categories.length
    ? categories
    : defaultH5OutfitConfigOptions.homeCategories;
  const rainProbability =
    typeof dailyWeather.precipitationProbability === "number"
      ? dailyWeather.precipitationProbability
      : dailyWeatherTheme === "rainy"
        ? 80
        : dailyWeatherTheme === "snowy"
          ? 60
          : 10;

  return (
    <section className="cw-home">
      <section
        className={heroBackgroundImage ? "cw-home-hero has-background" : "cw-home-hero"}
        style={
          heroBackgroundImage
            ? ({
                "--cw-home-hero-bg": `url("${heroBackgroundImage}")`,
              } as CSSProperties)
            : undefined
        }
      >
        <div className="cw-hero-copy">
          <span>{heroConfig.kicker}</span>
          <h1>
            {heroConfig.titleLine1}
            <br />
            {heroConfig.titleLine2}
          </h1>
          <p>
            {heroConfig.subtitle}
          </p>
          <div className="cw-hero-actions">
            <button type="button" onClick={onOpenPhoto}>
              <ImagePlus size={17} />
              {heroConfig.primaryAction}
            </button>
            <button type="button" onClick={onOpenKeyword}>
              <Sparkles size={17} />
              {heroConfig.secondaryAction}
            </button>
          </div>
        </div>
        <div className="cw-hero-editorial" aria-hidden="true">
          {featuredLooks.slice(0, 3).map((look, index) => (
            <div
              className={`cw-hero-look look-${index + 1}`}
              key={`${look.label}-hero-${index}`}
            >
              <Image
                alt=""
                src={resolveBackendAssetUrl(look.image) || fallbackOutfitImage}
                width={188}
                height={252}
                unoptimized
                className="h-full w-full object-cover"
              />
            </div>
          ))}
          <div className="cw-hero-lens">
            <Sparkles size={16} />
            <span>{heroConfig.lensText}</span>
          </div>
        </div>
      </section>

      <section className="cw-quick-panel">
        <div className="cw-quick-header">
          <div>
            <span>START HERE</span>
            <h2>选择你的生成方式</h2>
          </div>
          <small>2 种生成方式</small>
        </div>
        <div className="cw-entry-stack">
          <EntryCard
            accent="purple"
            description="输入风格、场景或单品，快速生成完整穿搭"
            icon={<Sparkles size={28} />}
            title="关键词生成"
            onClick={onOpenKeyword}
          />
          <EntryCard
            accent="blue"
            action="立即上传"
            description="基于你的照片做穿搭改造，更贴近本人气质"
            icon={<ImagePlus size={28} />}
            title="照片换装"
            onClick={onOpenPhoto}
          />
        </div>
      </section>

      <section className={`cw-daily-task-panel is-${dailyWeatherTheme}`}>
        <div className="cw-weather-scene" aria-hidden="true">
          <span className="cw-weather-sun" />
          <span className="cw-weather-moon" />
          <span className="cw-weather-star star-a" />
          <span className="cw-weather-star star-b" />
          <span className="cw-weather-star star-c" />
          <span className="cw-weather-cloud cloud-a" />
          <span className="cw-weather-cloud cloud-b" />
          <span className="cw-weather-rain rain-a" />
          <span className="cw-weather-rain rain-b" />
          <span className="cw-weather-rain rain-c" />
          <span className="cw-weather-snow snow-a" />
          <span className="cw-weather-snow snow-b" />
          <span className="cw-weather-snow snow-c" />
          <span className="cw-weather-haze" />
        </div>
        <div className="cw-daily-weather-head">
          <div className="cw-daily-weather-title">
            <h2>
              <CalendarDays size={18} />
              {dailyTaskTitle}
            </h2>
            <p>
              根据{dailyWeather.sourceLabel || "实时天气"}
              <MapPin size={12} />
              {dailyWeather.location}
            </p>
          </div>
          <button type="button" onClick={onShuffleDailyTasks}>
            <RefreshCw size={13} />
            重新推荐
          </button>
        </div>
        <div className="cw-daily-weather-main">
          {renderDailyWeatherIcon(dailyWeatherTheme, 50)}
          <strong>{dailyWeather.temperature}°C</strong>
          <span>{dailyWeather.weather}</span>
        </div>
        <div className="cw-daily-weather-meta">
          <span>
            <Droplets size={13} />
            降水概率 {rainProbability}%
          </span>
          <i />
          <span>{dailyTaskSummary.replace(/^根据/u, "结合")}</span>
        </div>
        <div className="cw-daily-task-grid">
          {dailyTasks.map((task) => {
            const Icon = scenarioTaskIconMap[task.icon] || Sparkles;
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onOpenScenarioTask(task)}
              >
                <span className="cw-daily-task-icon">
                  <Icon size={16} />
                </span>
                <span className="cw-daily-task-tone">{task.tone}</span>
                <strong>{task.title}</strong>
                <small>{task.subtitle}</small>
                <ArrowRight size={13} />
              </button>
            );
          })}
        </div>
        <p className="cw-daily-weather-footer">
          <Umbrella size={14} />
          {getDailyWeatherFooter(dailyWeatherTheme)}
        </p>
      </section>

      <section className="cw-editorial-strip">
        <SectionHeader icon={<Flame size={17} />} title="今日灵感" />
        <div className="cw-look-carousel">
          {featuredLooks.map((look, index) => (
            <button
              className="cw-look-card"
              key={`${look.label}-${index}`}
              type="button"
              onClick={() => onAddKeyword(look.label)}
            >
              <Image
                alt={look.label}
                src={resolveBackendAssetUrl(look.image) || fallbackOutfitImage}
                width={210}
                height={284}
                unoptimized
                className="h-full w-full object-cover"
              />
              <span>{look.label}</span>
            </button>
          ))}
        </div>
        <div className="cw-category-row">
          {visibleCategories.map((tag) => (
            <button key={tag} type="button" onClick={() => onAddKeyword(tag)}>
              {tag}
            </button>
          ))}
        </div>
      </section>

      <section className="cw-keyword-card">
        <SectionHeader
          action="换一批"
          icon={<CloudSun size={17} />}
          title="灵感关键词"
          onAction={onShuffle}
        />
        <div className="cw-keyword-grid">
          {keywords.map((keyword) => (
            <button
              key={keyword}
              type="button"
              className={copiedKeyword === keyword ? "copied" : undefined}
              onClick={() => void handleKeywordClick(keyword)}
            >
              {copiedKeyword === keyword ? "已加入" : keyword}
            </button>
          ))}
        </div>
      </section>

      <section className="cw-flow-teaser" aria-label="生成流程">
        <div>
          <CalendarDays size={17} />
          <span>场景天气</span>
        </div>
        <ArrowRight size={15} />
        <div>
          <Shirt size={17} />
          <span>风格单品</span>
        </div>
        <ArrowRight size={15} />
        <div>
          <BadgeCheck size={17} />
          <span>生成方案</span>
        </div>
      </section>

    </section>
  );
}

function GenerateScreen({
  configOptions,
  customLocations,
  customScenes,
  onAddCustomItem,
  onAddCustomLocation,
  onAddCustomScene,
  onAddCustomStyle,
  customColor,
  customStyles,
  error,
  generationCount,
  generationCountOptions,
  dailyGenerationLimit,
  generationMessage,
  generationPlanPreview,
  generationProgress,
  keywordText,
  imageModelOptions,
  photoDataUrl,
  photoError,
  photoModes,
  photoName,
  remainingGenerations,
  recommendationContext,
  screen,
  styleProfileReady,
  styleProfileSummary,
  taskStartedAt,
  useStyleProfile,
  selectedColor,
  selectedItems,
  selectedImageModel,
  selectedLocation,
  selectedPhotoModeId,
  selectedScenes,
  selectedSeason,
  selectedStyles,
  selectedTemperature,
  selectedWeather,
  status,
  onBack,
  onClearPhoto,
  onGenerate,
  onToggleUseStyleProfile,
  onPhotoChange,
  onSelectPhotoMode,
  onCustomColorChange,
  onSelectColor,
  onSelectGenerationCount,
  onSelectImageModel,
  onSelectLocation,
  onSelectSeason,
  onSelectTemperature,
  onSelectWeather,
  onTextChange,
  onToggleItem,
  onToggleScene,
  onToggleStyle,
}: {
  configOptions: H5OutfitConfigOptions;
  customLocations: string[];
  customScenes: string[];
  onAddCustomItem: (item: string) => void;
  onAddCustomLocation: (location: string) => void;
  onAddCustomScene: (scene: string) => void;
  onAddCustomStyle: (style: string) => void;
  customColor: string;
  customStyles: string[];
  error: string;
  generationCount: number;
  generationCountOptions: number[];
  dailyGenerationLimit: number;
  generationMessage: string;
  generationPlanPreview: OutfitPlan | null;
  generationProgress: number;
  keywordText: string;
  imageModelOptions: H5OptionItem[];
  photoDataUrl?: string;
  photoError?: string;
  photoModes?: readonly PhotoMode[];
  photoName?: string;
  remainingGenerations: number;
  recommendationContext?: OutfitRecommendationContext;
  screen: "keyword" | "photo";
  styleProfileReady: boolean;
  styleProfileSummary: string;
  taskStartedAt?: string;
  useStyleProfile: boolean;
  selectedColor: string | null;
  selectedItems: string[];
  selectedImageModel: string;
  selectedLocation: string | null;
  selectedPhotoModeId?: string;
  selectedScenes: string[];
  selectedSeason: string | null;
  selectedStyles: string[];
  selectedTemperature: number | null;
  selectedWeather: string | null;
  status: "idle" | "loading" | "saved";
  onBack: () => void;
  onClearPhoto?: () => void;
  onGenerate: () => void;
  onToggleUseStyleProfile: (enabled: boolean) => void;
  onPhotoChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onSelectPhotoMode?: (modeId: string) => void;
  onCustomColorChange: (color: string) => void;
  onSelectColor: (color: string) => void;
  onSelectGenerationCount: (count: number) => void;
  onSelectImageModel: (model: string) => void;
  onSelectLocation: (location: string | null) => void;
  onSelectSeason: (season: string | null) => void;
  onSelectTemperature: (temperature: number | null) => void;
  onSelectWeather: (weather: string | null) => void;
  onTextChange?: (value: string) => void;
  onToggleItem: (item: string) => void;
  onToggleScene: (scene: string) => void;
  onToggleStyle: (style: string) => void;
}) {
  const isKeyword = screen === "keyword";
  const selectedPhotoMode = photoModes?.find(
    (mode) => mode.id === selectedPhotoModeId,
  );
  const loadingKeywords = [
    ...(recommendationContext?.title ? [recommendationContext.title] : []),
    selectedScenes[0],
    selectedStyles[0],
    selectedSeason,
    selectedWeather,
    selectedTemperature === null ? "" : `${selectedTemperature}°C`,
    selectedLocation,
  ].filter(Boolean) as string[];
  const [customDialog, setCustomDialog] = useState<{
    example: string;
    onConfirm: (value: string) => void;
    title: string;
    value: string;
  } | null>(null);

  function requestCustomValue(
    title: string,
    example: string,
    onConfirm: (value: string) => void,
  ) {
    setCustomDialog({
      title,
      example,
      value: "",
      onConfirm,
    });
  }

  function confirmCustomValue() {
    if (!customDialog) return;

    const value = customDialog.value.trim();
    if (!value) return;

    customDialog.onConfirm(value);
    setCustomDialog(null);
  }

  const styleOptions = configOptions.styles.length
    ? configOptions.styles
    : defaultH5OutfitConfigOptions.styles;
  const sceneOptions = configOptions.scenes.length
    ? configOptions.scenes
    : defaultH5OutfitConfigOptions.scenes;
  const quickStyles = styleOptions.slice(0, 5);
  const quickScenes = sceneOptions.slice(0, 4);
  const selectedSummary = [
    selectedStyles.length ? selectedStyles.slice(0, 2).join("、") : "",
    selectedScenes.length ? selectedScenes.slice(0, 2).join("、") : "",
    selectedColor || "",
    selectedItems.length ? selectedItems.slice(0, 2).join("、") : "",
  ]
    .filter(Boolean)
    .join(" / ");
  const generateButtonText = recommendationContext
    ? `生成 ${generationCount} 张${recommendationContext.periodLabel}穿搭`
    : selectedPhotoMode
      ? `生成 ${generationCount} 张${selectedPhotoMode.label}换搭`
      : `生成 ${generationCount} 张穿搭图`;

  if (status === "loading") {
    return (
      <GenerationLoadingScreen
        key={taskStartedAt || "pending-generation"}
        keywords={loadingKeywords}
        progress={generationProgress}
        message={generationMessage}
        planPreview={generationPlanPreview}
        startedAt={taskStartedAt}
        title={isKeyword ? "生成中" : "照片换装中"}
        onBack={onBack}
      />
    );
  }

  return (
    <section className="cw-flow-screen">
      <TopBar
        subtitle={
          isKeyword
            ? "输入描述，生成多套穿搭方案"
            : "上传照片，AI 为你生成个性化穿搭"
        }
        title={isKeyword ? "关键词生成" : "上传照片生成"}
        onBack={onBack}
      />

      <main className="cw-flow-content">
        {isKeyword && recommendationContext ? (
          <RecommendationContextPanel context={recommendationContext} />
        ) : null}

        <StepCard
          number="1"
          title={isKeyword ? "快速生成" : "上传照片快速生成"}
        >
          {isKeyword ? (
            <label className="cw-keyword-input">
              <textarea
                maxLength={50}
                placeholder={keywordPlaceholder}
                value={keywordText}
                onChange={(event) => onTextChange?.(event.target.value)}
              />
              <span>{keywordText.length}/50</span>
            </label>
          ) : (
            <label
              className={
                photoDataUrl ? "cw-upload-zone has-photo" : "cw-upload-zone"
              }
            >
              <input
                accept="image/png,image/jpeg,image/jpg,image/webp"
                aria-label="上传照片"
                type="file"
                onClick={(event) => {
                  event.currentTarget.value = "";
                }}
                onChange={onPhotoChange}
              />
              {photoDataUrl ? (
                <>
                  <Image
                    alt="上传预览"
                    src={photoDataUrl}
                    width={420}
                    height={520}
                    unoptimized
                    className="cw-upload-preview"
                  />
                  <button
                    className="cw-clear-photo"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onClearPhoto?.();
                    }}
                    aria-label="移除照片"
                  >
                    <X size={16} />
                  </button>
                  <strong>{photoName}</strong>
                </>
              ) : (
                <>
                  <ImagePlus size={42} />
                  <strong>点击上传清晰的全身或半身照片</strong>
                  <span>支持 JPG / PNG / WebP，最大 6MB</span>
                </>
              )}
            </label>
          )}
          {photoError ? <p className="cw-error">{photoError}</p> : null}

          <label
            className={
              styleProfileReady
                ? "cw-profile-guide-toggle"
                : "cw-profile-guide-toggle is-disabled"
            }
          >
            <input
              checked={useStyleProfile && styleProfileReady}
              disabled={!styleProfileReady}
              type="checkbox"
              onChange={(event) => onToggleUseStyleProfile(event.target.checked)}
            />
            <span aria-hidden="true">
              <i />
            </span>
            <div>
              <strong>参考风格档案</strong>
              <small>{styleProfileReady ? styleProfileSummary : "档案完善后可用于本次生成"}</small>
            </div>
          </label>

          {!isKeyword ? (
            <PhotoModeControls
              modes={photoModes || []}
              selectedModeId={selectedPhotoModeId || ""}
              onSelectMode={onSelectPhotoMode}
            />
          ) : null}

          {!isKeyword ? (
            <label className="cw-keyword-input">
              <textarea
                maxLength={50}
                placeholder={keywordPlaceholder}
                value={keywordText}
                onChange={(event) => onTextChange?.(event.target.value)}
              />
              <span>{keywordText.length}/50</span>
            </label>
          ) : null}

          <div className="cw-quick-options">
            <div className="cw-quick-options-head">
              <strong>选填偏好</strong>
              <span>不选也可以直接生成，系统会按天气和默认参数自由发挥</span>
            </div>
            <QuickStylePicker
              compact
              isAvatar={isKeyword}
              options={quickStyles}
              customStyles={customStyles}
              selectedStyles={selectedStyles}
              onOpenCustomStyle={() =>
                requestCustomValue(
                  "自定义穿搭风格",
                  "比如 老钱风、Athflow、知识分子风",
                  onAddCustomStyle,
                )
              }
              onToggleStyle={onToggleStyle}
            />
            <QuickScenePicker
              compact
              options={quickScenes}
              customScenes={customScenes}
              selectedScenes={selectedScenes}
              onOpenCustomScene={() =>
                requestCustomValue(
                  "自定义场景",
                  "比如 音乐节、婚礼宾客、露营",
                  onAddCustomScene,
                )
              }
              onToggleScene={onToggleScene}
            />
          </div>
        </StepCard>

        <section className="cw-generation-settings-panel" aria-label="生成设置">
          <div className="cw-generation-settings-head">
            <strong>生成设置</strong>
            <span>{selectedImageModel} · {generationCount} 张</span>
          </div>
          <div className="cw-generation-settings-grid">
            <div className="cw-generation-setting-group">
              <span>模型</span>
              <ImageModelControls
                imageModelOptions={imageModelOptions}
                selectedImageModel={selectedImageModel}
                onSelectImageModel={onSelectImageModel}
              />
            </div>
            <GenerationCountControls
              generationCount={generationCount}
              generationCountOptions={generationCountOptions}
              onSelectGenerationCount={onSelectGenerationCount}
            />
          </div>
        </section>

        <details className="cw-advanced-panel">
          <summary>
            <div>
              <strong>高级设置</strong>
              <span>{selectedSummary || "已使用默认推荐，不需要逐项选择"}</span>
            </div>
            <ArrowRight size={18} />
          </summary>
          <div className="cw-advanced-content">
            <section className="cw-advanced-block">
              <h3>出行条件</h3>
              <TravelConditionControls
                options={configOptions}
                customLocations={customLocations}
                selectedLocation={selectedLocation}
                selectedSeason={selectedSeason}
                selectedTemperature={selectedTemperature}
                selectedWeather={selectedWeather}
                onOpenCustomLocation={() =>
                  requestCustomValue(
                    "自定义打卡地点",
                    "比如 天台酒吧、艺术展、夜市",
                    onAddCustomLocation,
                  )
                }
                onSelectLocation={onSelectLocation}
                onSelectSeason={onSelectSeason}
                onSelectTemperature={onSelectTemperature}
                onSelectWeather={onSelectWeather}
              />
            </section>

            <section className="cw-advanced-block">
              <h3>全部风格</h3>
              <QuickStylePicker
                isAvatar={isKeyword}
                options={styleOptions}
                customStyles={customStyles}
                selectedStyles={selectedStyles}
                onOpenCustomStyle={() =>
                  requestCustomValue(
                    "自定义穿搭风格",
                    "比如 老钱风、Athflow、知识分子风",
                    onAddCustomStyle,
                  )
                }
                onToggleStyle={onToggleStyle}
              />
            </section>

            <section className="cw-advanced-block">
              <h3>全部场景</h3>
              <QuickScenePicker
                options={sceneOptions}
                customScenes={customScenes}
                selectedScenes={selectedScenes}
                onOpenCustomScene={() =>
                  requestCustomValue(
                    "自定义场景",
                    "比如 音乐节、婚礼宾客、露营",
                    onAddCustomScene,
                  )
                }
                onToggleScene={onToggleScene}
              />
            </section>

            <section className="cw-advanced-block">
              <h3>颜色和单品</h3>
              <PreferenceControls
                options={configOptions}
                customColor={customColor}
                selectedColor={selectedColor}
                selectedItems={selectedItems}
                onCustomColorChange={onCustomColorChange}
                onOpenCustomItem={() =>
                  requestCustomValue(
                    "自定义单品",
                    "比如 丝巾、马甲、渔夫帽",
                    onAddCustomItem,
                  )
                }
                onSelectColor={onSelectColor}
                onToggleItem={onToggleItem}
              />
            </section>
          </div>
        </details>

        {error ? <p className="cw-error cw-flow-error">{error}</p> : null}
      </main>

      <div className="cw-flow-sticky-action">
        <button
          className="cw-generate-button"
          disabled={remainingGenerations <= 0}
          type="button"
          onClick={onGenerate}
        >
          <Sparkles size={18} />
          {generateButtonText}
        </button>
        <p className="cw-limit-note">
          每日免费额度：{dailyGenerationLimit} 张，今日剩余：{remainingGenerations} 张
        </p>
      </div>

      {customDialog ? (
        <CustomValueModal
          title={customDialog.title}
          value={customDialog.value}
          placeholder={customDialog.example}
          onCancel={() => setCustomDialog(null)}
          onChange={(value) =>
            setCustomDialog((current) =>
              current ? { ...current, value } : current,
            )
          }
          onConfirm={confirmCustomValue}
        />
      ) : null}
    </section>
  );
}

function RecommendationContextPanel({
  context,
}: {
  context: OutfitRecommendationContext;
}) {
  const detail = getRecommendationContextDetail(context);

  return (
    <section className="cw-recommendation-context" aria-label="天气推荐来源">
      <div>
        <CloudSun size={18} />
        <span>{getRecommendationContextLabel(context)}</span>
      </div>
      <strong>{context.title || `${context.periodLabel}穿搭推荐`}</strong>
      <p>
        {[detail, context.sourceLabel].filter(Boolean).join(" · ") ||
          context.summary ||
          "已按天气和个人偏好预填出行条件。"}
      </p>
    </section>
  );
}

function PhotoModeControls({
  modes,
  selectedModeId,
  onSelectMode,
}: {
  modes: readonly PhotoMode[];
  selectedModeId: string;
  onSelectMode?: (modeId: string) => void;
}) {
  return (
    <div className="cw-photo-mode-grid" role="radiogroup" aria-label="选择照片换搭模式">
      {modes.map((mode) => (
        <button
          aria-checked={selectedModeId === mode.id}
          className={selectedModeId === mode.id ? "active" : undefined}
          key={mode.id}
          role="radio"
          type="button"
          onClick={() => onSelectMode?.(mode.id)}
        >
          <span>
            <Sparkles size={16} />
          </span>
          <strong>{mode.label}</strong>
          <small>{mode.description}</small>
        </button>
      ))}
    </div>
  );
}

function GenerationLoadingScreen({
  keywords,
  message,
  planPreview,
  progress,
  startedAt,
  title,
  onBack,
}: {
  keywords: string[];
  message: string;
  planPreview?: OutfitPlan | null;
  progress: number;
  startedAt?: string;
  title: string;
  onBack: () => void;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    getGenerationTaskElapsedSeconds(startedAt),
  );
  const normalizedProgress = Math.round(Math.min(100, Math.max(0, progress || 8)));
  const estimatedRemainingSeconds =
    normalizedProgress >= 100
      ? 0
      : Math.max(0, generationExpectedSeconds - elapsedSeconds);
  const loadingTarget = title.includes("照片") ? "照片换搭" : "今日穿搭";
  const visibleKeywords = keywords.slice(0, 5);
  const previewItems = planPreview?.items.filter((item) => item.name || item.category).slice(0, 4) ?? [];
  const formulaText = previewItems
    .slice(0, 3)
    .map((item) => [item.category, item.name].filter(Boolean).join(" · "))
    .filter(Boolean)
    .join(" + ");
  const briefingRows = planPreview
    ? [
        {
          label: "搭配公式",
          value: formulaText || planPreview.outfitTitle,
        },
        {
          label: "风格方向",
          value: planPreview.styleTags.slice(0, 3).join(" / ") || planPreview.summary,
        },
        {
          label: "出门提醒",
          value: planPreview.temperatureAdvice || planPreview.occasionReason,
        },
      ].filter((item) => item.value)
    : [];
  const steps = [
    { label: "分析需求关键词", done: normalizedProgress >= 24 },
    { label: "匹配时尚数据库", done: normalizedProgress >= 44 },
    { label: "生成多套穿搭方案", done: normalizedProgress >= 72 },
    { label: "优化搭配效果", done: normalizedProgress >= 100 },
  ];
  const currentStepIndex = steps.findIndex((item) => !item.done);
  const activeStepIndex = currentStepIndex === -1 ? steps.length - 1 : currentStepIndex;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds(getGenerationTaskElapsedSeconds(startedAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [startedAt]);

  return (
    <section className="cw-loading-screen">
      <header className="cw-loading-topbar">
        <button className="cw-loading-nav-button" type="button" aria-label="返回" onClick={onBack}>
          <ChevronLeft size={23} />
        </button>
        <div className="cw-loading-title-chip">
          <strong>{title}</strong>
          <span>
            预计 5 分钟内 · 已等待 {formatElapsedTime(elapsedSeconds)}
          </span>
        </div>
        <Link className="cw-loading-nav-button" href="/history" aria-label="AI 衣橱" title="AI 衣橱">
          <CalendarDays size={18} />
        </Link>
      </header>
      <div className="cw-loading-stage">
        <div className="cw-loading-aurora" aria-hidden="true" />
        <div className="cw-loading-brand">
          <span>云裳AI</span>
          <small>CloudWear</small>
        </div>
        <div className="cw-loading-headline">
          <h1>
            正在为你
            <span>生成{loadingTarget}</span>
          </h1>
          <p>{message || "请稍等几秒，AI 正在根据你的灵感组合更适合你的搭配方案。"}</p>
        </div>

        <section
          className={planPreview ? "cw-loading-briefing is-ready" : "cw-loading-briefing is-pending"}
          aria-label={planPreview ? "AI 造型简报" : "造型简报生成状态"}
        >
          <div className="cw-loading-briefing-kicker">
            <Sparkles size={15} />
            <span>{planPreview ? "造型简报已生成" : "正在整理造型简报"}</span>
          </div>
          {planPreview ? (
            <>
              <h2>{planPreview.outfitTitle}</h2>
              <p>{planPreview.summary}</p>
              {briefingRows.length ? (
                <div className="cw-loading-briefing-grid">
                  {briefingRows.map((row) => (
                    <article key={row.label}>
                      <small>{row.label}</small>
                      <strong>{row.value}</strong>
                    </article>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <h2>先看方向，成图稍后到</h2>
              <p>
                {visibleKeywords.length
                  ? `AI 正在根据 ${visibleKeywords.join("、")} 生成搭配企划。`
                  : "AI 正在读取本次生成信息，生成企划出来后会自动展示在这里。"}
              </p>
              {visibleKeywords.length ? (
                <div className="cw-loading-briefing-tags" aria-label="本次生成关键词">
                  {visibleKeywords.map((keyword) => (
                    <span key={keyword}>{keyword}</span>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </section>

        <div className="cw-loading-look-stack" aria-hidden="true">
          <div className="cw-loading-look-card side left">
            <span
              className="cw-loading-look-image"
              style={
                {
                  "--loading-look-image":
                    "url('https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=520&q=76')",
                } as CSSProperties
              }
            />
          </div>
          <div className="cw-loading-look-card main">
            <span
              className="cw-loading-look-image"
              style={
                {
                  "--loading-look-image":
                    "url('https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=720&q=82')",
                } as CSSProperties
              }
            />
            <span className="cw-loading-look-badge"><Sparkles size={15} />生成中</span>
          </div>
          <div className="cw-loading-look-card side right">
            <span
              className="cw-loading-look-image"
              style={
                {
                  "--loading-look-image":
                    "url('https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=520&q=76')",
                } as CSSProperties
              }
            />
          </div>
        </div>

        <div
          className="cw-loading-atelier"
          style={{ "--progress": `${normalizedProgress}%` } as CSSProperties}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={normalizedProgress}
          aria-label={`生成进度 ${normalizedProgress}%`}
        >
          <div className="cw-atelier-scene" aria-hidden="true">
            <span className="cw-atelier-thread thread-a" />
            <span className="cw-atelier-thread thread-b" />
            <span className="cw-atelier-thread thread-c" />
            <span className="cw-atelier-swatch swatch-a" />
            <span className="cw-atelier-swatch swatch-b" />
            <span className="cw-atelier-swatch swatch-c" />
            <span className="cw-atelier-needle">
              <Sparkles size={15} />
            </span>
          </div>
          <div className="cw-atelier-copy">
            <small>灵感裁剪中</small>
            <strong>{normalizedProgress}%</strong>
          </div>
          <div className="cw-atelier-meter" aria-hidden="true">
            <span />
          </div>
        </div>
        <p className="cw-loading-remaining">
          预计剩余 <strong>{formatRemainingTime(estimatedRemainingSeconds)}</strong>
        </p>

        {planPreview ? (
          <section className="cw-loading-plan-preview" aria-label="AI 搭配企划预览">
            {planPreview.styleTags.length ? (
              <div className="cw-loading-plan-tags" aria-label="风格标签">
                {planPreview.styleTags.slice(0, 5).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            ) : null}

            {planPreview.temperatureAdvice || planPreview.occasionReason ? (
              <div className="cw-loading-plan-notes">
                {planPreview.temperatureAdvice ? (
                  <article>
                    <small>体感建议</small>
                    <p>{planPreview.temperatureAdvice}</p>
                  </article>
                ) : null}
                {planPreview.occasionReason ? (
                  <article>
                    <small>场景理由</small>
                    <p>{planPreview.occasionReason}</p>
                  </article>
                ) : null}
              </div>
            ) : null}

            {previewItems.length ? (
              <div className="cw-loading-plan-items">
                {previewItems.map((item) => (
                  <article
                    className="cw-loading-plan-item"
                    key={`${item.category}-${item.name}-${item.color}`}
                  >
                    <span>{item.category}</span>
                    <strong>{item.name}</strong>
                    <small>
                      {[item.color, item.material].filter(Boolean).join(" · ")}
                    </small>
                    <p>{item.reason}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ) : (
          <section className="cw-loading-keywords" aria-label="本次生成关键词">
            <h2><Sparkles size={16} />生成链路<Sparkles size={16} /></h2>
            <div className="cw-loading-chain">
              <span className={normalizedProgress >= 24 ? "is-done" : "is-current"}>需求分析</span>
              <span className={normalizedProgress >= 44 ? "is-done" : normalizedProgress >= 24 ? "is-current" : ""}>风格匹配</span>
              <span className={normalizedProgress >= 72 ? "is-done" : normalizedProgress >= 44 ? "is-current" : ""}>企划生成</span>
              <span className={normalizedProgress >= 100 ? "is-done" : normalizedProgress >= 72 ? "is-current" : ""}>画面优化</span>
            </div>
          </section>
        )}

        <p className="cw-loading-note">
          <Heart size={16} /> 温柔出门，也要带一点好心情。
        </p>

        <div className="cw-loading-steps">
          {steps.map((step, index) => (
            <div
              className={
                step.done
                  ? "is-done"
                  : index === activeStepIndex
                    ? "is-current"
                    : ""
              }
              key={step.label}
            >
              <span>
                {step.done ? <BadgeCheck size={17} /> : <Sparkles size={17} />}
              </span>
              <p>{step.label}</p>
              {step.done ? <BadgeCheck size={18} /> : <i />}
            </div>
          ))}
        </div>
        <div className="cw-loading-actions">
          <button type="button" onClick={onBack}>
            <RefreshCw size={18} />
            重新调整
          </button>
          <Link href="/history">
            <Sparkles size={18} />
            查看衣橱
          </Link>
        </div>
      </div>
    </section>
  );
}

function formatElapsedTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
}

function formatRemainingTime(seconds: number) {
  if (seconds <= 0) return "0 秒";

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  if (minutes <= 0) return `${restSeconds} 秒`;
  if (restSeconds === 0) return `${minutes} 分钟`;

  return `${minutes} 分 ${restSeconds} 秒`;
}

function QuickStylePicker({
  compact,
  customStyles,
  isAvatar,
  options,
  selectedStyles,
  onOpenCustomStyle,
  onToggleStyle,
}: {
  compact?: boolean;
  customStyles: string[];
  isAvatar: boolean;
  options: H5OptionItem[];
  selectedStyles: string[];
  onOpenCustomStyle: () => void;
  onToggleStyle: (style: string) => void;
}) {
  return (
    <div className={compact ? "cw-quick-group compact" : "cw-quick-group"}>
      <span>风格</span>
      <div className={isAvatar ? "cw-style-avatar-row" : "cw-chip-row"}>
        {options.map((style) =>
          isAvatar ? (
            <button
              className={selectedStyles.includes(style.label) ? "active" : ""}
              key={style.label}
              type="button"
              onClick={() => onToggleStyle(style.label)}
            >
              <span>
                <Image
                  alt=""
                  src={resolveBackendAssetUrl(style.image) || fallbackOutfitImage}
                  width={56}
                  height={56}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              </span>
              {style.label}
            </button>
          ) : (
            <button
              className={selectedStyles.includes(style.label) ? "active" : ""}
              key={style.label}
              type="button"
              onClick={() => onToggleStyle(style.label)}
            >
              {style.label}
            </button>
          ),
        )}
        <button
          className="cw-add-chip"
          type="button"
          onClick={onOpenCustomStyle}
        >
          自定义
        </button>
        {customStyles.map((style) => (
          <button
            className={selectedStyles.includes(style) ? "active" : ""}
            key={style}
            type="button"
            onClick={() => onToggleStyle(style)}
          >
            {style}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuickScenePicker({
  compact,
  customScenes,
  options,
  selectedScenes,
  onOpenCustomScene,
  onToggleScene,
}: {
  compact?: boolean;
  customScenes: string[];
  options: H5OptionItem[];
  selectedScenes: string[];
  onOpenCustomScene: () => void;
  onToggleScene: (scene: string) => void;
}) {
  return (
    <div className={compact ? "cw-quick-group compact" : "cw-quick-group"}>
      <span>场景</span>
      <div className="cw-scene-grid">
        {options.map(({ icon, label }) => {
          const Icon =
            sceneIconMap[
              String(icon || "sparkles") as keyof typeof sceneIconMap
            ] || Sparkles;
          return (
            <button
              className={selectedScenes.includes(label) ? "active" : ""}
              key={label}
              type="button"
              onClick={() => onToggleScene(label)}
            >
              <Icon size={21} />
              {label}
            </button>
          );
        })}
        <button
          className="cw-add-chip"
          type="button"
          onClick={onOpenCustomScene}
        >
          自定义
        </button>
        {customScenes.map((scene) => (
          <button
            className={selectedScenes.includes(scene) ? "active" : ""}
            key={scene}
            type="button"
            onClick={() => onToggleScene(scene)}
          >
            {scene}
          </button>
        ))}
      </div>
    </div>
  );
}

function PreferenceControls({
  options,
  customColor,
  selectedColor,
  selectedItems,
  onCustomColorChange,
  onOpenCustomItem,
  onSelectColor,
  onToggleItem,
}: {
  options: H5OutfitConfigOptions;
  customColor: string;
  selectedColor: string | null;
  selectedItems: string[];
  onCustomColorChange: (color: string) => void;
  onOpenCustomItem: () => void;
  onSelectColor: (color: string) => void;
  onToggleItem: (item: string) => void;
}) {
  return (
    <div className="cw-preferences">
      <span>颜色偏好</span>
      <div className="cw-color-row">
        {(options.colors.length
          ? options.colors
          : defaultH5OutfitConfigOptions.colors
        ).map((color) => (
          <button
            aria-label={`选择${color.label}`}
            className={selectedColor === color.label ? "active" : ""}
            key={color.label}
            style={{
              background: String(color.value || color.color || "#875ef1"),
            }}
            type="button"
            onClick={() => onSelectColor(color.label)}
          />
        ))}
        <label
          aria-label="选择自定义颜色"
          className={
            selectedColor === "自定义"
              ? "cw-custom-color active"
              : "cw-custom-color"
          }
        >
          <input
            type="color"
            value={customColor}
            onChange={(event) => {
              onCustomColorChange(event.target.value);
              onSelectColor("自定义");
            }}
          />
          <span style={{ background: customColor }} />
        </label>
      </div>
      <span>单品偏好（可多选）</span>
      <div className="cw-chip-row">
        {(options.items.length
          ? options.items
          : defaultH5OutfitConfigOptions.items
        ).map(({ label: item }) => (
          <button
            className={selectedItems.includes(item) ? "active" : ""}
            key={item}
            type="button"
            onClick={() => onToggleItem(item)}
          >
            {item}
          </button>
        ))}
        <button
          className="cw-add-chip"
          type="button"
          onClick={onOpenCustomItem}
        >
          自定义
        </button>
        {selectedItems
          .filter(
            (item) =>
              !(
                options.items.length
                  ? options.items
                  : defaultH5OutfitConfigOptions.items
              ).some((option) => option.label === item),
          )
          .map((item) => (
            <button
              className="active"
              key={item}
              type="button"
              onClick={() => onToggleItem(item)}
            >
              {item}
            </button>
          ))}
      </div>
    </div>
  );
}

function ImageModelControls({
  imageModelOptions,
  selectedImageModel,
  onSelectImageModel,
}: {
  imageModelOptions: H5OptionItem[];
  selectedImageModel: string;
  onSelectImageModel: (model: string) => void;
}) {
  return (
    <div
      className="cw-chip-row cw-model-chip-row"
      role="radiogroup"
      aria-label="选择生图模型"
    >
      {imageModelOptions.map((option) => (
        <button
          aria-checked={selectedImageModel === String(option.value)}
          className={
            selectedImageModel === String(option.value) ? "active" : ""
          }
          key={String(option.value)}
          role="radio"
          title={formatImageModelName(option)}
          type="button"
          onClick={() => onSelectImageModel(String(option.value))}
        >
          {formatImageModelName(option)}
        </button>
      ))}
    </div>
  );
}

function formatImageModelName(option: H5OptionItem) {
  const value = option.value === undefined ? "" : String(option.value).trim();
  if (value) return value;

  const label = String(option.label || "").trim();
  const [, modelName] = label.split(/\s*\/\s*/u);
  return modelName || label;
}

function GenerationCountControls({
  generationCount,
  generationCountOptions,
  onSelectGenerationCount,
}: {
  generationCount: number;
  generationCountOptions: number[];
  onSelectGenerationCount: (count: number) => void;
}) {
  return (
    <div className="cw-generation-count-control">
      <span>生成张数</span>
      <div
        className="cw-generation-count-row"
        role="radiogroup"
        aria-label="选择生成图片张数"
      >
        {generationCountOptions.map((count) => (
          <button
            aria-checked={generationCount === count}
            className={generationCount === count ? "active" : ""}
            key={count}
            role="radio"
            type="button"
            onClick={() => onSelectGenerationCount(count)}
          >
            {count} 张
          </button>
        ))}
      </div>
    </div>
  );
}

function TravelConditionControls({
  options,
  customLocations,
  selectedLocation,
  selectedSeason,
  selectedTemperature,
  selectedWeather,
  onOpenCustomLocation,
  onSelectLocation,
  onSelectSeason,
  onSelectTemperature,
  onSelectWeather,
}: {
  options: H5OutfitConfigOptions;
  customLocations: string[];
  selectedLocation: string | null;
  selectedSeason: string | null;
  selectedTemperature: number | null;
  selectedWeather: string | null;
  onOpenCustomLocation: () => void;
  onSelectLocation: (location: string | null) => void;
  onSelectSeason: (season: string | null) => void;
  onSelectTemperature: (temperature: number | null) => void;
  onSelectWeather: (weather: string | null) => void;
}) {
  return (
    <div className="cw-travel-conditions">
      <div className="cw-condition-summary">
        <div>
          <CalendarDays size={17} />
          <span>{selectedSeason ?? "未选季节"}</span>
        </div>
        <div>
          <CloudSun size={17} />
          <span>{selectedWeather ?? "未选天气"}</span>
        </div>
        <div>
          <Thermometer size={17} />
          <span>
            {selectedTemperature ? `${selectedTemperature}°C` : "未选温度"}
          </span>
        </div>
        <div>
          <MapPin size={17} />
          <span>{selectedLocation ?? "未选地点"}</span>
        </div>
      </div>

      <ConditionGroup title="季节">
        <div className="cw-segment-row" aria-label="选择季节">
          {(options.seasons.length
            ? options.seasons
            : defaultH5OutfitConfigOptions.seasons
          ).map(({ label: season }) => (
            <button
              className={selectedSeason === season ? "active" : ""}
              key={season}
              type="button"
              onClick={() =>
                onSelectSeason(selectedSeason === season ? null : season)
              }
            >
              {season}
            </button>
          ))}
        </div>
      </ConditionGroup>

      <ConditionGroup title="天气">
        <div className="cw-weather-row" aria-label="选择天气">
          {(options.weathers.length
            ? options.weathers
            : defaultH5OutfitConfigOptions.weathers
          ).map(({ label: weather }) => (
            <button
              className={selectedWeather === weather ? "active" : ""}
              key={weather}
              type="button"
              onClick={() =>
                onSelectWeather(selectedWeather === weather ? null : weather)
              }
            >
              {weather}
            </button>
          ))}
        </div>
      </ConditionGroup>

      <ConditionGroup title="温度">
        <div className="cw-temperature-row" aria-label="选择温度">
          {(options.temperatures.length
            ? options.temperatures
            : defaultH5OutfitConfigOptions.temperatures
          ).map((option) => {
            const temperature = Number(
              option.value ?? String(option.label).replace(/[^\d.-]/g, ""),
            );
            if (Number.isNaN(temperature)) return null;
            return (
              <button
                className={selectedTemperature === temperature ? "active" : ""}
                key={temperature}
                type="button"
                onClick={() =>
                  onSelectTemperature(
                    selectedTemperature === temperature ? null : temperature,
                  )
                }
              >
                {option.label || `${temperature}°C`}
              </button>
            );
          })}
        </div>
      </ConditionGroup>

      <ConditionGroup title="打卡地点">
        <div className="cw-location-grid" aria-label="选择打卡地点">
          {(options.locations.length
            ? options.locations
            : defaultH5OutfitConfigOptions.locations
          ).map(({ label: location }) => (
            <button
              className={selectedLocation === location ? "active" : ""}
              key={location}
              type="button"
              onClick={() =>
                onSelectLocation(
                  selectedLocation === location ? null : location,
                )
              }
            >
              {location}
            </button>
          ))}
          {customLocations.map((location) => (
            <button
              className={selectedLocation === location ? "active" : ""}
              key={location}
              type="button"
              onClick={() =>
                onSelectLocation(
                  selectedLocation === location ? null : location,
                )
              }
            >
              {location}
            </button>
          ))}
          <button
            className="cw-add-chip"
            type="button"
            onClick={onOpenCustomLocation}
          >
            自定义
          </button>
        </div>
      </ConditionGroup>
    </div>
  );
}

function ConditionGroup({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="cw-condition-group">
      <span>{title}</span>
      {children}
    </div>
  );
}

function CustomValueModal({
  onCancel,
  onChange,
  onConfirm,
  placeholder,
  title,
  value,
}: {
  onCancel: () => void;
  onChange: (value: string) => void;
  onConfirm: () => void;
  placeholder: string;
  title: string;
  value: string;
}) {
  return (
    <div
      className="cw-preview-overlay cw-custom-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cw-custom-title"
    >
      <button
        className="cw-preview-backdrop"
        type="button"
        aria-label="关闭弹窗"
        onClick={onCancel}
      />
      <section className="cw-custom-modal">
        <div className="cw-custom-modal-header">
          <h2 id="cw-custom-title">{title}</h2>
          <button type="button" aria-label="关闭" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>
        <input
          autoFocus
          className="cw-custom-modal-input"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            onConfirm();
          }}
        />
        <div className="cw-custom-modal-actions">
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="primary" onClick={onConfirm}>
            确定
          </button>
        </div>
      </section>
    </div>
  );
}

function TopBar({
  subtitle,
  title,
  onBack,
}: {
  subtitle: string;
  title: string;
  onBack: () => void;
}) {
  return (
    <header className="cw-topbar">
      <button type="button" aria-label="返回" onClick={onBack}>
        <ChevronLeft size={23} />
      </button>
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <Link href="/history">
        <CalendarDays size={14} />
        AI 衣橱
      </Link>
    </header>
  );
}

function StepCard({
  children,
  number,
  title,
}: {
  children: React.ReactNode;
  number: string;
  title: string;
}) {
  return (
    <section className="cw-step-card">
      <h2>
        <span>{number}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function SectionHeader({
  action,
  icon,
  title,
  onAction,
}: {
  action?: string;
  icon?: React.ReactNode;
  title: string;
  onAction?: () => void;
}) {
  return (
    <div className="cw-section-header">
      <h2>
        {icon}
        {title}
      </h2>
      {action ? (
        <button type="button" onClick={onAction}>
          <RefreshCw size={14} />
          {action}
        </button>
      ) : null}
    </div>
  );
}

function EntryCard({
  accent,
  action = "去生成",
  description,
  icon,
  title,
  onClick,
}: {
  accent: "purple" | "blue";
  action?: string;
  description: string;
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`cw-entry-card ${accent}`}
      type="button"
      onClick={onClick}
    >
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
        <em>
          {action}
          <ArrowRight size={14} />
        </em>
      </span>
      <i>{icon}</i>
    </button>
  );
}

function rotateItems<T>(items: readonly T[], amount: number) {
  return items.map((_, index) => items[(index + amount) % items.length]);
}
