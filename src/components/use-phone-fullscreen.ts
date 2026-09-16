"use client";

import { useEffect, useRef } from "react";

/** 给 html/body 加上手机铺满样式；不在第一次点击时抢全屏（会吞掉按钮点击）。 */
export function usePhoneFullscreen() {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("shop-phone");
    document.body.classList.add("shop-phone");
    return () => {
      html.classList.remove("shop-phone");
      document.body.classList.remove("shop-phone");
    };
  }, []);

  return shellRef;
}
