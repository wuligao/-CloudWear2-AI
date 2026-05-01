"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  ImageIcon,
  RotateCw,
  Search,
} from "lucide-react";
import { DeleteConfirmDialog } from "@/components/outfit/delete-confirm-dialog";
import { outfitApiEndpoints, resolveBackendAssetUrl } from "@/lib/api-endpoints";
import {
  type ActiveGenerationTask,
  readActiveGenerationTasks,
} from "@/lib/generation-task-state";
import { deleteOutfitRecord, listOutfitRecords } from "@/lib/outfit-records";
import { buildRecordPreviewStack } from "@/lib/record-preview-stack";
import type { RecordPreviewStack } from "@/lib/record-preview-stack";
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
              : "生成记录读取失败，请稍后重试。",
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
    if (status === "all") return "全部生成记录";
    return (
      statusTabs.find((item) => item.value === status)?.label || "生成记录"
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
          : "生成记录删除失败。",
      );
      return false;
    } finally {
      setDeletingId("");
    }
  }

  function downloadGeneration(generation: OutfitGeneration) {
    const link = document.createElement("a");
    link.href = resolveBackendAssetUrl(generation.imageUrl);
    link.download = `${sanitizeDownloadName(generation.outfitTitle)}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
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
        <h1>生成记录</h1>
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
        aria-label="生成记录状态"
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
                  router.push(`/?taskId=${encodeURIComponent(generation.taskId || generation.id)}`);
                  return;
                }
                router.push(`/history/${generation.id}`);
              }}
              onDownload={() => downloadGeneration(generation)}
              onRegenerate={() => router.push(buildRegenerateHref(generation))}
            />
          ))
        )}
      </div>

      <DeleteConfirmDialog
        description={
          pendingDelete
            ? `即将删除「${pendingDelete.outfitTitle}」，删除后列表中将不再展示这条生成记录。`
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
    outfitTitle: activeTask.source === "photo" ? "照片换搭生成中" : "图片生成中",
    summary: task.message || `正在并发生成 ${generationCount} 套穿搭图片。`,
    styleTags: ["生成中"],
    temperatureAdvice: "生成完成后会更新天气和体感建议。",
    occasionReason: "任务正在执行，完成后会保存到生成记录。",
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
  onDownload,
  onRegenerate,
}: {
  generation: OutfitGeneration;
  onDelete: () => void;
  onDetail: () => void;
  onDownload: () => void;
  onRegenerate: () => void;
}) {
  const status = generation.recordStatus || "succeeded";
  const isRunning = status === "running";
  const isDownloadable = status === "succeeded" && generation.imageUrl;
  const resultStack = buildRecordPreviewStack({
    imageUrl: generation.imageUrl,
    recordStatus: status,
    failedCount: generation.failedCount,
    successCount: generation.successCount,
    totalCount: generation.totalCount,
  });

  return (
    <article className="record-task-card">
      <div className="record-card-top">
        <div className="record-card-title">
          <h2>{generation.outfitTitle}</h2>
          <span>{getRecordModeLabel(generation, resultStack.totalCount)}</span>
        </div>
        <div className="record-card-status">
          <StatusBadge status={status} />
          <button type="button" aria-label="查看详情" onClick={onDetail}>
            <ChevronRight size={19} />
          </button>
        </div>
      </div>

      <div className="record-meta">
        <p>生成时间：{formatRecordTime(generation.createdAt)}</p>
      </div>

      <div className="record-preview-row">
        <PreviewThumb generation={generation} tone="source" />
        <span className="record-arrow">→</span>
        <ResultStackPreview generation={generation} stack={resultStack} />
        <div className="record-count-panel">
          <strong>{resultStack.totalCount}</strong>
          <span>生成数量</span>
          <i />
          <small>
            成功 {resultStack.successCount}
            <b>|</b>
            失败 {resultStack.failedCount}
          </small>
        </div>
      </div>

      <div className="record-actions">
        <button type="button" onClick={onDetail}>
          <Eye size={17} />
          {isRunning ? "查看进度" : "查看详情"}
        </button>
        <button type="button" disabled={isRunning} onClick={onRegenerate}>
          <RotateCw size={17} />
          再次生成
        </button>
        <button
          className="record-download"
          type="button"
          disabled={!isDownloadable}
          onClick={onDownload}
        >
          <Download size={17} />
          下载
        </button>
      </div>

      {isRunning ? null : (
        <button className="record-delete" type="button" onClick={onDelete}>
          删除记录
        </button>
      )}
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
    return <span className="record-status failed">失败</span>;
  if (status === "running")
    return <span className="record-status running">进行中</span>;

  return <span className="record-status succeeded">已完成</span>;
}

function RecordEmpty({ title }: { title: string }) {
  return (
    <section className="record-empty">
      <ImageIcon size={34} />
      <h2>{title}为空</h2>
      <p>生成完成后保存到衣橱，就会在这里形成可搜索、可下载的任务记录。</p>
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
      record.taskId,
      record.id,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedKeyword));
  });
}

function buildRegenerateHref(generation: OutfitGeneration) {
  const query = new URLSearchParams({
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

  return `/?${query.toString()}`;
}

function formatRecordTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function sanitizeDownloadName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "-").slice(0, 40) || "cloudwear-outfit";
}
