"use client";

import { ArrowRight, Loader2, LogIn } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  buildH5LoginHref,
  clearH5AuthSession,
  fetchH5Profile,
  readH5AuthSession,
  subscribeH5AuthSession,
} from "@/lib/auth";

const loginRedirectDelayMs = 1200;
type AuthGateStatus = "checking" | "authorized" | "unauthorized";

export function RequireH5Auth({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthGateStatus>("checking");

  function goLoginNow() {
    window.location.replace(buildH5LoginHref());
  }

  useEffect(() => {
    let redirectTimer: number | undefined;
    let checkSeq = 0;

    function checkAuth() {
      const currentSeq = checkSeq + 1;
      checkSeq = currentSeq;
      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
        redirectTimer = undefined;
      }

      if (readH5AuthSession()) {
        setStatus("checking");
        void fetchH5Profile()
          .then(() => {
            if (currentSeq === checkSeq) setStatus("authorized");
          })
          .catch(() => {
            if (currentSeq !== checkSeq) return;
            clearH5AuthSession();
            setStatus("unauthorized");
            redirectTimer = window.setTimeout(() => {
              window.location.replace(buildH5LoginHref());
            }, loginRedirectDelayMs);
          });
        return;
      }

      setStatus("unauthorized");
      redirectTimer = window.setTimeout(() => {
        window.location.replace(buildH5LoginHref());
      }, loginRedirectDelayMs);
    }

    checkAuth();
    const unsubscribe = subscribeH5AuthSession(checkAuth);
    return () => {
      if (redirectTimer) window.clearTimeout(redirectTimer);
      unsubscribe();
    };
  }, []);

  if (status === "authorized") return children;

  if (status === "checking") {
    return (
      <section className="cw-auth-required-screen">
        <div className="cw-auth-required-card is-checking">
          <span>CloudWear</span>
          <Loader2 className="cw-auth-checking-icon" size={24} />
          <h1>正在进入</h1>
          <p>正在确认登录状态，并同步你的云裳衣橱。</p>
          <small>请稍候...</small>
        </div>
      </section>
    );
  }

  if (status === "unauthorized") {
    return (
      <section className="cw-auth-required-screen">
        <div className="cw-auth-required-card">
          <span>CloudWear</span>
          <h1>请先登录</h1>
          <p>登录后即可继续使用 AI 衣橱、风格档案和 AI 换搭功能。</p>
          <button type="button" onClick={goLoginNow}>
            <LogIn size={17} />
            <strong>去登录</strong>
            <ArrowRight size={16} />
          </button>
          <small>稍后将自动前往登录页面</small>
        </div>
      </section>
    );
  }
}
