import assert from "node:assert/strict";
import test from "node:test";
import * as weatherTheme from "../src/lib/weather-theme.ts";

const weatherThemeModule = (
  "getCloudWearWeatherTheme" in weatherTheme
    ? weatherTheme
    : (weatherTheme as unknown as { default: typeof weatherTheme }).default
) as typeof weatherTheme;
const {
  getCloudWearWeatherTheme,
  getDailyWeatherVisualTheme,
} = weatherThemeModule;

test("getDailyWeatherVisualTheme classifies weather conditions for visual themes", () => {
  assert.equal(getDailyWeatherVisualTheme({ weather: "小雨", temperature: 18 }), "rainy");
  assert.equal(getDailyWeatherVisualTheme({ weather: "晴", temperature: 32 }), "sunny");
  assert.equal(getDailyWeatherVisualTheme({ weather: "降雪", temperature: 2 }), "snowy");
  assert.equal(getDailyWeatherVisualTheme({ weather: "阴天", temperature: 16 }), "overcast");
});

test("getCloudWearWeatherTheme maps weather to stable color directions", () => {
  assert.equal(getCloudWearWeatherTheme("sunny"), "editorial");
  assert.equal(getCloudWearWeatherTheme("mild"), "soft");
  assert.equal(getCloudWearWeatherTheme("cloudy"), "utility");
  assert.equal(getCloudWearWeatherTheme("overcast"), "utility");
  assert.equal(getCloudWearWeatherTheme("rainy"), "utility");
  assert.equal(getCloudWearWeatherTheme("windy"), "utility");
  assert.equal(getCloudWearWeatherTheme("snowy"), "cold-editorial");
  assert.equal(getCloudWearWeatherTheme("night"), "showcase");
});
