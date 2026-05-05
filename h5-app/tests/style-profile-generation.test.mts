import assert from "node:assert/strict";
import test from "node:test";
import * as styleProfileGeneration from "../src/lib/style-profile-generation.ts";
import type { H5StyleArchive } from "../src/types/profile.ts";

const styleProfileGenerationModule = (
  "buildStyleProfileGenerationContext" in styleProfileGeneration
    ? styleProfileGeneration
    : (styleProfileGeneration as unknown as { default: typeof styleProfileGeneration }).default
) as typeof styleProfileGeneration;
const { buildStyleProfileGenerationContext, hasStyleProfileGenerationContext } =
  styleProfileGenerationModule;

const archive: H5StyleArchive = {
  profile: {
    displayName: "云裳用户",
    statusLabel: "风格档案中",
    genderPreference: "女性",
    height: "168cm",
    weight: "52kg",
    clothingSize: "M",
    shoeSize: "38",
  },
  summary: {
    recordCount: 2,
    photoRecordCount: 1,
  },
  stylePreferences: [{ id: "french", label: "法式通勤", percent: 78 }],
  colorPreferences: [{ id: "black", label: "黑色", value: "#111111" }],
  avoidColors: ["荧光粉"],
  commonOccasions: ["通勤"],
  elementPreferences: ["针织", "高腰线"],
  bodyMetrics: [
    { id: "shoulder", label: "肩宽", value: "38cm" },
    { id: "waist", label: "腰围", value: "66cm" },
  ],
  fitTypes: [{ id: "straight", label: "直筒", description: "更利落" }],
  inspiration: [],
  valueProps: [],
  notes: "上班需要低调一点",
};

test("buildStyleProfileGenerationContext summarizes profile fields for generation", () => {
  const context = buildStyleProfileGenerationContext(archive);

  assert.equal(context.genderPreference, "女性");
  assert.equal(context.bodySummary, "身高 168cm，体重 52kg，服装尺码 M，鞋码 38，肩宽 38cm，腰围 66cm");
  assert.deepEqual(context.favoriteStyles, ["法式通勤"]);
  assert.deepEqual(context.favoriteColors, ["黑色"]);
  assert.deepEqual(context.avoidColors, ["荧光粉"]);
  assert.deepEqual(context.commonOccasions, ["通勤"]);
  assert.deepEqual(context.elementPreferences, ["针织", "高腰线"]);
  assert.deepEqual(context.fitPreferences, ["直筒"]);
  assert.equal(context.notes, "上班需要低调一点");
  assert.equal(hasStyleProfileGenerationContext(context), true);
});

test("hasStyleProfileGenerationContext returns false when archive has no usable profile data", () => {
  assert.equal(
    hasStyleProfileGenerationContext({
      favoriteStyles: [],
      favoriteColors: [],
      elementPreferences: [],
      fitPreferences: [],
    }),
    false,
  );
});
