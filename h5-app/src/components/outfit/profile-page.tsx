"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  BarChart3,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  Pencil,
  Ruler,
  Shirt,
  Sparkles,
  Target,
} from "lucide-react";
import {
  readH5AuthSession,
  subscribeH5AuthSession,
} from "@/lib/auth";
import { resolveBackendAssetUrl } from "@/lib/api-endpoints";
import {
  defaultH5ProfileOverview,
  fetchH5ProfileOverview,
} from "@/lib/profile-overview";
import type {
  H5BodyMetricItem,
  H5ColorPreferenceItem,
  H5FitTypeItem,
  H5InspirationItem,
  H5ProfileMenuItem,
  H5ProfileOverview,
  H5StylePreferenceItem,
} from "@/types/profile";

const valueIconMap = {
  chart: BarChart3,
  heart: Heart,
  shirt: Shirt,
  target: Target,
};

export function ProfilePage() {
  const [overview, setOverview] = useState<H5ProfileOverview>(defaultH5ProfileOverview);
  const [error, setError] = useState("");
  const authSnapshot = useSyncExternalStore(
    subscribeH5AuthSession,
    getAuthSnapshot,
    getServerAuthSnapshot,
  );
  const session = useMemo(() => parseAuthSnapshot(authSnapshot), [authSnapshot]);
  const user = session?.user;
  const archive = overview.archive || defaultH5ProfileOverview.archive;
  const displayName = user?.nickName || archive.profile.displayName || overview.user.displayName;
  const avatarSrc = resolveAvatarSrc(user?.avatar || archive.profile.avatar || overview.user.avatar);
  const avatarLabel = displayName.slice(0, 1).toUpperCase();
  const userDisplayId = user?.userId ? formatUserId(user.userId) : "";

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        const nextOverview = await fetchH5ProfileOverview();
        if (!cancelled) {
          setOverview(normalizeProfileOverview(nextOverview, session));
          setError("");
        }
      } catch (caughtError) {
        if (!cancelled) {
          setOverview(normalizeProfileOverview(defaultH5ProfileOverview, session));
          setError(caughtError instanceof Error ? caughtError.message : "风格档案读取失败。");
        }
      }
    }

    void loadOverview();
    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <section className="style-profile-screen">
      <div className="style-profile-glow" aria-hidden="true" />

      <header className="style-profile-topbar">
        <div>
          <h1>风格档案</h1>
          <p>记录你的风格偏好，打造专属穿搭 DNA</p>
        </div>
        <Link href="/profile/archive">
          <Pencil size={15} />
          <span>编辑</span>
        </Link>
      </header>

      {error ? <div className="style-profile-error">{formatProfileError(error)}</div> : null}

      {!session ? (
        <section className="style-profile-login">
          <div>
            <strong>登录后同步风格档案</strong>
            <span>保存记录、头像和昵称会自动汇总到档案。</span>
          </div>
          <Link href="/login">去登录</Link>
        </section>
      ) : null}

      <section className="style-profile-user-card">
        <div className="style-profile-avatar">
          {avatarSrc ? (
            <Image src={avatarSrc} alt="" width={72} height={72} unoptimized />
          ) : (
            <span>{avatarLabel}</span>
          )}
        </div>
        <div className="style-profile-user-copy">
          <div>
            <h2>{displayName}</h2>
            <span>{archive.profile.statusLabel}</span>
          </div>
          <p className="style-profile-id-line">
            {userDisplayId ? <b>ID：{userDisplayId}</b> : null}
          </p>
          <dl>
            <InfoPair label="身高" value={archive.profile.height || "待完善"} />
            <InfoPair label="体重" value={archive.profile.weight || "待完善"} />
            <InfoPair label="穿衣尺码" value={archive.profile.clothingSize || "待完善"} />
            <InfoPair label="鞋码" value={archive.profile.shoeSize || "待完善"} />
          </dl>
        </div>
      </section>

      <StyleProfileSection actionHref="/history" title="风格偏好">
        {archive.stylePreferences.length ? (
          <div className="style-preference-grid">
            {archive.stylePreferences.map((item) => (
              <StylePreferenceCard item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <ArchiveEmpty text="保存几套 AI 衣橱 Look 后，会自动生成风格占比。" />
        )}
      </StyleProfileSection>

      <StyleProfileSection title="色彩偏好">
        {archive.colorPreferences.length ? (
          <div className="style-color-row">
            {archive.colorPreferences.map((item) => (
              <ColorPreference item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <ArchiveEmpty text="暂无常用色系，先保存一套喜欢的搭配。" />
        )}
      </StyleProfileSection>

      <StyleProfileSection title="元素偏好">
        {archive.elementPreferences.length ? (
          <div className="style-chip-cloud">
            {archive.elementPreferences.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : (
          <ArchiveEmpty text="单品、面料和细节偏好会从 AI 衣橱里归纳。" />
        )}
      </StyleProfileSection>

      <StyleProfileSection actionHref="/profile/archive" actionText="完善数据" title="身材数据">
        <div className="style-body-card">
          <div className="style-body-figure">
            <Ruler size={36} />
          </div>
          <div className="style-body-metrics">
            {archive.bodyMetrics.map((item) => (
              <BodyMetric item={item} key={item.id} />
            ))}
          </div>
        </div>
      </StyleProfileSection>

      <StyleProfileSection title="适合我的版型">
        <div className="style-fit-grid">
          {archive.fitTypes.map((item) => (
            <FitType item={item} key={item.id} />
          ))}
        </div>
      </StyleProfileSection>

      <StyleProfileSection actionHref="/history?status=succeeded" title="我的灵感库">
        {archive.inspiration.length ? (
          <div className="style-inspiration-row">
            {archive.inspiration.map((item) => (
              <InspirationCard item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <ArchiveEmpty text="收藏或保存生成结果后，这里会沉淀你的穿搭灵感。" />
        )}
      </StyleProfileSection>

      <section className="style-profile-values">
        <strong>核心价值</strong>
        {archive.valueProps.map((item) => (
          <ValueProp item={item} key={item.id} />
        ))}
      </section>
    </section>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function StyleProfileSection({
  actionHref,
  actionText = "查看全部",
  children,
  title,
}: {
  actionHref?: string;
  actionText?: string;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="style-profile-card">
      <div className="style-profile-section-title">
        <h2>{title}</h2>
        {actionHref ? (
          <Link href={actionHref}>
            {actionText}
            <ChevronRight size={14} />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function StylePreferenceCard({ item }: { item: H5StylePreferenceItem }) {
  return (
    <article className="style-preference-card">
      <div>
        {item.imageUrl ? (
          <Image src={resolveBackendAssetUrl(item.imageUrl)} alt="" width={132} height={132} unoptimized />
        ) : (
          <ImageIcon size={24} />
        )}
      </div>
      <strong>{item.label}</strong>
      <span>{item.percent}%</span>
    </article>
  );
}

function ColorPreference({ item }: { item: H5ColorPreferenceItem }) {
  return (
    <div className="style-color-item">
      <i style={{ backgroundColor: item.value }} />
      <span>{item.label}</span>
    </div>
  );
}

function BodyMetric({ item }: { item: H5BodyMetricItem }) {
  return (
    <div className="style-body-metric">
      <span>{item.label}</span>
      <strong>{item.value}</strong>
    </div>
  );
}

function FitType({ item }: { item: H5FitTypeItem }) {
  return (
    <article className="style-fit-item">
      <Shirt size={25} />
      <strong>{item.label}</strong>
      <span>{item.description}</span>
    </article>
  );
}

function InspirationCard({ item }: { item: H5InspirationItem }) {
  return (
    <article className="style-inspiration-card">
      <Image src={resolveBackendAssetUrl(item.imageUrl)} alt={item.title} width={150} height={190} unoptimized />
      <Heart size={17} />
    </article>
  );
}

function ValueProp({ item }: { item: H5ProfileMenuItem }) {
  const Icon = valueIconMap[item.icon as keyof typeof valueIconMap] || Sparkles;

  return (
    <div className="style-value-item">
      <Icon size={22} />
      <div>
        <span>{item.label}</span>
        <small>{item.description}</small>
      </div>
    </div>
  );
}

function ArchiveEmpty({ text }: { text: string }) {
  return (
    <div className="style-archive-empty">
      <Sparkles size={19} />
      <span>{text}</span>
    </div>
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

function formatProfileError(message: string) {
  const normalizedMessage = message.replace(/[。！!，,]+$/u, "");
  return `${normalizedMessage}，当前展示本机默认档案。`;
}

function formatUserId(userId: number) {
  return String(userId).padStart(4, "0");
}

function normalizeProfileOverview(
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
      profile: {
        ...defaultH5ProfileOverview.archive.profile,
        ...value.archive?.profile,
      },
      summary: {
        ...defaultH5ProfileOverview.archive.summary,
        ...value.archive?.summary,
      },
      stylePreferences:
        value.archive?.stylePreferences ?? defaultH5ProfileOverview.archive.stylePreferences,
      colorPreferences:
        value.archive?.colorPreferences ?? defaultH5ProfileOverview.archive.colorPreferences,
      elementPreferences:
        value.archive?.elementPreferences ?? defaultH5ProfileOverview.archive.elementPreferences,
      bodyMetrics: value.archive?.bodyMetrics ?? defaultH5ProfileOverview.archive.bodyMetrics,
      fitTypes: value.archive?.fitTypes ?? defaultH5ProfileOverview.archive.fitTypes,
      inspiration: value.archive?.inspiration ?? defaultH5ProfileOverview.archive.inspiration,
      valueProps: value.archive?.valueProps ?? defaultH5ProfileOverview.archive.valueProps,
    },
  };
}

function resolveAvatarSrc(avatar?: string) {
  return resolveBackendAssetUrl(avatar);
}
