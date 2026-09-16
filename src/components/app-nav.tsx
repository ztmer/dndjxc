"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRightIcon, PanelLeftCloseIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SiteBrandMark } from "@/components/site-brand-mark";
import { NAV_GROUPS, groupHasActive, navItemActive } from "@/components/nav-config";

export function AppNav({
  onHide,
  siteTitle,
  logoSrc,
}: {
  onHide: () => void;
  siteTitle: string;
  logoSrc?: string;
}) {
  const pathname = usePathname();
  const routeOpen = NAV_GROUPS.find((g) => groupHasActive(pathname, g.items))?.title ?? "工作台";
  const [peek, setPeek] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  useEffect(() => {
    setPeek(null);
  }, [pathname]);

  return (
    <aside suppressHydrationWarning className="flex h-full w-[236px] shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-[52px] items-center gap-2 border-b border-white/10 px-3">
        <SiteBrandMark title={siteTitle} logoSrc={logoSrc} inverse className="min-w-0 flex-1" />
        <button
          type="button"
          aria-label="隐藏菜单"
          suppressHydrationWarning
          className="flex size-8 shrink-0 items-center justify-center rounded text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
          onClick={onHide}
        >
          <PanelLeftCloseIcon className="size-4" />
        </button>
      </div>
      <nav className="flex flex-1 flex-col overflow-y-auto py-2">
        {NAV_GROUPS.map((g) => {
          const always = g.items.length <= 1;
          const open = always || !ready || (peek ? peek === g.title : g.title === routeOpen);
          return (
            <div key={g.title} className="flex flex-col">
              {always ? (
                <div className="px-4 pb-1 pt-3 text-[13px] font-medium leading-none text-white/60">{g.title}</div>
              ) : (
                <button
                  type="button"
                  aria-expanded={open}
                  suppressHydrationWarning
                  className={cn(
                    "flex h-9 w-full items-center justify-between px-4 text-left text-[13px] font-medium leading-none transition-colors",
                    open || g.title === routeOpen ? "text-white/50" : "text-white/40 hover:bg-white/[0.06] hover:text-white/70",
                  )}
                  onClick={() => setPeek(open && peek === g.title ? routeOpen : g.title)}
                >
                  {g.title}
                  <ChevronRightIcon className={cn("size-3.5 shrink-0 opacity-70 transition-transform", open && "rotate-90")} />
                </button>
              )}
              {g.items.map((it) => {
                const Icon = it.icon;
                const on = navItemActive(pathname, it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      "relative flex h-10 items-center gap-2.5 px-4 text-[15px] leading-none transition-colors",
                      !open && "hidden",
                      on
                        ? "bg-sidebar-accent font-semibold text-white"
                        : "text-sidebar-foreground hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    {on ? <span className="absolute inset-y-0 left-0 w-[3px] rounded-r-sm bg-white/60" /> : null}
                    <Icon className={cn("size-4 shrink-0", on ? "opacity-100" : "opacity-75")} />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <p className="shrink-0 border-t border-white/10 px-4 py-2.5 text-[12px] leading-relaxed text-white/50">
        当前系统由 <span className="font-medium text-white/80">石湾焯智电脑</span> 完成
      </p>
    </aside>
  );
}
