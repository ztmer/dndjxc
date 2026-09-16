"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, MoreHorizontalIcon, ScanLineIcon, UsersIcon, WrenchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShopUser } from "@/lib/auth-shared";
import { usePhoneFullscreen } from "@/components/use-phone-fullscreen";

const TABS = [
  { href: "/m", label: "首页", icon: HomeIcon, match: (p: string) => p === "/m" },
  { href: "/m/customers", label: "客户", icon: UsersIcon, match: (p: string) => p.startsWith("/m/customers") },
  { href: "/m/work-orders", label: "工单", icon: WrenchIcon, match: (p: string) => p.startsWith("/m/work-orders") },
  { href: "/m/serials", label: "串号", icon: ScanLineIcon, match: (p: string) => p.startsWith("/m/serials") },
  { href: "/m/more", label: "更多", icon: MoreHorizontalIcon, match: (p: string) => p.startsWith("/m/more") || p.startsWith("/m/knowledge") || p.startsWith("/m/receipts") || p.startsWith("/m/help") || p.startsWith("/m/products") },
];

const TITLES: { test: (p: string) => boolean; title: string }[] = [
  { test: (p) => p === "/m", title: "外出工作台" },
  { test: (p) => p.startsWith("/m/customers"), title: "客户" },
  { test: (p) => p.startsWith("/m/work-orders/new"), title: "开工单" },
  { test: (p) => p.startsWith("/m/work-orders"), title: "工单" },
  { test: (p) => p.startsWith("/m/builds/new"), title: "组装配置" },
  { test: (p) => p.startsWith("/m/builds"), title: "组装配置" },
  { test: (p) => p.startsWith("/m/products/new"), title: "新建商品" },
  { test: (p) => p.startsWith("/m/products"), title: "本店商品" },
  { test: (p) => p.startsWith("/m/serials"), title: "查串号" },
  { test: (p) => p.startsWith("/m/knowledge"), title: "知识库" },
  { test: (p) => p.startsWith("/m/receipts"), title: "收款" },
  { test: (p) => p.startsWith("/m/more"), title: "更多" },
  { test: (p) => p.startsWith("/m/help"), title: "使用说明" },
];

export function MobileChrome({ children, user }: { children: React.ReactNode; user: ShopUser | null }) {
  const pathname = usePathname();
  const title = TITLES.find((t) => t.test(pathname))?.title ?? "电脑店";
  const shellRef = usePhoneFullscreen();

  return (
    <div ref={shellRef} className="shop-phone-shell">
      <header className="flex min-h-12 shrink-0 items-center justify-between border-b bg-card px-3 pt-[env(safe-area-inset-top,0px)]">
        <p className="truncate text-base font-semibold" suppressHydrationWarning>
          {title}
        </p>
        <p className="shrink-0 text-xs text-muted-foreground" suppressHydrationWarning>
          {user?.displayName ?? ""}
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </div>
      <nav
        className="shop-phone-nav grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom,0px)]"
        aria-label="手机端导航"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = t.match(pathname);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px]",
                on ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
