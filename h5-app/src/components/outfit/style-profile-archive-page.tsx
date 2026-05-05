"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  ChevronLeft,
  Loader2,
  Palette,
  RefreshCw,
  Ruler,
  Settings2,
  Sparkles,
  Tags,
  Upload,
  UserRound,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { readH5AuthSession, subscribeH5AuthSession } from "@/lib/auth";
import { resolveBackendAssetUrl } from "@/lib/api-endpoints";
import {
  analyzeH5StyleProfilePhoto,
  fetchH5StyleProfileArchive,
  updateH5StyleProfileArchive,
} from "@/lib/profile-overview";
import type {
  H5ColorPreferenceItem,
  H5RecommendedStyleItem,
  H5StyleAnalysisItem,
  H5StyleProfileArchive,
} from "@/types/profile";

type StyleProfileForm = {
  genderPreference: string;
  height: string;
  weight: string;
  clothingSize: string;
  shoeSize: string;
  favoriteStyles: string;
  favoriteColors: string;
  avoidColors: string;
  commonOccasions: string;
  elementPreferences: string;
  fitPreferences: string;
  shoulder: string;
  bust: string;
  waist: string;
  hip: string;
  thigh: string;
  calf: string;
  notes: string;
};

type PhotoType = "fullBody" | "face" | "makeupFree";

type ToastState = {
  message: string;
};

const emptyStyleProfileForm: StyleProfileForm = {
  genderPreference: "不限定",
  height: "",
  weight: "",
  clothingSize: "",
  shoeSize: "",
  favoriteStyles: "",
  favoriteColors: "",
  avoidColors: "",
  commonOccasions: "",
  elementPreferences: "",
  fitPreferences: "",
  shoulder: "",
  bust: "",
  waist: "",
  hip: "",
  thigh: "",
  calf: "",
  notes: "",
};

const genderPreferenceOptions = ["女性", "男性", "中性", "不限定"];

const photoCards: Array<{ id: PhotoType; title: string; description: string; accent: string }> = [
  { id: "fullBody", title: "全身照", description: "展示你的身材比例", accent: "#c79665" },
  { id: "face", title: "脸部照", description: "用于分析五官特征", accent: "#9b8977" },
  { id: "makeupFree", title: "素颜照", description: "用于分析肤色特性", accent: "#b98277" },
];

const reportCards: Array<{ key: keyof NonNullable<H5StyleProfileArchive["analysisReport"]>; label: string }> = [
  { key: "bodyFeature", label: "身材特征" },
  { key: "skinFeature", label: "肤色特征" },
  { key: "facialFeature", label: "五官特征" },
  { key: "hairFeature", label: "发质特征" },
  { key: "colorSeason", label: "个人色彩" },
  { key: "stylePositioning", label: "风格定位" },
];

const stylePreviewImages = [
  "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=480&q=82",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=480&q=82",
  "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=480&q=82",
  "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=480&q=82",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=480&q=82",
];

export function StyleProfileArchivePage() {
  const router = useRouter();
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [session, setSession] = useState<ReturnType<typeof readH5AuthSession>>(null);
  const [styleForm, setStyleForm] = useState<StyleProfileForm>(emptyStyleProfileForm);
  const [archive, setArchive] = useState<H5StyleProfileArchive | null>(null);
  const [savedStyleSnapshot, setSavedStyleSnapshot] = useState(
    serializeStyleForm(emptyStyleProfileForm),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<PhotoType | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const refreshSession = () => setSession(readH5AuthSession());
    refreshSession();
    return subscribeH5AuthSession(refreshSession);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchH5StyleProfileArchive()
      .then((nextStyleProfile) => {
        if (cancelled) return;
        const nextStyleForm = styleProfileToForm(nextStyleProfile);
        setArchive(nextStyleProfile);
        setStyleForm(nextStyleForm);
        setSavedStyleSnapshot(serializeStyleForm(nextStyleForm));
        setError("");
      })
      .catch((caughtError) => {
        if (cancelled) return;
        setArchive(null);
        setStyleForm(emptyStyleProfileForm);
        setSavedStyleSnapshot(serializeStyleForm(emptyStyleProfileForm));
        setError(caughtError instanceof Error ? caughtError.message : "风格档案读取失败。");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const dirty = serializeStyleForm(styleForm) !== savedStyleSnapshot;
  const completionPercent = Math.max(0, Math.min(100, Math.round(archive?.completionPercent ?? 0)));
  const recommendedColors = archive?.recommendedColors || [];
  const recommendedStyles = archive?.recommendedStyles || [];
  const photoCount = photoCards.filter((item) => archive?.basePhotos?.[item.id]?.url).length;
  const updatedText = useMemo(() => formatArchiveUpdatedAt(archive?.analysisUpdatedAt || archive?.updatedAt), [
    archive?.analysisUpdatedAt,
    archive?.updatedAt,
  ]);

  function updateStyleField(field: keyof StyleProfileForm, value: string) {
    setStyleForm((current) => ({ ...current, [field]: value }));
  }

  function scrollToSettings() {
    settingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!dirty) {
      setToast({ message: "档案没有变化" });
      return;
    }

    setSaving(true);
    setError("");
    try {
      const savedStyle = await updateH5StyleProfileArchive(formToStyleProfile(styleForm));
      const savedStyleForm = styleProfileToForm(savedStyle);
      setArchive(savedStyle);
      setStyleForm(savedStyleForm);
      setSavedStyleSnapshot(serializeStyleForm(savedStyleForm));
      setToast({ message: "风格档案已保存" });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "风格档案保存失败。");
    } finally {
      setSaving(false);
    }
  }

  async function analyzePhoto(photoType: PhotoType, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploadingPhoto) return;
    if (!file.type.startsWith("image/")) {
      setError("请上传 png、jpg 或 webp 图片。");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("上传照片不能超过 6MB。");
      return;
    }

    setUploadingPhoto(photoType);
    setError("");
    try {
      const photoDataUrl = await readFileAsDataUrl(file);
      const nextArchive = await analyzeH5StyleProfilePhoto({ photoType, photoDataUrl });
      const nextStyleForm = styleProfileToForm(nextArchive);
      setArchive(nextArchive);
      setStyleForm(nextStyleForm);
      setSavedStyleSnapshot(serializeStyleForm(nextStyleForm));
      setToast({ message: "AI 分析已更新" });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "风格照片分析失败。");
    } finally {
      setUploadingPhoto(null);
    }
  }

  return (
    <form className="style-guide-screen" onSubmit={submit}>
      <div className="style-guide-topbar">
        <button type="button" aria-label="返回" onClick={() => router.back()}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1>风格档案 <Sparkles size={18} /></h1>
          <p>了解自己，遇见更美的穿搭</p>
        </div>
        <button className="style-guide-settings-button" type="button" onClick={scrollToSettings}>
          <Settings2 size={17} />
          <span>档案设置</span>
        </button>
      </div>

      {error ? <div className="profile-settings-error">{error}</div> : null}

      <section className="style-guide-completion-card" aria-busy={loading}>
        <div className="style-guide-avatar">
          {session?.user.avatar ? (
            <img alt={session.user.nickName || "头像"} src={resolveBackendAssetUrl(session.user.avatar)} />
          ) : (
            <UserRound size={30} />
          )}
        </div>
        <div className="style-guide-completion-copy">
          <strong>{session?.user.nickName || "完善档案，生成更精准的穿搭方案"}</strong>
          <span>
            {photoCount ? `已上传 ${photoCount}/3 张基础照片` : "上传基础照片后，AI 会生成专属分析报告"}
          </span>
          <button type="button" onClick={scrollToSettings}>完善档案</button>
        </div>
        <div className="style-guide-completion-ring" style={{ "--percent": completionPercent } as CSSProperties}>
          <span>{completionPercent}%</span>
          <small>完整度</small>
        </div>
      </section>

      <SectionHeader title="基础照片" actionText={updatedText} />
      <section className="style-guide-photo-grid">
        {photoCards.map((photo) => {
          const uploaded = archive?.basePhotos?.[photo.id];
          const imageUrl = resolveBackendAssetUrl(uploaded?.url);
          const uploading = uploadingPhoto === photo.id;

          return (
            <label className="style-guide-photo-card" key={photo.id} style={{ "--accent": photo.accent } as CSSProperties}>
              <input
                accept="image/png,image/jpeg,image/jpg,image/webp"
                disabled={Boolean(uploadingPhoto)}
                type="file"
                onChange={(event) => void analyzePhoto(photo.id, event)}
              />
              <div className="style-guide-photo-preview">
                {imageUrl ? <img alt={photo.title} src={imageUrl} /> : <Camera size={30} />}
                {uploading ? (
                  <div className="style-guide-photo-loading">
                    <Loader2 className="profile-settings-spinner" size={22} />
                    <span>分析中</span>
                  </div>
                ) : null}
              </div>
              <strong>{photo.title}</strong>
              <span>{photo.description}</span>
              <em>{imageUrl ? "重新上传" : "上传照片"}</em>
            </label>
          );
        })}
      </section>

      <SectionHeader
        title="AI 分析报告"
        icon={<RefreshCw className={uploadingPhoto ? "profile-settings-spinner" : ""} size={16} />}
        actionText={archive?.analysisReport ? "已生成" : "待生成"}
      />
      <section className="style-guide-report-grid">
        {reportCards.map((item) => (
          <ReportCard
            key={item.key}
            label={item.label}
            item={archive?.analysisReport?.[item.key]}
          />
        ))}
      </section>

      <SectionHeader title="推荐色彩" />
      {recommendedColors.length ? (
        <section className="style-guide-color-strip">
          {recommendedColors.map((color) => (
            <ColorSwatch color={color} key={`${color.label}-${color.value}`} />
          ))}
        </section>
      ) : (
        <EmptyGuideState text="上传素颜照后生成适合你的专属色彩" />
      )}

      <SectionHeader title="推荐风格" />
      {recommendedStyles.length ? (
        <section className="style-guide-style-strip">
          {recommendedStyles.map((style, index) => (
            <StyleCard item={style} index={index} key={`${style.label}-${index}`} />
          ))}
        </section>
      ) : (
        <EmptyGuideState text="上传基础照片后生成适合你的风格定位" />
      )}

      <div ref={settingsRef} />
      <section className="profile-settings-panel style-guide-settings-panel">
        <div className="profile-settings-panel-title">
          <Ruler size={18} />
          <h2>档案设置</h2>
        </div>
        <div className="style-guide-gender-field">
          <span>穿搭性别偏好</span>
          <div className="style-guide-gender-options" role="group" aria-label="穿搭性别偏好">
            {genderPreferenceOptions.map((option) => (
              <button
                aria-pressed={styleForm.genderPreference === option}
                className={styleForm.genderPreference === option ? "is-active" : ""}
                key={option}
                type="button"
                onClick={() => updateStyleField("genderPreference", option)}
              >
                {option}
              </button>
            ))}
          </div>
          <small>会影响版型、单品和模特表达，不从照片里猜测。</small>
        </div>
        <div className="profile-settings-grid">
          <StyleInput label="身高" value={styleForm.height} placeholder="168cm" onChange={(value) => updateStyleField("height", value)} />
          <StyleInput label="体重" value={styleForm.weight} placeholder="52kg" onChange={(value) => updateStyleField("weight", value)} />
          <StyleInput label="服装尺码" value={styleForm.clothingSize} placeholder="M / 160" onChange={(value) => updateStyleField("clothingSize", value)} />
          <StyleInput label="鞋码" value={styleForm.shoeSize} placeholder="38" onChange={(value) => updateStyleField("shoeSize", value)} />
          <StyleInput label="肩宽" value={styleForm.shoulder} placeholder="38cm" onChange={(value) => updateStyleField("shoulder", value)} />
          <StyleInput label="胸围" value={styleForm.bust} placeholder="84cm" onChange={(value) => updateStyleField("bust", value)} />
          <StyleInput label="腰围" value={styleForm.waist} placeholder="66cm" onChange={(value) => updateStyleField("waist", value)} />
          <StyleInput label="臀围" value={styleForm.hip} placeholder="90cm" onChange={(value) => updateStyleField("hip", value)} />
          <StyleInput label="大腿围" value={styleForm.thigh} placeholder="52cm" onChange={(value) => updateStyleField("thigh", value)} />
          <StyleInput label="小腿围" value={styleForm.calf} placeholder="34cm" onChange={(value) => updateStyleField("calf", value)} />
        </div>
      </section>

      <section className="profile-settings-panel">
        <div className="profile-settings-panel-title">
          <Palette size={18} />
          <h2>喜好数据</h2>
        </div>
        <StyleInput label="喜欢的风格" value={styleForm.favoriteStyles} placeholder="法式通勤、松弛休闲" onChange={(value) => updateStyleField("favoriteStyles", value)} />
        <StyleInput label="喜欢的颜色" value={styleForm.favoriteColors} placeholder="黑色、燕麦色、浅蓝" onChange={(value) => updateStyleField("favoriteColors", value)} />
        <StyleInput label="避开颜色" value={styleForm.avoidColors} placeholder="荧光色、高饱和粉" onChange={(value) => updateStyleField("avoidColors", value)} />
        <StyleInput label="常用场景" value={styleForm.commonOccasions} placeholder="通勤、约会、周末出游" onChange={(value) => updateStyleField("commonOccasions", value)} />
        <StyleInput label="元素偏好" value={styleForm.elementPreferences} placeholder="针织、高腰线、利落廓形" onChange={(value) => updateStyleField("elementPreferences", value)} />
        <StyleInput label="版型偏好" value={styleForm.fitPreferences} placeholder="直筒、微宽松、A字" onChange={(value) => updateStyleField("fitPreferences", value)} />
      </section>

      <section className="profile-settings-panel">
        <div className="profile-settings-panel-title">
          <Tags size={18} />
          <h2>补充说明</h2>
        </div>
        <label className="profile-settings-field">
          <span>穿搭备注</span>
          <textarea
            maxLength={500}
            placeholder="例如：上班需要低调一点，周末可以更有设计感"
            value={styleForm.notes}
            onChange={(event) => updateStyleField("notes", event.target.value)}
          />
        </label>
      </section>

      {!session ? (
        <Link className="style-archive-login-link" href="/login">
          登录后同步到账号
        </Link>
      ) : null}

      <div className="profile-settings-actions">
        <button disabled={!dirty || saving} type="submit">
          {saving ? <Loader2 className="profile-settings-spinner" size={18} /> : <Check size={18} />}
          <span>{saving ? "正在保存" : "保存风格档案"}</span>
        </button>
      </div>

      {toast ? <div className="profile-toast">{toast.message}</div> : null}
    </form>
  );
}

function SectionHeader({
  title,
  actionText,
  icon,
}: {
  title: string;
  actionText?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="style-guide-section-header">
      <h2>{title}</h2>
      {actionText || icon ? (
        <span>
          {icon}
          {actionText}
        </span>
      ) : null}
    </div>
  );
}

function ReportCard({ label, item }: { label: string; item?: H5StyleAnalysisItem }) {
  const points = item?.points?.filter(Boolean) || [];
  return (
    <article className="style-guide-report-card">
      <span>{label}</span>
      <strong>{item?.title || "待补充照片确认"}</strong>
      {points.length ? (
        <p>{points.slice(0, 3).join("、")}</p>
      ) : (
        <p>上传对应照片后生成更细的风格判断</p>
      )}
      {item?.advice ? <em>{item.advice}</em> : null}
    </article>
  );
}

function ColorSwatch({ color }: { color: H5ColorPreferenceItem }) {
  return (
    <div className="style-guide-color-swatch">
      <i style={{ background: color.value }} />
      <span>{color.label}</span>
    </div>
  );
}

function StyleCard({ item, index }: { item: H5RecommendedStyleItem; index: number }) {
  const imageUrl = resolveBackendAssetUrl(item.imageUrl) || stylePreviewImages[index % stylePreviewImages.length];
  return (
    <article className="style-guide-style-card">
      <img alt={item.label} src={imageUrl} />
      <strong>{item.label}</strong>
      {item.description ? <span>{item.description}</span> : null}
    </article>
  );
}

function EmptyGuideState({ text }: { text: string }) {
  return (
    <div className="style-guide-empty">
      <Upload size={18} />
      <span>{text}</span>
    </div>
  );
}

function StyleInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="profile-settings-field">
      <span>{label}</span>
      <input
        maxLength={120}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function styleProfileToForm(profile: H5StyleProfileArchive): StyleProfileForm {
  return {
    genderPreference: normalizeGenderPreference(profile.genderPreference),
    height: profile.height ?? "",
    weight: profile.weight ?? "",
    clothingSize: profile.clothingSize ?? "",
    shoeSize: profile.shoeSize ?? "",
    favoriteStyles: joinList(profile.favoriteStyles),
    favoriteColors: joinList(profile.favoriteColors),
    avoidColors: joinList(profile.avoidColors),
    commonOccasions: joinList(profile.commonOccasions),
    elementPreferences: joinList(profile.elementPreferences),
    fitPreferences: joinList(profile.fitPreferences),
    shoulder: profile.bodyMetrics?.shoulder ?? "",
    bust: profile.bodyMetrics?.bust ?? "",
    waist: profile.bodyMetrics?.waist ?? "",
    hip: profile.bodyMetrics?.hip ?? "",
    thigh: profile.bodyMetrics?.thigh ?? "",
    calf: profile.bodyMetrics?.calf ?? "",
    notes: profile.notes ?? "",
  };
}

function formToStyleProfile(
  form: StyleProfileForm,
): Omit<H5StyleProfileArchive, "profileId" | "userId" | "updatedAt"> {
  return {
    genderPreference: normalizeGenderPreference(form.genderPreference),
    height: form.height.trim(),
    weight: form.weight.trim(),
    clothingSize: form.clothingSize.trim(),
    shoeSize: form.shoeSize.trim(),
    favoriteStyles: splitList(form.favoriteStyles),
    favoriteColors: splitList(form.favoriteColors),
    avoidColors: splitList(form.avoidColors),
    commonOccasions: splitList(form.commonOccasions),
    elementPreferences: splitList(form.elementPreferences),
    fitPreferences: splitList(form.fitPreferences),
    bodyMetrics: {
      shoulder: form.shoulder.trim(),
      bust: form.bust.trim(),
      waist: form.waist.trim(),
      hip: form.hip.trim(),
      thigh: form.thigh.trim(),
      calf: form.calf.trim(),
    },
    notes: form.notes.trim(),
  };
}

function normalizeGenderPreference(value?: string) {
  const text = value?.trim();
  if (!text || text === "不限") return "不限定";
  return genderPreferenceOptions.includes(text) ? text : text.slice(0, 40);
}

function serializeStyleForm(form: StyleProfileForm) {
  return JSON.stringify(formToStyleProfile(form));
}

function joinList(items?: string[]) {
  return (items || []).join("、");
}

function splitList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[，,、/｜|;；\s]+/u)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 16);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("照片读取失败。"));
    reader.readAsDataURL(file);
  });
}

function formatArchiveUpdatedAt(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}/${date.getDate()} 已更新`;
}
