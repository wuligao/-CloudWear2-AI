import type { GenerateOutfitResponse, OutfitGeneration, OutfitInput } from "@/types/outfit";

export type GenerateSource = "keyword" | "photo";

export interface ActiveGenerationTask {
  taskId: string;
  source: GenerateSource;
  createdAt?: string;
  input?: Partial<OutfitInput>;
}

const dailyGenerationUsageKey = "cloudwear.daily-generation-usage.v1";
const activeGenerationTaskKey = "cloudwear.active-generation-task.v1";
const countedGenerationIdsKey = "cloudwear.counted-generation-ids.v1";
export const activeGenerationTaskStoreEvent =
  "cloudwear-active-generation-tasks-change";

interface WriteActiveGenerationTaskOptions {
  syncUrl?: boolean;
}

export function readDailyGenerationCount() {
  if (typeof window === "undefined") return 0;

  try {
    const snapshot = window.localStorage.getItem(dailyGenerationUsageKey);
    if (!snapshot) return 0;

    const usage = JSON.parse(snapshot) as { count?: number; date?: string };
    if (usage.date !== getTodayKey()) return 0;

    return Math.max(0, usage.count || 0);
  } catch {
    return 0;
  }
}

export function writeDailyGenerationCount(count: number) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    dailyGenerationUsageKey,
    JSON.stringify({ count, date: getTodayKey() }),
  );
}

export function countCompletedGenerationImages(
  generation: GenerateOutfitResponse,
  generations: OutfitGeneration[],
  dailyGenerationLimit?: number,
) {
  const countKey = generation.taskId || generation.id;
  if (hasCountedGeneration(countKey)) return readDailyGenerationCount();

  markGenerationCounted(countKey);
  const generatedImageCount = Math.max(1, generations.length);
  const nextCount = readDailyGenerationCount() + generatedImageCount;
  const normalizedCount =
    typeof dailyGenerationLimit === "number"
      ? Math.min(dailyGenerationLimit, nextCount)
      : nextCount;

  writeDailyGenerationCount(normalizedCount);
  return normalizedCount;
}

export function getGenerationTaskElapsedSeconds(
  createdAt?: string,
  now = Date.now(),
) {
  const startedAt = Date.parse(String(createdAt || ""));
  if (!Number.isFinite(startedAt)) return 0;

  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function readActiveGenerationTask(): ActiveGenerationTask | null {
  return readActiveGenerationTasks()[0] || null;
}

export function readActiveGenerationTasks(): ActiveGenerationTask[] {
  if (typeof window === "undefined") return [];

  const taskIdFromUrl = new URL(window.location.href).searchParams.get(
    "taskId",
  );
  const storedTasks = readStoredActiveGenerationTasks();

  if (taskIdFromUrl) {
    const selectedTask = storedTasks.find((task) => task.taskId === taskIdFromUrl);
    const taskFromUrl: ActiveGenerationTask = selectedTask || {
      taskId: taskIdFromUrl,
      source: "keyword",
    };

    return [
      taskFromUrl,
      ...storedTasks.filter((task) => task.taskId !== taskIdFromUrl),
    ];
  }

  return storedTasks;
}

export function readStoredActiveGenerationTask(): ActiveGenerationTask | null {
  return readStoredActiveGenerationTasks()[0] || null;
}

export function readStoredActiveGenerationTasks(): ActiveGenerationTask[] {
  if (typeof window === "undefined") return [];

  try {
    const snapshot = window.localStorage.getItem(activeGenerationTaskKey);
    if (!snapshot) return [];

    const parsedValue = JSON.parse(snapshot) as
      | Partial<ActiveGenerationTask>
      | Partial<ActiveGenerationTask>[];
    const tasks = Array.isArray(parsedValue) ? parsedValue : [parsedValue];

    return tasks
      .map(normalizeActiveGenerationTask)
      .filter((task): task is ActiveGenerationTask => Boolean(task));
  } catch {
    return [];
  }
}

export function writeActiveGenerationTask(
  task: ActiveGenerationTask,
  options: WriteActiveGenerationTaskOptions = {},
) {
  if (typeof window === "undefined") return;

  const nextTasks = [
    task,
    ...readStoredActiveGenerationTasks().filter((item) => item.taskId !== task.taskId),
  ];
  if (options.syncUrl) updateTaskIdInUrl(task.taskId);
  writeStoredActiveGenerationTasks(nextTasks);
}

export function clearActiveGenerationTask() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(activeGenerationTaskKey);
  updateTaskIdInUrl(null);
  dispatchActiveGenerationTaskChange();
}

export function removeActiveGenerationTask(taskId: string) {
  if (typeof window === "undefined") return;

  const nextTasks = readStoredActiveGenerationTasks().filter(
    (task) => task.taskId !== taskId,
  );
  writeStoredActiveGenerationTasks(nextTasks);

  const url = new URL(window.location.href);
  if (url.searchParams.get("taskId") === taskId) {
    updateTaskIdInUrl(null);
  }
}

export function removeAutoGenerateFlagFromUrl() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (!url.searchParams.has("autoGenerate")) return;

  url.searchParams.delete("autoGenerate");
  window.history.replaceState(
    null,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function updateTaskIdInUrl(taskId: string | null) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete("autoGenerate");
  if (taskId) {
    url.searchParams.set("taskId", taskId);
  } else {
    url.searchParams.delete("taskId");
  }
  window.history.replaceState(
    null,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function normalizeActiveGenerationTask(
  task: Partial<ActiveGenerationTask>,
): ActiveGenerationTask | null {
  if (!task.taskId) return null;
  if (task.source !== "keyword" && task.source !== "photo") return null;

  return {
    taskId: task.taskId,
    source: task.source,
    createdAt: typeof task.createdAt === "string" ? task.createdAt : undefined,
    input: task.input && typeof task.input === "object" ? task.input : undefined,
  };
}

function writeStoredActiveGenerationTasks(tasks: ActiveGenerationTask[]) {
  if (tasks.length) {
    window.localStorage.setItem(
      activeGenerationTaskKey,
      JSON.stringify(tasks.slice(0, 20)),
    );
  } else {
    window.localStorage.removeItem(activeGenerationTaskKey);
  }

  dispatchActiveGenerationTaskChange();
}

function dispatchActiveGenerationTaskChange() {
  window.dispatchEvent(new Event(activeGenerationTaskStoreEvent));
}

function hasCountedGeneration(id: string) {
  return readCountedGenerationIds().includes(id);
}

function markGenerationCounted(id: string) {
  if (typeof window === "undefined") return;

  const ids = readCountedGenerationIds();
  if (ids.includes(id)) return;

  window.localStorage.setItem(
    countedGenerationIdsKey,
    JSON.stringify([id, ...ids].slice(0, 80)),
  );
}

function readCountedGenerationIds() {
  if (typeof window === "undefined") return [];

  try {
    const parsedValue = JSON.parse(
      window.localStorage.getItem(countedGenerationIdsKey) ?? "[]",
    );
    if (!Array.isArray(parsedValue)) return [];

    return parsedValue.filter(
      (item): item is string => typeof item === "string",
    );
  } catch {
    return [];
  }
}

function getTodayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}
