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
