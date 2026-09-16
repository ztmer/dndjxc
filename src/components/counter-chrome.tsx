"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTER_SHORTCUTS, NAV_GROUPS, navItemActive } from "@/components/nav-config";
import { HeaderSearch } from "@/components/header-search";
import { UiSchemeSwitch } from "@/components/ui-scheme-switch";
import { SiteBrandMark } from "@/components/site-brand-mark";
import type { SiteBrand } from "@/lib/site-brand";

export function CounterChrome({
  children,
  extra,
  brand,
}: {
  children: React.ReactNode;
  extra?: React.ReactNode;
  brand: SiteBrand;
}) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <header className="flex shrink-0 flex-col border-b bg-card">
        <div className="flex h-14 items-center gap-2 px-3">
          <SiteBrandMark title={brand.title} logoSrc={brand.logoSrc} size="sm" className="hidden sm:flex max-w-[11rem]" />
          {brand.logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoSrc} alt="" className="size-9 shrink-0 rounded-lg object-contain bg-white sm:hidden" />
          ) : (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground sm:hidden">
              店
            </div>
          )}
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {COUNTER_SHORTCUTS.map((it) => {
              const Icon = it.icon;
              const on = navItemActive(pathname, it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium",
                    on ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" />
                  {it.label}
                </Link>
              );
            })}
            <button
              type="button"
              className={cn("flex h-9 shrink-0 items-center gap-1 rounded-lg px-3 text-sm", more ? "bg-muted" : "hover:bg-muted")}
              onClick={() => setMore((v) => !v)}
            >
              <MenuIcon className="size-4" />
              全部
            </button>
          </nav>
          <UiSchemeSwitch compact />
          {extra}
        </div>
        <div className="flex items-center gap-2 border-t px-3 py-1.5">
          <HeaderSearch className="ml-0 max-w-md" />
        </div>
        {more ? (
          <div className="grid max-h-64 grid-cols-2 gap-3 overflow-y-auto border-t bg-muted/40 px-3 py-3 sm:grid-cols-3 lg:grid-cols-4">
            {NAV_GROUPS.map((g) => (
              <div key={g.title} className="flex flex-col gap-1">
                <div className="text-xs font-medium text-muted-foreground">{g.title}</div>
                {g.items.map((it) => {
                  const Icon = it.icon;
                  const on = navItemActive(pathname, it.href);
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setMore(false)}
                      className={cn(
                        "flex h-8 items-center gap-2 rounded-md px-2 text-sm",
                        on ? "bg-background font-medium shadow-sm" : "hover:bg-background/70",
                      )}
                    >
                      <Icon className="size-4 opacity-80" />
                      {it.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="w-full max-w-[1080px]">{children}</div>
      </div>
    </div>
  );
}
