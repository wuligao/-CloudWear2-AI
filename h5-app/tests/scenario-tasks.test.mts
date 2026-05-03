import assert from "node:assert/strict";
import test from "node:test";
import * as scenarioTasks from "../src/lib/scenario-tasks.ts";

const scenarioTasksModule = (
  "buildScenarioTaskHref" in scenarioTasks
    ? scenarioTasks
    : (scenarioTasks as unknown as { default: typeof scenarioTasks }).default
) as typeof scenarioTasks;
const {
  buildDailyScenarioTasks,
  buildScenarioTaskHref,
  parseRecommendationContextFromSearchParams,
  buildScenarioTaskSummary,
  scenarioTasks: defaultScenarioTasks,
} = scenarioTasksModule;

test("default scenario tasks include high-frequency outfit occasions", () => {
  assert.ok(defaultScenarioTasks.length >= 6);
  assert.ok(defaultScenarioTasks.some((task) => task.id === "commute-30s"));
  assert.ok(defaultScenarioTasks.some((task) => task.id === "coffee-photo"));
});

test("buildScenarioTaskHref carries preset fields into keyword generation", () => {
  const task = defaultScenarioTasks.find((item) => item.id === "commute-30s");
  assert.ok(task);

  const href = buildScenarioTaskHref(task);
  const url = new URL(href, "https://cloudwear.local");

  assert.equal(url.pathname, "/");
  assert.equal(url.searchParams.get("screen"), "keyword");
  assert.equal(url.searchParams.get("scenarioTaskId"), "commute-30s");
  assert.equal(url.searchParams.get("occasion"), "日常通勤");
  assert.equal(url.searchParams.get("location"), "办公室");
  assert.match(url.searchParams.get("style") || "", /清爽/);
});

test("buildScenarioTaskHref can opt into immediate generation", () => {
  const href = buildScenarioTaskHref(defaultScenarioTasks[0], {
    autoGenerate: true,
  });
  const url = new URL(href, "https://cloudwear.local");

  assert.equal(url.searchParams.get("autoGenerate"), "1");
});

test("buildScenarioTaskHref carries weather recommendation context", () => {
  const task = defaultScenarioTasks[0];
  const href = buildScenarioTaskHref(task, {
    weather: {
      season: "春",
      temperature: 18,
      highTemperature: 21,
      lowTemperature: 14,
      precipitationProbability: 70,
      weather: "小雨",
      location: "上海",
      forecastDateKey: "2026-05-03",
      periodLabel: "明日",
      sourceLabel: "上海明日天气预报",
    },
  });
  const url = new URL(href, "https://cloudwear.local");

  assert.equal(url.searchParams.get("recommendationSource"), "weather");
  assert.equal(url.searchParams.get("recommendationPeriod"), "明日");
  assert.equal(url.searchParams.get("recommendationDate"), "2026-05-03");
  assert.equal(url.searchParams.get("recommendationPrecipitation"), "70");

  assert.deepEqual(parseRecommendationContextFromSearchParams(url.searchParams), {
    kind: "weather",
    periodLabel: "明日",
    sourceLabel: "上海明日天气预报",
    forecastDateKey: "2026-05-03",
    summary: "14-21°C 小雨，降水概率70%",
    weather: "小雨",
    temperature: 18,
    highTemperature: 21,
    lowTemperature: 14,
    precipitationProbability: 70,
    location: "办公室",
    scenarioTaskId: "commute-30s",
    title: "30 秒通勤不出错",
  });
});

test("buildDailyScenarioTasks is stable for the same day and context", () => {
  const input = {
    date: "2026-05-02",
    weather: {
      season: "春",
      temperature: 15,
      weather: "小雨",
      location: "上海",
      sourceLabel: "上海实时天气",
    },
    profile: {
      favoriteStyles: ["法式"],
      favoriteColors: ["黑色"],
      commonOccasions: ["日常通勤"],
      elementPreferences: ["高腰线"],
      fitPreferences: ["显瘦"],
    },
  };

  assert.deepEqual(buildDailyScenarioTasks(input), buildDailyScenarioTasks(input));
});

test("buildDailyScenarioTasks changes ordering when recommendation seed changes", () => {
  const input = {
    weather: {
      season: "春",
      temperature: 20,
      weather: "小雨",
      location: "上海",
      sourceLabel: "上海实时天气",
    },
    profile: {
      favoriteStyles: ["简约"],
      favoriteColors: ["黑色"],
      commonOccasions: ["日常通勤"],
      elementPreferences: ["直筒"],
      fitPreferences: [],
    },
  };

  const firstBatch = buildDailyScenarioTasks({
    ...input,
    date: "2026-05-02-0",
  }).map((task) => task.id);
  const nextBatch = buildDailyScenarioTasks({
    ...input,
    date: "2026-05-02-1",
  }).map((task) => task.id);

  assert.notDeepEqual(nextBatch, firstBatch);
});

test("buildDailyScenarioTasks reflects weather and style preferences", () => {
  const tasks = buildDailyScenarioTasks({
    date: "2026-05-02",
    weather: {
      season: "春",
      temperature: 15,
      weather: "小雨",
      location: "上海",
      sourceLabel: "上海实时天气",
    },
    profile: {
      favoriteStyles: ["法式"],
      favoriteColors: ["黑色"],
      commonOccasions: ["日常通勤"],
      elementPreferences: ["高腰线"],
      fitPreferences: ["显瘦"],
    },
  });

  assert.equal(tasks.length, 6);
  assert.ok(tasks.every((task) => task.preset.weather === "小雨"));
  assert.ok(tasks.every((task) => task.preset.temperature === 15));
  assert.ok(tasks.some((task) => /小雨|雨天/.test(task.title + task.preset.style)));
  assert.ok(tasks.some((task) => /法式/.test(task.preset.style)));
  assert.ok(tasks.some((task) => task.preset.colorPreference === "黑色"));
});

test("buildDailyScenarioTasks changes weather-specific cards for hot days", () => {
  const tasks = buildDailyScenarioTasks({
    date: "2026-07-20",
    weather: {
      season: "夏",
      temperature: 34,
      weather: "晴天",
      location: "杭州",
      sourceLabel: "杭州实时天气",
    },
    profile: {
      favoriteStyles: ["运动"],
      favoriteColors: ["浅蓝"],
      commonOccasions: ["逛街"],
      elementPreferences: [],
      fitPreferences: [],
    },
  });

  assert.ok(tasks.some((task) => /清爽|防晒|降温/.test(task.title + task.preset.style)));
  assert.ok(tasks.every((task) => task.preset.season === "夏"));
});

test("buildScenarioTaskSummary names weather source and preferences", () => {
  assert.equal(
    buildScenarioTaskSummary({
      weather: {
        season: "春",
        temperature: 15,
        highTemperature: 18,
        lowTemperature: 12,
        precipitationProbability: 80,
        weather: "小雨",
        location: "上海",
        sourceLabel: "上海实时天气",
      },
      profile: {
        favoriteStyles: ["法式"],
        favoriteColors: ["黑色"],
        commonOccasions: [],
        elementPreferences: [],
        fitPreferences: [],
      },
    }),
    "根据上海实时天气：12-18°C 小雨，降水概率80%，结合你的法式 / 黑色偏好生成",
  );
});

test("buildScenarioTaskSummary switches suffix for tomorrow recommendations", () => {
  assert.equal(
    buildScenarioTaskSummary({
      weather: {
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
      },
    }),
    "根据当前位置明日天气预报：11-18°C 小雨，降水概率90%，为你生成明日推荐",
  );
});
