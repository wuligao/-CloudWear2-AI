"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  BadgeCheck,
  Bell,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Clock3,
  Headphones,
  Image as ImageIcon,
  Info,
  LayoutTemplate,
  List,
  Loader2,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
  Star,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import { AuthLoadingOverlay } from "@/components/outfit/auth-loading-overlay";
import {
  logoutH5User,
  readH5AuthSession,
  subscribeH5AuthSession,
} from "@/lib/auth";
import { resolveBackendAssetUrl } from "@/lib/api-endpoints";
import {
  defaultH5ProfileOverview,
  fetchH5ProfileOverview,
} from "@/lib/profile-overview";
import type { H5ProfileMenuItem, H5ProfileOverview } from "@/types/profile";

const menuIconMap = {
  "badge-check": BadgeCheck,
  bell: Bell,
  "book-open": BookOpen,
  "circle-help": CircleHelp,
  headphones: Headphones,
  image: ImageIcon,
  info: Info,
  "layout-template": LayoutTemplate,
  list: List,
  "message-square": MessageSquare,
  settings: Settings,
  shield: Shield,
  star: Star,
  "user-round": UserRound,
  "user-round-check": UserRoundCheck,
};

export function MinePage() {
  const router = useRouter();
  const [overview, setOverview] = useState<H5ProfileOverview>(defaultH5ProfileOverview);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const authSnapshot = useSyncExternalStore(
    subscribeH5AuthSession,
    getAuthSnapshot,
    getServerAuthSnapshot,
  );
  const session = useMemo(() => parseAuthSnapshot(authSnapshot), [authSnapshot]);
  const user = session?.user;
  const displayName = user?.nickName || overview.user.displayName;
  const avatarSrc = resolveAvatarSrc(user?.avatar || overview.user.avatar);
  const avatarLabel = displayName.slice(0, 1).toUpperCase();
  const userDisplayId = user?.userId ? String(user.userId).padStart(4, "0") : "未登录";

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        const nextOverview = await fetchH5ProfileOverview();
        if (!cancelled) {
          setOverview(normalizeMineOverview(nextOverview, session));
          setError("");
        }
      } catch (caughtError) {
        if (!cancelled) {
          setOverview(normalizeMineOverview(defaultH5ProfileOverview, session));
          setError(caughtError instanceof Error ? caughtError.message : "我的页面读取失败。");
        }
      }
    }

    void loadOverview();
    return () => {
      cancelled = true;
    };
  }, [session]);

  function requestLogout() {
    if (!session || loggingOut) return;
    setLogoutConfirmOpen(true);
  }

  async function confirmLogout() {
    if (!session || loggingOut) return;

    setLogoutConfirmOpen(false);
    setLoggingOut(true);
    setError("");
    try {
      await logoutH5User();
    } catch (caughtError) {
      console.warn(caughtError instanceof Error ? caughtError.message : "退出登录失败。");
    } finally {
      setLoggingOut(false);
      router.replace("/login");
    }
  }

  return (
    <section className="profile-screen">
      <div className="profile-atmosphere" aria-hidden="true" />

      <header className="profile-header">
        <div className="profile-avatar">
          {avatarSrc ? (
            <Image src={avatarSrc} alt="" width={58} height={58} unoptimized />
          ) : (
            <span>{avatarLabel}</span>
          )}
        </div>
        <div className="profile-identity">
          <div className="profile-name-row">
            <h1>{displayName}</h1>
            <span>{overview.user.memberLevel}</span>
          </div>
          <p>ID：{userDisplayId}</p>
        </div>
        <Link className="profile-icon-button" href="/profile/account" aria-label="账户设置">
          <Settings size={19} />
        </Link>
      </header>

      {error ? <div className="profile-error">{formatMineError(error)}</div> : null}

      {!session ? (
        <section className="cw-profile-login-card">
          <div>
            <strong>登录后同步资料</strong>
            <span>保存记录、风格档案和账号资料会跟随账号。</span>
          </div>
          <Link href="/login">去登录</Link>
        </section>
      ) : null}

      <section className="profile-vip-card">
        <div className="profile-vip-top">
          <div>
            <span>CloudWear AI</span>
            <strong>{overview.invite.title}</strong>
          </div>
          <button type="button">查看权益</button>
        </div>
        <div className="profile-benefits">
          {overview.benefits.map((item) => (
            <div className="profile-benefit" key={item.id}>
              <Sparkles size={18} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-stats-card">
        <div className="profile-stat profile-stat-primary">
          <span>今日生成</span>
          <strong>{overview.stats.dailyGenerated}</strong>
          <em>今日已完成</em>
        </div>
        <div className="profile-stat">
          <span>剩余次数</span>
          <strong>
            {overview.stats.remainingToday}
            <small>次</small>
          </strong>
          <em>上限 {overview.stats.dailyLimit} 次</em>
        </div>
        <div className="profile-stat profile-stat-points">
          <span>积分余额</span>
          <strong>{overview.stats.pointsBalance}</strong>
          <button type="button">去获取</button>
        </div>
      </section>

      <section className="profile-card">
        <div className="profile-section-title">
          <h2>AI 衣橱</h2>
          <Link href="/history">
            查看全部
            <ChevronRight size={14} />
          </Link>
        </div>
        <div className="profile-order-grid">
          {overview.orderStatuses.map((item) => (
            <ProfileOrderItem item={item} key={item.id} />
          ))}
        </div>
      </section>

      <button className="profile-invite-card" type="button">
        <div>
          <h2>{overview.invite.title}</h2>
          <p>{overview.invite.subtitle}</p>
          <span>{overview.invite.rewardPoints} 积分</span>
        </div>
        <Sparkles size={42} />
      </button>

      {overview.menuGroups.map((group) => (
        <section className="profile-card" key={group.id}>
          <div className="profile-section-title">
            <h2>{group.title}</h2>
          </div>
          <div className={group.layout === "grid" ? "profile-feature-grid" : "profile-list-menu"}>
            {group.items.map((item) => (
              <ProfileMenuEntry item={item} key={item.id} />
            ))}
          </div>
        </section>
      ))}

      {session ? (
        <button
          className="profile-logout-button"
          disabled={loggingOut}
          type="button"
          onClick={requestLogout}
        >
          {loggingOut ? <Loader2 size={18} /> : <LogOut size={18} />}
          <span>{loggingOut ? "正在退出" : "退出登录"}</span>
        </button>
      ) : null}

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        loading={loggingOut}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={confirmLogout}
      />

      <AuthLoadingOverlay
        visible={loggingOut}
        title="正在退出登录"
        subtitle="正在清理本机登录状态"
        steps={["请求退出", "清理缓存"]}
        tone="logout"
      />
    </section>
  );
}

function LogoutConfirmDialog({
  loading,
  onCancel,
  onConfirm,
  open,
}: {
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
}) {
  if (!open) return null;

  return (
    <div
      aria-labelledby="profile-logout-confirm-title"
      aria-modal="true"
      className="profile-logout-confirm-overlay"
      role="dialog"
    >
      <section className="profile-logout-confirm-card">
        <div className="profile-logout-confirm-icon" aria-hidden="true">
          <LogOut size={22} />
        </div>
        <div className="profile-logout-confirm-copy">
          <h2 id="profile-logout-confirm-title">确认退出登录？</h2>
          <p>退出后本机登录状态会被清理，重新使用账号资料需要再次登录。</p>
        </div>
        <div className="profile-logout-confirm-actions">
          <button disabled={loading} type="button" onClick={onCancel}>
            取消
          </button>
          <button disabled={loading} type="button" onClick={onConfirm}>
            {loading ? <Loader2 size={17} /> : <LogOut size={17} />}
            <span>{loading ? "正在退出" : "确认退出"}</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function ProfileOrderItem({ item }: { item: H5ProfileMenuItem & { count: number } }) {
  const content = (
    <>
      <Clock3 size={21} />
      <strong>{item.count}</strong>
      <span>{item.label}</span>
    </>
  );

  if (item.href) {
    return (
      <Link className="profile-order-item" href={item.href}>
        {content}
      </Link>
    );
  }

  return (
    <div className="profile-order-item">
      {content}
    </div>
  );
}

function ProfileMenuEntry({ item }: { item: H5ProfileMenuItem }) {
  const Icon = menuIconMap[item.icon as keyof typeof menuIconMap] || Sparkles;
  const content = (
    <>
      <span className="profile-menu-icon">
        <Icon size={18} />
      </span>
      <span>{item.label}</span>
      <ChevronRight className="profile-list-arrow" size={15} />
    </>
  );

  if (item.href) {
    return (
      <Link className="profile-menu-entry" href={item.href}>
        {content}
      </Link>
    );
  }

  return (
    <button className="profile-menu-entry" type="button">
      {content}
    </button>
  );
}

function getAuthSnapshot() {
  return JSON.stringify(readH5AuthSession());
}

function getServerAuthSnapshot() {
  return "null";
}

function parseAuthSnapshot(snapshot: string) {
  try {
    return JSON.parse(snapshot) as ReturnType<typeof readH5AuthSession>;
  } catch {
    return null;
  }
}

function normalizeMineOverview(
  value: H5ProfileOverview,
  session: ReturnType<typeof readH5AuthSession>,
): H5ProfileOverview {
  const fallbackName =
    session?.user.nickName || session?.user.userName || defaultH5ProfileOverview.user.displayName;

  return {
    ...defaultH5ProfileOverview,
    ...value,
    user: {
      ...defaultH5ProfileOverview.user,
      ...value.user,
      displayName: value.user?.displayName || fallbackName,
      avatar: value.user?.avatar || session?.user.avatar,
    },
    stats: {
      ...defaultH5ProfileOverview.stats,
      ...value.stats,
    },
    benefits: value.benefits?.length ? value.benefits : defaultH5ProfileOverview.benefits,
    orderStatuses: value.orderStatuses?.length
      ? value.orderStatuses
      : defaultH5ProfileOverview.orderStatuses,
    invite: {
      ...defaultH5ProfileOverview.invite,
      ...value.invite,
    },
    menuGroups: value.menuGroups?.length ? value.menuGroups : defaultH5ProfileOverview.menuGroups,
    archive: {
      ...defaultH5ProfileOverview.archive,
      ...value.archive,
    },
  };
}

function formatMineError(message: string) {
  const normalizedMessage = message.replace(/[。！!，,]+$/u, "");
  return `${normalizedMessage}，当前展示本机默认内容。`;
}

function resolveAvatarSrc(avatar?: string) {
  return resolveBackendAssetUrl(avatar);
}
