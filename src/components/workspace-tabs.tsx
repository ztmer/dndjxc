"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { pathOnly, tabModuleKey, tabTitle } from "@/lib/tab-title";

type Tab = { id: string; href: string; title: string };

const KEY = "shop-workspace-tabs";
const HOME_ID = "home";

function makeHomeTab(): Tab {
  return { id: HOME_ID, href: "/", title: tabTitle("/") };
}

function makeTab(href: string): Tab {
  const path = pathOnly(href) || "/";
  if (path === "/") return makeHomeTab();
  return { id: tabModuleKey(path), href: path, title: tabTitle(path) };
}

function pathEq(a: string, b: string) {
  return pathOnly(a) === pathOnly(b);
}

function isHomeTab(tab: Tab) {
  return tab.id === HOME_ID || pathOnly(tab.href) === "/";
}

function ensureHome(tabs: Tab[]): Tab[] {
  const rest = tabs.filter((t) => !isHomeTab(t));
  const seen = new Set<string>();
  const uniq: Tab[] = [];
  for (const t of rest) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    uniq.push(t);
  }
  return [makeHomeTab(), ...uniq];
}

export function WorkspaceTabs({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [tabs, setTabs] = useState<Tab[]>(() => ensureHome([makeTab(pathname)]));
  const [activeId, setActiveId] = useState(() => (pathEq(pathname, "/") ? HOME_ID : tabModuleKey(pathname)));
  const [ready, setReady] = useState(false);
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { tabs: Tab[]; activeId: string };
        if (parsed.tabs?.length) {
          const rows = parsed.tabs.map((t) =>
            isHomeTab(t) ? makeHomeTab() : makeTab(t.href || t.id),
          );
          const key = tabModuleKey(pathname);
          const has = rows.some((t) => t.id === key);
          const next = ensureHome(has ? rows.map((t) => (t.id === key ? makeTab(pathname) : t)) : [...rows, makeTab(pathname)]);
          const active = next.find((t) => t.id === key)?.id ?? next[0]!.id;
          setTabs(next);
          setActiveId(active);
          setReady(true);
          return;
        }
      }
    } catch {
      /* 忽略损坏的缓存 */
    }
    const next = ensureHome([makeTab(pathname)]);
    setTabs(next);
    setActiveId(next.find((t) => t.id === tabModuleKey(pathname))?.id ?? HOME_ID);
    setReady(true);
  }, [pathname]);

  useEffect(() => {
    if (!ready) return;
    const key = tabModuleKey(pathname);
    setTabs((prev) => {
      const hit = prev.find((t) => t.id === key);
      if (hit) {
        setActiveId(hit.id);
        return ensureHome(prev.map((t) => (t.id === key ? makeTab(pathname) : t)));
      }
      const t = makeTab(pathname);
      setActiveId(t.id);
      return ensureHome([...prev, t]);
    });
  }, [pathname, ready]);

  useEffect(() => {
    if (!ready) return;
    sessionStorage.setItem(KEY, JSON.stringify({ tabs, activeId }));
  }, [tabs, activeId, ready]);

  function closeTab(id: string) {
    const target = tabs.find((t) => t.id === id);
    if (!target || isHomeTab(target)) return;
    const i = tabs.findIndex((t) => t.id === id);
    const next = ensureHome(tabs.filter((t) => t.id !== id));
    setTabs(next);
    if (activeId === id) {
      const fallback = next[Math.max(0, i - 1)] ?? next[0]!;
      setActiveId(fallback.id);
      router.push(pathOnly(fallback.href));
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-stretch overflow-x-auto border-b bg-card px-3">
        {tabs.map((tab) => {
          const on = tab.id === activeId;
          return (
            <div
              key={tab.id}
              className={cn(
                "group flex max-w-52 shrink-0 items-center gap-1 border-b-2 px-4 text-[13px]",
                on
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-[#748194] hover:text-foreground",
              )}
            >
              <Link href={pathOnly(tab.href)} className="min-w-0 truncate py-2.5 text-left" onClick={() => setActiveId(tab.id)}>
                {tab.title}
              </Link>
              {isHomeTab(tab) ? null : (
                <button
                  type="button"
                  aria-label={`关闭 ${tab.title}`}
                  className="mb-0.5 flex size-5 shrink-0 items-center justify-center rounded text-[#9baab8] opacity-0 hover:bg-[#eef1f6] hover:text-foreground group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-background p-4">
        <div key={pathname} className="shop-page-enter w-full max-w-[1080px]">
          {children}
        </div>
      </div>
    </div>
  );
}
