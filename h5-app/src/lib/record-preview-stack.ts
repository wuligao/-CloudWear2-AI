import type { OutfitGeneration } from "@/types/outfit";

const maxVisualCount = 12;
const maxVisibleLayers = 3;

export interface RecordPreviewStackInput {
  imageUrl?: string;
  recordStatus?: OutfitGeneration["recordStatus"];
  totalCount?: number;
  successCount?: number;
  failedCount?: number;
}

export interface RecordPreviewStackLayer {
  key: string;
  depth: "front" | "middle" | "back";
}

export interface RecordPreviewStack {
  failedCount: number;
  hasImage: boolean;
  hiddenCount: number;
  isBatch: boolean;
  status: OutfitGeneration["recordStatus"];
  successCount: number;
  summaryLabel: string;
  totalCount: number;
  visibleLayers: RecordPreviewStackLayer[];
}

export function buildRecordPreviewStack(
  input: RecordPreviewStackInput,
): RecordPreviewStack {
  const status = input.recordStatus || "succeeded";
  const requestedTotalCount = normalizeRecordCount(input.totalCount);
  const successCount = normalizeOutcomeCount(
    input.successCount,
    status === "failed" ? 0 : Math.min(requestedTotalCount, 1),
  );
  const failedCount = normalizeOutcomeCount(
    input.failedCount,
    status === "failed" ? 1 : 0,
  );
  const totalCount = normalizeRecordCount(
    Math.max(requestedTotalCount, successCount + failedCount),
  );
  const visibleCount = Math.min(totalCount, maxVisibleLayers);

  return {
    failedCount,
    hasImage: Boolean(input.imageUrl),
    hiddenCount: Math.max(0, totalCount - visibleCount),
    isBatch: totalCount > 1,
    status,
    successCount,
    summaryLabel: `成功 ${successCount} / 失败 ${failedCount}`,
    totalCount,
    visibleLayers: buildVisibleLayers(visibleCount),
  };
}

export function normalizeRecordCount(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;

  return Math.min(maxVisualCount, Math.max(1, Math.trunc(value)));
}

function normalizeOutcomeCount(value: number | undefined, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;

  return Math.min(maxVisualCount, Math.max(0, Math.trunc(value)));
}

function buildVisibleLayers(count: number): RecordPreviewStackLayer[] {
  const depths: RecordPreviewStackLayer["depth"][] = ["front", "middle", "back"];

  return Array.from({ length: count }, (_, index) => ({
    key: `record-stack-${index}`,
    depth: depths[index] || "back",
  }));
}
