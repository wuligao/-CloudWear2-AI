"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Eye,
  Filter,
  ImageIcon,
  LoaderCircle,
  MoreHorizontal,
  RotateCw,
  Search,
  TriangleAlert,
} from "lucide-react";
import { DeleteConfirmDialog } from "@/components/outfit/delete-confirm-dialog";
import { outfitApiEndpoints, resolveBackendAssetUrl } from "@/lib/api-endpoints";
import {
  type ActiveGenerationTask,
  readActiveGenerationTasks,
} from "@/lib/generation-task-state";
import { formatGenerationDuration } from "@/lib/generation-duration";
import { deleteOutfitRecord, listOutfitRecords } from "@/lib/outfit-records";
import { getPhotoModeLabel } from "@/lib/photo-modes";
import { buildRecordPreviewStack } from "@/lib/record-preview-stack";
import type { RecordPreviewStack } from "@/lib/record-preview-stack";
import {
  appendRecommendationContextParams,
  getRecommendationContextLabel,
} from "@/lib/scenario-tasks";
import type {
  ApiErrorResponse,
  GenerateOutfitTaskSnapshot,
  OutfitGeneration,
  OutfitRecordListSummary,
  OutfitRecordStatusFilter,
} from "@/types/outfit";

const emptySummary: OutfitRecordListSummary = {
  all: 0,
  running: 0,
  succeeded: 0,
  failed: 0,
};

const statusTabs: Array<{
  label: string;
  value: OutfitRecordStatusFilter;
}> = [
  { label: "全部", value: "all" },
  { label: "进行中", value: "running" },
  { label: "已完成", value: "succeeded" },
  { label: "失败", value: "failed" },
];

interface HistoryPageProps {
  initialStatus?: OutfitRecordStatusFilter;
}

export function HistoryPage({ initialStatus = "all" }: HistoryPageProps) {
  const router = useRouter();
  const [generations, setGenerations] = useState<OutfitGeneration[]>([]);
  const [summary, setSummary] = useState<OutfitRecordListSummary>(emptySummary);
  const [status, setStatus] = useState<OutfitRecordStatusFilter>(initialStatus);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<OutfitGeneration | null>(null);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [activeTaskRefreshTick, setActiveTaskRefreshTick] = useState(0);
  const hasLoadedRecordsRef = useRef(false);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    if (!readActiveGenerationTasks().length) return;

    const timer = window.setInterval(() => {
      setActiveTaskRefreshTick((current) => current + 1);
      if (!readActiveGenerationTasks().length) {
        window.clearInterval(timer);
      }
    }, 2200);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      const requestSeq = requestSeqRef.current + 1;
      requestSeqRef.current = requestSeq;
      const showInitialSkeleton = !hasLoadedRecordsRef.current;
      setLoading(showInitialSkeleton);
      setRefreshing(!showInitialSkeleton);
      try {
        const response = await listOutfitRecords({
          keyword: keyword.trim(),
          status,
        });
        const mergedRecords = await mergeActiveGenerationTask(
          response.items,
          response.summary,
          keyword,
          status,
        );
        if (!cancelled && requestSeq === requestSeqRef.current) {
          setGenerations(mergedRecords.items);
          setSummary(mergedRecords.summary);
          setError("");
        }
      } catch (caughtError) {
        const runningRecords = await mergeActiveGenerationTask(
          [],
          emptySummary,
          keyword,
          status,
        );
        if (!cancelled && requestSeq === requestSeqRef.current) {
          setGenerations(runningRecords.items);
          setSummary(runningRecords.summary);
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "AI 衣橱读取失败，请稍后重试。",
          );
        }
      } finally {
        if (!cancelled && requestSeq === requestSeqRef.current) {
          hasLoadedRecordsRef.current = true;
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    const timer = window.setTimeout(() => {
      void loadRecords();
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTaskRefreshTick, keyword, status]);

  const visibleTitle = useMemo(() => {
    if (status === "all") return "全部 AI 衣橱";
    return (
      statusTabs.find((item) => item.value === status)?.label || "AI 衣橱"
    );
  }, [status]);

  async function removeGeneration(id: string) {
    setError("");
    setDeletingId(id);
    try {
      await deleteOutfitRecord(id);
      setGenerations((current) =>
        current.filter((generation) => generation.id !== id),
      );
      setSummary((current) => ({
        ...current,
        all: Math.max(0, current.all - 1),
        succeeded: Math.max(0, current.succeeded - 1),
      }));
      setPendingDelete(null);
      return true;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "AI 衣橱删除失败。",
      );
      return false;
    } finally {
      setDeletingId("");
    }
  }

  return (
    <section className="record-screen">
      <div className="record-ribbon record-ribbon-a" aria-hidden="true" />
      <div className="record-ribbon record-ribbon-b" aria-hidden="true" />

      <header className="record-header">
        <button
          type="button"
          aria-label="返回首页"
          onClick={() => router.push("/")}
        >
          <ChevronLeft size={25} />
        </button>
        <h1>AI 衣橱</h1>
        <button
          className="record-filter-button"
          type="button"
          aria-label="筛选"
        >
          <Filter size={20} />
          <span>筛选</span>
        </button>
      </header>

      <label className="record-search">
        <Search size={22} />
        <input
          value={keyword}
          placeholder="搜索任务名称 / 模板 / 备注"
          onChange={(event) => setKeyword(event.target.value)}
        />
      </label>

      <div
        className={`record-tabs status-${status}`}
        role="tablist"
        aria-label="AI 衣橱状态"
      >
        {statusTabs.map((item) => (
          <button
            key={item.value}
            className={status === item.value ? "is-active" : undefined}
            type="button"
            role="tab"
            aria-selected={status === item.value}
            onClick={() => setStatus(item.value)}
          >
            <span className="record-tab-label">{item.label}</span>
            <span className="record-tab-count">{summary[item.value]}</span>
          </button>
        ))}
      </div>

      {error ? <div className="record-error">{error}</div> : null}

      <div
        className="record-list"
        aria-busy={loading || refreshing}
        aria-label={visibleTitle}
      >
        {loading && generations.length === 0 ? (
          <RecordSkeleton />
        ) : !loading && generations.length === 0 ? (
          <RecordEmpty title={visibleTitle} />
        ) : (
          generations.map((generation) => (
            <RecordTaskCard
              generation={generation}
              key={generation.id}
              onDelete={() => setPendingDelete(generation)}
              onDetail={() => {
                if (generation.recordStatus === "running") {
                  const source = generation.source === "photo" ? "photo" : "keyword";
                  router.push(
                    `/?screen=${source}&taskId=${encodeURIComponent(generation.taskId || generation.id)}`,
                  );
                  return;
                }
                router.push(`/history/${generation.id}`);
              }}
              onRegenerate={() => router.push(buildRegenerateHref(generation))}
            />
          ))
        )}
      </div>

      <DeleteConfirmDialog
        description={
          pendingDelete
            ? `即将删除「${pendingDelete.outfitTitle}」，删除后 AI 衣橱中将不再展示这套穿搭。`
            : undefined
        }
        loading={Boolean(pendingDelete && deletingId === pendingDelete.id)}
        open={Boolean(pendingDelete)}
        onCancel={() => {
          if (!deletingId) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (pendingDelete) void removeGeneration(pendingDelete.id);
        }}
      />
    </section>
  );
}

async function mergeActiveGenerationTask(
  items: OutfitGeneration[],
  summary: OutfitRecordListSummary,
  keyword: string,
  status: OutfitRecordStatusFilter,
) {
  const activeTasks = readActiveGenerationTasks();
  if (!activeTasks.length) return { items, summary };

  const runningRecords = (
    await Promise.all(
      activeTasks.map(async (activeTask) => {
        const task = await readActiveTaskSnapshot(activeTask.taskId);
        if (!task || (task.status !== "queued" && task.status !== "running")) {
          return null;
        }

        const exists = items.some(
          (item) =>
            item.taskId === activeTask.taskId || item.id === activeTask.taskId,
        );
        if (exists) return null;

        return buildRunningRecord(activeTask, task);
      }),
    )
  ).filter((record): record is OutfitGeneration => Boolean(record));

  if (!runningRecords.length) {
    return { items, summary };
  }

  const nextSummary = {
    ...summary,
    all: summary.all + runningRecords.length,
    running: summary.running + runningRecords.length,
  };
  const shouldShowInCurrentTab = status === "all" || status === "running";
  const visibleRunningRecords = filterRecords(runningRecords, keyword, "all");

  return {
    items: shouldShowInCurrentTab && visibleRunningRecords.length
      ? [...visibleRunningRecords, ...items]
      : items,
    summary: nextSummary,
  };
}

async function readActiveTaskSnapshot(taskId: string) {
  try {
    const response = await fetch(outfitApiEndpoints.generationTask(taskId), {
      cache: "no-store",
    });
    const payload = (await response.json()) as GenerateOutfitTaskSnapshot | ApiErrorResponse;
    if (!response.ok || "error" in payload) return null;

    return payload;
  } catch {
    return null;
  }
}

function buildRunningRecord(
  activeTask: ActiveGenerationTask,
  task: GenerateOutfitTaskSnapshot,
): OutfitGeneration {
  const input = activeTask.input || {};
  const generationCount = normalizeRunningCount(input.generationCount);

  return {
    id: activeTask.taskId,
    taskId: activeTask.taskId,
    source: activeTask.source,
    recordStatus: "running",
    totalCount: generationCount,
    successCount: 0,
    failedCount: 0,
    season: input.season || "不限",
    temperature: typeof input.temperature === "number" ? input.temperature : 22,
    weather: input.weather || "不限",
    location: input.location || "生成中",
    occasion: input.occasion || "生成中",
    style: input.style || "AI 穿搭",
    colorPreference: input.colorPreference,
    genderPreference: input.genderPreference,
    imageModel: input.imageModel,
    recommendationContext: input.recommendationContext,
    photoMode: input.photoMode,
    outfitTitle: activeTask.source === "photo" ? "照片换搭生成中" : "图片生成中",
    summary: task.message || `正在并发生成 ${generationCount} 套穿搭图片。`,
    styleTags: ["生成中"],
    temperatureAdvice: "生成完成后会更新天气和体感建议。",
    occasionReason: "任务正在执行，完成后会保存到 AI 衣橱。",
    items: [],
    imagePrompt: "",
    imageUrl: "",
    userPhotoUsed: activeTask.source === "photo",
    createdAt: activeTask.createdAt || task.createdAt,
  };
}

function normalizeRunningCount(value: unknown) {
  const count = Number(value);
  if (!Number.isFinite(count)) return 1;

  return Math.max(1, Math.trunc(count));
}

function RecordTaskCard({
  generation,
  onDelete,
  onDetail,
  onRegenerate,
}: {
  generation: OutfitGeneration;
  onDelete: () => void;
  onDetail: () => void;
  onRegenerate: () => void;
}) {
  const status = generation.recordStatus || "succeeded";
  const isRunning = status === "running";
  const isFailed = status === "failed";
  const resultStack = buildRecordPreviewStack({
    imageUrl: generation.imageUrl,
    recordStatus: status,
    failedCount: generation.failedCount,
    successCount: generation.successCount,
    totalCount: generation.totalCount,
  });
  const previewImage =
    status === "succeeded" && generation.imageUrl
      ? resolveBackendAssetUrl(generation.imageUrl)
      : isPhotoGeneration(generation) && generation.userPhotoUrl
        ? resolveBackendAssetUrl(generation.userPhotoUrl)
        : "";
  const modeLabel = getRecordModeLabel(generation, resultStack.totalCount);
  const actionDetailLabel = isRunning ? "查看进度" : "查看穿搭";
  const durationLabel = formatGenerationDuration(generation.generationDurationMs);

  return (
    <article className={`record-task-card record-history-card is-${status}`}>
      <div
        className={`record-history-thumb ${
          previewImage ? "" : "is-empty"
        } ${isRunning ? "is-running" : ""}`}
      >
        {previewImage ? (
          <Image
            src={previewImage}
            alt={generation.outfitTitle}
            width={132}
            height={132}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="record-history-thumb-empty">
            <ImageIcon size={22} />
          </span>
        )}
        {isRunning ? (
          <span className="record-history-thumb-overlay">
            <LoaderCircle size={18} />
            <b>AI</b>
          </span>
        ) : null}
        {isFailed ? (
          <span className="record-history-thumb-overlay failed">
            <TriangleAlert size={18} />
          </span>
        ) : null}
        {durationLabel ? (
          <span className="record-history-duration">{durationLabel}</span>
        ) : null}
      </div>

      <div className="record-history-main">
        <div className="record-history-head">
          <div className="record-card-title">
            <h2>{generation.outfitTitle}</h2>
            <span>{modeLabel}</span>
          </div>
          {!isRunning ? (
            <button
              className="record-history-more"
              type="button"
              aria-label="删除记录"
              onClick={onDelete}
            >
              <MoreHorizontal size={18} />
            </button>
          ) : null}
        </div>

        <div className="record-history-meta">
          <span>{generation.occasion || "不限场景"}</span>
          <small>{formatRecordTime(generation.createdAt)}</small>
          <StatusBadge status={status} />
        </div>

        {isRunning ? (
          <div className="record-progress-panel">
            <strong>AI 正在为你生成穿搭方案...</strong>
            <span>
              <i />
            </span>
            <small>{generation.summary || "生成完成后会自动保存到生成记录。"}</small>
          </div>
        ) : isFailed ? (
          <p className="record-history-note failed">生成失败，请重试</p>
        ) : (
          <p className="record-history-note">{generation.summary}</p>
        )}

        <div className="record-actions record-history-actions">
          {!isRunning ? (
            <button type="button" onClick={onRegenerate}>
              <RotateCw size={16} />
              {isFailed ? "重新生成" : "再生成"}
            </button>
          ) : null}
          {!isFailed ? (
            <button type="button" onClick={onDetail}>
              <Eye size={16} />
              {actionDetailLabel}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PreviewThumb({
  generation,
  tone,
}: {
  generation: OutfitGeneration;
  tone: "source";
}) {
  const isPhotoSource = isPhotoGeneration(generation);
  const imageSrc = isPhotoSource ? resolveBackendAssetUrl(generation.userPhotoUrl) : "";
  const emptyLabel = isPhotoSource ? "原图未保存" : "文字生成";

  return (
    <div className={`record-thumb ${tone}`}>
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={tone === "source" ? "用户上传原图" : generation.outfitTitle}
          width={150}
          height={190}
          unoptimized
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="record-thumb-empty">
          <ImageIcon size={20} />
          <b>{emptyLabel}</b>
        </span>
      )}
    </div>
  );
}

function getRecordModeLabel(generation: OutfitGeneration, totalCount: number) {
  const isBatch = totalCount > 1;
  if (generation.recommendationContext) {
    return isBatch
      ? `${getRecommendationContextLabel(generation.recommendationContext)}批量`
      : getRecommendationContextLabel(generation.recommendationContext);
  }
  if (generation.photoMode) {
    const label = getPhotoModeLabel(generation.photoMode);
    return isBatch ? `${label}批量` : label;
  }
  if (isPhotoGeneration(generation)) return isBatch ? "照片批量生成" : "照片生成";

  return isBatch ? "批量生成" : "单图生成";
}

function isPhotoGeneration(generation: OutfitGeneration) {
  return (
    generation.source === "photo" ||
    generation.userPhotoUsed === true ||
    Boolean(generation.userPhotoUrl)
  );
}

function ResultStackPreview({
  generation,
  stack,
}: {
  generation: OutfitGeneration;
  stack: RecordPreviewStack;
}) {
  return (
    <div
      className={stack.isBatch ? "record-result-stack is-batch" : "record-result-stack"}
      aria-label={`生成结果，${stack.summaryLabel}`}
    >
      {stack.visibleLayers.map((layer) => (
        <div
          className={`record-stack-layer ${layer.depth} ${
            stack.hasImage ? "" : "is-empty"
          }`}
          key={layer.key}
        >
          {stack.hasImage && layer.depth === "front" ? (
            <Image
              src={resolveBackendAssetUrl(generation.imageUrl)}
              alt={generation.outfitTitle}
              width={150}
              height={190}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : !stack.hasImage && layer.depth === "front" ? (
            <span className="record-stack-empty">
              <ImageIcon size={20} />
              <b>暂无图片</b>
            </span>
          ) : null}
        </div>
      ))}
      <span className="record-stack-count">{stack.totalCount}张</span>
    </div>
  );
}

function StatusBadge({ status }: { status: OutfitGeneration["recordStatus"] }) {
  if (status === "failed")
    return <span className="record-status failed">生成失败</span>;
  if (status === "running")
    return <span className="record-status running">生成中</span>;

  return <span className="record-status succeeded">已生成</span>;
}

function RecordEmpty({ title }: { title: string }) {
  return (
    <section className="record-empty">
      <ImageIcon size={34} />
      <h2>{title}为空</h2>
      <p>保存几套喜欢的 Look 后，这里会形成可搜索、可下载、可再次调搭的 AI 衣橱。</p>
    </section>
  );
}

function RecordSkeleton() {
  return (
    <div className="record-task-card record-skeleton">
      <i />
      <i />
      <i />
    </div>
  );
}

function filterRecords(
  records: OutfitGeneration[],
  keyword: string,
  status: OutfitRecordStatusFilter,
) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  return records.filter((record) => {
    const recordStatus = record.recordStatus || "succeeded";
    if (status !== "all" && recordStatus !== status) return false;
    if (!normalizedKeyword) return true;

    return [
      record.outfitTitle,
      record.summary,
      record.occasion,
      record.style,
      record.photoMode?.label,
      record.taskId,
      record.id,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedKeyword));
  });
}

function buildRegenerateHref(generation: OutfitGeneration) {
  const query = new URLSearchParams({
    autoGenerate: "1",
    screen: "keyword",
    season: generation.season,
    temperature: String(generation.temperature),
    weather: generation.weather,
    location: generation.location,
    occasion: generation.occasion,
    style: generation.style,
  });
  if (generation.colorPreference)
    query.set("colorPreference", generation.colorPreference);
  if (generation.genderPreference)
    query.set("genderPreference", generation.genderPreference);
  appendRecommendationContextParams(query, generation.recommendationContext);

  return `/?${query.toString()}`;
}

function formatRecordTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const todayKey = toDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const dateKey = toDateKey(date);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  if (dateKey === todayKey) return `今天 ${hour}:${minute}`;
  if (dateKey === toDateKey(yesterday)) return `昨天 ${hour}:${minute}`;

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
