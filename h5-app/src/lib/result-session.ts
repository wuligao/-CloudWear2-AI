import type { OutfitGeneration } from "@/types/outfit";

const outfitResultSessionKey = "cloudwear.current-result.v1";

export interface OutfitResultSession {
  taskId?: string;
  source?: "keyword" | "photo";
  createdAt: string;
  recordIds?: string[];
  results: OutfitGeneration[];
}

export const emptyOutfitResultSession: OutfitResultSession = {
  createdAt: "",
  recordIds: [],
  results: [],
};

export function readOutfitResultSession() {
  if (typeof window === "undefined") return emptyOutfitResultSession;

  return parseOutfitResultSessionSnapshot(
    window.localStorage.getItem(outfitResultSessionKey) || "",
  );
}

export function writeOutfitResultSession(session: OutfitResultSession) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    outfitResultSessionKey,
    JSON.stringify({
      taskId: session.taskId,
      source: session.source,
      createdAt: session.createdAt,
      recordIds: getSessionRecordIds(session),
    }),
  );
}

export function parseOutfitResultSessionSnapshot(
  snapshot: string,
): OutfitResultSession {
  try {
    const parsedValue = JSON.parse(snapshot) as Partial<OutfitResultSession>;
    if (!parsedValue || typeof parsedValue !== "object") {
      return emptyOutfitResultSession;
    }

    const results = Array.isArray(parsedValue.results)
      ? parsedValue.results.filter(isOutfitGeneration)
      : [];
    const recordIds = Array.isArray(parsedValue.recordIds)
      ? parsedValue.recordIds.filter((value): value is string => typeof value === "string")
      : results.map((item) => item.id);
    if (recordIds.length === 0 && results.length === 0) return emptyOutfitResultSession;

    return {
      taskId:
        typeof parsedValue.taskId === "string" ? parsedValue.taskId : undefined,
      source:
        parsedValue.source === "keyword" || parsedValue.source === "photo"
          ? parsedValue.source
          : undefined,
      createdAt:
        typeof parsedValue.createdAt === "string" ? parsedValue.createdAt : "",
      recordIds,
      results: [],
    };
  } catch {
    return emptyOutfitResultSession;
  }
}

function getSessionRecordIds(session: OutfitResultSession) {
  const ids = session.recordIds?.length
    ? session.recordIds
    : session.results.map((item) => item.id);

  return ids.filter(Boolean).slice(0, 8);
}

function isOutfitGeneration(value: unknown): value is OutfitGeneration {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<OutfitGeneration>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.imageUrl === "string" &&
    typeof candidate.outfitTitle === "string"
  );
}
