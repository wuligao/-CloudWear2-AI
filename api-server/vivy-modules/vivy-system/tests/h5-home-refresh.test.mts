import assert from "node:assert/strict";
import test from "node:test";
import {
  buildH5HomeLookBriefs,
  buildH5HomeLookImagePrompt,
} from "../src/modules/ai-model/h5-home-refresh.ts";

test("buildH5HomeLookBriefs keeps generated fashion looks and caps to four", () => {
  const briefs = buildH5HomeLookBriefs(
    [
      { label: "轻薄通勤", imagePrompt: "fashion editorial, linen blazer outfit, full body" },
      { label: "海边度假", imagePrompt: "fashion editorial, resort dress outfit, full body" },
      { label: "无关内容", imagePrompt: "food photography on a table" },
      { label: "雨天风衣", imagePrompt: "fashion editorial, trench coat outfit, full body" },
      { label: "周末牛仔", imagePrompt: "fashion editorial, denim outfit, full body" },
      { label: "晚宴黑裙", imagePrompt: "fashion editorial, black dress outfit, full body" },
    ],
    [{ label: "旧图片", image: "/old.jpg" }],
    ["通勤", "约会"],
    ["低饱和"]
  );

  assert.equal(briefs.length, 4);
  assert.deepEqual(
    briefs.map((brief) => brief.label),
    ["轻薄通勤", "海边度假", "雨天风衣", "周末牛仔"]
  );
});

test("buildH5HomeLookBriefs creates daily look prompts when text model omits look images", () => {
  const briefs = buildH5HomeLookBriefs(
    [],
    [
      { label: "浅奶油通勤", image: "/old-a.jpg" },
      { label: "柔雾风衣", image: "/old-b.jpg" },
    ],
    ["通勤", "法式"],
    ["初夏约会"]
  );

  assert.equal(briefs.length, 4);
  assert.equal(briefs[0].label, "浅奶油通勤");
  assert.match(briefs[0].imagePrompt, /fashion editorial/i);
  assert.match(briefs[0].imagePrompt, /no text, no logo, no watermark/i);
  assert.equal(new Set(briefs.map((brief) => brief.label)).size, 4);
});

test("buildH5HomeLookBriefs fills missing generated look slots from current homepage images", () => {
  const briefs = buildH5HomeLookBriefs(
    [{ label: "法式通勤", imagePrompt: "fashion editorial, french commute outfit" }],
    [
      { label: "柔雾风衣", image: "/old-b.jpg" },
      { label: "周末牛仔", image: "/old-c.jpg" },
      { label: "晚宴黑裙", image: "/old-d.jpg" },
    ],
    ["约会"],
    []
  );

  assert.equal(briefs.length, 4);
  assert.deepEqual(
    briefs.map((brief) => brief.label),
    ["法式通勤", "柔雾风衣", "周末牛仔", "晚宴黑裙"]
  );
});

test("buildH5HomeLookImagePrompt keeps each homepage image mobile friendly", () => {
  const prompt = buildH5HomeLookImagePrompt({
    label: "雨天风衣",
    imagePrompt: "fashion editorial, trench coat outfit",
  });

  assert.match(prompt, /雨天风衣/);
  assert.match(prompt, /4:5 portrait/);
  assert.match(prompt, /no text, no logo, no watermark/);
});
