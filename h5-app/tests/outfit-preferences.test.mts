import assert from "node:assert/strict";
import test from "node:test";
import * as outfitPreferences from "../src/lib/outfit-preferences.ts";

const outfitPreferencesModule = (
  "toggleSelectable" in outfitPreferences
    ? outfitPreferences
    : (outfitPreferences as unknown as { default: typeof outfitPreferences }).default
) as typeof outfitPreferences;
const {
  addCustomSelectable,
  buildColorPreference,
  hasKeyword,
  toggleKeywordText,
  toggleSelectable,
} = outfitPreferencesModule;

test("toggleSelectable allows a tag group to become empty", () => {
  assert.deepEqual(toggleSelectable("法式", ["法式"]), []);
  assert.deepEqual(toggleSelectable("韩系", ["法式"]), ["法式", "韩系"]);
});

test("toggleKeywordText adds and removes quick keywords", () => {
  const withKeyword = toggleKeywordText("法式风格，通勤", "温柔");
  assert.equal(withKeyword, "法式风格，通勤，温柔");
  assert.equal(toggleKeywordText(withKeyword, "通勤"), "法式风格，温柔");
  assert.equal(hasKeyword(withKeyword, "温柔"), true);
  assert.equal(toggleKeywordText("法式风格，通勤", "法式"), "通勤");
  assert.equal(hasKeyword("法式风格，通勤", "法式"), true);
});

test("buildColorPreference uses custom palette values when selected", () => {
  assert.equal(buildColorPreference("浅蓝", "#cbdcff"), "浅蓝");
  assert.equal(buildColorPreference("自定义", "#abc123"), "自定义色 #ABC123");
});

test("addCustomSelectable trims input and avoids duplicates", () => {
  assert.deepEqual(addCustomSelectable("  通勤老钱风  ", ["法式"]), ["法式", "通勤老钱风"]);
  assert.deepEqual(addCustomSelectable("法式", ["法式风格"]), ["法式风格"]);
  assert.deepEqual(addCustomSelectable("   ", ["法式风格"]), ["法式风格"]);
});
