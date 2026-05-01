"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CloudSun,
  ImageIcon,
  MapPin,
  Palette,
  RefreshCw,
  Shirt,
  Sparkles,
  Trash2,
} from "lucide-react";
import { DeleteConfirmDialog } from "@/components/outfit/delete-confirm-dialog";
import { resolveBackendAssetUrl } from "@/lib/api-endpoints";
import { deleteOutfitRecord, getOutfitRecord } from "@/lib/outfit-records";
import type { OutfitGeneration } from "@/types/outfit";

interface HistoryDetailProps {
  id: string;
}

export function HistoryDetail({ id }: HistoryDetailProps) {
  const [generation, setGeneration] = useState<OutfitGeneration | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [activeTag, setActiveTag] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRecord() {
      setLoading(true);
      setError("");
      try {
        const record = await getOutfitRecord(id);
        if (!cancelled) {
          setGeneration(record);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setGeneration(null);
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "穿搭记录详情读取失败。",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRecord();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function removeGeneration() {
    if (!generation) return;
    setError("");
    setDeleting(true);
    try {
      await deleteOutfitRecord(generation.id);
      window.location.href = "/history";
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "穿搭记录删除失败。");
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <section className="history-detail-screen">
        <div className="history-detail-state">
          <span>CloudWear</span>
          <h1>正在读取穿搭记录</h1>
          <p>正在同步你的穿搭档案。</p>
        </div>
        <Link className="history-detail-state-link" href="/history">
          <ArrowLeft size={18} />
          <span>返回历史</span>
        </Link>
      </section>
    );
  }

  if (!generation) {
    return (
      <section className="history-detail-screen">
        <div className="history-detail-state">
          <span>Not found</span>
          <h1>没有找到这条记录</h1>
          <p>{error || "它可能已经被删除，或当前账号没有访问权限。"}</p>
        </div>
        <Link className="history-detail-state-link" href="/history">
          <ArrowLeft size={18} />
          <span>返回历史</span>
        </Link>
      </section>
    );
  }

  const visibleActiveTag = activeTag || generation.styleTags[0] || "";

  return (
    <article className="history-detail-screen">
      <header className="history-detail-topbar">
        <Link href="/history" aria-label="返回生成记录">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <strong>穿搭档案</strong>
          <span>{formatDetailTime(generation.createdAt)}</span>
        </div>
        <button type="button" aria-label="删除记录" onClick={() => setDeleteConfirmOpen(true)}>
          <Trash2 size={17} />
        </button>
      </header>

      {error ? <div className="history-detail-error">{error}</div> : null}

      <section className="history-detail-hero">
        {generation.userPhotoUsed && !generation.userPhotoUrl ? (
          <div className="history-detail-missing-origin">
            <ImageIcon size={18} />
            <span>用户上传原图未保存，当前只展示 AI 生成结果。</span>
          </div>
        ) : null}

        <div className={generation.userPhotoUrl ? "history-detail-image-grid" : "history-detail-image-grid single"}>
          {generation.userPhotoUrl ? (
            <HistoryDetailImage
              label="用户上传原图"
              src={resolveBackendAssetUrl(generation.userPhotoUrl)}
              title={generation.outfitTitle}
            />
          ) : null}
          <HistoryDetailImage
            label="AI 生成结果"
            priority
            src={resolveBackendAssetUrl(generation.imageUrl)}
            title={generation.outfitTitle}
          />
        </div>

        <div className="history-detail-copy">
          <div className="history-detail-tags" role="tablist" aria-label="穿搭标签">
            {generation.styleTags.slice(0, 6).map((tag) => (
              <button
                aria-selected={visibleActiveTag === tag}
                className={visibleActiveTag === tag ? "is-active" : undefined}
                key={tag}
                onClick={() => setActiveTag(tag)}
                role="tab"
                type="button"
              >
                {tag}
              </button>
            ))}
          </div>
          <h1>{generation.outfitTitle}</h1>
          <p>{generation.summary}</p>
        </div>
      </section>

      <section className="history-detail-metrics" aria-label="穿搭信息">
        <DetailMetric
          icon={<CloudSun size={16} />}
          label="天气"
          value={`${generation.temperature}°C / ${generation.weather}`}
        />
        <DetailMetric icon={<MapPin size={16} />} label="地点" value={generation.location} />
        <DetailMetric icon={<Sparkles size={16} />} label="场景" value={generation.occasion} />
        <DetailMetric icon={<Palette size={16} />} label="风格" value={generation.style} />
        <DetailMetric icon={<Shirt size={16} />} label="季节" value={generation.season} />
        <DetailMetric
          icon={<CalendarDays size={16} />}
          label="保存"
          value={formatDetailTime(generation.createdAt)}
        />
      </section>

      <section className="history-detail-notes">
        <TextBlock title="温度适配" value={generation.temperatureAdvice} />
        <TextBlock title="场景理由" value={generation.occasionReason} />
      </section>

      <section className="history-detail-items">
        <div className="history-detail-section-title">
          <span>Wardrobe</span>
          <h2>单品拆解</h2>
        </div>
        {generation.items.length === 0 ? (
          <p className="history-detail-empty">本次暂无单品拆解。</p>
        ) : (
          <div className="history-detail-item-list">
            {generation.items.map((item) => (
              <article key={`${item.category}-${item.name}`}>
                <span>{item.category}</span>
                <h3>{item.name}</h3>
                <p>{item.color} / {item.material}</p>
                <small>{item.reason}</small>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="history-detail-actions">
        <Link href="/history">
          <ArrowLeft size={17} />
          <span>记录</span>
        </Link>
        <Link
          href={{
            pathname: "/",
            query: {
              season: generation.season,
              temperature: generation.temperature,
              weather: generation.weather,
              location: generation.location,
              occasion: generation.occasion,
              style: generation.style,
              colorPreference: generation.colorPreference,
              genderPreference: generation.genderPreference,
            },
          }}
        >
          <RefreshCw size={17} />
          <span>生成相似风格</span>
        </Link>
      </footer>

      <DeleteConfirmDialog
        description={`即将删除「${generation.outfitTitle}」，删除后会返回生成记录列表。`}
        loading={deleting}
        open={deleteConfirmOpen}
        onCancel={() => {
          if (!deleting) setDeleteConfirmOpen(false);
        }}
        onConfirm={() => void removeGeneration()}
      />
    </article>
  );
}

function HistoryDetailImage({
  emptyText = "暂无图片",
  label,
  priority = false,
  src,
  title,
}: {
  emptyText?: string;
  label: string;
  priority?: boolean;
  src?: string;
  title: string;
}) {
  return (
    <div className={src ? "history-detail-image" : "history-detail-image is-empty"}>
      {src ? (
        <Image
          src={src}
          alt={label}
          width={900}
          height={1350}
          unoptimized
          priority={priority}
        />
      ) : (
        <div className="history-detail-image-empty">
          <ImageIcon size={26} />
          <strong>{emptyText}</strong>
          <p>{title}</p>
        </div>
      )}
      <span>{label}</span>
    </div>
  );
}

interface DetailMetricProps {
  icon: ReactNode;
  label: string;
  value: string | number | undefined;
}

function DetailMetric({ icon, label, value }: DetailMetricProps) {
  return (
    <div>
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value || "-"}</strong>
    </div>
  );
}

interface TextBlockProps {
  title: string;
  value: string;
}

function TextBlock({ title, value }: TextBlockProps) {
  return (
    <section>
      <h3>{title}</h3>
      <p>{value}</p>
    </section>
  );
}

function formatDetailTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${month}.${day} ${hour}:${minute}`;
}
