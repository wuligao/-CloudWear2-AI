export function normalizeGenerationDuration(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return Math.trunc(value);
}

export function formatGenerationDuration(value: number | undefined) {
  const durationMs = normalizeGenerationDuration(value);
  if (durationMs === undefined) return "";

  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) return `耗时 ${totalSeconds}秒`;

  return `耗时 ${minutes}分${String(seconds).padStart(2, "0")}秒`;
}
