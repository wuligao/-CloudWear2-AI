"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Loader2, Palette, Ruler, Tags, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { readH5AuthSession, subscribeH5AuthSession } from "@/lib/auth";
import {
  fetchH5StyleProfileArchive,
  updateH5StyleProfileArchive,
} from "@/lib/profile-overview";
import type { H5StyleProfileArchive } from "@/types/profile";

type StyleProfileForm = {
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

type ToastState = {
  id: number;
  message: string;
};

const emptyStyleProfileForm: StyleProfileForm = {
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

export function StyleProfileArchivePage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof readH5AuthSession>>(null);
  const [styleForm, setStyleForm] = useState<StyleProfileForm>(emptyStyleProfileForm);
  const [savedStyleSnapshot, setSavedStyleSnapshot] = useState(
    serializeStyleForm(emptyStyleProfileForm),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        setStyleForm(nextStyleForm);
        setSavedStyleSnapshot(serializeStyleForm(nextStyleForm));
        setError("");
      })
      .catch((caughtError) => {
        if (cancelled) return;
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

  function updateStyleField(field: keyof StyleProfileForm, value: string) {
    setStyleForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!dirty) {
      setToast({ id: Date.now(), message: "档案没有变化" });
      return;
    }

    setSaving(true);
    setError("");
    try {
      const savedStyle = styleProfileToForm(
        await updateH5StyleProfileArchive(formToStyleProfile(styleForm)),
      );
      setStyleForm(savedStyle);
      setSavedStyleSnapshot(serializeStyleForm(savedStyle));
      setToast({ id: Date.now(), message: "风格档案已保存" });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "风格档案保存失败。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="profile-settings-screen" onSubmit={submit}>
      <div className="profile-settings-topbar">
        <button type="button" aria-label="返回" onClick={() => router.back()}>
          <ChevronLeft size={20} />
        </button>
        <h1>风格档案</h1>
        <button className="profile-settings-top-save" disabled={!dirty || saving} type="submit">
          {saving ? <Loader2 className="profile-settings-spinner" size={17} /> : <Check size={17} />}
        </button>
      </div>

      <section className="profile-settings-hero" aria-busy={loading}>
        <div className="style-archive-edit-icon">
          <UserRound size={34} />
        </div>
        <div className="profile-settings-hero-copy">
          <strong>{session?.user.nickName || "我的风格档案"}</strong>
          <span>{session ? "已登录同步" : "本机保存，登录后可同步"}</span>
        </div>
      </section>

      {error ? <div className="profile-settings-error">{error}</div> : null}

      <section className="profile-settings-panel">
        <div className="profile-settings-panel-title">
          <Ruler size={18} />
          <h2>身材数据</h2>
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
