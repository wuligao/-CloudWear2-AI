"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AlertCircle, BadgeCheck, Loader2, Sparkles } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { outfitApiEndpoints } from "@/lib/api-endpoints";
import {
  type ActiveGenerationTask,
  activeGenerationTaskStoreEvent,
  countCompletedGenerationImages,
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
  const isProgressPage = pathname === "/" && Boolean(searchParams.get("taskId"));

  const mergeStoredTasks = useCallback((storedTasks: ActiveGenerationTask[]) => {
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
      setDismissedTaskIds((current) =>
        current.filter((taskId) => taskId !== taskSnapshot.taskId),
      );
      setMonitorItems((current) =>
        current.map((item) =>
          item.task.taskId === taskSnapshot.taskId
            ? {
                ...item,
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
        return;
      }

      if (taskSnapshot.status === "failed") {
        removeActiveGenerationTask(taskSnapshot.taskId);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function restoreTask(task: ActiveGenerationTask) {
      try {
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

        if (!cancelled) {
          applyTaskSnapshot(payload as GenerateOutfitTaskSnapshot, task.source);
        }
      } catch (caughtError) {
        if (cancelled) return;

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
      const eventSource = new EventSource(
        outfitApiEndpoints.generationEvents(task.taskId),
      );

      function handleStatus(event: MessageEvent<string>) {
        applyTaskSnapshot(
          JSON.parse(event.data) as GenerateOutfitTaskSnapshot,
          task.source,
        );
      }

      eventSource.addEventListener("status", handleStatus);
      return { eventSource, handleStatus };
    });

    return () => {
      eventSources.forEach(({ eventSource, handleStatus }) => {
        eventSource.removeEventListener("status", handleStatus);
        eventSource.close();
      });
    };
  }, [applyTaskSnapshot, runningTaskKey]);

  const visibleItems = monitorItems.filter(
    (item) => !dismissedTaskIds.includes(item.task.taskId),
  );
  const monitorTone = visibleItems.some((item) => item.status === "failed")
    ? "danger"
    : visibleItems.some((item) => item.status === "running")
      ? "running"
      : "success";

  if (!visibleItems.length || isProgressPage) return null;

  return (
    <aside className={`cw-global-generation ${monitorTone} is-list`} aria-label="生图任务进度">
      {visibleItems.map((item) => (
        <MonitorRow
          item={item}
          key={item.task.taskId}
          onDismiss={() =>
            setDismissedTaskIds((current) => [...current, item.task.taskId])
          }
        />
      ))}
    </aside>
  );
}

function MonitorRow({
  item,
  onDismiss,
}: {
  item: MonitorItem;
  onDismiss: () => void;
}) {
  const normalizedProgress = Math.min(
    100,
    Math.max(0, item.snapshot?.progress || (item.status === "running" ? 8 : 100)),
  );
  const copy = getMonitorCopy(item);

  return (
    <div className={`cw-global-generation-row ${item.status}`}>
      <div className="cw-global-generation-icon">{copy.icon}</div>
      <div className="cw-global-generation-copy">
        <strong>{copy.title}</strong>
        <span>{copy.message}</span>
        {item.status === "running" ? (
          <i>
            <em style={{ width: `${normalizedProgress}%` }} />
          </i>
        ) : null}
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
