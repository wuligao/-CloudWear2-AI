import assert from "node:assert/strict";
import test from "node:test";
import * as generationInput from "../src/lib/generation-input.ts";
import type { H5OutfitConfigOptions } from "../src/lib/h5-config.ts";
import type { OutfitInput } from "../src/types/outfit.ts";

const generationInputModule = (
  "buildGenerationInput" in generationInput
    ? generationInput
    : (generationInput as unknown as { default: typeof generationInput }).default
) as typeof generationInput;
const {
  buildGenerationCountOptions,
  buildGenerationInput,
  normalizeGenerationCount,
} = generationInputModule;

const configDefaults: OutfitInput = {
  season: "春季",
  temperature: 22,
  weather: "晴朗",
  location: "上海街区",
  occasion: "通勤",
  style: "法式风格",
  colorPreference: "浅色",
};

const emptyConfigOptions: H5OutfitConfigOptions = {
  colors: [],
  dailyFreeGenerationLimit: 3,
  generationCounts: [],
  homeCategories: [],
  homeLooks: [],
  imageModels: [],
  inspirationKeywords: [],
  items: [],
  login: {
    brandTitle: "",
    heroAlt: "",
    heroImage: "",
    phonePasswordEnabled: true,
    registerEnabled: true,
    subtitle: "",
    wechatEnabled: true,
    guestEnabled: true,
  },
  locations: [],
  scenes: [],
  seasons: [],
  styles: [],
  temperatures: [],
  tomorrowRecommendationStartHour: 20,
  weathers: [],
};

test("buildGenerationInput keeps empty tag groups unselected and sends image count", () => {
  const input = buildGenerationInput({
    configDefaults,
    customColor: "#abcdef",
    generationCount: 2,
    imageModel: "gpt-image-1",
    keywordText: "",
    selectedColor: null,
    selectedItems: [],
    selectedLocation: null,
    selectedScenes: [],
    selectedSeason: null,
    selectedStyles: [],
    selectedTemperature: null,
    selectedWeather: null,
    source: "keyword",
  });

  assert.equal(input.season, "不限季节");
  assert.equal(input.weather, "不限天气");
  assert.equal(input.location, "不限地点");
  assert.equal(input.occasion, "不限场景");
  assert.equal(input.style, "自由发挥");
  assert.equal(input.colorPreference, undefined);
  assert.equal(input.generationCount, 2);
});

test("normalizeGenerationCount clamps unsupported values to the supported range", () => {
  assert.equal(normalizeGenerationCount(0), 1);
  assert.equal(normalizeGenerationCount(3), 3);
  assert.equal(normalizeGenerationCount(99), 4);
});

test("buildGenerationCountOptions uses configured counts when available", () => {
  assert.deepEqual(
    buildGenerationCountOptions({
      ...emptyConfigOptions,
      generationCounts: [
        { label: "1 张", value: 1 },
        { label: "3 张", value: 3 },
        { label: "无效", value: 9 },
      ],
    }),
    [1, 3],
  );
});
