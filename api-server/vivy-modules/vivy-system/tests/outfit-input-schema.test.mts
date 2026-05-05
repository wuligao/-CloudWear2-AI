import assert from "node:assert/strict";
import test from "node:test";
import * as schema from "../src/modules/outfit/ai/schema.ts";

const schemaModule = (
  "outfitInputSchema" in schema
    ? schema
    : (schema as unknown as { default: typeof schema }).default
) as typeof schema;
const { outfitInputSchema } = schemaModule;

const validInput = {
  season: "不限季节",
  temperature: 22,
  weather: "不限天气",
  location: "不限地点",
  occasion: "不限场景",
  style: "自由发挥",
  imageModel: "gpt-image-1",
};

test("outfitInputSchema accepts a requested generation count", () => {
  const parsed = outfitInputSchema.parse({
    ...validInput,
    generationCount: 3,
  });

  assert.equal(parsed.generationCount, 3);
});

test("outfitInputSchema accepts photo mode context", () => {
  const parsed = outfitInputSchema.parse({
    ...validInput,
    photoMode: {
      id: "slimmer",
      label: "更显瘦",
      prompt: "照片换搭模式：更显瘦，优化身材比例。",
    },
  });

  assert.equal(parsed.photoMode?.label, "更显瘦");
});

test("outfitInputSchema accepts style profile context for guided generation", () => {
  const parsed = outfitInputSchema.parse({
    ...validInput,
    styleProfileContext: {
      genderPreference: "女性",
      bodySummary: "身高 168cm，体重 52kg，服装尺码 M，鞋码 38",
      favoriteStyles: ["法式通勤", "松弛休闲"],
      favoriteColors: ["黑色", "燕麦色"],
      avoidColors: ["荧光粉"],
      commonOccasions: ["通勤", "约会"],
      elementPreferences: ["针织", "高腰线"],
      fitPreferences: ["直筒", "微宽松"],
      notes: "上班需要低调一点",
    },
  });

  assert.deepEqual(parsed.styleProfileContext?.favoriteStyles, ["法式通勤", "松弛休闲"]);
  assert.equal(parsed.styleProfileContext?.bodySummary, "身高 168cm，体重 52kg，服装尺码 M，鞋码 38");
});

test("outfitInputSchema rejects unsupported generation counts", () => {
  assert.throws(
    () =>
      outfitInputSchema.parse({
        ...validInput,
        generationCount: 0,
      }),
    /Too small|Number must be greater than or equal to 1/,
  );
});
