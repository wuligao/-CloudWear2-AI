import { getH5AuthHeader } from "@/lib/auth";
import { outfitApiEndpoints } from "@/lib/api-endpoints";
import type { ApiErrorResponse } from "@/types/outfit";
import type {
  H5ProfileOverview,
  H5ProfileOverviewResponse,
  H5StyleProfileArchive,
  H5StyleProfileArchiveResponse,
} from "@/types/profile";

export async function fetchH5ProfileOverview() {
  const response = await fetch(outfitApiEndpoints.h5ProfileOverview(), {
    cache: "no-store",
    headers: getH5AuthHeader(),
  });
  const payload = (await response.json().catch(() => null)) as
    | H5ProfileOverviewResponse
    | ApiErrorResponse
    | null;

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload) || "个人中心读取失败。");
  }

  if (!payload || !("code" in payload) || payload.code !== 200 || !payload.data) {
    throw new Error("个人中心读取失败。");
  }

  return payload.data;
}

export async function fetchH5StyleProfileArchive() {
  const response = await fetch(outfitApiEndpoints.h5ProfileArchive(), {
    cache: "no-store",
    headers: getH5AuthHeader(),
  });
  const payload = (await response.json().catch(() => null)) as
    | H5StyleProfileArchiveResponse
    | ApiErrorResponse
    | null;

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload) || "风格档案读取失败。");
  }

  if (!payload || !("code" in payload) || payload.code !== 200 || !payload.data) {
    throw new Error("风格档案读取失败。");
  }

  return payload.data;
}

export async function updateH5StyleProfileArchive(
  archive: Omit<H5StyleProfileArchive, "profileId" | "userId" | "updatedAt">,
) {
  const response = await fetch(outfitApiEndpoints.h5ProfileArchive(), {
    method: "PUT",
    headers: {
      ...getH5AuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...archive,
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | H5StyleProfileArchiveResponse
    | ApiErrorResponse
    | null;

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload) || "风格档案保存失败。");
  }

  if (!payload || !("code" in payload) || payload.code !== 200 || !payload.data) {
    throw new Error("风格档案保存失败。");
  }

  return payload.data;
}

export async function analyzeH5StyleProfilePhoto(payload: {
  photoType: "fullBody" | "face" | "makeupFree";
  photoDataUrl: string;
}) {
  const response = await fetch(outfitApiEndpoints.h5ProfileArchiveAnalyzePhoto(), {
    method: "POST",
    headers: {
      ...getH5AuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const responsePayload = (await response.json().catch(() => null)) as
    | H5StyleProfileArchiveResponse
    | ApiErrorResponse
    | null;

  if (!response.ok) {
    throw new Error(extractErrorMessage(responsePayload) || "风格照片分析失败。");
  }

  if (
    !responsePayload ||
    !("code" in responsePayload) ||
    responsePayload.code !== 200 ||
    !responsePayload.data
  ) {
    throw new Error("风格照片分析失败。");
  }

  return responsePayload.data;
}

export const defaultH5ProfileOverview: H5ProfileOverview = {
  user: {
    displayName: "云裳用户",
    memberLevel: "待生成记录",
  },
  stats: {
    pointsBalance: 0,
    dailyGenerated: 0,
    dailyLimit: 50,
    remainingToday: 50,
  },
  benefits: [
    { id: "badge", label: "无界生成", icon: "shield" },
    { id: "gallery", label: "高清导出", icon: "image" },
    { id: "stylist", label: "专属模特", icon: "user-round-check" },
    { id: "queue", label: "优先处理", icon: "badge-check" },
  ],
  orderStatuses: [
    { id: "all", label: "全部", icon: "list", href: "/history?status=all", count: 0 },
    {
      id: "running",
      label: "进行中",
      icon: "refresh-cw",
      href: "/history?status=running",
      count: 0,
    },
    {
      id: "succeeded",
      label: "已完成",
      icon: "check-square",
      href: "/history?status=succeeded",
      count: 0,
    },
    { id: "failed", label: "已失败", icon: "x-square", href: "/history?status=failed", count: 0 },
  ],
  invite: {
    title: "邀请好友一起换装",
    subtitle: "双方各得 100 积分",
    rewardPoints: 100,
  },
  menuGroups: [
    {
      id: "features",
      title: "更多功能",
      layout: "grid",
      items: [
        { id: "templates", label: "我的模板", icon: "layout-template", href: "/" },
        { id: "models", label: "我的模特", icon: "user-round" },
        { id: "materials", label: "我的素材", icon: "image" },
        { id: "favorites", label: "我的收藏", icon: "star", href: "/history?status=succeeded" },
        { id: "help", label: "帮助中心", icon: "circle-help" },
        { id: "tutorial", label: "使用教程", icon: "book-open" },
        { id: "feedback", label: "意见反馈", icon: "message-square" },
        { id: "support", label: "联系客服", icon: "headphones" },
      ],
    },
    {
      id: "settings",
      title: "设置与管理",
      layout: "list",
      items: [
        { id: "account", label: "账户设置", icon: "settings", href: "/profile/account" },
        { id: "notifications", label: "消息通知", icon: "bell" },
        { id: "about", label: "关于我们", icon: "info" },
      ],
    },
  ],
  archive: {
    profile: {
      displayName: "云裳用户",
      statusLabel: "待生成记录",
    },
    summary: {
      recordCount: 0,
      photoRecordCount: 0,
    },
    stylePreferences: [],
    colorPreferences: [],
    elementPreferences: [],
    bodyMetrics: [
      { id: "shoulder", label: "肩宽", value: "待完善" },
      { id: "bust", label: "胸围", value: "待完善" },
      { id: "waist", label: "腰围", value: "待完善" },
      { id: "hip", label: "臀围", value: "待完善" },
      { id: "thigh", label: "大腿围", value: "待完善" },
      { id: "calf", label: "小腿围", value: "待完善" },
    ],
    fitTypes: [
      { id: "straight", label: "直筒", description: "保存更多记录后生成推荐" },
      { id: "a-line", label: "高腰A字", description: "保存更多记录后生成推荐" },
      { id: "h-line", label: "H型", description: "保存更多记录后生成推荐" },
      { id: "x-line", label: "X型", description: "保存更多记录后生成推荐" },
    ],
    inspiration: [],
    valueProps: [
      { id: "accurate", label: "更懂你", icon: "target", description: "个性化推荐更精准" },
      { id: "efficient", label: "更高效", icon: "shirt", description: "快速找到适合风格" },
      { id: "confident", label: "更自信", icon: "heart", description: "穿出属于你的风格" },
      { id: "growth", label: "可成长", icon: "chart", description: "档案越完善，推荐越准" },
    ],
  },
};

function extractErrorMessage(
  payload: H5ProfileOverviewResponse | H5StyleProfileArchiveResponse | ApiErrorResponse | null,
) {
  if (!payload) return "";
  if ("error" in payload && payload.error) return payload.error;
  if ("message" in payload && payload.message) return payload.message;
  return "";
}
