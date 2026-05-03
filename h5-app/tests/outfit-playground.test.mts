import assert from "node:assert/strict";
import test from "node:test";
import * as outfitPlayground from "../src/lib/outfit-playground.ts";
import type { OutfitGeneration } from "../src/types/outfit.ts";

const outfitPlaygroundModule = (
  "buildTuneHref" in outfitPlayground
    ? outfitPlayground
    : (outfitPlayground as unknown as { default: typeof outfitPlayground }).default
) as typeof outfitPlayground;
const { buildTuneHref, tuneActions } = outfitPlaygroundModule;

const generation = {
  colorPreference: "浅蓝",
  createdAt: "2026-05-02T08:00:00.000Z",
  failedCount: 0,
  genderPreference: "不限",
  id: "look-1",
  imagePrompt: "full body outfit",
  imageUrl: "https://example.com/look.png",
  items: [],
  location: "咖啡店",
  occasion: "约会",
  occasionReason: "适合轻松约会。",
  recordStatus: "succeeded",
  season: "夏",
  source: "keyword",
  style: "法式",
  styleTags: ["法式", "浅蓝"],
  successCount: 1,
  summary: "清爽的法式约会穿搭。",
  taskId: "task-1",
  temperature: 28,
  temperatureAdvice: "适合夏季温度。",
  totalCount: 1,
  weather: "晴天",
  outfitTitle: "浅蓝法式约会",
} satisfies OutfitGeneration;

test("buildTuneHref carries outfit context and appends the tune prompt", () => {
  const href = buildTuneHref(generation, tuneActions[0]);
  const url = new URL(href, "https://cloudwear.local");

  assert.equal(url.pathname, "/");
  assert.equal(url.searchParams.get("screen"), "keyword");
  assert.equal(url.searchParams.get("autoGenerate"), "1");
  assert.equal(url.searchParams.get("season"), "夏");
  assert.equal(url.searchParams.get("weather"), "晴天");
  assert.equal(url.searchParams.get("location"), "咖啡店");
  assert.equal(url.searchParams.get("occasion"), "约会");
  assert.match(url.searchParams.get("style") || "", /法式/);
  assert.match(url.searchParams.get("style") || "", /换成黑色系/);
});

test("buildTuneHref omits empty optional preferences", () => {
  const href = buildTuneHref(
    { ...generation, colorPreference: "", genderPreference: "" },
    tuneActions[2],
  );
  const url = new URL(href, "https://cloudwear.local");

  assert.equal(url.searchParams.has("colorPreference"), false);
  assert.equal(url.searchParams.has("genderPreference"), false);
});

test("tuneActions cover commute and photo-ready refinements", () => {
  assert.ok(tuneActions.some((action) => action.id === "commute"));
  assert.ok(tuneActions.some((action) => action.id === "photo-ready"));
});
