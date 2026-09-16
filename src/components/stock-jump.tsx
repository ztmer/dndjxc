"use client";

import { useEffect } from "react";

/** 从总览预警点进来时，滚到对应商品行。 */
export function StockJump() {
  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.classList.add("bg-primary/10");
  }, []);
  return null;
}
