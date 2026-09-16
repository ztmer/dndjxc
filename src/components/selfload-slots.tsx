"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductOpt } from "@/components/forms/sales-form";
import type { DocLine } from "@/components/doc-line-editor";
import { BUILD_SLOTS, type BuildSlot } from "@/lib/build-presets";
import { buildCompatIssues, hitConflicts } from "@/lib/build-compat";
import { ensureShopProductByCode, searchSlotParts, type SlotPartHit } from "@/actions/catalog";
import { formatAmount } from "@/lib/format-amount";

/** 京东自助装机式配件位：点添加从产品目录选一件。 */
export function SelfloadSlots({
  products,
  lines,
  onChange,
  compact,
}: {
  products: ProductOpt[];
  lines: DocLine[];
  onChange: (lines: DocLine[]) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [openSlot, setOpenSlot] = useState<BuildSlot | null>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SlotPartHit[]>([]);
  const [loading, setLoading] = useState(false);

  const bySlot = useMemo(() => {
    const m = new Map<string, DocLine>();
    for (const l of lines) {
      if (l.slot) m.set(l.slot, l);
    }
    return m;
  }, [lines]);

  const selectedParts = useMemo(() => {
    const o: Record<string, { code?: string; name?: string; spec?: string; brand?: string; params?: string; category?: string }> = {};
    for (const slot of BUILD_SLOTS) {
      const id = bySlot.get(slot)?.productId;
      const p = id ? products.find((x) => x.id === id) : undefined;
      if (p) o[slot] = { code: p.code, name: p.name, spec: p.spec, brand: p.brand, params: p.params, category: p.category };
    }
    return o;
  }, [bySlot, products]);

  const issues = useMemo(() => buildCompatIssues(selectedParts), [selectedParts]);

  async function openPicker(slot: BuildSlot) {
    setOpenSlot(slot);
    setQ("");
    setLoading(true);
    setHits([]);
    try {
      const rows = await searchSlotParts(slot, "");
      setHits(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "目录加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function search() {
    if (!openSlot) return;
    setLoading(true);
    try {
      setHits(await searchSlotParts(openSlot, q));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "搜索失败");
    } finally {
      setLoading(false);
    }
  }

  async function pick(hit: SlotPartHit) {
    let productId = hit.productId || products.find((p) => p.code === hit.code)?.id;
    if (!productId) {
      const r = await ensureShopProductByCode(hit.code);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      productId = r.id;
      router.refresh();
    }
    const prod = products.find((p) => p.id === productId);
    const price = prod?.salePrice || String(hit.sale);
    if (!openSlot) return;
    const next = BUILD_SLOTS.map((slot) => {
      const cur = bySlot.get(slot) ?? {
        productId: "",
        qty: "1",
        price: "0",
        serials: "",
        slot,
        isWarrantyFree: false,
        isContractExtra: false,
      };
      if (slot !== openSlot) return cur;
      return { ...cur, slot, productId, qty: "1", price, serials: "" };
    });
    onChange(next);
    setOpenSlot(null);
    toast.success(`已加入${openSlot}：${hit.brand} ${hit.name}`);
  }

  function clearSlot(slot: BuildSlot) {
    onChange(lines.map((l) => (l.slot === slot ? { ...l, productId: "", price: "0", serials: "" } : l)));
  }

  const picker =
    openSlot && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
            <div className="flex max-h-[80vh] w-full max-w-lg flex-col gap-3 rounded-xl bg-background p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium">选择{openSlot}</h2>
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpenSlot(null)}>
                  关闭
                </Button>
              </div>
              <div className="flex gap-2">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="名称 / 型号 / 品牌" />
                <Button type="button" variant="outline" onClick={() => void search()}>
                  搜索
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                {loading ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">正在加载目录…</p>
                ) : hits.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">没有这一档，换个关键词</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {hits.map((h) => (
                    <li key={h.code}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted"
                        onClick={() => void pick(h)}
                      >
                        {h.imageUrl ? (
                          <img src={h.imageUrl} alt="" className="h-10 w-10 rounded border object-contain" />
                        ) : (
                          <div className="h-10 w-10 rounded border bg-muted" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">
                            {h.brand} {h.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {h.code} · {h.spec || "—"}
                          </span>
                          {openSlot &&
                          hitConflicts(
                            openSlot,
                            { code: h.code, name: h.name, spec: h.spec, brand: h.brand, params: h.params },
                            selectedParts,
                          ).length ? (
                            <span className="block text-xs text-destructive">和已选配件冲突</span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-sm tabular-nums">¥{formatAmount(h.sale)}</span>
                      </button>
                    </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="flex flex-col gap-2">
      {compact ? null : (
        <>
          <div className="text-sm font-medium">自助装机</div>
          <p className="text-xs text-muted-foreground">从产品目录选一件加入本店并填到配件位。</p>
        </>
      )}
      {compact ? null : issues.length ? (
        <ul className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
          {issues.map((i) => (
            <li key={i.text} className={i.level === "error" ? "text-destructive" : "text-muted-foreground"}>
              {i.level === "error" ? "不能这么配：" : "留意："}
              {i.text}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-col divide-y rounded-xl border bg-card">
        {BUILD_SLOTS.map((slot) => {
          const line = bySlot.get(slot);
          const prod = line?.productId ? products.find((p) => p.id === line.productId) : undefined;
          return (
            <div key={slot} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="w-20 shrink-0 text-sm font-medium">{slot}</div>
              <div className="min-w-0 flex-1 text-sm text-muted-foreground">
                {prod ? prod.name : `未选择${slot}`}
              </div>
              {prod ? <span className="tabular-nums text-sm">{formatAmount(line?.price)}</span> : null}
              {prod ? (
                <button
                  type="button"
                  className="h-7 rounded-lg border px-2.5 text-[0.8rem]"
                  onClick={() => clearSlot(slot)}
                >
                  清除
                </button>
              ) : null}
              <button
                type="button"
                className="h-7 rounded-lg bg-primary px-2.5 text-[0.8rem] text-primary-foreground"
                onClick={() => void openPicker(slot)}
              >
                {prod ? "更换" : "添加"}
              </button>
            </div>
          );
        })}
      </div>
      {picker}
    </div>
  );
}
