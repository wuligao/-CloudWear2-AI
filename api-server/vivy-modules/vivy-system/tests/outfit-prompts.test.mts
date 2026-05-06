import assert from "node:assert/strict";
import test from "node:test";
import * as prompts from "../src/modules/outfit/ai/prompts.ts";
import type { OutfitInput } from "../src/modules/outfit/types/outfit.ts";

const promptModule = (
  "buildOutfitUserPrompt" in prompts
    ? prompts
    : (prompts as unknown as { default: typeof prompts }).default
) as typeof prompts;
const { buildOutfitUserPrompt } = promptModule;

const input: OutfitInput = {
  season: "春季",
  temperature: 22,
  weather: "晴朗",
  location: "上海街区",
  occasion: "通勤",
  style: "简约通勤",
  colorPreference: "黑白灰",
  genderPreference: "男性",
};

test("buildOutfitUserPrompt asks the planner to keep male image prompts explicitly male", () => {
  const prompt = buildOutfitUserPrompt(input);

  assert.match(prompt, /Image subject directive: one adult male model/);
  assert.match(prompt, /imagePrompt must follow the image subject directive/);
});

test("buildOutfitUserPrompt uses male preference from style profile context", () => {
  const prompt = buildOutfitUserPrompt({
    ...input,
    genderPreference: "不限",
    styleProfileContext: {
      genderPreference: "男性",
    },
  });

  assert.match(prompt, /Image subject directive: one adult male model/);
});
