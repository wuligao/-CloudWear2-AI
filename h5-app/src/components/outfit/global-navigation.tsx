"use client";

import Link from "next/link";
import { BadgeCheck, Clock3, Home, Shirt, Sparkles, UserRound } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const navItems = [
  {
    href: "/",
    label: "首页",
    icon: Home,
    id: "home",
  },
  {
    href: "/history",
    label: "生成记录",
    icon: Clock3,
    id: "history",
  },
  {
    href: "/?screen=photo",
    label: "AI换搭",
    icon: Shirt,
    id: "ai",
    primary: true,
  },
  {
    href: "/profile",
    label: "风格档案",
    icon: BadgeCheck,
    id: "style",
  },
  {
    href: "/profile/settings",
    label: "我的",
    icon: UserRound,
    id: "mine",
  },
];

export function GlobalBottomNav() {
  return (
    <Suspense fallback={<GlobalBottomNavFallback />}>
      <GlobalBottomNavContent />
    </Suspense>
  );
}

function GlobalBottomNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const screen = searchParams.get("screen");
  const [pressedId, setPressedId] = useState("");
  const [previewId, setPreviewId] = useState("");
  const routeActiveIndex = navItems.findIndex((item) =>
    isNavItemActive(item, pathname, screen),
  );
  const previewIndex = navItems.findIndex((item) => item.id === previewId);
  const activeIndex = previewIndex >= 0 ? previewIndex : routeActiveIndex;
  const activeClassName = `active-${Math.max(0, activeIndex)}`;

  function releasePress() {
    window.setTimeout(() => {
      setPressedId("");
      setPreviewId("");
    }, 220);
  }

  function pressItem(id: string) {
    setPressedId(id);
    setPreviewId(id);
  }

  return (
    <nav className={`cw-bottom-nav ${activeClassName}`} aria-label="主要导航">
      <span className="cw-nav-track" aria-hidden="true" />
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = isNavItemActive(item, pathname, screen);
        const isPressed = pressedId === item.id;
        const isPreview = previewId === item.id;
        const className = [
          isActive || isPreview ? "is-active" : "",
          item.primary ? "is-primary" : "",
          isPressed ? "is-pressed" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={className || undefined}
            href={item.href}
            key={item.id}
            scroll={false}
            onPointerCancel={releasePress}
            onPointerDown={() => pressItem(item.id)}
            onPointerLeave={releasePress}
            onPointerUp={releasePress}
          >
            <span className="cw-nav-icon">
              <Icon size={20} strokeWidth={2.35} />
              {item.primary ? <Sparkles className="cw-nav-spark" size={14} strokeWidth={2.6} /> : null}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function GlobalBottomNavFallback() {
  return (
    <nav className="cw-bottom-nav active-0" aria-label="主要导航">
      <span className="cw-nav-track" aria-hidden="true" />
      {navItems.map((item) => {
        const Icon = item.icon;
        const className = [
          item.id === "home" ? "is-active" : "",
          item.primary ? "is-primary" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <Link
            aria-current={item.id === "home" ? "page" : undefined}
            className={className || undefined}
            href={item.href}
            key={item.id}
            scroll={false}
          >
            <span className="cw-nav-icon">
              <Icon size={20} strokeWidth={2.35} />
              {item.primary ? <Sparkles className="cw-nav-spark" size={14} strokeWidth={2.6} /> : null}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function isNavItemActive(
  item: (typeof navItems)[number],
  pathname: string,
  screen: string | null,
) {
  if (item.id === "ai") {
    return pathname === "/result" || (pathname === "/" && (screen === "photo" || screen === "keyword"));
  }
  if (item.id === "home") return pathname === "/" && !screen;
  if (item.id === "style") return pathname === "/profile" || pathname.startsWith("/profile/archive");
  if (item.id === "mine") {
    return pathname.startsWith("/profile/settings") || pathname.startsWith("/profile/account");
  }

  return pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
}
