import assert from "node:assert/strict";
import test from "node:test";
import {
  buildH5ChatSystemPrompt,
  parseH5ChatAssistantResponse,
} from "../src/modules/outfit/h5-chat-agent.ts";

test("buildH5ChatSystemPrompt includes enabled style profile and recent records", () => {
  const prompt = buildH5ChatSystemPrompt({
    assistant: {
      enabled: true,
      welcomeMessage: "今天想聊哪种穿搭？",
      quickPrompts: ["明天通勤怎么穿"],
      useStyleProfile: true,
      useRecentRecords: true,
      maxHistoryMessages: 8,
      dailyLimit: 20,
    },
    profile: {
      genderPreference: "女装",
      favoriteStyles: ["法式", "通勤"],
      favoriteColors: ["浅蓝"],
      avoidColors: ["荧光绿"],
      commonOccasions: ["办公室"],
      fitPreferences: ["显高"],
      notes: "不喜欢太夸张",
    },
    recentRecords: [
      {
        outfitTitle: "浅蓝通勤穿搭",
        summary: "衬衫搭配半裙，颜色清爽。",
        occasion: "通勤",
        style: "法式",
        colorPreference: "浅蓝",
        weather: "多云",
        temperature: 22,
      },
    ],
    options: {
      homeCategories: ["通勤", "约会"],
      inspirationKeywords: ["初夏约会"],
      styles: ["法式", "韩系"],
      scenes: ["日常通勤"],
      colors: ["浅蓝", "奶茶"],
      items: ["外套", "半裙"],
    },
  });

  assert.match(prompt, /女装/);
  assert.match(prompt, /浅蓝通勤穿搭/);
  assert.match(prompt, /只输出严格 JSON/);
  assert.match(prompt, /suggestedGenerationInput/);
});

test("parseH5ChatAssistantResponse reads strict JSON reply and generation suggestion", () => {
  const parsed = parseH5ChatAssistantResponse(`{
    "reply": "建议你用浅蓝衬衫搭配米色半裙。",
    "quickReplies": ["换成裤装", "更正式一点"],
    "suggestedGenerationInput": {
      "style": "浅蓝衬衫，米色半裙，法式通勤",
      "occasion": "通勤",
      "colorPreference": "浅蓝",
      "weather": "多云",
      "temperature": 22,
      "location": "上海"
    }
  }`);

  assert.equal(parsed.reply, "建议你用浅蓝衬衫搭配米色半裙。");
  assert.deepEqual(parsed.quickReplies, ["换成裤装", "更正式一点"]);
  assert.equal(parsed.suggestedGenerationInput?.style, "浅蓝衬衫，米色半裙，法式通勤");
  assert.equal(parsed.suggestedGenerationInput?.temperature, 22);
});

test("parseH5ChatAssistantResponse rejects non-json model output", () => {
  assert.throws(
    () => parseH5ChatAssistantResponse("可以呀，我建议你穿风衣。"),
    /未返回有效的顾问 JSON/
  );
});
