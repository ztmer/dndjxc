"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** 内嵌页路径变化时通知外壳更新页签标题。 */
export function EmbedPathSync() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (window.self === window.top) return;
    const qs = search.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    window.parent.postMessage({ type: "shop-tab-nav", href }, window.location.origin);
  }, [pathname, search]);

  return null;
}
