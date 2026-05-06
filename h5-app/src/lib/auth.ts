const h5AuthSessionKey = "cloudwear.h5-auth-session.v1";
export const h5AuthSessionCookieName = "cloudwear_h5_auth_session";
const h5AuthChangeEvent = "cloudwear-h5-auth-change";
const h5LoginPath = "/login";
const h5LogoutLocalStorageKeys = [
  h5AuthSessionKey,
  "cloudwear.generations.v1",
  "cloudwear.profile.v1",
  "cloudwear.current-result.v1",
  "cloudwear.daily-generation-usage.v1",
  "cloudwear.active-generation-task.v1",
  "cloudwear.counted-generation-ids.v1",
];
const h5LogoutStorageEvents = [
  h5AuthChangeEvent,
  "cloudwear-generations-change",
  "cloudwear-profile-change",
];

export interface H5AuthUser {
  userId: number;
  userName: string;
  phone: string;
  nickName: string;
  avatar?: string;
}

export interface H5AuthSession {
  token: string;
  expiresIn: number;
  expiresAt: number;
  user: H5AuthUser;
}

type WritableH5AuthSession = Omit<H5AuthSession, "expiresAt"> & {
  expiresAt?: number;
};

interface AjaxResponse<T> {
  code: number;
  message?: string;
  data?: T;
}

type AuthStorageType = "local" | "session";

export function normalizeLoginPhone(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

export function readH5AuthSession(): H5AuthSession | null {
  if (typeof window === "undefined") return null;

  const localSession = readStoredH5AuthSession(window.localStorage);
  if (localSession) return localSession;

  return readStoredH5AuthSession(window.sessionStorage);
}

export function writeH5AuthSession(
  session: WritableH5AuthSession,
  storageType: AuthStorageType = "local",
) {
  if (typeof window === "undefined") return;

  const normalizedSession = normalizeWritableH5AuthSession(session);
  const snapshot = JSON.stringify(normalizedSession);
  if (storageType === "local") {
    window.localStorage.setItem(h5AuthSessionKey, snapshot);
    window.sessionStorage?.removeItem(h5AuthSessionKey);
  } else {
    window.sessionStorage?.setItem(h5AuthSessionKey, snapshot);
    window.localStorage.removeItem(h5AuthSessionKey);
  }
  writeH5AuthSessionCookie(normalizedSession, storageType);
  window.dispatchEvent(new Event(h5AuthChangeEvent));
}

export function updateStoredH5AuthUser(user: H5AuthUser) {
  const session = readH5AuthSession();
  if (!session) return;

  writeH5AuthSession(
    {
      ...session,
      user,
    },
    getH5AuthStorageType(),
  );
}

export function clearH5AuthSession() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(h5AuthSessionKey);
  window.sessionStorage?.removeItem(h5AuthSessionKey);
  clearH5AuthSessionCookie();
  window.dispatchEvent(new Event(h5AuthChangeEvent));
}

function clearH5LogoutState() {
  if (typeof window === "undefined") return;

  h5LogoutLocalStorageKeys.forEach((key) => {
    window.localStorage.removeItem(key);
  });
  window.sessionStorage?.removeItem(h5AuthSessionKey);
  clearH5AuthSessionCookie();
  clearH5LogoutUrlParams();
  h5LogoutStorageEvents.forEach((eventName) => {
    window.dispatchEvent(new Event(eventName));
  });
}

export function subscribeH5AuthSession(onStoreChange: () => void) {
  window.setTimeout(onStoreChange, 0);
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(h5AuthChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(h5AuthChangeEvent, onStoreChange);
  };
}

export function getH5AuthHeader(): Record<string, string> {
  const session = readH5AuthSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

export function buildH5LoginHref(redirectTo?: string) {
  const params = new URLSearchParams({
    notice: "login_required",
  });
  const normalizedRedirect = normalizeH5RedirectPath(
    redirectTo || getCurrentH5Path(),
  );

  if (normalizedRedirect && normalizedRedirect !== h5LoginPath) {
    params.set("redirect", normalizedRedirect);
  }

  return `${h5LoginPath}?${params.toString()}`;
}

export function normalizeH5RedirectPath(value?: string | null) {
  const fallback = "/";
  const rawValue = String(value || "").trim();
  if (!rawValue || !rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return fallback;
  }

  try {
    const parsedUrl = new URL(rawValue, "http://cloudwear.local");
    if (parsedUrl.origin !== "http://cloudwear.local") return fallback;
    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return fallback;
  }
}

export async function loginH5User({
  phone,
  password,
  remember,
}: {
  phone: string;
  password: string;
  remember: boolean;
}) {
  const endpoints = await getOutfitApiEndpoints();
  const session = await postAuth<H5AuthSession>(endpoints.h5AuthLogin(), {
    phone: normalizeLoginPhone(phone),
    password,
  });
  writeH5AuthSession(session, remember ? "local" : "session");
  return session;
}

export async function registerH5User({
  phone,
  password,
  nickName,
  remember,
}: {
  phone: string;
  password: string;
  nickName?: string;
  remember: boolean;
}) {
  const endpoints = await getOutfitApiEndpoints();
  const session = await postAuth<H5AuthSession>(endpoints.h5AuthRegister(), {
    phone: normalizeLoginPhone(phone),
    password,
    nickName,
  });
  writeH5AuthSession(session, remember ? "local" : "session");
  return session;
}

export async function guestLoginH5User({ remember }: { remember: boolean }) {
  const endpoints = await getOutfitApiEndpoints();
  const session = await postAuth<H5AuthSession>(endpoints.h5AuthGuest(), {});
  writeH5AuthSession(session, remember ? "local" : "session");
  return session;
}

export async function fetchH5Profile() {
  const endpoints = await getOutfitApiEndpoints();
  const payload = await requestAuth<H5AuthUser>(endpoints.h5AuthMe(), {
    headers: getH5AuthHeader(),
  });
  return payload;
}

export async function updateH5Profile(profile: {
  nickName?: string;
  avatar?: string;
}) {
  const endpoints = await getOutfitApiEndpoints();
  const user = await requestAuth<H5AuthUser>(endpoints.h5AuthMe(), {
    method: "PUT",
    headers: {
      ...getH5AuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });
  updateStoredH5AuthUser(user);
  return user;
}

export async function uploadH5Avatar(fileDataUrl: string) {
  const endpoints = await getOutfitApiEndpoints();
  return requestAuth<string>(endpoints.h5AvatarUpload(), {
    method: "POST",
    headers: {
      ...getH5AuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: "avatar",
      file: fileDataUrl,
    }),
  });
}

export async function logoutH5User() {
  const endpoints = await getOutfitApiEndpoints();
  try {
    await requestAuth<null>(endpoints.h5AuthLogout(), {
      method: "POST",
      headers: getH5AuthHeader(),
    });
  } finally {
    clearH5LogoutState();
  }
}

async function getOutfitApiEndpoints() {
  try {
    return (await import("./api-endpoints")).outfitApiEndpoints;
  } catch (caughtError) {
    if (isNodeTestModuleResolutionError(caughtError)) {
      const nodeTestApiEndpointsPath = "./api-endpoints.ts";
      return (await import(nodeTestApiEndpointsPath)).outfitApiEndpoints;
    }
    throw caughtError;
  }
}

async function postAuth<T>(url: string, body: Record<string, unknown>) {
  return requestAuth<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function requestAuth<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => null)) as AjaxResponse<T> | null;
  const message = payload?.message || "登录服务暂时不可用。";

  if (!response.ok || !payload || payload.code !== 200) {
    throw new Error(message);
  }

  if (payload.data === undefined) {
    return null as T;
  }

  return payload.data;
}

function parseH5AuthSession(snapshot: string | null): H5AuthSession | null {
  if (!snapshot) return null;

  try {
    const parsedValue = JSON.parse(snapshot) as Partial<H5AuthSession>;
    if (
      !parsedValue ||
      typeof parsedValue.token !== "string" ||
      typeof parsedValue.expiresAt !== "number" ||
      !parsedValue.user ||
      typeof parsedValue.user.phone !== "string"
    ) {
      return null;
    }
    if (parsedValue.expiresAt <= Date.now()) return null;

    return parsedValue as H5AuthSession;
  } catch {
    return null;
  }
}

function readStoredH5AuthSession(storage: Storage | undefined): H5AuthSession | null {
  const snapshot = storage?.getItem(h5AuthSessionKey) ?? null;
  const session = parseH5AuthSession(snapshot);
  if (snapshot && !session) {
    storage?.removeItem(h5AuthSessionKey);
  }

  return session;
}

function normalizeWritableH5AuthSession(session: WritableH5AuthSession): H5AuthSession {
  const expiresInMinutes = Number(session.expiresIn);
  const candidateExpiresAt = Number(session.expiresAt);
  const expiresAt =
    Number.isFinite(candidateExpiresAt) && candidateExpiresAt > Date.now()
      ? candidateExpiresAt
      : Date.now() + Math.max(1, expiresInMinutes || 720) * 60 * 1000;

  return {
    ...session,
    expiresAt,
  };
}

function writeH5AuthSessionCookie(session: H5AuthSession, storageType: AuthStorageType) {
  if (typeof document === "undefined") return;

  const maxAgeSeconds = Math.max(1, Math.floor((session.expiresAt - Date.now()) / 1000));
  const maxAgePart = storageType === "local" ? `; Max-Age=${maxAgeSeconds}` : "";
  document.cookie = `${h5AuthSessionCookieName}=${encodeURIComponent(
    JSON.stringify(session),
  )}; Path=/; SameSite=Lax${maxAgePart}`;
}

function clearH5AuthSessionCookie() {
  if (typeof document === "undefined") return;

  document.cookie = `${h5AuthSessionCookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function clearH5LogoutUrlParams() {
  if (typeof window === "undefined" || !window.location?.href || !window.history) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete("taskId");
  url.searchParams.delete("autoGenerate");
  window.history.replaceState(
    null,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function getH5AuthStorageType(): AuthStorageType {
  if (typeof window === "undefined") return "local";

  return window.sessionStorage?.getItem(h5AuthSessionKey) ? "session" : "local";
}

function getCurrentH5Path() {
  if (typeof window === "undefined") return "/";

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function isNodeTestModuleResolutionError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "ERR_MODULE_NOT_FOUND" &&
    error.message.includes("api-endpoints")
  );
}
