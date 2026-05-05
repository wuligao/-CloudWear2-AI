import type { DailyWeatherContext } from "./scenario-tasks.ts";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface OpenMeteoCurrentWeatherResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    weather_code?: number[];
    wind_speed_10m_max?: number[];
  };
}

interface ReverseGeocodeResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
}

export const defaultDailyWeather: DailyWeatherContext = {
  season: seasonFromDate(new Date()),
  temperature: 22,
  weather: "多云",
  location: "上海",
  forecastDateKey: buildDateKey(new Date()),
  periodLabel: "今日",
  sourceLabel: "默认天气",
};

const defaultGeoPoint: GeoPoint = {
  latitude: 31.2304,
  longitude: 121.4737,
};
const defaultWeatherLocation = "上海";
const weatherRequestTimeoutMs = 2800;
const locationRequestTimeoutMs = 1800;
const tomorrowRecommendationStartHour = 20;
const dailyWeatherCacheKey = "cloudwear.daily-weather-context.v1";
const dailyWeatherCacheMaxAgeMs = 1000 * 60 * 30;

export interface DailyWeatherFetchOptions {
  tomorrowRecommendationStartHour?: number;
}

export function buildDefaultDailyWeatherContext({
  now = new Date(),
  tomorrowRecommendationStartHour: configuredTomorrowStartHour,
}: {
  now?: Date;
  tomorrowRecommendationStartHour?: number;
} = {}): DailyWeatherContext {
  const target = getRecommendationForecastTarget(
    now,
    configuredTomorrowStartHour,
  );

  return {
    ...defaultDailyWeather,
    season: seasonFromDate(target.date),
    forecastDateKey: buildDateKey(target.date),
    periodLabel: target.periodLabel,
  };
}

export function buildPendingDailyWeatherContext({
  now = new Date(),
  tomorrowRecommendationStartHour: configuredTomorrowStartHour,
}: {
  now?: Date;
  tomorrowRecommendationStartHour?: number;
} = {}): DailyWeatherContext {
  const target = getRecommendationForecastTarget(
    now,
    configuredTomorrowStartHour,
  );

  return {
    ...defaultDailyWeather,
    season: seasonFromDate(target.date),
    forecastDateKey: buildDateKey(target.date),
    location: "定位中",
    periodLabel: target.periodLabel,
    sourceLabel: "正在获取本地天气",
  };
}

export function readCachedDailyWeatherContext({
  now = new Date(),
  tomorrowRecommendationStartHour: configuredTomorrowStartHour,
}: {
  now?: Date;
  tomorrowRecommendationStartHour?: number;
} = {}) {
  if (typeof window === "undefined") return null;

  try {
    const snapshot = window.localStorage.getItem(dailyWeatherCacheKey);
    if (!snapshot) return null;

    const payload = JSON.parse(snapshot) as {
      cachedAt?: string;
      weather?: DailyWeatherContext;
    };
    const cachedAt = payload.cachedAt ? new Date(payload.cachedAt).getTime() : Number.NaN;
    const target = getRecommendationForecastTarget(
      now,
      configuredTomorrowStartHour,
    );

    if (!Number.isFinite(cachedAt)) return null;
    if (Date.now() - cachedAt > dailyWeatherCacheMaxAgeMs) return null;
    if (payload.weather?.forecastDateKey !== buildDateKey(target.date)) return null;
    if (payload.weather.periodLabel !== target.periodLabel) return null;

    return normalizeCachedDailyWeatherContext(payload.weather);
  } catch {
    return null;
  }
}

function writeCachedDailyWeatherContext(weather: DailyWeatherContext) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      dailyWeatherCacheKey,
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        weather,
      }),
    );
  } catch {
    // Cache write failure should not block live weather rendering.
  }
}

export function buildOpenMeteoForecastUrl(
  point: GeoPoint = defaultGeoPoint,
) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", formatCoordinate(point.latitude));
  url.searchParams.set("longitude", formatCoordinate(point.longitude));
  url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
  );
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "auto");
  return url.toString();
}

export async function fetchDailyWeatherContext({
  tomorrowRecommendationStartHour: configuredTomorrowStartHour,
}: DailyWeatherFetchOptions = {}): Promise<DailyWeatherContext> {
  const target = getRecommendationForecastTarget(
    new Date(),
    configuredTomorrowStartHour,
  );

  try {
    const point = await getBrowserGeoPoint();
    const [weatherResult, locationResult] = await Promise.allSettled([
      fetchWithTimeout(buildOpenMeteoForecastUrl(point || defaultGeoPoint)),
      point ? fetchReverseGeocodeLocation(point) : Promise.resolve(defaultWeatherLocation),
    ]);
    if (weatherResult.status === "rejected") throw weatherResult.reason;

    const location =
      locationResult.status === "fulfilled" && locationResult.value
        ? locationResult.value
        : point
          ? "当前位置"
          : defaultWeatherLocation;
    const response = weatherResult.value;
    if (!response.ok) throw new Error(`${target.periodLabel}天气读取失败。`);
    const payload = (await response.json()) as OpenMeteoCurrentWeatherResponse;
    const weather = normalizeOpenMeteoCurrentWeather(payload, {
      date: target.date,
      dayIndex: target.dayIndex,
      location,
      periodLabel: target.periodLabel,
      sourceLabel:
        target.periodLabel === "明日"
          ? `${location}明日天气预报`
          : `${location}实时天气`,
    });
    writeCachedDailyWeatherContext(weather);
    return weather;
  } catch (error) {
    console.warn(error instanceof Error ? error.message : `${target.periodLabel}天气读取失败。`);
    return {
      ...defaultDailyWeather,
      season: seasonFromDate(target.date),
      forecastDateKey: buildDateKey(target.date),
      periodLabel: target.periodLabel,
    };
  }
}

async function fetchReverseGeocodeLocation(point: GeoPoint) {
  const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
  url.searchParams.set("latitude", formatCoordinate(point.latitude));
  url.searchParams.set("longitude", formatCoordinate(point.longitude));
  url.searchParams.set("localityLanguage", "zh");

  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), locationRequestTimeoutMs);
  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as ReverseGeocodeResponse;
    return normalizeLocationName(
      payload.city || payload.locality || payload.principalSubdivision,
    );
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

function normalizeLocationName(value?: string) {
  const location = value?.trim();
  if (!location) return null;

  return location.replace(/市$/u, "");
}

function normalizeCachedDailyWeatherContext(
  weather: DailyWeatherContext,
): DailyWeatherContext | null {
  if (!weather || typeof weather !== "object") return null;
  if (!weather.location || !weather.forecastDateKey || !weather.periodLabel) {
    return null;
  }

  return {
    ...defaultDailyWeather,
    ...weather,
    temperature: Number.isFinite(Number(weather.temperature))
      ? Math.round(Number(weather.temperature))
      : defaultDailyWeather.temperature,
    highTemperature: normalizeOptionalNumber(Number(weather.highTemperature)),
    lowTemperature: normalizeOptionalNumber(Number(weather.lowTemperature)),
    precipitationProbability: normalizeOptionalNumber(
      Number(weather.precipitationProbability),
    ),
  };
}

export function normalizeOpenMeteoCurrentWeather(
  payload: OpenMeteoCurrentWeatherResponse,
  context: {
    date: Date | string;
    dayIndex?: number;
    location: string;
    periodLabel?: "今日" | "明日";
    sourceLabel: string;
  },
): DailyWeatherContext {
  const current = payload.current;
  const daily = payload.daily;
  const dayIndex = context.dayIndex ?? 0;
  const highTemperature = finiteNumberAt(daily?.temperature_2m_max, dayIndex);
  const lowTemperature = finiteNumberAt(daily?.temperature_2m_min, dayIndex);
  const precipitationProbability = firstFiniteNumber(
    daily?.precipitation_probability_max,
    dayIndex,
  );
  const dailyWindSpeed = finiteNumberAt(daily?.wind_speed_10m_max, dayIndex);
  const dailyWeatherCode = finiteNumberAt(daily?.weather_code, dayIndex);

  if (!current && !daily) return {
    ...defaultDailyWeather,
    season: seasonFromDate(context.date),
    forecastDateKey: buildDateKey(context.date),
    location: context.location,
    periodLabel: context.periodLabel ?? "今日",
    sourceLabel: context.sourceLabel,
  };

  const useCurrentWeather = dayIndex === 0;
  const temperature = Number(useCurrentWeather ? current?.temperature_2m : Number.NaN);
  const windSpeed = Number(
    useCurrentWeather ? current?.wind_speed_10m ?? dailyWindSpeed ?? 0 : dailyWindSpeed ?? 0,
  );
  const weatherCode = Number(
    useCurrentWeather ? current?.weather_code ?? dailyWeatherCode : dailyWeatherCode,
  );

  return {
    season: seasonFromDate(context.date),
    temperature: Number.isFinite(temperature)
      ? Math.round(temperature)
      : averageTemperature(highTemperature, lowTemperature),
    highTemperature: normalizeOptionalNumber(highTemperature),
    lowTemperature: normalizeOptionalNumber(lowTemperature),
    precipitationProbability: normalizeOptionalNumber(precipitationProbability),
    weather: mapOpenMeteoWeatherCode(weatherCode, windSpeed),
    location: context.location,
    forecastDateKey: buildDateKey(context.date),
    periodLabel: context.periodLabel ?? "今日",
    sourceLabel: context.sourceLabel,
  };
}

export function getRecommendationForecastTarget(
  now: Date,
  configuredTomorrowStartHour = tomorrowRecommendationStartHour,
) {
  const targetDate = new Date(now);
  const startHour = normalizeTomorrowRecommendationStartHour(
    configuredTomorrowStartHour,
  );
  const isTomorrow = now.getHours() >= startHour;
  if (isTomorrow) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  return {
    date: targetDate,
    dayIndex: isTomorrow ? 1 : 0,
    periodLabel: isTomorrow ? ("明日" as const) : ("今日" as const),
  };
}

function normalizeTomorrowRecommendationStartHour(value: unknown) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) return tomorrowRecommendationStartHour;

  return Math.min(23, Math.max(0, Math.round(parsedValue)));
}

export function mapOpenMeteoWeatherCode(code: number, windSpeed: number) {
  if (Number.isFinite(windSpeed) && windSpeed >= 35) return "大风";
  if ([0, 1].includes(code)) return "晴天";
  if ([2, 3, 45, 48].includes(code)) return "多云";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99)) {
    return "小雨";
  }
  if (code >= 71 && code <= 77) return "降温";
  return defaultDailyWeather.weather;
}

export function seasonFromDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00`) : value;
  const month = Number.isNaN(date.getTime()) ? new Date().getMonth() + 1 : date.getMonth() + 1;

  if (month >= 3 && month <= 5) return "春";
  if (month >= 6 && month <= 8) return "夏";
  if (month >= 9 && month <= 11) return "秋";
  return "冬";
}

async function getBrowserGeoPoint(): Promise<GeoPoint | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  const permission = await navigator.permissions
    ?.query({ name: "geolocation" as PermissionName })
    .catch(() => null);
  if (permission?.state === "denied") return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: false,
        maximumAge: 1000 * 60 * 30,
        timeout: 1200,
      },
    );
  });
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), weatherRequestTimeoutMs);
  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timer);
  }
}

function formatCoordinate(value: number) {
  return String(Number(value.toFixed(4)));
}

function firstFiniteNumber(values?: number[], index = 0) {
  return finiteNumberAt(values, index);
}

function finiteNumberAt(values: number[] | undefined, index: number) {
  const value = Number(values?.[index]);
  return Number.isFinite(value) ? value : Number.NaN;
}

function normalizeOptionalNumber(value: number) {
  return Number.isFinite(value) ? Math.round(value) : undefined;
}

function averageTemperature(highTemperature: number, lowTemperature: number) {
  if (Number.isFinite(highTemperature) && Number.isFinite(lowTemperature)) {
    return Math.round((highTemperature + lowTemperature) / 2);
  }

  if (Number.isFinite(highTemperature)) return Math.round(highTemperature);
  if (Number.isFinite(lowTemperature)) return Math.round(lowTemperature);
  return defaultDailyWeather.temperature;
}

function buildDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00`) : value;
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
