"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  BadgeCheck,
  ImagePlus,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  type CSSProperties,
  type PointerEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { outfitApiEndpoints } from "@/lib/api-endpoints";
import {
  type ActiveGenerationTask,
  activeGenerationTaskStoreEvent,
  countCompletedGenerationImages,
  getGenerationTaskElapsedSeconds,
  readStoredActiveGenerationTasks,
  removeActiveGenerationTask,
} from "@/lib/generation-task-state";
import { writeOutfitResultSession } from "@/lib/result-session";
import type {
  ApiErrorResponse,
  GenerateOutfitTaskSnapshot,
} from "@/types/outfit";

type MonitorStatus = "running" | "succeeded" | "failed";
type MonitorItem = {
  task: ActiveGenerationTask;
  snapshot: GenerateOutfitTaskSnapshot | null;
  status: MonitorStatus;
};
type OrbPosition = { x: number; y: number };

const orbPositionStoreKey = "cloudwear.global-generation-orb-position.v1";
const orbWidth = 124;
const orbHeight = 48;
const orbMargin = 12;
const topbarSafeGap = 118;
const bottomNavSafeGap = 104;

function logMonitorTrace(event: string, payload: Record<string, unknown> = {}) {
  console.info("[CloudWear:H5GenerationMonitor]", {
    event,
    ...payload,
    at: new Date().toISOString(),
  });
}

export function GlobalGenerationMonitor() {
  return (
    <Suspense fallback={null}>
      <GlobalGenerationMonitorContent />
    </Suspense>
  );
}

function GlobalGenerationMonitorContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [monitorItems, setMonitorItems] = useState<MonitorItem[]>([]);
  const [dismissedTaskIds, setDismissedTaskIds] = useState<string[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [elapsedTick, setElapsedTick] = useState(0);
  const [orbPosition, setOrbPosition] = useState<OrbPosition | null>(null);
  const dragStateRef = useRef<{
    dragging: boolean;
    origin: OrbPosition;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const liveTaskId =
    typeof window === "undefined"
      ? null
      : new URL(window.location.href).searchParams.get("taskId");
  const isProgressPage =
    pathname === "/" && Boolean(searchParams.get("taskId") || liveTaskId);

  const mergeStoredTasks = useCallback((storedTasks: ActiveGenerationTask[]) => {
    logMonitorTrace("tasks.merge_stored", {
      taskCount: storedTasks.length,
      taskIds: storedTasks.map((task) => task.taskId),
    });
    setMonitorItems((current) => {
      const currentById = new Map(
        current.map((item) => [item.task.taskId, item]),
      );
      const runningItems: MonitorItem[] = storedTasks.map((task) => {
        const existing = currentById.get(task.taskId);
        const status: MonitorStatus =
          existing?.status === "failed" || existing?.status === "succeeded"
            ? existing.status
            : "running";
        return {
          task,
          snapshot: existing?.snapshot || null,
          status,
        };
      });
      const completedItems = current.filter(
        (item) =>
          item.status !== "running" &&
          !storedTasks.some((task) => task.taskId === item.task.taskId),
      );

      return [...runningItems, ...completedItems].slice(0, 8);
    });
  }, []);

  const applyTaskSnapshot = useCallback(
    (
      taskSnapshot: GenerateOutfitTaskSnapshot,
      taskSource: ActiveGenerationTask["source"],
    ) => {
      logMonitorTrace("task.snapshot.apply", {
        progress: taskSnapshot.progress,
        source: taskSource,
        status: taskSnapshot.status,
        taskId: taskSnapshot.taskId,
      });
      setDismissedTaskIds((current) =>
        current.filter((taskId) => taskId !== taskSnapshot.taskId),
      );
      setMonitorItems((current) =>
        current.map((item) =>
          item.task.taskId === taskSnapshot.taskId
            ? {
                ...item,
                task: {
                  ...item.task,
                  createdAt: item.task.createdAt || taskSnapshot.createdAt,
                },
                snapshot: taskSnapshot,
                status:
                  taskSnapshot.status === "failed"
                    ? "failed"
                    : taskSnapshot.status === "succeeded"
                      ? "succeeded"
                      : "running",
              }
            : item,
        ),
      );

      if (
        taskSnapshot.status === "queued" ||
        taskSnapshot.status === "running"
      ) {
        return;
      }

      if (taskSnapshot.status === "succeeded" && taskSnapshot.result) {
        const results = taskSnapshot.results?.length
          ? taskSnapshot.results
          : [taskSnapshot.result];
        countCompletedGenerationImages(taskSnapshot.result, results);
        removeActiveGenerationTask(taskSnapshot.taskId);
        writeOutfitResultSession({
          taskId: taskSnapshot.taskId,
          source: taskSource,
          createdAt: new Date().toISOString(),
          results,
        });
        logMonitorTrace("task.succeeded", {
          resultCount: results.length,
          source: taskSource,
          taskId: taskSnapshot.taskId,
        });
        return;
      }

      if (taskSnapshot.status === "failed") {
        logMonitorTrace("task.failed", {
          error: taskSnapshot.error,
          source: taskSource,
          taskId: taskSnapshot.taskId,
        });
        removeActiveGenerationTask(taskSnapshot.taskId);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function restoreTask(task: ActiveGenerationTask) {
      try {
        logMonitorTrace("task.restore.start", {
          source: task.source,
          taskId: task.taskId,
        });
        const response = await fetch(
          outfitApiEndpoints.generationTask(task.taskId),
          { cache: "no-store" },
        );
        const payload = (await response.json()) as
          | GenerateOutfitTaskSnapshot
          | ApiErrorResponse;

        if (!response.ok) {
          throw new Error(
            "error" in payload ? payload.error : "生成任务恢复失败。",
          );
        }
        logMonitorTrace("task.restore.response", {
          httpStatus: response.status,
          source: task.source,
          status: (payload as GenerateOutfitTaskSnapshot).status,
          taskId: task.taskId,
        });

        if (!cancelled) {
          applyTaskSnapshot(payload as GenerateOutfitTaskSnapshot, task.source);
        }
      } catch (caughtError) {
        if (cancelled) return;

        logMonitorTrace("task.restore.failed", {
          error:
            caughtError instanceof Error
              ? caughtError.message
              : "生成任务恢复失败。",
          source: task.source,
          taskId: task.taskId,
        });
        applyTaskSnapshot(
          {
            taskId: task.taskId,
            status: "failed",
            progress: 100,
            message:
              caughtError instanceof Error
                ? caughtError.message
                : "生成任务恢复失败。",
            error:
              caughtError instanceof Error
                ? caughtError.message
                : "生成任务恢复失败。",
            createdAt: task.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          task.source,
        );
        removeActiveGenerationTask(task.taskId);
      }
    }

    function refreshStoredTasks() {
      const storedTasks = readStoredActiveGenerationTasks();
      mergeStoredTasks(storedTasks);
      storedTasks.forEach((task) => void restoreTask(task));
    }

    refreshStoredTasks();

    window.addEventListener(activeGenerationTaskStoreEvent, refreshStoredTasks);
    window.addEventListener("storage", refreshStoredTasks);

    return () => {
      cancelled = true;
      window.removeEventListener(activeGenerationTaskStoreEvent, refreshStoredTasks);
      window.removeEventListener("storage", refreshStoredTasks);
    };
  }, [applyTaskSnapshot, mergeStoredTasks]);

  const runningItems = useMemo(
    () => monitorItems.filter((item) => item.status === "running"),
    [monitorItems],
  );
  const runningTaskKey = runningItems.map((item) => item.task.taskId).join("|");

  useEffect(() => {
    if (!runningTaskKey) return;

    const runningTasks = readStoredActiveGenerationTasks().filter((task) =>
      runningTaskKey.split("|").includes(task.taskId),
    );
    const eventSources = runningTasks.map((task) => {
      logMonitorTrace("task.sse.open", {
        source: task.source,
        taskId: task.taskId,
      });
      const eventSource = new EventSource(
        outfitApiEndpoints.generationEvents(task.taskId),
      );

      function handleStatus(event: MessageEvent<string>) {
        const taskSnapshot = JSON.parse(event.data) as GenerateOutfitTaskSnapshot;
        logMonitorTrace("task.sse.status", {
          progress: taskSnapshot.progress,
          source: task.source,
          status: taskSnapshot.status,
          taskId: taskSnapshot.taskId,
        });
        applyTaskSnapshot(taskSnapshot, task.source);
      }

      eventSource.addEventListener("status", handleStatus);
      return { eventSource, handleStatus, task };
    });

    return () => {
      eventSources.forEach(({ eventSource, handleStatus, task }) => {
        eventSource.removeEventListener("status", handleStatus);
        eventSource.close();
        logMonitorTrace("task.sse.close", {
          source: task.source,
          taskId: task.taskId,
        });
      });
    };
  }, [applyTaskSnapshot, runningTaskKey]);

  const visibleItems = monitorItems.filter(
    (item) => !dismissedTaskIds.includes(item.task.taskId),
  );
  const runningVisibleItems = visibleItems.filter(
    (item) => item.status === "running",
  );
  const monitorTone = visibleItems.some((item) => item.status === "failed")
    ? "danger"
    : visibleItems.some((item) => item.status === "running")
      ? "running"
      : "success";

  useEffect(() => {
    if (!runningVisibleItems.length) return;

    const timer = window.setInterval(() => {
      setElapsedTick((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [runningVisibleItems.length]);

  useEffect(() => {
    function syncOrbPosition() {
      setOrbPosition((current) =>
        clampOrbPosition(current || readStoredOrbPosition() || getDefaultOrbPosition()),
      );
    }

    syncOrbPosition();
    window.addEventListener("resize", syncOrbPosition);

    return () => window.removeEventListener("resize", syncOrbPosition);
  }, []);

  if (!visibleItems.length || isProgressPage) return null;

  const panelVisible = panelOpen && visibleItems.length > 0;
  const activeOrbPosition = orbPosition || getDefaultOrbPosition();
  const primaryVisibleItem = runningVisibleItems[0] || visibleItems[0];
  const primaryElapsedSeconds = getGenerationTaskElapsedSeconds(
    primaryVisibleItem.task.createdAt || primaryVisibleItem.snapshot?.createdAt,
  );
  const primaryProgress = Math.min(
    100,
    Math.max(
      0,
      primaryVisibleItem.snapshot?.progress ||
        (primaryVisibleItem.status === "running" ? 8 : 100),
    ),
  );
  const orbCount = runningVisibleItems.length || visibleItems.length;
  const orbTitle = runningVisibleItems.length ? "生成中" : "新结果";
  const orbMeta = runningVisibleItems.length
    ? `${primaryProgress}% · ${formatMonitorElapsedTime(primaryElapsedSeconds)}`
    : "有新结果";
  const panelAlignClass =
    activeOrbPosition.x + orbWidth / 2 < window.innerWidth / 2
      ? "align-left"
      : "align-right";
  const panelDirectionClass =
    activeOrbPosition.y + orbHeight / 2 > window.innerHeight / 2
      ? "panel-up"
      : "panel-down";

  function handleOrbPointerDown(event: PointerEvent<HTMLButtonElement>) {
    const origin = orbPosition || getDefaultOrbPosition();
    dragStateRef.current = {
      dragging: false,
      origin,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleOrbPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    if (!dragState.dragging && Math.hypot(deltaX, deltaY) < 4) return;

    dragState.dragging = true;
    setPanelOpen(false);
    setOrbPosition(
      clampOrbPosition({
        x: dragState.origin.x + deltaX,
        y: dragState.origin.y + deltaY,
      }),
    );
  }

  function handleOrbPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
    dragStateRef.current = null;

    if (dragState.dragging) {
      const nextPosition = clampOrbPosition({
        x: dragState.origin.x + event.clientX - dragState.startX,
        y: dragState.origin.y + event.clientY - dragState.startY,
      });
      setOrbPosition(nextPosition);
      writeStoredOrbPosition(nextPosition);
      return;
    }

    setPanelOpen((current) => !current);
  }

  return (
    <aside
      className={`cw-global-generation ${monitorTone} ${panelVisible ? "is-open" : ""} ${panelAlignClass} ${panelDirectionClass}`}
      aria-label="生图任务进度"
      style={{ left: activeOrbPosition.x, top: activeOrbPosition.y }}
    >
      <button
        aria-expanded={panelVisible}
        className="cw-global-generation-orb"
        type="button"
        onPointerCancel={() => {
          dragStateRef.current = null;
        }}
        onPointerDown={handleOrbPointerDown}
        onPointerMove={handleOrbPointerMove}
        onPointerUp={handleOrbPointerUp}
        style={
          {
            "--cw-global-progress": `${primaryProgress}%`,
          } as CSSProperties
        }
      >
        <span className="cw-global-generation-orb-mark" aria-hidden="true">
          <ImagePlus size={16} />
        </span>
        <span className="cw-global-generation-orb-copy">
          <strong>{orbTitle}</strong>
          <small>{orbMeta}</small>
        </span>
        <b>{orbCount}</b>
      </button>
      {panelVisible ? (
        <div className="cw-global-generation-panel">
          <div className="cw-global-generation-panel-head">
            <span>后台生成</span>
            <strong>
              {runningVisibleItems.length
                ? `${runningVisibleItems.length} 个进度`
                : `${visibleItems.length} 条更新`}
            </strong>
          </div>
          <div className="cw-global-generation-list">
            {visibleItems.map((item) => (
              <MonitorRow
                elapsedTick={elapsedTick}
                item={item}
                key={item.task.taskId}
                onDismiss={() =>
                  setDismissedTaskIds((current) => [
                    ...current,
                    item.task.taskId,
                  ])
                }
              />
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function MonitorRow({
  elapsedTick,
  item,
  onDismiss,
}: {
  elapsedTick: number;
  item: MonitorItem;
  onDismiss: () => void;
}) {
  void elapsedTick;
  const normalizedProgress = Math.min(
    100,
    Math.max(0, item.snapshot?.progress || (item.status === "running" ? 8 : 100)),
  );
  const copy = getMonitorCopy(item);
  const startedAt = item.task.createdAt || item.snapshot?.createdAt;
  const elapsedSeconds = getGenerationTaskElapsedSeconds(startedAt);
  const elapsedLabel = formatMonitorElapsedTime(elapsedSeconds);

  return (
    <div className={`cw-global-generation-row ${item.status}`}>
      <div className="cw-global-generation-icon">{copy.icon}</div>
      <div className="cw-global-generation-copy">
        <strong>{copy.title}</strong>
        <span>{copy.message}</span>
        <small>
          {item.status === "running"
            ? `已生成 ${elapsedLabel} · ${normalizedProgress}%`
            : item.status === "succeeded"
              ? "生成完成"
              : "生成失败"}
        </small>
      </div>
      {item.status === "succeeded" ? (
        <Link href="/result" onClick={() => writeMonitorResultSession(item)}>
          查看
        </Link>
      ) : item.status === "running" ? (
        <Link
          href={`/?screen=${item.task.source}&taskId=${encodeURIComponent(
            item.task.taskId,
          )}`}
        >
          进度
        </Link>
      ) : (
        <button type="button" onClick={onDismiss} aria-label="关闭生成提示">
          <Sparkles size={15} />
        </button>
      )}
    </div>
  );
}

function getMonitorCopy(item: MonitorItem) {
  if (item.status === "succeeded") {
    return {
      icon: <BadgeCheck size={17} />,
      title: item.task.source === "photo" ? "照片换搭完成" : "图片生成完成",
      message: item.snapshot?.message || "你的穿搭图片已经生成好了。",
    };
  }

  if (item.status === "failed") {
    return {
      icon: <AlertCircle size={17} />,
      title: "生成没有完成",
      message: item.snapshot?.error || item.snapshot?.message || "请稍后重新生成。",
    };
  }

  return {
    icon: <Loader2 size={17} />,
    title: item.task.source === "photo" ? "照片换搭生成中" : "关键词生成中",
    message: item.snapshot?.message || "页面可以刷新或切换，任务会继续执行。",
  };
}

function formatMonitorElapsedTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
}

function getDefaultOrbPosition(): OrbPosition {
  if (typeof window === "undefined") return { x: 320, y: 560 };

  const phoneRightInset = Math.max(
    orbMargin,
    (window.innerWidth - 430) / 2 + orbMargin,
  );

  return clampOrbPosition({
    x: window.innerWidth - phoneRightInset - orbWidth,
    y: window.innerHeight - bottomNavSafeGap - orbHeight,
  });
}

function clampOrbPosition(position: OrbPosition): OrbPosition {
  if (typeof window === "undefined") return position;

  const maxX = Math.max(orbMargin, window.innerWidth - orbWidth - orbMargin);
  const minY = Math.min(
    topbarSafeGap,
    Math.max(orbMargin, window.innerHeight - orbHeight - orbMargin),
  );
  const maxY = Math.max(minY, window.innerHeight - orbHeight - orbMargin);

  return {
    x: Math.min(maxX, Math.max(orbMargin, position.x)),
    y: Math.min(maxY, Math.max(minY, position.y)),
  };
}

function readStoredOrbPosition(): OrbPosition | null {
  if (typeof window === "undefined") return null;

  try {
    const parsedValue = JSON.parse(
      window.localStorage.getItem(orbPositionStoreKey) || "",
    ) as Partial<OrbPosition>;

    if (
      typeof parsedValue.x !== "number" ||
      typeof parsedValue.y !== "number"
    ) {
      return null;
    }

    return parsedValue as OrbPosition;
  } catch {
    return null;
  }
}

function writeStoredOrbPosition(position: OrbPosition) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(orbPositionStoreKey, JSON.stringify(position));
}

function writeMonitorResultSession(item: MonitorItem) {
  if (!item.snapshot?.result) return;

  const results = item.snapshot.results?.length
    ? item.snapshot.results
    : [item.snapshot.result];

  writeOutfitResultSession({
    taskId: item.snapshot.taskId,
    source: item.task.source,
    createdAt: new Date().toISOString(),
    results,
  });
}
