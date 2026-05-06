import assert from "node:assert/strict";
import test from "node:test";
import * as auth from "./auth.ts";

const authModule = (
  "normalizeLoginPhone" in auth ? auth : (auth as unknown as { default: typeof auth }).default
) as typeof auth;
const {
  clearH5AuthSession,
  getH5AuthHeader,
  guestLoginH5User,
  logoutH5User,
  normalizeH5RedirectPath,
  normalizeLoginPhone,
  readH5AuthSession,
  updateH5Profile,
  uploadH5Avatar,
  writeH5AuthSession,
} = authModule;

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

test("normalizeLoginPhone strips spaces and keeps an 11 digit phone", () => {
  assert.equal(normalizeLoginPhone(" 138 0013 8000 "), "13800138000");
})

test("normalizeH5RedirectPath only allows internal app paths", () => {
  assert.equal(normalizeH5RedirectPath("/history?status=succeeded"), "/history?status=succeeded");
  assert.equal(normalizeH5RedirectPath("https://example.com/login"), "/");
  assert.equal(normalizeH5RedirectPath("//example.com/login"), "/");
  assert.equal(normalizeH5RedirectPath("javascript:alert(1)"), "/");
})

test("auth session can be saved, read and converted to a bearer header", () => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: new MemoryStorage(),
      sessionStorage: new MemoryStorage(),
      dispatchEvent() {},
    },
  });

  writeH5AuthSession({
    token: "jwt-token",
    expiresIn: 720,
    user: {
      userId: 1,
      userName: "13800138000",
      phone: "13800138000",
      nickName: "云裳用户8000",
    },
  });

  assert.deepEqual(readH5AuthSession()?.user.phone, "13800138000");
  assert.deepEqual(getH5AuthHeader(), { Authorization: "Bearer jwt-token" });

  clearH5AuthSession();
  assert.equal(readH5AuthSession(), null);
})

test("expired auth sessions are ignored and removed", () => {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage,
      sessionStorage,
      dispatchEvent() {},
    },
  });

  localStorage.setItem(
    "cloudwear.h5-auth-session.v1",
    JSON.stringify({
      token: "expired-token",
      expiresIn: 720,
      expiresAt: Date.now() - 1000,
      user: {
        userId: 1,
        userName: "13800138000",
        phone: "13800138000",
        nickName: "云裳用户8000",
      },
    }),
  );

  assert.equal(readH5AuthSession(), null);
  assert.equal(localStorage.getItem("cloudwear.h5-auth-session.v1"), null);
})

test("legacy auth sessions without expiresAt are ignored", () => {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage,
      sessionStorage,
      dispatchEvent() {},
    },
  });

  localStorage.setItem(
    "cloudwear.h5-auth-session.v1",
    JSON.stringify({
      token: "legacy-token",
      expiresIn: 720,
      user: {
        userId: 1,
        userName: "13800138000",
        phone: "13800138000",
        nickName: "云裳用户8000",
      },
    }),
  );

  assert.equal(readH5AuthSession(), null);
  assert.equal(localStorage.getItem("cloudwear.h5-auth-session.v1"), null);
})

test("logout clears local auth session even when the server rejects the token", async () => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: new MemoryStorage(),
      sessionStorage: new MemoryStorage(),
      dispatchEvent() {},
    },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => ({
      ok: false,
      async json() {
        return { code: 401, message: "登录已过期，请重新登录" };
      },
    }),
  });

  writeH5AuthSession({
    token: "expired-token",
    expiresIn: 720,
    user: {
      userId: 1,
      userName: "13800138000",
      phone: "13800138000",
      nickName: "云裳用户8000",
    },
  });

  await assert.rejects(
    () => logoutH5User(),
    /登录已过期，请重新登录/,
  );
  assert.equal(readH5AuthSession(), null);
})

test("logout clears local H5 account data", async () => {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage,
      sessionStorage,
      location: new URL("https://h5.cloudwear.local/history?taskId=task-1&autoGenerate=1"),
      history: {
        replacedUrl: "",
        replaceState(_state: unknown, _title: string, url: string) {
          this.replacedUrl = url;
        },
      },
      dispatchEvent() {},
    },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => ({
      ok: true,
      async json() {
        return { code: 200, data: null };
      },
    }),
  });

  writeH5AuthSession({
    token: "jwt-token",
    expiresIn: 720,
    user: {
      userId: 1,
      userName: "13800138000",
      phone: "13800138000",
      nickName: "云裳用户8000",
    },
  });
  localStorage.setItem("cloudwear.generations.v1", "[]");
  localStorage.setItem("cloudwear.profile.v1", "{}");
  localStorage.setItem("cloudwear.current-result.v1", "{}");
  localStorage.setItem("cloudwear.daily-generation-usage.v1", "{}");
  localStorage.setItem("cloudwear.active-generation-task.v1", "{}");
  localStorage.setItem("cloudwear.counted-generation-ids.v1", "[]");

  await logoutH5User();

  assert.equal(localStorage.getItem("cloudwear.h5-auth-session.v1"), null);
  assert.equal(localStorage.getItem("cloudwear.generations.v1"), null);
  assert.equal(localStorage.getItem("cloudwear.profile.v1"), null);
  assert.equal(localStorage.getItem("cloudwear.current-result.v1"), null);
  assert.equal(localStorage.getItem("cloudwear.daily-generation-usage.v1"), null);
  assert.equal(localStorage.getItem("cloudwear.active-generation-task.v1"), null);
  assert.equal(localStorage.getItem("cloudwear.counted-generation-ids.v1"), null);
  assert.equal(sessionStorage.getItem("cloudwear.h5-auth-session.v1"), null);
  assert.equal(
    (window.history as typeof window.history & { replacedUrl: string }).replacedUrl,
    "/history",
  );
})

test("guest login posts an empty body and stores the returned session", async () => {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  let requestUrl = "";
  let requestInit: RequestInit | undefined;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage,
      sessionStorage,
      dispatchEvent() {},
    },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (url: string, init?: RequestInit) => {
      requestUrl = url;
      requestInit = init;
      return {
        ok: true,
        async json() {
          return {
            code: 200,
            data: {
              token: "guest-token",
              expiresIn: 720,
              user: {
                userId: 8,
                userName: "19000000008",
                phone: "19000000008",
                nickName: "云裳游客0008",
              },
            },
          };
        },
      };
    },
  });

  const session = await guestLoginH5User({ remember: false });

  assert.equal(requestUrl, "http://localhost:9200/api/h5/auth/guest");
  assert.equal(requestInit?.method, "POST");
  assert.deepEqual(requestInit?.headers, { "Content-Type": "application/json" });
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {});
  assert.equal(session.user.nickName, "云裳游客0008");
  assert.equal(localStorage.getItem("cloudwear.h5-auth-session.v1"), null);
  assert.equal(readH5AuthSession()?.token, "guest-token");
})

test("profile updates are sent with bearer auth and refresh the saved user", async () => {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  let requestUrl = "";
  let requestInit: RequestInit | undefined;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage,
      sessionStorage,
      dispatchEvent() {},
    },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (url: string, init?: RequestInit) => {
      requestUrl = url;
      requestInit = init;
      return {
        ok: true,
        async json() {
          return {
            code: 200,
            data: {
              userId: 1,
              userName: "13800138000",
              phone: "13800138000",
              nickName: "新昵称",
              avatar: "/uploads/avatar/new.png",
            },
          };
        },
      };
    },
  });

  writeH5AuthSession({
    token: "jwt-token",
    expiresIn: 720,
    user: {
      userId: 1,
      userName: "13800138000",
      phone: "13800138000",
      nickName: "旧昵称",
    },
  });

  const updatedUser = await updateH5Profile({
    nickName: "新昵称",
    avatar: "/uploads/avatar/new.png",
  });

  assert.equal(requestUrl, "http://localhost:9200/api/h5/auth/me");
  assert.equal(requestInit?.method, "PUT");
  assert.deepEqual(requestInit?.headers, {
    Authorization: "Bearer jwt-token",
    "Content-Type": "application/json",
  });
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    nickName: "新昵称",
    avatar: "/uploads/avatar/new.png",
  });
  assert.equal(updatedUser.nickName, "新昵称");
  assert.equal(readH5AuthSession()?.user.avatar, "/uploads/avatar/new.png");
  assert.equal(sessionStorage.getItem("cloudwear.h5-auth-session.v1"), null);
});

test("avatar upload posts base64 data as json", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: new MemoryStorage(),
      sessionStorage: new MemoryStorage(),
      dispatchEvent() {},
    },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (url: string, init?: RequestInit) => {
      requestUrl = url;
      requestInit = init;
      return {
        ok: true,
        async json() {
          return { code: 200, data: "/uploads/avatar/demo.png" };
        },
      };
    },
  });

  writeH5AuthSession({
    token: "jwt-token",
    expiresIn: 720,
    user: {
      userId: 1,
      userName: "13800138000",
      phone: "13800138000",
      nickName: "云裳用户8000",
    },
  });

  const avatarUrl = await uploadH5Avatar("data:image/png;base64,AAAA");

  assert.equal(requestUrl, "http://localhost:9200/files/upload-base64");
  assert.equal(requestInit?.method, "POST");
  assert.deepEqual(requestInit?.headers, {
    Authorization: "Bearer jwt-token",
    "Content-Type": "application/json",
  });
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    path: "avatar",
    file: "data:image/png;base64,AAAA",
  });
  assert.equal(avatarUrl, "/uploads/avatar/demo.png");
});
