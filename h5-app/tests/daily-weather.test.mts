import assert from "node:assert/strict";
import test from "node:test";
import * as dailyWeather from "../src/lib/daily-weather.ts";

const dailyWeatherModule = (
  "buildOpenMeteoForecastUrl" in dailyWeather
    ? dailyWeather
    : (dailyWeather as unknown as { default: typeof dailyWeather }).default
) as typeof dailyWeather;
const {
  buildDefaultDailyWeatherContext,
  buildOpenMeteoForecastUrl,
  defaultDailyWeather,
  getRecommendationForecastTarget,
  mapOpenMeteoWeatherCode,
  normalizeOpenMeteoCurrentWeather,
  seasonFromDate,
} = dailyWeatherModule;

test("buildOpenMeteoForecastUrl requests current weather without an API key", () => {
  const url = new URL(buildOpenMeteoForecastUrl({ latitude: 31.2304, longitude: 121.4737 }));

  assert.equal(url.origin, "https://api.open-meteo.com");
  assert.equal(url.pathname, "/v1/forecast");
  assert.equal(url.searchParams.get("latitude"), "31.2304");
  assert.equal(url.searchParams.get("longitude"), "121.4737");
  assert.equal(url.searchParams.get("current"), "temperature_2m,weather_code,wind_speed_10m");
  assert.equal(
    url.searchParams.get("daily"),
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
  );
  assert.equal(url.searchParams.get("forecast_days"), "2");
  assert.equal(url.searchParams.get("timezone"), "auto");
});

test("mapOpenMeteoWeatherCode maps WMO weather codes into app weather labels", () => {
  assert.equal(mapOpenMeteoWeatherCode(0, 8), "晴天");
  assert.equal(mapOpenMeteoWeatherCode(3, 8), "多云");
  assert.equal(mapOpenMeteoWeatherCode(61, 8), "小雨");
  assert.equal(mapOpenMeteoWeatherCode(80, 8), "小雨");
  assert.equal(mapOpenMeteoWeatherCode(1, 38), "大风");
});

test("normalizeOpenMeteoCurrentWeather produces app weather context", () => {
  const context = normalizeOpenMeteoCurrentWeather(
    {
      current: {
        temperature_2m: 15.4,
        weather_code: 61,
        wind_speed_10m: 12,
      },
      daily: {
        temperature_2m_max: [18.2],
        temperature_2m_min: [12.1],
        precipitation_probability_max: [80],
        weather_code: [61],
        wind_speed_10m_max: [18],
      },
    },
    {
      date: "2026-05-02",
      location: "上海",
      sourceLabel: "上海实时天气",
    },
  );

  assert.deepEqual(context, {
    season: "春",
    temperature: 15,
    highTemperature: 18,
    lowTemperature: 12,
    precipitationProbability: 80,
    weather: "小雨",
    location: "上海",
    forecastDateKey: "2026-05-02",
    periodLabel: "今日",
    sourceLabel: "上海实时天气",
  });
});

test("normalizeOpenMeteoCurrentWeather can build context from daily forecast only", () => {
  const context = normalizeOpenMeteoCurrentWeather(
    {
      daily: {
        temperature_2m_max: [31.6],
        temperature_2m_min: [24.2],
        precipitation_probability_max: [0],
        weather_code: [1],
        wind_speed_10m_max: [10],
      },
    },
    {
      date: "2026-07-02",
      location: "当前位置",
      sourceLabel: "当前位置天气预报",
    },
  );

  assert.deepEqual(context, {
    season: "夏",
    temperature: 28,
    highTemperature: 32,
    lowTemperature: 24,
    precipitationProbability: 0,
    weather: "晴天",
    location: "当前位置",
    forecastDateKey: "2026-07-02",
    periodLabel: "今日",
    sourceLabel: "当前位置天气预报",
  });
});

test("normalizeOpenMeteoCurrentWeather can select tomorrow forecast after night", () => {
  const context = normalizeOpenMeteoCurrentWeather(
    {
      current: {
        temperature_2m: 29,
        weather_code: 0,
        wind_speed_10m: 8,
      },
      daily: {
        temperature_2m_max: [30, 18],
        temperature_2m_min: [24, 11],
        precipitation_probability_max: [0, 90],
        weather_code: [0, 61],
        wind_speed_10m_max: [10, 14],
      },
    },
    {
      date: "2026-05-03",
      dayIndex: 1,
      location: "当前位置",
      periodLabel: "明日",
      sourceLabel: "当前位置明日天气预报",
    },
  );

  assert.deepEqual(context, {
    season: "春",
    temperature: 15,
    highTemperature: 18,
    lowTemperature: 11,
    precipitationProbability: 90,
    weather: "小雨",
    location: "当前位置",
    forecastDateKey: "2026-05-03",
    periodLabel: "明日",
    sourceLabel: "当前位置明日天气预报",
  });
});

test("getRecommendationForecastTarget switches to tomorrow at 20:00", () => {
  const evening = getRecommendationForecastTarget(new Date("2026-05-02T20:00:00"));
  const beforeEvening = getRecommendationForecastTarget(new Date("2026-05-02T19:59:00"));

  assert.equal(beforeEvening.dayIndex, 0);
  assert.equal(beforeEvening.periodLabel, "今日");
  assert.equal(evening.dayIndex, 1);
  assert.equal(evening.periodLabel, "明日");
  assert.equal(seasonFromDate(evening.date), "春");
});

test("getRecommendationForecastTarget respects configured start hour", () => {
  const stillToday = getRecommendationForecastTarget(
    new Date("2026-05-02T21:59:00"),
    22,
  );
  const tomorrow = getRecommendationForecastTarget(
    new Date("2026-05-02T22:00:00"),
    22,
  );

  assert.equal(stillToday.dayIndex, 0);
  assert.equal(stillToday.periodLabel, "今日");
  assert.equal(tomorrow.dayIndex, 1);
  assert.equal(tomorrow.periodLabel, "明日");
});

test("buildDefaultDailyWeatherContext follows the same today/tomorrow target", () => {
  const beforeEvening = buildDefaultDailyWeatherContext({
    now: new Date("2026-05-02T19:59:00"),
  });
  const evening = buildDefaultDailyWeatherContext({
    now: new Date("2026-05-02T20:00:00"),
  });

  assert.equal(beforeEvening.periodLabel, "今日");
  assert.equal(beforeEvening.forecastDateKey, "2026-05-02");
  assert.equal(evening.periodLabel, "明日");
  assert.equal(evening.forecastDateKey, "2026-05-03");
  assert.equal(evening.sourceLabel, "默认天气");
});

test("seasonFromDate maps month to season", () => {
  assert.equal(seasonFromDate("2026-01-15"), "冬");
  assert.equal(seasonFromDate("2026-04-15"), "春");
  assert.equal(seasonFromDate("2026-07-15"), "夏");
  assert.equal(seasonFromDate("2026-10-15"), "秋");
});

test("defaultDailyWeather is explicit fallback context", () => {
  assert.equal(defaultDailyWeather.sourceLabel, "默认天气");
  assert.ok(defaultDailyWeather.location);
});
