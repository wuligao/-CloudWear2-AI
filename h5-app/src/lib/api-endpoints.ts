const defaultApiBaseUrl = "http://localhost:9200";
const defaultApiPort = "9200";

type QueryValue = string | number | boolean | undefined | null;

export function buildApiUrl(path: string, baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL) {
  const normalizedBaseUrl = (baseUrl || getRuntimeApiBaseUrl()).replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

export function resolveBackendAssetUrl(value?: string) {
  const assetUrl = String(value || "").trim();
  if (!assetUrl) return "";
  if (/^(https?:|data:|blob:)/iu.test(assetUrl)) return assetUrl;
  if (assetUrl.startsWith("//")) return assetUrl;
  if (assetUrl.startsWith("/")) return buildApiUrl(assetUrl);
  if (assetUrl.startsWith("uploads/")) return buildApiUrl(`/${assetUrl}`);

  return assetUrl;
}

function getRuntimeApiBaseUrl() {
  if (typeof window === "undefined") return defaultApiBaseUrl;

  const { protocol, hostname } = window.location || {};
  if (!protocol || !hostname) return defaultApiBaseUrl;

  return `${protocol}//${hostname}:${defaultApiPort}`;
}

function buildQuery(params: Record<string, QueryValue>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}

export const outfitApiEndpoints = {
  h5Config: () => buildApiUrl("/ai-model/public/app-configs/h5-outfit"),
  h5AuthLogin: () => buildApiUrl("/api/h5/auth/login"),
  h5AuthRegister: () => buildApiUrl("/api/h5/auth/register"),
  h5AuthGuest: () => buildApiUrl("/api/h5/auth/guest"),
  h5AuthMe: () => buildApiUrl("/api/h5/auth/me"),
  h5AuthLogout: () => buildApiUrl("/api/h5/auth/logout"),
  h5AvatarUpload: () => buildApiUrl("/files/upload-base64"),
  h5ProfileOverview: (baseUrl?: string) =>
    buildApiUrl("/api/h5/profile/overview", baseUrl),
  h5ProfileArchive: (baseUrl?: string) =>
    buildApiUrl("/api/h5/profile/archive", baseUrl),
  h5ProfileArchiveAnalyzePhoto: () => buildApiUrl("/api/h5/profile/archive/analyze-photo"),
  h5ProfileFeedback: (baseUrl?: string) =>
    buildApiUrl("/api/h5/profile/feedback", baseUrl),
  h5ChatBootstrap: () => buildApiUrl("/api/h5/chat/bootstrap"),
  h5ChatSessions: () => buildApiUrl("/api/h5/chat/sessions"),
  h5ChatMessages: (sessionId: string | number) =>
    buildApiUrl(`/api/h5/chat/sessions/${encodeURIComponent(String(sessionId))}/messages`),
  createGeneration: () => buildApiUrl("/api/generate-outfit"),
  generationTask: (taskId: string) => buildApiUrl(`/api/generate-outfit/${taskId}`),
  generationEvents: (taskId: string) =>
    buildApiUrl(`/api/generate-outfit/${taskId}/events`),
  outfitRecords: (params: { keyword?: string; status?: string } = {}) =>
    buildApiUrl(
      `/api/outfit-records?${buildQuery({
        keyword: params.keyword,
        status: params.status,
      })}`,
    ),
  outfitRecord: (recordId: string) =>
    buildApiUrl(`/api/outfit-records/${encodeURIComponent(recordId)}`),
};
