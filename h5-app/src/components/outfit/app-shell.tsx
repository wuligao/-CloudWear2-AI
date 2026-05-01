import Link from "next/link";
import { ChevronLeft, Clock3 } from "lucide-react";
import { GlobalGenerationMonitor } from "@/components/outfit/global-generation-monitor";
import { GlobalBottomNav } from "@/components/outfit/global-navigation";

interface AppShellProps {
  children: React.ReactNode;
  hideHeader?: boolean;
  hideBottomNav?: boolean;
  hideTopHeader?: boolean;
}

export function AppShell({
  children,
  hideBottomNav = false,
  hideHeader = false,
  hideTopHeader = false,
}: AppShellProps) {
  const frameClassName = [
    hideHeader ? "app-frame app-frame-full" : "app-frame px-3 py-4 md:px-6 md:py-8",
    hideBottomNav ? "app-frame-no-bottom-nav" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const mainClassName = [
    hideHeader
      ? "h-full"
      : hideTopHeader
        ? "app-main-with-nav app-main-immersive"
        : "app-main-with-nav px-4 pt-3",
    hideBottomNav ? "app-main-no-bottom-nav" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={frameClassName}>
      <div className="phone-shell">
        {hideHeader || hideTopHeader ? null : (
          <header className="app-header">
            <Link className="header-icon" href="/" aria-label="返回首页">
              <ChevronLeft size={22} />
            </Link>
            <Link className="header-title" href="/">
              <span>云裳 AI</span>
              <small>CloudWear</small>
            </Link>
            <Link className="header-history" href="/history" aria-label="查看历史">
              <Clock3 size={16} />
              <span>历史</span>
            </Link>
          </header>
        )}
        <main className={mainClassName}>
          {children}
        </main>
        <GlobalGenerationMonitor />
        {hideHeader || hideBottomNav ? null : <GlobalBottomNav />}
      </div>
    </div>
  );
}
