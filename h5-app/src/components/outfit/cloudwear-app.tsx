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
  ChevronLeft,
  CloudSun,
  Flame,
  Heart,
  Home,
  ImagePlus,
  MapPin,
  Plane,
  RefreshCw,
  Shirt,
  Sparkles,
  Thermometer,
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
  buildGenerationCountOptions,
  buildGenerationInput,
  defaultGenerationCount,
} from "@/lib/generation-input";
import {
  type ActiveGenerationTask,
  type GenerateSource,
  countCompletedGenerationImages,
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
  mergeH5ConfigOptions,
  normalizeDailyFreeGenerationLimit,
} from "@/lib/h5-config";
import type {
  H5OptionItem,
  H5OutfitConfigOptions,
  H5OutfitConfigResponse,
} from "@/lib/h5-config";
import type {
  ApiErrorResponse,
  GenerateOutfitTaskSnapshot,
  GenerateOutfitResponse,
  OutfitGeneration,
  OutfitInput,
} from "@/types/outfit";

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
  defaultH5OutfitConfigOptions.imageModels[0]?.value || "gpt-4o-image",
);
const defaultPhotoImageModel = defaultImageModel;
const fallbackOutfitImage =
  defaultH5OutfitConfigOptions.homeLooks[0]?.image ||
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=82";
const uploadedPhotoMaxBytes = 6 * 1024 * 1024;
const keywordPlaceholder = "输入想要的提示词";
const loginRedirectDelayMs = 1200;

const sceneIconMap = {
  home: Home,
  heart: Heart,
  plane: Plane,
  "map-pin": MapPin,
  sparkles: Sparkles,
  briefcase: BriefcaseBusiness,
};

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

export function CloudWearApp({ initialScreen = "home" }: { initialScreen?: Screen } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const latestAutoGenerateRef = useRef<() => void>(() => undefined);
  const lastAutoGenerateAtRef = useRef(0);
  const authRedirectTimerRef = useRef<number | undefined>(undefined);
  const screen = initialScreen;
  const progressTaskId = searchParams.get("taskId");
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const [keywordText, setKeywordText] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedScenes, setSelectedScenes] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedWeather, setSelectedWeather] = useState<string | null>(null);
  const [selectedTemperature, setSelectedTemperature] = useState<number | null>(
    null,
  );
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(
    null as string | null,
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
  const [activeTask, setActiveTask] = useState<ActiveGenerationTask | null>(
    null,
  );
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState("");
  const [h5Options, setH5Options] = useState<H5OutfitConfigOptions>(
    defaultH5OutfitConfigOptions,
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
    let cancelled = false;

    async function loadH5Config() {
      try {
        const response = await fetch(outfitApiEndpoints.h5Config(), {
          cache: "no-store",
        });
        const payload = (await response.json()) as H5OutfitConfigResponse;
        if (!response.ok || payload.code !== 200) {
          throw new Error(payload.message || "H5配置读取失败。");
        }
        if (!cancelled) {
          setH5Options(mergeH5ConfigOptions(payload.data?.options));
        }
      } catch (caughtError) {
        console.warn(
          caughtError instanceof Error
            ? caughtError.message
            : "H5配置读取失败。",
        );
      }
    }

    void loadH5Config();
    return () => {
      cancelled = true;
    };
  }, []);

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
      setDailyGenerationCount((current) => {
        const nextCount = countCompletedGenerationImages(
          generation,
          generations,
          dailyGenerationLimit,
        );
        return nextCount === current ? current : nextCount;
      });
      removeActiveGenerationTask(generation.taskId || generation.id);
      setActiveTask(null);
      setGenerationProgress(0);
      setGenerationMessage("");
      setStatus("idle");
      writeOutfitResultSession({
        taskId: generation.taskId || generation.id,
        source:
          readActiveGenerationTasks().find(
            (task) => task.taskId === (generation.taskId || generation.id),
          )?.source || activeTask?.source,
        createdAt: new Date().toISOString(),
        results: generations,
      });
      router.push("/result");
    },
    [activeTask?.source, dailyGenerationLimit, router],
  );

  const applyTaskSnapshot = useCallback(
    (task: GenerateOutfitTaskSnapshot) => {
      setGenerationProgress(task.progress);
      setGenerationMessage(task.message);

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
        removeActiveGenerationTask(task.taskId);
        setActiveTask(null);
        setGenerationProgress(0);
        setGenerationMessage("");
        setError(task.error || "生成失败，请稍后再试。");
        setStatus("idle");
      }
    },
    [completeGeneration],
  );

  const restoreGenerationTask = useCallback(
    async (task: ActiveGenerationTask) => {
      setActiveTask(task);
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

        applyTaskSnapshot(payload as GenerateOutfitTaskSnapshot);
      } catch (caughtError) {
        removeActiveGenerationTask(task.taskId);
        setActiveTask(null);
        setGenerationProgress(0);
        setGenerationMessage("");
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

    const eventSource = new EventSource(
      outfitApiEndpoints.generationEvents(activeTask.taskId),
    );

    function handleStatus(event: MessageEvent<string>) {
      applyTaskSnapshot(JSON.parse(event.data) as GenerateOutfitTaskSnapshot);
    }

    eventSource.addEventListener("status", handleStatus);
    eventSource.onerror = () => {
      setGenerationMessage("连接中断，正在重新连接。");
    };

    return () => {
      eventSource.removeEventListener("status", handleStatus);
      eventSource.close();
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
    navigateToScreen(nextScreen);
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

    if (!/^image\/(png|jpeg|jpg|webp)$/.test(file.type)) {
      setPhotoError("请上传 JPG、PNG 或 WebP 图片。");
      event.target.value = "";
      return;
    }

    if (file.size > uploadedPhotoMaxBytes) {
      setPhotoError("图片不能超过 6MB。");
      event.target.value = "";
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

    try {
      const generationInput = buildInput(source);
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
      const activeGenerationTask = {
        taskId: task.taskId,
        source,
        createdAt: task.createdAt,
        input: generationInput,
      };
      writeActiveGenerationTask(activeGenerationTask, { syncUrl: false });
      if (progressTaskId === task.taskId) {
        setActiveTask(activeGenerationTask);
        applyTaskSnapshot(task);
        return;
      }

      setGenerationProgress(0);
      setGenerationMessage("");
      setStatus("idle");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "生成失败");
      setStatus("idle");
    }
  }

  function buildInput(source: GenerateSource): OutfitInput {
    const configDefaults = buildDefaultInput(h5Options);

    return buildGenerationInput({
      configDefaults,
      customColor,
      generationCount: effectiveGenerationCount,
      imageModel:
        source === "photo"
          ? effectivePhotoImageModel
          : effectiveKeywordImageModel,
      keywordText,
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
  }

  return (
    <div className="cw-app">
      {screen === "home" ? (
        <HomeScreen
          categories={h5Options.homeCategories}
          homeLooks={h5Options.homeLooks}
          keywords={rotatedKeywords}
          onAddKeyword={addKeyword}
          onOpenKeyword={() => openScreen("keyword")}
          onOpenPhoto={() => openScreen("photo")}
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
          generationProgress={generationProgress}
          generationCount={effectiveGenerationCount}
          generationCountOptions={generationCountOptions}
          dailyGenerationLimit={dailyGenerationLimit}
          keywordText={keywordText}
          remainingGenerations={remainingGenerations}
          screen="keyword"
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
          generationProgress={generationProgress}
          generationCount={effectiveGenerationCount}
          generationCountOptions={generationCountOptions}
          dailyGenerationLimit={dailyGenerationLimit}
          keywordText={keywordText}
          photoDataUrl={photoDataUrl}
          photoName={photoName}
          remainingGenerations={remainingGenerations}
          screen="photo"
          configOptions={h5Options}
          imageModelOptions={activeImageModels}
          selectedColor={effectiveSelectedColor}
          selectedItems={selectedItems}
          selectedImageModel={effectivePhotoImageModel}
          selectedLocation={selectedLocation}
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
          onPhotoChange={handlePhotoChange}
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
      <GlobalBottomNav />
    </div>
  );
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
  homeLooks,
  keywords,
  onAddKeyword,
  onOpenKeyword,
  onOpenPhoto,
  onShuffle,
}: {
  categories: readonly string[];
  homeLooks: readonly H5OptionItem[];
  keywords: readonly string[];
  onAddKeyword: (keyword: string) => void;
  onOpenKeyword: () => void;
  onOpenPhoto: () => void;
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
  const visibleCategories = categories.length
    ? categories
    : defaultH5OutfitConfigOptions.homeCategories;

  return (
    <section className="cw-home">
      <section className="cw-home-hero">
        <div className="cw-hero-copy">
          <span>AI STYLING STUDIO</span>
          <h1>
            今日穿搭
            <br />
            交给云裳 AI
          </h1>
          <p>
            从关键词到本人照片，快速生成更适合场景、天气和个人风格的完整穿搭。
          </p>
          <div className="cw-hero-actions">
            <button type="button" onClick={onOpenPhoto}>
              <ImagePlus size={17} />
              上传照片
            </button>
            <button type="button" onClick={onOpenKeyword}>
              <Sparkles size={17} />
              写关键词
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
            <span>智能搭配中</span>
          </div>
        </div>
      </section>

      <section className="cw-quick-panel">
        <div className="cw-quick-header">
          <div>
            <span>START HERE</span>
            <h2>选择你的生成方式</h2>
          </div>
          <small>{featuredLooks.length} 套灵感样片</small>
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
  generationProgress,
  keywordText,
  imageModelOptions,
  photoDataUrl,
  photoError,
  photoName,
  remainingGenerations,
  screen,
  selectedColor,
  selectedItems,
  selectedImageModel,
  selectedLocation,
  selectedScenes,
  selectedSeason,
  selectedStyles,
  selectedTemperature,
  selectedWeather,
  status,
  onBack,
  onClearPhoto,
  onGenerate,
  onPhotoChange,
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
  generationProgress: number;
  keywordText: string;
  imageModelOptions: H5OptionItem[];
  photoDataUrl?: string;
  photoError?: string;
  photoName?: string;
  remainingGenerations: number;
  screen: "keyword" | "photo";
  selectedColor: string | null;
  selectedItems: string[];
  selectedImageModel: string;
  selectedLocation: string | null;
  selectedScenes: string[];
  selectedSeason: string | null;
  selectedStyles: string[];
  selectedTemperature: number | null;
  selectedWeather: string | null;
  status: "idle" | "loading" | "saved";
  onBack: () => void;
  onClearPhoto?: () => void;
  onGenerate: () => void;
  onPhotoChange?: (event: ChangeEvent<HTMLInputElement>) => void;
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

  if (status === "loading") {
    return (
      <GenerationLoadingScreen
        progress={generationProgress}
        message={generationMessage}
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
        {isKeyword ? (
          <StepCard number="1" title="输入关键词">
            <label className="cw-keyword-input">
              <textarea
                maxLength={50}
                placeholder={keywordPlaceholder}
                value={keywordText}
                onChange={(event) => onTextChange?.(event.target.value)}
              />
              <span>{keywordText.length}/50</span>
            </label>
          </StepCard>
        ) : (
          <StepCard number="1" title="上传照片">
            <label
              className={
                photoDataUrl ? "cw-upload-zone has-photo" : "cw-upload-zone"
              }
            >
              <input
                accept="image/png,image/jpeg,image/jpg,image/webp"
                aria-label="上传照片"
                type="file"
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
            {photoError ? <p className="cw-error">{photoError}</p> : null}
          </StepCard>
        )}

        {!isKeyword ? (
          <StepCard number="2" title="补充关键词">
            <label className="cw-keyword-input">
              <textarea
                maxLength={50}
                placeholder={keywordPlaceholder}
                value={keywordText}
                onChange={(event) => onTextChange?.(event.target.value)}
              />
              <span>{keywordText.length}/50</span>
            </label>
          </StepCard>
        ) : null}

        <StepCard number={isKeyword ? "2" : "3"} title="出行条件">
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
        </StepCard>

        <StepCard
          number={isKeyword ? "3" : "4"}
          title={
            isKeyword ? "选择风格（可多选）" : "选择想要的穿搭风格（可多选）"
          }
        >
          <div className={isKeyword ? "cw-style-avatar-row" : "cw-chip-row"}>
            {(configOptions.styles.length
              ? configOptions.styles
              : defaultH5OutfitConfigOptions.styles
            ).map((style) =>
              isKeyword ? (
                <button
                  className={
                    selectedStyles.includes(style.label) ? "active" : ""
                  }
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
                  className={
                    selectedStyles.includes(style.label) ? "active" : ""
                  }
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
              onClick={() =>
                requestCustomValue(
                  "自定义穿搭风格",
                  "比如 老钱风、Athflow、知识分子风",
                  onAddCustomStyle,
                )
              }
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
        </StepCard>

        <StepCard number={isKeyword ? "4" : "5"} title="场景（可多选）">
          <div className="cw-scene-grid">
            {(configOptions.scenes.length
              ? configOptions.scenes
              : defaultH5OutfitConfigOptions.scenes
            ).map(({ icon, label }) => {
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
              onClick={() =>
                requestCustomValue(
                  "自定义场景",
                  "比如 音乐节、婚礼宾客、露营",
                  onAddCustomScene,
                )
              }
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
        </StepCard>

        <StepCard number={isKeyword ? "5" : "6"} title="偏好设置">
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
        </StepCard>

        <StepCard number={isKeyword ? "6" : "7"} title="选择生图模型">
          <ImageModelControls
            imageModelOptions={imageModelOptions}
            selectedImageModel={selectedImageModel}
            onSelectImageModel={onSelectImageModel}
          />
          <GenerationCountControls
            generationCount={generationCount}
            generationCountOptions={generationCountOptions}
            onSelectGenerationCount={onSelectGenerationCount}
          />
          {error ? <p className="cw-error">{error}</p> : null}
          <button
            className="cw-generate-button"
            disabled={remainingGenerations <= 0}
            type="button"
            onClick={onGenerate}
          >
            <Sparkles size={18} />
            生成 {generationCount} 张穿搭图
          </button>
          <p className="cw-limit-note">
            每日免费额度：{dailyGenerationLimit} 张，今日剩余：{remainingGenerations} 张
          </p>
        </StepCard>

      </main>

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

function GenerationLoadingScreen({
  message,
  progress,
  title,
  onBack,
}: {
  message: string;
  progress: number;
  title: string;
  onBack: () => void;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const normalizedProgress = Math.round(Math.min(100, Math.max(0, progress || 8)));
  const steps = [
    { label: "分析需求关键词", done: normalizedProgress >= 24 },
    { label: "匹配时尚数据库", done: normalizedProgress >= 44 },
    { label: "生成多套穿搭方案", done: normalizedProgress >= 72 },
    { label: "优化搭配效果", done: normalizedProgress >= 100 },
  ];
  const currentStepIndex = steps.findIndex((item) => !item.done);
  const activeStepIndex = currentStepIndex === -1 ? steps.length - 1 : currentStepIndex;

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="cw-loading-screen">
      <header className="cw-loading-topbar">
        <button className="cw-loading-nav-button" type="button" aria-label="返回" onClick={onBack}>
          <ChevronLeft size={23} />
        </button>
        <div className="cw-loading-title-chip">
          <strong>{title}</strong>
          <span>
            预计 20-60 秒 · {formatElapsedTime(elapsedSeconds)}
          </span>
        </div>
        <Link className="cw-loading-nav-button" href="/history" aria-label="历史记录" title="历史记录">
          <CalendarDays size={18} />
        </Link>
      </header>
      <div className="cw-loading-stage">
        <div className="cw-loading-aurora" aria-hidden="true" />
        <p>AI正在为你生成穿搭方案...</p>
        <span>{message || "正在理解场景、风格和颜色偏好。"}</span>

        <div
          className="cw-progress-orbit"
          style={
            { "--progress": `${normalizedProgress * 3.6}deg` } as CSSProperties
          }
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={normalizedProgress}
          aria-label={`生成进度 ${normalizedProgress}%`}
        >
          <span className="cw-progress-halo halo-a" aria-hidden="true" />
          <span className="cw-progress-halo halo-b" aria-hidden="true" />
          <span className="cw-progress-track" aria-hidden="true" />
          <div className="cw-progress-core">
            <strong>{normalizedProgress}%</strong>
            <small>正在生成</small>
          </div>
          <i className="cw-progress-dot dot-a" />
          <i className="cw-progress-dot dot-b" />
        </div>

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
      </div>
    </section>
  );
}

function formatElapsedTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
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
        {title.includes("上传") ? "生成记录" : "历史记录"}
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
