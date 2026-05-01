"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  fetchH5Profile,
  readH5AuthSession,
  subscribeH5AuthSession,
  updateH5Profile,
  uploadH5Avatar,
  type H5AuthUser,
} from "@/lib/auth";
import { resolveBackendAssetUrl } from "@/lib/api-endpoints";

type ToastState = {
  id: number;
  message: string;
};

const maxAvatarBytes = 4 * 1024 * 1024;
const acceptedAvatarTypes = ["image/jpeg", "image/png", "image/webp"];

export function ProfileSettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<ReturnType<typeof readH5AuthSession>>(null);
  const [profile, setProfile] = useState<H5AuthUser | null>(session?.user ?? null);
  const [nickName, setNickName] = useState(session?.user.nickName ?? "");
  const [avatarPreview, setAvatarPreview] = useState(session?.user.avatar ?? "");
  const [pendingAvatarDataUrl, setPendingAvatarDataUrl] = useState("");
  const [loading, setLoading] = useState(Boolean(session));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const refreshSession = () => setSession(readH5AuthSession());
    refreshSession();
    return subscribeH5AuthSession(refreshSession);
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    void fetchH5Profile()
      .then((nextProfile) => {
        if (cancelled) return;
        setProfile(nextProfile);
        setNickName(nextProfile.nickName);
        setAvatarPreview(nextProfile.avatar ?? "");
        setPendingAvatarDataUrl("");
        setError("");
      })
      .catch((caughtError) => {
        if (cancelled) return;
        setProfile(session.user);
        setNickName(session.user.nickName);
        setAvatarPreview(session.user.avatar ?? "");
        setError(caughtError instanceof Error ? caughtError.message : "资料读取失败。");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const displayName = nickName.trim() || profile?.nickName || "云裳用户";
  const avatarInitial = displayName.slice(0, 1).toUpperCase();
  const avatarSrc = resolveAvatarSrc(avatarPreview);
  const userId = profile?.userId ? String(profile.userId).padStart(4, "0") : "";
  const dirty =
    Boolean(pendingAvatarDataUrl) || nickName.trim() !== (profile?.nickName ?? "").trim();

  function showToast(message: string) {
    setToast({ id: Date.now(), message });
  }

  function openAvatarPicker() {
    fileInputRef.current?.click();
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!acceptedAvatarTypes.includes(file.type)) {
      setError("头像仅支持 JPG、PNG 或 WebP。");
      return;
    }

    if (file.size > maxAvatarBytes) {
      setError("头像大小不能超过 4MB。");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setError("");
    setAvatarPreview(dataUrl);
    setPendingAvatarDataUrl(dataUrl);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || saving) return;

    const nextNickName = nickName.trim();
    if (!nextNickName) {
      setError("昵称不能为空。");
      return;
    }

    if (nextNickName.length > 50) {
      setError("昵称不能超过 50 个字符。");
      return;
    }

    if (!dirty) {
      showToast("资料没有变化");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const avatar = pendingAvatarDataUrl
        ? await uploadH5Avatar(pendingAvatarDataUrl)
        : profile.avatar;
      const nextProfile = await updateH5Profile({
        nickName: nextNickName,
        avatar,
      });
      setProfile(nextProfile);
      setNickName(nextProfile.nickName);
      setAvatarPreview(nextProfile.avatar ?? "");
      setPendingAvatarDataUrl("");
      showToast("资料已保存");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "保存失败，请稍后再试。");
    } finally {
      setSaving(false);
    }
  }

  if (!session) {
    return (
      <section className="profile-settings-screen">
        <div className="profile-settings-topbar">
          <button type="button" aria-label="返回" onClick={() => router.back()}>
            <ChevronLeft size={20} />
          </button>
          <h1>账户设置</h1>
          <span />
        </div>
        <div className="profile-settings-empty">
          <UserRound size={34} />
          <strong>登录后可编辑资料</strong>
          <Link href="/login">
            去登录
            <ChevronRight size={16} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form className="profile-settings-screen" onSubmit={submit}>
      <div className="profile-settings-topbar">
        <button type="button" aria-label="返回" onClick={() => router.back()}>
          <ChevronLeft size={20} />
        </button>
        <h1>账户设置</h1>
        <button
          className="profile-settings-top-save"
          disabled={!dirty || saving}
          type="submit"
        >
          {saving ? <Loader2 className="profile-settings-spinner" size={17} /> : <Check size={17} />}
        </button>
      </div>

      <section className="profile-settings-hero" aria-busy={loading}>
        <div className="profile-settings-avatar-wrap">
          <button
            className="profile-settings-avatar"
            style={avatarSrc ? { backgroundImage: `url("${avatarSrc}")` } : undefined}
            type="button"
            aria-label="修改头像"
            onClick={openAvatarPicker}
          >
            {avatarSrc ? null : <span>{avatarInitial}</span>}
          </button>
          <button
            className="profile-settings-camera"
            type="button"
            aria-label="选择头像"
            onClick={openAvatarPicker}
          >
            <Camera size={17} />
          </button>
          <input
            ref={fileInputRef}
            accept={acceptedAvatarTypes.join(",")}
            className="profile-settings-file"
            type="file"
            onChange={handleAvatarChange}
          />
        </div>
        <div className="profile-settings-hero-copy">
          <strong>{displayName}</strong>
          <span>ID：{userId}</span>
        </div>
      </section>

      {error ? <div className="profile-settings-error">{error}</div> : null}

      <section className="profile-settings-panel">
        <div className="profile-settings-panel-title">
          <UserRound size={18} />
          <h2>基础资料</h2>
        </div>
        <label className="profile-settings-field">
          <span>昵称</span>
          <input
            autoComplete="nickname"
            maxLength={50}
            placeholder="输入昵称"
            value={nickName}
            onChange={(event) => setNickName(event.target.value)}
          />
        </label>
      </section>

      <section className="profile-settings-panel">
        <div className="profile-settings-panel-title">
          <ShieldCheck size={18} />
          <h2>账号信息</h2>
        </div>
        <div className="profile-settings-readonly">
          <span>
            <Phone size={17} />
            手机号
          </span>
          <strong>{maskPhone(profile?.phone ?? "")}</strong>
        </div>
        <div className="profile-settings-readonly">
          <span>
            <UserRound size={17} />
            用户 ID
          </span>
          <strong>{userId}</strong>
        </div>
      </section>

      <div className="profile-settings-actions">
        <button disabled={!dirty || saving} type="submit">
          {saving ? <Loader2 className="profile-settings-spinner" size={18} /> : <Check size={18} />}
          <span>{saving ? "正在保存" : "保存修改"}</span>
        </button>
      </div>

      {toast ? <div className="profile-toast">{toast.message}</div> : null}
    </form>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(new Error("头像读取失败。")));
    reader.readAsDataURL(file);
  });
}

function maskPhone(phone: string) {
  if (!phone) return "";
  return phone.replace(/^(\d{3})\d{4}(\d+)/u, "$1****$2");
}

function resolveAvatarSrc(avatar?: string) {
  return resolveBackendAssetUrl(avatar);
}
