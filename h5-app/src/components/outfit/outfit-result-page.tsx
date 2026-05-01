"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CloudSun,
  Download,
  Heart,
  Home,
  MapPin,
  RefreshCw,
  Save,
  Share2,
  Shirt,
  Sparkles,
  Thermometer,
} from "lucide-react";
import { outfitApiEndpoints, resolveBackendAssetUrl } from "@/lib/api-endpoints";
import { getOutfitRecord, saveOutfitRecord } from "@/lib/outfit-records";
import {
  readOutfitResultSession,
  type OutfitResultSession,
} from "@/lib/result-session";
import type {
  ApiErrorResponse,
  GenerateOutfitTaskSnapshot,
  OutfitGeneration,
  OutfitItem,
} from "@/types/outfit";

type ToastState = {
  id: number;
  message: string;
};

export function OutfitResultPage() {
  const [results, setResults] = useState<OutfitGeneration[]>([]);
  const [activeId, setActiveId] = useState("");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      const session = readOutfitResultSession();
      try {
        const backendResults = await readBackendResultSession(session);
        if (cancelled) return;
        setResults(backendResults);
        setActiveId(backendResults[0]?.id || "");
        setSavedIds(backendResults.filter(isPersistedRecord).map((item) => item.id));
        setLoadError("");
      } catch (caughtError) {
        if (cancelled) return;
        setResults([]);
        setActiveId("");
        setSavedIds([]);
        setLoadError(
          caughtError instanceof Error ? caughtError.message : "生成结果读取失败。",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadResults();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeResult = useMemo(
    () => results.find((item) => item.id === activeId) || results[0] || null,
    [activeId, results],
  );
  const activeIndex = activeResult
    ? results.findIndex((item) => item.id === activeResult.id) + 1
    : 0;
  const activeTags = activeResult?.styleTags.slice(0, 5) ?? [];

  function showToast(message: string) {
    setToast({ id: Date.now(), message });
  }

  async function saveCurrent() {
    if (!activeResult || savingId) return;
    if (savedIds.includes(activeResult.id)) {
      showToast("已保存到衣橱");
      return;
    }

    setSavingId(activeResult.id);
    try {
      const savedGeneration = await saveOutfitRecord({ generation: activeResult });
      setResults((current) =>
        current.map((item) => (item.id === activeResult.id ? savedGeneration : item)),
      );
      setActiveId(savedGeneration.id);
      setSavedIds((current) =>
        current.includes(savedGeneration.id) ? current : [...current, savedGeneration.id],
      );
      showToast("已保存到衣橱");
    } catch (caughtError) {
      showToast(
        caughtError instanceof Error ? caughtError.message : "穿搭记录保存失败",
      );
    } finally {
      setSavingId("");
    }
  }

  function downloadCurrent() {
    if (!activeResult) return;

    const link = document.createElement("a");
    link.href = resolveBackendAssetUrl(activeResult.imageUrl);
    link.download = `${sanitizeDownloadName(activeResult.outfitTitle)}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("已开始保存图片");
  }

  async function shareCurrent() {
    if (!activeResult) return;

    if (!navigator.share) {
      showToast("当前浏览器不支持系统分享");
      return;
    }

    await navigator.share({
      title: "云裳 AI 穿搭方案",
      text: `${activeResult.outfitTitle}：${activeResult.summary}`,
    });
  }

  if (loading) {
    return (
      <section className="outfit-result-page is-empty">
        <div className="outfit-result-empty-card">
          <Sparkles size={30} />
          <h1>正在读取生成结果</h1>
          <p>正在从服务端同步图片和穿搭档案。</p>
          <Link href="/history">
            <Heart size={18} />
            查看衣橱
          </Link>
        </div>
      </section>
    );
  }

  if (!activeResult) {
    return (
      <section className="outfit-result-page is-empty">
        <div className="outfit-result-empty-card">
          <Sparkles size={30} />
          <h1>还没有可查看的生成结果</h1>
          <p>{loadError || "回到首页生成穿搭后，会自动进入这个独立结果页。"}</p>
          <Link href="/">
            <Home size={18} />
            返回首页生成
          </Link>
        </div>
      </section>
    );
  }

  const saved = savedIds.includes(activeResult.id);
  return (
    <section className="outfit-result-page">
      <header className="outfit-result-topbar">
        <Link href="/" aria-label="返回首页">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <span>AI 穿搭方案</span>
          <strong>共生成 {results.length} 套</strong>
        </div>
        <Link href="/history" aria-label="查看衣橱">
          <Heart size={19} />
        </Link>
      </header>

      <main className="outfit-result-main">
        <section className="outfit-result-intro">
          <div>
            <span>LOOK {String(activeIndex).padStart(2, "0")}</span>
            <h1>{activeResult.outfitTitle}</h1>
            <p>{activeResult.summary}</p>
          </div>
          <span>{results.length} 套方案</span>
        </section>

        <section className="outfit-result-hero">
          <button
            className="outfit-result-poster"
            type="button"
            onClick={downloadCurrent}
            aria-label="保存当前大图"
          >
            <Image
              alt={activeResult.outfitTitle}
              src={resolveBackendAssetUrl(activeResult.imageUrl)}
              width={1080}
              height={1440}
              unoptimized
              priority
            />
            <div className="outfit-result-poster-caption">
              <span>CloudWear AI</span>
              <strong>
                {activeResult.weather} / {activeResult.temperature}°C
              </strong>
            </div>
          </button>
          <div className="outfit-result-tags" aria-label="方案标签">
            {activeTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </section>

        <section className="outfit-result-switcher" aria-label="切换方案">
          {results.map((result, index) => (
            <button
              className={result.id === activeResult.id ? "is-active" : undefined}
              key={result.id}
              type="button"
              onClick={() => setActiveId(result.id)}
            >
              <Image
                alt={result.outfitTitle}
                src={resolveBackendAssetUrl(result.imageUrl)}
                width={220}
                height={300}
                unoptimized
              />
              <span>方案 {index + 1}</span>
            </button>
          ))}
        </section>

        <section className="outfit-result-panel">
          <SectionTitle kicker="STYLE BRIEF" title="造型信息" />
          <div className="outfit-result-meta">
            <Info icon={<MapPin size={17} />} label="场景" value={activeResult.occasion} />
            <Info icon={<Shirt size={17} />} label="风格" value={activeResult.style} />
            <Info icon={<CloudSun size={17} />} label="地点" value={activeResult.location} />
            <Info
              icon={<Thermometer size={17} />}
              label="色彩"
              value={activeResult.colorPreference || "不限"}
            />
          </div>
        </section>

        <section className="outfit-result-panel">
          <SectionTitle kicker="ITEM LIST" title="单品清单" />
          <div className="outfit-result-items">
            {activeResult.items.slice(0, 6).map((item, index) => (
              <OutfitItemCard
                index={index}
                item={item}
                key={`${item.category}-${item.name}`}
              />
            ))}
          </div>
        </section>

        <section className="outfit-result-panel">
          <SectionTitle kicker="WHY IT WORKS" title="穿搭说明" />
          <div className="outfit-result-advice">
            <TextBlock title="温度适配" value={activeResult.temperatureAdvice} />
            <TextBlock title="场景理由" value={activeResult.occasionReason} />
          </div>
        </section>
      </main>

      <footer className="outfit-result-actions">
        <button
          type="button"
          className={saved ? "is-saved" : undefined}
          disabled={Boolean(savingId)}
          onClick={() => void saveCurrent()}
        >
          {saved ? <Check size={19} /> : <Save size={19} />}
          <span>{saved ? "已保存" : savingId ? "保存中" : "保存"}</span>
        </button>
        <button type="button" onClick={downloadCurrent}>
          <Download size={19} />
          <span>下载</span>
        </button>
        <button type="button" onClick={() => void shareCurrent()}>
          <Share2 size={19} />
          <span>分享</span>
        </button>
        <Link href="/">
          <RefreshCw size={19} />
          <span>再生成</span>
        </Link>
      </footer>

      {toast ? <div className="outfit-result-toast">{toast.message}</div> : null}
    </section>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="outfit-result-section-title">
      <span>{kicker}</span>
      <h2>{title}</h2>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function OutfitItemCard({ index, item }: { index: number; item: OutfitItem }) {
  return (
    <article>
      <span>{String(index + 1).padStart(2, "0")}</span>
      <div>
        <small>{item.category}</small>
        <strong>{item.name}</strong>
        <p>{[item.color, item.material].filter(Boolean).join(" / ")}</p>
      </div>
    </article>
  );
}

function TextBlock({ title, value }: { title: string; value: string }) {
  return (
    <section>
      <h3>{title}</h3>
      <p>{value}</p>
    </section>
  );
}

function sanitizeDownloadName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "").slice(0, 40) || "cloudwear-outfit";
}

function isPersistedRecord(generation: OutfitGeneration) {
  const parsedId = Number(generation.id);
  return Number.isSafeInteger(parsedId) && parsedId > 0;
}

async function readBackendResultSession(session: OutfitResultSession) {
  if (session.taskId) {
    const taskResults = await readTaskResults(session.taskId);
    if (taskResults.length) return taskResults;
  }

  if (session.recordIds?.length) {
    return Promise.all(session.recordIds.map((recordId) => getOutfitRecord(recordId)));
  }

  throw new Error("未找到可同步的生成结果，请返回衣橱查看已保存记录。");
}

async function readTaskResults(taskId: string) {
  const response = await fetch(outfitApiEndpoints.generationTask(taskId), {
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | GenerateOutfitTaskSnapshot
    | ApiErrorResponse
    | null;
  if (!response.ok || !payload || "error" in payload) return [];

  if (payload.results?.length) return payload.results;
  if (payload.result) return [payload.result];

  return [];
}
