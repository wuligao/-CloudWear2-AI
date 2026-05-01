"use client";

import { Check, CircleDotDashed, Sparkles } from "lucide-react";

interface AuthLoadingOverlayProps {
  visible: boolean;
  title: string;
  subtitle: string;
  steps: string[];
  tone?: "login" | "logout";
}

export function AuthLoadingOverlay({
  visible,
  title,
  subtitle,
  steps,
  tone = "login",
}: AuthLoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div
      aria-label={title}
      aria-live="polite"
      className={`cw-auth-loading-overlay is-${tone}`}
      role="status"
    >
      <section className="cw-auth-loading-card">
        <div className="cw-auth-loading-mark" aria-hidden="true">
          <Sparkles size={25} strokeWidth={2.35} />
          <span />
        </div>
        <div className="cw-auth-loading-copy">
          <strong>{title}</strong>
          <p>{subtitle}</p>
        </div>
        <div className="cw-auth-loading-scan" aria-hidden="true">
          <span />
        </div>
        <div className="cw-auth-loading-steps" aria-hidden="true">
          {steps.map((step, index) => (
            <div className={index === 0 ? "is-done" : "is-running"} key={step}>
              {index === 0 ? <Check size={16} /> : <CircleDotDashed size={16} />}
              <span>{step}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
