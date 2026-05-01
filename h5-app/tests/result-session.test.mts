import assert from "node:assert/strict";
import test from "node:test";
import * as resultSession from "../src/lib/result-session.ts";
import type { OutfitGeneration } from "../src/types/outfit.ts";

const resultSessionModule = (
  "parseOutfitResultSessionSnapshot" in resultSession
    ? resultSession
    : (resultSession as unknown as { default: typeof resultSession }).default
) as typeof resultSession;
const { emptyOutfitResultSession, parseOutfitResultSessionSnapshot } =
  resultSessionModule;

const generation: OutfitGeneration = {
  id: "look-1",
  taskId: "task-1",
  season: "夏季",
  temperature: 24,
  weather: "小雨",
  location: "上海",
  occasion: "逛街",
  style: "日系",
  outfitTitle: "轻潮街拍风方案",
  summary: "轻盈浅蓝色雨天穿搭。",
  styleTags: ["日系", "逛街"],
  temperatureAdvice: "适合 22-26 度。",
  occasionReason: "适合轻松出行。",
  items: [],
  imagePrompt: "look",
  imageUrl: "https://example.com/look.png",
  createdAt: "2026-05-01T00:00:00.000Z",
};

test("parseOutfitResultSessionSnapshot keeps valid generated looks", () => {
  const snapshot = JSON.stringify({
    taskId: "task-1",
    source: "keyword",
    createdAt: "2026-05-01T00:00:00.000Z",
    results: [generation],
  });

  const session = parseOutfitResultSessionSnapshot(snapshot);

  assert.equal(session.taskId, "task-1");
  assert.equal(session.results.length, 1);
  assert.equal(session.results[0]?.outfitTitle, "轻潮街拍风方案");
});

test("parseOutfitResultSessionSnapshot falls back for broken snapshots", () => {
  assert.deepEqual(
    parseOutfitResultSessionSnapshot("{broken"),
    emptyOutfitResultSession,
  );
  assert.deepEqual(
    parseOutfitResultSessionSnapshot(JSON.stringify({ results: [] })),
    emptyOutfitResultSession,
  );
});
