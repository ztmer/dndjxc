"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    title: "基本配置",
    items: [
      { href: "/settings/company", label: "公司信息" },
      { href: "/settings/site", label: "网站信息" },
      { href: "/settings/kits", label: "组装套餐" },
      { href: "/settings/wecom", label: "企业微信" },
      { href: "/settings/rules", label: "开单规则" },
      { href: "/settings", label: "账号与界面" },
    ],
  },
  {
    title: "系统维护",
    items: [
      { href: "/settings/backup", label: "备份与恢复" },
      { href: "/settings/logs", label: "系统日志" },
    ],
  },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b pb-3">
      {GROUPS.map((g) => (
        <div key={g.title} className="mr-4 flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] font-semibold text-muted-foreground">{g.title}</span>
          {g.items.map((it) => {
            const on = it.href === "/settings" ? pathname === "/settings" : pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[13px]",
                  on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {it.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
