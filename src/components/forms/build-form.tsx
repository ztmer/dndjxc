"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { CustomerOpt, ProductOpt } from "@/components/forms/sales-form";
import { saveBuildDraft, submitBuild } from "@/actions/service";
import { persistThenConfirm } from "@/lib/persist-then-confirm";
import { formatAmount } from "@/lib/format-amount";
import { BUILD_SLOTS, DIY_SCENES, canonicalBuildSlot } from "@/lib/build-presets";
import type { ShopDiyKit } from "@/lib/diy-kit-types";
import { buildCompatIssues } from "@/lib/build-compat";
import { SelfloadSlots } from "@/components/selfload-slots";
import { DocLineEditor, docLinesTotal, emptyDocLine, type DocLine } from "@/components/doc-line-editor";
import { CustomerPickField } from "@/components/customer-pick-field";

const sel = "h-8 w-full rounded-lg border bg-background px-2 text-sm";

function findByCode(products: ProductOpt[], code: string) {
  return products.find((p) => p.code === code);
}

function findKitIn(kits: ShopDiyKit[], key: string) {
  return kits.find((k) => k.id === key || k.code === key);
}

function alignBuildLines(raw: DocLine[]): DocLine[] {
  const extras: DocLine[] = [];
  const map = new Map<string, DocLine>();
  for (const l of raw) {
    const slot = canonicalBuildSlot(l.slot) ?? "";
    if ((BUILD_SLOTS as readonly string[]).includes(slot)) {
      const prev = map.get(slot);
      if (!prev?.productId) map.set(slot, { ...l, slot });
      else extras.push({ ...l, slot: "其它" });
    } else {
      extras.push({ ...l, slot: slot || l.slot });
    }
  }
  return [...BUILD_SLOTS.map((slot) => map.get(slot) ?? emptyDocLine(slot)), ...extras];
}

function presetEstimate(products: ProductOpt[], preset: { parts: { code: string; qty?: string }[]; laborFee: string }) {
  let parts = 0;
  let missing = 0;
  for (const part of preset.parts) {
    const p = findByCode(products, part.code);
    if (!p) {
      missing += 1;
      continue;
    }
    parts += (Number(part.qty ?? "1") || 1) * (Number(p.salePrice) || 0);
  }
  return { total: parts + (Number(preset.laborFee) || 0), missing };
}

export function BuildForm({
  customers,
  products,
  defaultCustomerId,
  docId,
  defaultModelName,
  defaultLaborFee,
  defaultUnitSn,
  defaultRemark,
  defaultLines,
  defaultKit,
  kits,
  detailHref = "/builds/:id",
}: {
  customers: CustomerOpt[];
  products: ProductOpt[];
  defaultCustomerId?: string;
  docId?: string;
  defaultModelName?: string;
  defaultLaborFee?: string;
  defaultUnitSn?: string;
  defaultRemark?: string;
  defaultLines?: DocLine[];
  defaultKit?: string;
  kits: ShopDiyKit[];
  detailHref?: string;
}) {
  const router = useRouter();
  const kitOnLoad = defaultKit && !defaultLines?.length ? findKitIn(kits, defaultKit) : undefined;
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? customers[0]?.id ?? "");
  const [modelName, setModelName] = useState(defaultModelName ?? kitOnLoad?.name ?? "");
  const [laborFee, setLaborFee] = useState(defaultLaborFee ?? kitOnLoad?.laborFee ?? "150");
  const [unitSn, setUnitSn] = useState(defaultUnitSn ?? "");
  const [remark, setRemark] = useState(defaultRemark ?? kitOnLoad?.remark ?? "");
  const [presetId, setPresetId] = useState<string | null>(kitOnLoad?.id ?? null);
  const [sceneFilter, setSceneFilter] = useState<string>(kitOnLoad?.scene ?? "all");
  const [showKits, setShowKits] = useState(!!kitOnLoad);
  const [showCatalog, setShowCatalog] = useState(false);
  const [lines, setLines] = useState<DocLine[]>(() => {
    if (defaultLines?.length) return alignBuildLines(defaultLines);
    if (!kitOnLoad) return BUILD_SLOTS.map((slot) => emptyDocLine(slot));
    return BUILD_SLOTS.map((slot) => {
      const spec = kitOnLoad.parts.find((p) => p.slot === slot);
      if (!spec) return emptyDocLine(slot);
      const product = findByCode(products, spec.code);
      if (!product) return emptyDocLine(slot);
      return {
        ...emptyDocLine(slot),
        productId: product.id,
        qty: spec.qty ?? "1",
        price: product.salePrice || "0",
      };
    });
  });

  const parts = useMemo(() => docLinesTotal(lines), [lines]);
  const labor = Number(laborFee) || 0;
  const deal = parts + labor;
  const filled = lines.filter((l) => l.productId).length;
  const issues = useMemo(() => {
    const selected: Record<string, { code?: string; name?: string; spec?: string; brand?: string; params?: string; category?: string }> = {};
    for (const slot of BUILD_SLOTS) {
      const id = lines.find((l) => l.slot === slot)?.productId;
      const p = id ? products.find((x) => x.id === id) : undefined;
      if (p) selected[slot] = { code: p.code, name: p.name, spec: p.spec, brand: p.brand, params: p.params, category: p.category };
    }
    return buildCompatIssues(selected);
  }, [lines, products]);

  function applyPreset(id: string) {
    const kit = findKitIn(kits, id);
    if (!kit) return;
    const missing: string[] = [];
    const next = BUILD_SLOTS.map((slot) => {
      const spec = kit.parts.find((p) => p.slot === slot);
      if (!spec) return emptyDocLine(slot);
      const product = findByCode(products, spec.code);
      if (!product) {
        missing.push(`${slot}（${spec.code}）`);
        return emptyDocLine(slot);
      }
      return {
        ...emptyDocLine(slot),
        productId: product.id,
        qty: spec.qty ?? "1",
        price: product.salePrice || "0",
      };
    });
    setLines(next);
    setModelName(kit.name);
    setLaborFee(kit.laborFee);
    setRemark(kit.remark);
    setPresetId(kit.id);
    if (missing.length) toast.error(`店里还没有这些货：${missing.join("、")}，对应配件位先空着，可改选或先建商品资料`);
    else toast.success(`已带入「${kit.name}」，可改配件再保存`);
  }

  const shownKits = sceneFilter === "all" ? kits : kits.filter((k) => k.scene === sceneFilter);

  async function persist(confirm: boolean) {
    if (!customerId) {
      toast.error("请先筛选并选中客户");
      return;
    }
    const r = await persistThenConfirm(
      () =>
        saveBuildDraft({
          id: docId,
          customerId,
          modelName: modelName || "组装主机",
          laborFee,
          unitSn,
          remark,
          lines,
        }),
      submitBuild,
      confirm,
    );
    if (r.ok) {
      toast.success(confirm ? "已出库并生成销售单" : "已暂存配置");
      router.push(detailHref.replace(":id", r.id));
      router.refresh();
    } else toast.error(r.error);
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void persist(true);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field>
          <FieldLabel>客户</FieldLabel>
          <CustomerPickField customers={customers} value={customerId} onChange={(id) => setCustomerId(id)} />
        </Field>
        <Field>
          <FieldLabel>机型名称</FieldLabel>
          <Input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="办公电脑 / 游戏主机" />
        </Field>
        <Field>
          <FieldLabel>组装工时费</FieldLabel>
          <Input value={laborFee} onChange={(e) => setLaborFee(e.target.value)} />
        </Field>
        <Field className="sm:col-span-2 lg:col-span-3">
          <FieldLabel>备注</FieldLabel>
          <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="用途、装系统等，可空" />
        </Field>
      </div>

      <div className="rounded-xl border bg-muted/20">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
          onClick={() => setShowKits((v) => !v)}
        >
          <span>
            从套餐带入
            {presetId ? (
              <span className="ml-2 font-normal text-muted-foreground">{findKitIn(kits, presetId)?.name}</span>
            ) : (
              <span className="ml-2 font-normal text-muted-foreground">需要时再打开</span>
            )}
          </span>
          <span className="text-muted-foreground">{showKits ? "收起" : "打开"}</span>
        </button>
        {showKits ? (
          <div className="space-y-3 border-t px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <select className={sel} value={sceneFilter} onChange={(e) => setSceneFilter(e.target.value)}>
                <option value="all">全部场景</option>
                {DIY_SCENES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <Link href="/settings/kits" className="text-xs text-primary hover:underline">
                增改删套餐
              </Link>
            </div>
            <div className="grid gap-1 sm:grid-cols-2">
              {shownKits.map((kit) => {
                const est = presetEstimate(products, kit);
                const active = presetId === kit.id;
                return (
                  <button
                    key={kit.id}
                    type="button"
                    onClick={() => applyPreset(kit.id)}
                    className={`flex items-baseline justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                      active ? "bg-primary/10" : "hover:bg-background"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{kit.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {kit.cpu} · {kit.gpu}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">¥{formatAmount(est.total)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-medium">配件清单</div>
          <div className="text-xs text-muted-foreground">已填 {filled} 项 · 报价不用扫 SN</div>
        </div>
        {issues.length ? (
          <ul className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
            {issues.map((i) => (
              <li key={i.text} className={i.level === "error" ? "text-destructive" : "text-muted-foreground"}>
                {i.level === "error" ? "不能这么配：" : "留意："}
                {i.text}
              </li>
            ))}
          </ul>
        ) : null}
        <DocLineEditor
          products={products}
          lines={lines}
          onChange={setLines}
          stockedOnly
          showSlot
          filterBySlot
          hideSerial
          hideStock
        />
        <div>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setShowCatalog((v) => !v)}
          >
            {showCatalog ? "收起产品目录" : "本店没有这款？从产品目录加入"}
          </button>
          {showCatalog ? (
            <div className="mt-2">
              <SelfloadSlots compact products={products} lines={lines} onChange={setLines} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-0 z-20 -mx-6 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-6 py-3 backdrop-blur">
        <div className="text-sm">
          <span className="text-muted-foreground">配件 {formatAmount(parts)}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="text-muted-foreground">工时 {formatAmount(labor)}</span>
          <span className="ml-3 text-base font-semibold tabular-nums">¥{formatAmount(deal)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void persist(false)}>
            暂存
          </Button>
          <Button type="submit">确认出库</Button>
        </div>
      </div>
    </form>
  );
}
