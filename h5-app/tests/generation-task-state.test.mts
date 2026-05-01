import assert from "node:assert/strict";
import test from "node:test";
import * as generationTaskState from "../src/lib/generation-task-state.ts";

const generationTaskStateModule = generationTaskState as typeof generationTaskState & {
  readActiveGenerationTasks: typeof generationTaskState.readActiveGenerationTask;
  readStoredActiveGenerationTasks: typeof generationTaskState.readStoredActiveGenerationTask;
  removeActiveGenerationTask: (taskId: string) => void;
};
const {
  clearActiveGenerationTask,
  readActiveGenerationTask,
  readActiveGenerationTasks,
  readStoredActiveGenerationTasks,
  removeActiveGenerationTask,
  writeActiveGenerationTask,
} = generationTaskStateModule;

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

function installWindow(url = "https://h5.cloudwear.local/?screen=photo") {
  const localStorage = new MemoryStorage();
  const history = {
    replacedUrl: "",
    replaceState(_state: unknown, _title: string, nextUrl: string) {
      this.replacedUrl = nextUrl;
    },
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage,
      location: new URL(url),
      history,
      dispatchEvent() {},
    },
  });

  return { history, localStorage };
}

test("active generation tasks keep multiple background tasks without forcing progress url", () => {
  const { history } = installWindow();

  writeActiveGenerationTask(
    { taskId: "task-1", source: "photo", createdAt: "2026-05-01T08:00:00.000Z" },
    { syncUrl: false },
  );
  writeActiveGenerationTask(
    { taskId: "task-2", source: "keyword", createdAt: "2026-05-01T08:01:00.000Z" },
    { syncUrl: false },
  );

  assert.deepEqual(
    readStoredActiveGenerationTasks().map((task) => task.taskId),
    ["task-2", "task-1"],
  );
  assert.equal(readActiveGenerationTask()?.taskId, "task-2");
  assert.equal(history.replacedUrl, "");
});

test("task id in the url selects the progress task and preserves its source", () => {
  installWindow("https://h5.cloudwear.local/?screen=photo&taskId=task-1");
  writeActiveGenerationTask(
    { taskId: "task-1", source: "photo", createdAt: "2026-05-01T08:00:00.000Z" },
    { syncUrl: false },
  );
  writeActiveGenerationTask(
    { taskId: "task-2", source: "keyword", createdAt: "2026-05-01T08:01:00.000Z" },
    { syncUrl: false },
  );

  assert.deepEqual(
    readActiveGenerationTasks().map((task) => `${task.taskId}:${task.source}`),
    ["task-1:photo", "task-2:keyword"],
  );
  assert.deepEqual(readActiveGenerationTask(), {
    taskId: "task-1",
    source: "photo",
    createdAt: "2026-05-01T08:00:00.000Z",
    input: undefined,
  });
});

test("removing one active generation task keeps the other task available", () => {
  installWindow("https://h5.cloudwear.local/?screen=photo&taskId=task-1");
  writeActiveGenerationTask({ taskId: "task-1", source: "photo" }, { syncUrl: false });
  writeActiveGenerationTask({ taskId: "task-2", source: "keyword" }, { syncUrl: false });

  removeActiveGenerationTask("task-1");

  assert.deepEqual(
    readStoredActiveGenerationTasks().map((task) => task.taskId),
    ["task-2"],
  );

  clearActiveGenerationTask();
  assert.deepEqual(readStoredActiveGenerationTasks(), []);
});
