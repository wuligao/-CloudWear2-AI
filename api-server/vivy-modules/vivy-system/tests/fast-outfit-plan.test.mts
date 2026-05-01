import assert from "node:assert/strict";
import test from "node:test";
import { buildFastOutfitPlan } from "../src/modules/outfit/ai/fast-outfit-plan.ts";
import type { OutfitInput } from "../src/modules/outfit/types/outfit.ts";

const input: OutfitInput = {
  season: "春季",
  temperature: 22,
  weather: "晴朗",
  location: "上海街区",
  occasion: "通勤",
  style: "法式风格，浅色系，衬衫，半裙",
  colorPreference: "低饱和",
};

test("buildFastOutfitPlan composes an image prompt directly from user input", () => {
  const plan = buildFastOutfitPlan(input);

  assert.equal(plan.items.length, 0);
  assert.match(plan.imagePrompt, /法式风格/);
  assert.match(plan.imagePrompt, /22 Celsius/);
  assert.match(plan.imagePrompt, /上海街区/);
  assert.match(plan.imagePrompt, /no text, no logo, no watermark/);
});
