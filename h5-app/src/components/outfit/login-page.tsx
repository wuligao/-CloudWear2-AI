"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ChevronRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Loader2,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";
import {
  loginH5User,
  normalizeH5RedirectPath,
  normalizeLoginPhone,
  registerH5User,
} from "@/lib/auth";
import { outfitApiEndpoints, resolveBackendAssetUrl } from "@/lib/api-endpoints";
import { fetchWithTimeout } from "@/lib/request-timeout";
import {
  defaultH5OutfitConfigOptions,
  H5LoginConfig,
  H5OutfitConfigResponse,
  mergeH5ConfigOptions,
} from "@/lib/h5-config";
import { AuthLoadingOverlay } from "@/components/outfit/auth-loading-overlay";

type LoginMode = "login" | "register";
const authLoadingMinimumMs = 900;
const loginConfigTimeoutMs = 2500;

export function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [nickName, setNickName] = useState("");
  const [remember, setRemember] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const currentSearch = useLocationSearch();
  const loginParams = useMemo(() => new URLSearchParams(currentSearch), [currentSearch]);
  const redirectTo = normalizeH5RedirectPath(loginParams.get("redirect"));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginConfig, setLoginConfig] = useState<H5LoginConfig | null>(null);
  const [configError, setConfigError] = useState("");
  const activeLoginConfig = loginConfig || defaultH5OutfitConfigOptions.login;
  const phonePasswordEnabled = activeLoginConfig.phonePasswordEnabled !== false;
  const registerEnabled = phonePasswordEnabled && activeLoginConfig.registerEnabled !== false;
  const wechatEnabled = activeLoginConfig.wechatEnabled !== false;
  const hasAvailableLoginMethod = phonePasswordEnabled || wechatEnabled;

  useEffect(() => {
    let cancelled = false;

    async function loadH5Config() {
      try {
        const response = await fetchWithTimeout(outfitApiEndpoints.h5Config(), {
          cache: "no-store",
        }, loginConfigTimeoutMs);
        const payload = (await response.json()) as H5OutfitConfigResponse;
        if (!response.ok || payload.code !== 200) {
          throw new Error(payload.message || "H5配置读取失败。");
        }
        if (!cancelled) {
          setConfigError("");
          setLoginConfig(mergeH5ConfigOptions(payload.data?.options).login);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setConfigError(
            caughtError instanceof Error ? caughtError.message : "H5配置读取失败。",
          );
          setLoginConfig(defaultH5OutfitConfigOptions.login);
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
      await minimumLoading;
      router.replace(redirectTo);
    } catch (caughtError) {
      await minimumLoading;
      setError(caughtError instanceof Error ? caughtError.message : "登录失败，请稍后再试。");
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode: LoginMode) {
    setMode(nextMode);
    setError("");
  }

  if (!loginConfig) {
    return <LoginConfigLoadingScreen error={configError} />;
  }

  return (
    <div className="cw-login-screen">
      <section className="cw-login-hero" aria-label="云裳 AI 穿搭">
        <Image
          alt={activeLoginConfig.heroAlt}
          className="cw-login-hero-image"
          fill
          priority
          sizes="430px"
          src={resolveBackendAssetUrl(activeLoginConfig.heroImage)}
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

            <label className="cw-login-agreement">
              <input
                checked={accepted}
                disabled={isSubmitting}
                type="checkbox"
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>
                我已阅读并同意 <button type="button">《用户协议》</button> 和{" "}
                <button type="button">《隐私政策》</button>
              </span>
            </label>
          </form>
        ) : wechatEnabled ? (
          <div className="cw-login-wechat-only">
            {error ? <p className="cw-login-error">{error}</p> : null}
            <WechatLoginButton
              disabled={isSubmitting}
              onClick={() => setError("微信登录暂未接入，请联系管理员完成接入。")}
            />
          </div>
        ) : (
          <div className="cw-login-disabled">
            <LockKeyhole size={26} />
            <strong>当前没有开放的登录方式</strong>
            <span>可在后台 H5 配置中心开启手机号或微信登录入口。</span>
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
        <span>东方衣境</span>
        <p>
          云想衣裳花想容
          <br />
          春风拂槛露华浓
        </p>
        <small>登录后同步衣橱偏好与历史方案</small>
      </section>

      <AuthLoadingOverlay
        visible={isSubmitting}
        title={mode === "login" ? "正在进入云裳" : "正在创建账号"}
        subtitle="正在校验登录态，并为你同步个人衣橱偏好。"
        steps={
          mode === "login"
            ? ["账号校验", "同步偏好", "准备首页"]
            : ["创建身份", "写入衣橱", "自动登录"]
        }
      />
    </div>
  );
}

function wait(duration: number) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
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
