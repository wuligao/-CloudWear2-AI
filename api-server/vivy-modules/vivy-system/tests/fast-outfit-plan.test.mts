import assert from "node:assert/strict";
import test from "node:test";
import * as fastOutfitPlan from "../src/modules/outfit/ai/fast-outfit-plan.ts";
import type { OutfitInput } from "../src/modules/outfit/types/outfit.ts";

const fastOutfitPlanModule = (
  "buildFastOutfitPlan" in fastOutfitPlan
    ? fastOutfitPlan
    : (fastOutfitPlan as unknown as { default: typeof fastOutfitPlan }).default
) as typeof fastOutfitPlan;
const { buildFastOutfitPlan } = fastOutfitPlanModule;

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

test("buildFastOutfitPlan turns male preference into an explicit male image subject", () => {
  const plan = buildFastOutfitPlan({
    ...input,
    genderPreference: "男性",
  });

  assert.match(plan.imagePrompt, /one adult male model/);
  assert.match(plan.imagePrompt, /clearly masculine/);
});

test("buildFastOutfitPlan uses male preference from style profile context", () => {
  const plan = buildFastOutfitPlan({
    ...input,
    genderPreference: "不限",
    styleProfileContext: {
      genderPreference: "男性",
    },
  });

  assert.match(plan.imagePrompt, /one adult male model/);
});
