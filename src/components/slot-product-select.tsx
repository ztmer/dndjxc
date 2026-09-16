"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ProductOpt } from "@/components/forms/sales-form";
import { productMatchesSlot } from "@/lib/build-presets";

/** 配件清单商品列：品牌+型号，如 华硕H610M-K。 */
function slotProductLabel(p: ProductOpt) {
  const model = (p.itemName || "").trim();
  const brand = (p.brand || "").trim();
  if (brand && model) {
    if (model.startsWith(brand)) return model;
    return `${brand}${model}`;
  }
  return model || p.name;
}

/** 按配件位分类筛选，可搜编码/名称/规格。下拉用传送门，避免被表格 overflow 裁切。 */
export function SlotProductSelect({
  products,
  value,
  slot,
  showMeta,
  onPick,
}: {
  products: ProductOpt[];
  value: string;
  slot?: string;
  /** 工单等：下拉带分类、库存 */
  showMeta?: boolean;
  onPick: (productId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState({ top: 0, left: 0, width: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const scoped = useMemo(
    () => products.filter((p) => productMatchesSlot(slot, p)),
    [products, slot],
  );
  const selected = scoped.find((p) => p.id === value) ?? products.find((p) => p.id === value);
  const hits = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const rows = kw
      ? scoped.filter((p) =>
          `${p.code ?? ""} ${p.name} ${p.spec ?? ""} ${p.brand ?? ""}`.toLowerCase().includes(kw),
        )
      : scoped;
    return rows.slice(0, 80);
  }, [scoped, q]);
  const placeholder = slot && slot !== "其它" ? `搜索${slot}…` : "搜索商品…";

  function place() {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setBox({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280) });
  }

  useEffect(() => {
    if (!open) return;
    place();
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <ul
            className="fixed z-50 max-h-56 overflow-auto rounded-lg border bg-background py-1 shadow-md"
            style={{ top: box.top, left: box.left, width: box.width }}
          >
            {hits.length === 0 ? (
              <li className="px-2 py-3 text-sm text-muted-foreground">
                {scoped.length === 0 ? `本店还没有「${slot ?? "商品"}」这一类` : "没有匹配，换个关键词"}
              </li>
            ) : (
              hits.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onPick(p.id);
                      setQ("");
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{slotProductLabel(p)}</span>
                    {showMeta ? (
                      <span className="text-xs text-muted-foreground">
                        {[p.category, p.isStocked ? `库存 ${p.stockQty ?? "0"}` : "服务"].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className="relative" ref={wrapRef}>
      <input
        className="h-8 w-full rounded-lg border bg-background px-2 text-sm"
        value={open ? q : selected ? slotProductLabel(selected) : q}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQ("");
        }}
        onChange={(e) => {
          setOpen(true);
          setQ(e.target.value);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 180);
        }}
      />
      {value && !open ? (
        <button
          type="button"
          className="absolute top-1 right-1 h-6 rounded px-1.5 text-xs text-muted-foreground hover:bg-muted"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onPick("");
            setQ("");
            setOpen(true);
          }}
        >
          清除
        </button>
      ) : null}
      {value && selected && !scoped.some((p) => p.id === value) ? (
        <p className="mt-1 text-xs text-destructive">当前商品不在「{slot}」大类，请改选</p>
      ) : null}
      {menu}
    </div>
  );
}
