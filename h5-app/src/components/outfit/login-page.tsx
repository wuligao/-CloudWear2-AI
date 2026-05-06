"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, MouseEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ChevronRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Loader2,
  MessageCircle,
  Phone,
  Sparkles,
  X,
} from "lucide-react";
import {
  fetchH5Profile,
  guestLoginH5User,
  loginH5User,
  normalizeH5RedirectPath,
  normalizeLoginPhone,
  registerH5User,
} from "@/lib/auth";
import { resolveBackendAssetUrl } from "@/lib/api-endpoints";
import {
  defaultH5OutfitConfigOptions,
  fetchH5OutfitConfigOptions,
  H5LoginHeroImageConfig,
  H5LoginPoemConfig,
  H5OutfitConfigOptions,
} from "@/lib/h5-config";
import { AuthLoadingOverlay } from "@/components/outfit/auth-loading-overlay";
import { fetchDailyWeatherContext } from "@/lib/daily-weather";
import { fetchH5ProfileOverview } from "@/lib/profile-overview";

type LoginMode = "login" | "register";
type LegalDocType = "terms" | "privacy";
const authLoadingMinimumMs = 900;
const loginConfigTimeoutMs = 2500;

const legalDocuments: Record<
  LegalDocType,
  {
    title: string;
    subtitle: string;
    updatedAt: string;
    sections: Array<{
      title: string;
      content: string;
    }>;
  }
> = {
  terms: {
    title: "用户协议",
    subtitle: "使用 CloudWear AI 前，请了解账号、服务和内容生成规则。",
    updatedAt: "2026-05-04",
    sections: [
      {
        title: "账号与登录",
        content:
          "你需要使用真实可用的手机号注册或登录，并妥善保管账号密码。因账号外借、泄露或设备丢失造成的操作记录，由账号持有人自行承担。",
      },
      {
        title: "AI 穿搭服务",
        content:
          "CloudWear AI 会根据你提交的关键词、照片、天气、风格档案和历史生成记录提供穿搭建议。AI 生成内容仅供审美和搭配参考，不构成医疗、法律、投资或其他专业建议。",
      },
      {
        title: "上传内容规范",
        content:
          "请勿上传侵犯他人权益、含敏感身份信息、违法违规或未经授权的人像照片。你应确认对上传内容拥有合法使用权，并授权平台为完成穿搭生成、展示和记录保存而处理相关内容。",
      },
      {
        title: "服务变更与限制",
        content:
          "平台可能因模型维护、额度限制、网络异常或安全风控暂停部分功能。若生成失败或结果不符合预期，可根据页面提示重试或切换可用模型。",
      },
    ],
  },
  privacy: {
    title: "隐私政策",
    subtitle: "我们尽量只收集完成穿搭生成和账号服务所必需的信息。",
    updatedAt: "2026-05-04",
    sections: [
      {
        title: "我们收集的信息",
        content:
          "为提供服务，我们会处理你的手机号、昵称、登录状态、风格档案、穿搭偏好、上传照片、生成结果、生成耗时和必要的设备网络日志。",
      },
      {
        title: "信息如何使用",
        content:
          "上述信息用于账号登录、身份校验、AI 穿搭生成、历史记录展示、每日推荐、问题排查、安全风控和服务质量优化。",
      },
      {
        title: "照片与生成记录",
        content:
          "你上传的照片会用于本次 AI 换搭生成，并可能与生成结果一起保存在你的历史记录中，方便你查看、放大、复用或删除。",
      },
      {
        title: "你的选择",
        content:
          "你可以在个人中心维护风格档案和账号信息，也可以删除不需要的生成记录。未勾选同意前，平台不会提交登录或注册请求。",
      },
    ],
  },
};

export function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [nickName, setNickName] = useState("");
  const [remember, setRemember] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const currentSearch = useLocationSearch();
  const loginParams = useMemo(() => new URLSearchParams(currentSearch), [currentSearch]);
  const redirectTo = normalizeH5RedirectPath(loginParams.get("redirect"));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [h5Options, setH5Options] = useState<H5OutfitConfigOptions | null>(null);
  const [configError, setConfigError] = useState("");
  const activeLoginConfig = h5Options?.login || defaultH5OutfitConfigOptions.login;
  const activeLoginHero = useMemo(
    () =>
      pickRandomItem<H5LoginHeroImageConfig>(
        activeLoginConfig.heroImages?.length
          ? activeLoginConfig.heroImages
          : [{ image: activeLoginConfig.heroImage, alt: activeLoginConfig.heroAlt }],
      ),
    [activeLoginConfig],
  );
  const activeLoginPoem = useMemo(
    () =>
      pickRandomItem<H5LoginPoemConfig>(
        activeLoginConfig.poems?.length
          ? activeLoginConfig.poems
          : defaultH5OutfitConfigOptions.login.poems,
      ),
    [activeLoginConfig],
  );
  const phonePasswordEnabled = activeLoginConfig.phonePasswordEnabled !== false;
  const registerEnabled = phonePasswordEnabled && activeLoginConfig.registerEnabled !== false;
  const wechatEnabled = activeLoginConfig.wechatEnabled !== false;
  const guestEnabled = activeLoginConfig.guestEnabled !== false;
  const hasAvailableLoginMethod = phonePasswordEnabled || wechatEnabled || guestEnabled;

  useEffect(() => {
    let cancelled = false;

    async function loadH5Config() {
      try {
        const options = await fetchH5OutfitConfigOptions({
          timeoutMs: loginConfigTimeoutMs,
        });
        if (!cancelled) {
          setConfigError("");
          setH5Options(options);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setConfigError(
            caughtError instanceof Error ? caughtError.message : "H5配置读取失败。",
          );
          setH5Options(defaultH5OutfitConfigOptions);
        }
        console.warn(
          caughtError instanceof Error
            ? caughtError.message
            : "H5配置读取失败。",
        );
      }
    }

    void loadH5Config();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode === "register" && !registerEnabled) {
      switchMode("login");
    }
  }, [mode, registerEnabled]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!phonePasswordEnabled) {
      setError("手机号登录暂未开放。");
      return;
    }

    const normalizedPhone = normalizeLoginPhone(phone);
    if (!/^1[3-9]\d{9}$/.test(normalizedPhone)) {
      setError("请输入正确的手机号。");
      return;
    }

    if (password.length < 6 || password.length > 32) {
      setError("密码长度需为 6-32 位。");
      return;
    }

    if (!accepted) {
      setError("请先阅读并同意用户协议和隐私政策。");
      return;
    }

    setIsSubmitting(true);
    const minimumLoading = wait(authLoadingMinimumMs);
    try {
      if (mode === "login") {
        await loginH5User({ phone: normalizedPhone, password, remember });
      } else {
        await registerH5User({
          phone: normalizedPhone,
          password,
          nickName,
          remember,
        });
      }
      await preloadH5LandingData(h5Options || defaultH5OutfitConfigOptions);
      await minimumLoading;
      router.replace(redirectTo);
    } catch (caughtError) {
      await minimumLoading;
      setError(caughtError instanceof Error ? caughtError.message : "登录失败，请稍后再试。");
      setIsSubmitting(false);
    }
  }

  async function submitGuestLogin() {
    setError("");

    if (!guestEnabled) {
      setError("游客登录暂未开放。");
      return;
    }

    if (!accepted) {
      setError("请先阅读并同意用户协议和隐私政策。");
      return;
    }

    setIsSubmitting(true);
    const minimumLoading = wait(authLoadingMinimumMs);
    try {
      await guestLoginH5User({ remember });
      await preloadH5LandingData(h5Options || defaultH5OutfitConfigOptions);
      await minimumLoading;
      router.replace(redirectTo);
    } catch (caughtError) {
      await minimumLoading;
      setError(caughtError instanceof Error ? caughtError.message : "游客登录失败，请稍后再试。");
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode: LoginMode) {
    setMode(nextMode);
    setError("");
  }

  function openLegalDoc(event: MouseEvent<HTMLButtonElement>, docType: LegalDocType) {
    event.preventDefault();
    event.stopPropagation();
    setActiveLegalDoc(docType);
  }

  if (!h5Options) {
    return <LoginConfigLoadingScreen error={configError} />;
  }

  return (
    <div className="cw-login-screen">
      <section className="cw-login-hero" aria-label="云裳 AI 穿搭">
        <Image
          alt={activeLoginHero.alt}
          className="cw-login-hero-image"
          fill
          priority
          sizes="430px"
          src={resolveBackendAssetUrl(activeLoginHero.image)}
          unoptimized
        />
        <div className="cw-login-brand">
          <Sparkles size={28} strokeWidth={2.4} />
          <h1>{renderBrandTitle(activeLoginConfig.brandTitle)}</h1>
          <p>{activeLoginConfig.subtitle}</p>
        </div>
      </section>

      <section className="cw-login-panel">
        {configError ? (
          <div className="cw-login-config-warning">{configError}，已使用默认登录配置。</div>
        ) : null}
        <div className="cw-login-heading">
          <span>
            {!hasAvailableLoginMethod
              ? "登录暂未开放"
              : mode === "login"
                ? "欢迎登录"
                : "创建账号"}
          </span>
          <p>
            {!hasAvailableLoginMethod
              ? "请稍后再试，或联系平台管理员"
              : mode === "login"
                ? registerEnabled
                  ? "未注册手机号将自动创建账号"
                  : "使用已注册手机号和密码登录"
                : "手机号注册后自动登录"}
          </p>
        </div>

        {phonePasswordEnabled ? (
          <form className="cw-login-form" onSubmit={submit}>
            {mode === "register" ? (
              <label className="cw-login-field">
                <span>昵称</span>
                <input
                  autoComplete="nickname"
                  disabled={isSubmitting}
                  maxLength={50}
                  placeholder="给自己取个昵称"
                  value={nickName}
                  onChange={(event) => setNickName(event.target.value)}
                />
              </label>
            ) : null}

            <label className="cw-login-field">
              <Phone size={22} strokeWidth={2.25} />
              <input
                autoComplete="tel"
                disabled={isSubmitting}
                inputMode="tel"
                maxLength={24}
                placeholder="请输入手机号"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>

            <label className="cw-login-field">
              <LockKeyhole size={22} strokeWidth={2.25} />
              <input
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                disabled={isSubmitting}
                maxLength={32}
                placeholder="请输入密码"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
                className="cw-login-icon-button"
                disabled={isSubmitting}
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={21} /> : <Eye size={21} />}
              </button>
            </label>

            <div className="cw-login-row">
              <label className="cw-login-check">
                <input
                  checked={remember}
                  disabled={isSubmitting}
                  type="checkbox"
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <span>记住我</span>
              </label>
              <button
                disabled={isSubmitting}
                type="button"
                onClick={() => setError("密码找回暂未接入，请先使用已注册手机号和密码登录。")}
              >
                忘记密码?
              </button>
            </div>

            {error ? <p className="cw-login-error">{error}</p> : null}

            <button className="cw-login-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <>
                  <Loader2 size={20} />
                  <span>正在进入首页</span>
                </>
              ) : (
                <span>{mode === "login" ? "登录 / 自动注册" : "注册并登录"}</span>
              )}
            </button>

            {wechatEnabled ? (
              <div className="cw-login-divider">
                <span />
                <em>其他登录方式</em>
                <span />
              </div>
            ) : null}

            {wechatEnabled ? (
              <WechatLoginButton
                disabled={isSubmitting}
                onClick={() => setError("微信登录暂未接入，请使用手机号登录。")}
              />
            ) : null}

            {guestEnabled ? (
              <button
                className="cw-login-guest"
                disabled={isSubmitting}
                type="button"
                onClick={submitGuestLogin}
              >
                <Sparkles size={18} />
                <span>游客体验</span>
              </button>
            ) : null}

            <label className="cw-login-agreement">
              <input
                checked={accepted}
                disabled={isSubmitting}
                type="checkbox"
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>
                我已阅读并同意{" "}
                <button type="button" onClick={(event) => openLegalDoc(event, "terms")}>
                  《用户协议》
                </button>{" "}
                和{" "}
                <button type="button" onClick={(event) => openLegalDoc(event, "privacy")}>
                  《隐私政策》
                </button>
              </span>
            </label>
          </form>
        ) : wechatEnabled || guestEnabled ? (
          <div className="cw-login-wechat-only">
            {error ? <p className="cw-login-error">{error}</p> : null}
            {wechatEnabled ? (
              <WechatLoginButton
                disabled={isSubmitting}
                onClick={() => setError("微信登录暂未接入，请联系管理员完成接入。")}
              />
            ) : null}
            {guestEnabled ? (
              <button
                className="cw-login-guest primary-guest"
                disabled={isSubmitting}
                type="button"
                onClick={submitGuestLogin}
              >
                <Sparkles size={18} />
                <span>游客体验</span>
              </button>
            ) : null}
            <label className="cw-login-agreement">
              <input
                checked={accepted}
                disabled={isSubmitting}
                type="checkbox"
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>
                我已阅读并同意{" "}
                <button type="button" onClick={(event) => openLegalDoc(event, "terms")}>
                  《用户协议》
                </button>{" "}
                和{" "}
                <button type="button" onClick={(event) => openLegalDoc(event, "privacy")}>
                  《隐私政策》
                </button>
              </span>
            </label>
          </div>
        ) : (
          <div className="cw-login-disabled">
            <LockKeyhole size={26} />
            <strong>当前没有开放的登录方式</strong>
            <span>可在后台 H5 配置中心开启手机号、游客或微信登录入口。</span>
          </div>
        )}

        {registerEnabled ? (
          <button
            className="cw-login-mode"
            disabled={isSubmitting}
            type="button"
            onClick={() => switchMode(mode === "login" ? "register" : "login")}
          >
            <span>{mode === "login" ? "新用户注册" : "已有账号登录"}</span>
            <ChevronRight size={18} />
          </button>
        ) : null}
      </section>

      <section className="cw-login-poem" aria-label="云裳灵感文案">
        <span>{activeLoginPoem.kicker}</span>
        <p>
          {activeLoginPoem.line1}
          {activeLoginPoem.line2 ? (
            <>
              <br />
              {activeLoginPoem.line2}
            </>
          ) : null}
        </p>
        <small>{activeLoginPoem.footer}</small>
      </section>

      {activeLegalDoc ? (
        <LegalDocumentDialog
          document={legalDocuments[activeLegalDoc]}
          onClose={() => setActiveLegalDoc(null)}
        />
      ) : null}

      <AuthLoadingOverlay
        visible={isSubmitting}
        title={mode === "login" ? "正在进入云裳" : "正在创建账号"}
        subtitle="正在一次性加载首页配置、天气推荐和个人风格档案。"
        steps={
          mode === "login"
            ? ["账号校验", "加载配置", "同步天气", "准备首页"]
            : ["创建身份", "加载配置", "同步档案", "准备首页"]
        }
      />
    </div>
  );
}

function LegalDocumentDialog({
  document,
  onClose,
}: {
  document: (typeof legalDocuments)[LegalDocType];
  onClose: () => void;
}) {
  return (
    <div className="cw-legal-dialog" role="dialog" aria-modal="true" aria-label={document.title}>
      <button
        className="cw-legal-dialog-backdrop"
        type="button"
        aria-label="关闭协议"
        onClick={onClose}
      />
      <section className="cw-legal-dialog-panel">
        <header className="cw-legal-dialog-head">
          <div>
            <span>CloudWear AI</span>
            <h2>{document.title}</h2>
            <p>{document.subtitle}</p>
            <small>更新日期：{document.updatedAt}</small>
          </div>
          <button type="button" aria-label="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="cw-legal-dialog-content">
          {document.sections.map((section) => (
            <article key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.content}</p>
            </article>
          ))}
        </div>
        <button className="cw-legal-dialog-confirm" type="button" onClick={onClose}>
          我知道了
        </button>
      </section>
    </div>
  );
}

async function preloadH5LandingData(options: H5OutfitConfigOptions) {
  await Promise.all([
    fetchH5Profile(),
    fetchH5OutfitConfigOptions({
      timeoutMs: loginConfigTimeoutMs,
    }),
    fetchH5ProfileOverview(),
    fetchDailyWeatherContext({
      tomorrowRecommendationStartHour: options.tomorrowRecommendationStartHour,
    }),
  ]);
}

function wait(duration: number) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function pickRandomItem<T>(items: T[]): T {
  const fallback = items[0];
  if (items.length <= 1) return fallback;

  const randomIndex =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? crypto.getRandomValues(new Uint32Array(1))[0] % items.length
      : Math.floor(Math.random() * items.length);
  return items[randomIndex] || fallback;
}

function useLocationSearch() {
  return useSyncExternalStore(
    subscribeLocationChange,
    () => window.location.search,
    () => "",
  );
}

function subscribeLocationChange(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function LoginConfigLoadingScreen({ error }: { error: string }) {
  return (
    <div className="cw-login-screen cw-login-config-state">
      <div className={error ? "cw-login-config-card is-error" : "cw-login-config-card"}>
        <div className="cw-login-config-mark" aria-hidden="true">
          {error ? (
            <LockKeyhole className="cw-login-config-error-icon" size={26} />
          ) : (
            <>
              <Sparkles size={25} />
              <i />
            </>
          )}
        </div>
        <div className="cw-login-config-copy">
          <span>CloudWear Access</span>
          <strong>{error ? "正在启用默认登录" : "正在载入登录空间"}</strong>
          <p>{error || "同步后台登录方式、品牌图和安全策略。"}</p>
        </div>
        <div className="cw-login-config-meter" aria-hidden="true">
          <span />
        </div>
        <div className="cw-login-config-grid" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="cw-login-config-status" aria-hidden="true">
          <span>CONFIG</span>
          <span>AUTH</span>
          <span>READY</span>
        </div>
      </div>
    </div>
  );
}

function WechatLoginButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="cw-wechat-button"
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      <MessageCircle size={28} fill="currentColor" strokeWidth={1.8} />
      <span>微信登录</span>
    </button>
  );
}

function renderBrandTitle(title: string) {
  const parts = title.split(/(AI)/i);
  return parts.map((part, index) =>
    part.toLowerCase() === "ai" ? (
      <span key={`${part}-${index}`}>{part}</span>
    ) : (
      part
    ),
  );
}
