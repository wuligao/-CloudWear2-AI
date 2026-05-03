import assert from "node:assert/strict";
import test from "node:test";
import * as recordDto from "../dist/modules/outfit/dto/outfit-record.dto.js";

const recordDtoModule = (
  "createOutfitRecordSchema" in recordDto
    ? recordDto
    : (recordDto as unknown as { default: typeof recordDto }).default
) as typeof recordDto;
const { createOutfitRecordSchema } = recordDtoModule;

const validGeneration = {
  id: "record-duration-1",
  taskId: "task-duration-1",
  source: "keyword",
  recordStatus: "succeeded",
  totalCount: 1,
  successCount: 1,
  failedCount: 0,
  season: "夏",
  temperature: 24,
  weather: "晴天",
  location: "上海",
  occasion: "通勤",
  style: "简约",
  imageModel: "gpt-image-2",
  outfitTitle: "清爽通勤方案",
  summary: "适合晴天通勤的清爽穿搭。",
  styleTags: ["通勤", "简约"],
  temperatureAdvice: "24度适合轻薄面料。",
  occasionReason: "适合通勤场景。",
  items: [
    {
      category: "上衣",
      name: "白色衬衫",
      color: "白色",
      material: "棉",
      reason: "清爽耐看。",
    },
  ],
  imagePrompt: "Full-body fashion look",
  imageUrl: "https://example.com/look.png",
  createdAt: "2026-05-01T00:00:00.000Z",
};

test("createOutfitRecordSchema keeps generation duration in milliseconds", () => {
  const parsed = createOutfitRecordSchema.parse({
    source: "keyword",
    generation: {
      ...validGeneration,
      generationDurationMs: 125000,
    },
  });

  assert.equal(parsed.generation.generationDurationMs, 125000);
});
