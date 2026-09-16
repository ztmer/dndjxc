"use client";

import { Fragment, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { SerialScanField } from "@/components/serial-scan-field";
import { parseSerials, qtyAfterScan } from "@/lib/serials";
import type { ProductOpt } from "@/components/forms/sales-form";
import { SlotProductSelect } from "@/components/slot-product-select";
import { BUILD_SLOTS } from "@/lib/build-presets";
import { formatAmount } from "@/lib/format-amount";
import { useForceOutboundSn } from "@/components/use-force-outbound-sn";

export type DocLine = {
  productId: string;
  qty: string;
  price: string;
  serials: string;
  slot?: string;
  isWarrantyFree?: boolean;
  isContractExtra?: boolean;
};

export function emptyDocLine(slot?: string, flags?: { isWarrantyFree?: boolean }): DocLine {
  return {
    productId: "",
    qty: "1",
    price: "0",
    serials: "",
    slot,
    isWarrantyFree: flags?.isWarrantyFree ?? false,
    isContractExtra: false,
  };
}

function lineAmt(line: DocLine) {
  const n = Number(line.qty) * Number(line.price);
  return Number.isFinite(n) ? n : 0;
}

export function docLinesTotal(lines: DocLine[]) {
  return lines.reduce((s, l) => (l.productId ? s + lineAmt(l) : s), 0);
}

export function DocLineEditor({
  products,
  lines,
  onChange,
  stockedOnly,
  showSlot,
  filterBySlot,
  showWorkFlags,
  pickCost,
  priceLabel = "单价",
  hidePrice,
  hideAmount,
  hideSerial,
  hideUnit,
  hideStock,
  stockMode = "out",
  filterProducts,
  rememberedPrices,
  deferSerial,
  defaultWarrantyFree,
  walkIn,
}: {
  products: ProductOpt[];
  lines: DocLine[];
  onChange: (lines: DocLine[]) => void;
  stockedOnly?: boolean;
  showSlot?: boolean;
  /** 组装配置：按配件位只出对应分类，可搜索 */
  filterBySlot?: boolean;
  showWorkFlags?: boolean;
  pickCost?: boolean;
  priceLabel?: string;
  hidePrice?: boolean;
  hideAmount?: boolean;
  /** 报价/配置单草稿：不出货，不管唯一 SN */
  hideSerial?: boolean;
  hideUnit?: boolean;
  hideStock?: boolean;
  stockMode?: "out" | "in" | "none";
  /** 工单等：按分类/品牌/实物·服务筛选，商品格可搜索 */
  filterProducts?: boolean;
  /** 客户上次成交价，开单带出 */
  rememberedPrices?: Record<string, string>;
  /** 先开单后送货：唯一 SN 可后补 */
  deferSerial?: boolean;
  /** 质保售后工单：新行默认保内免费 */
  defaultWarrantyFree?: boolean;
  /** 散客缺货文案，不提待采购 */
  walkIn?: boolean;
}) {
  const forceSn = useForceOutboundSn();
  const optionalOut = stockMode !== "in" && !forceSn;
  const defer = !!deferSerial || optionalOut;
  const [kind, setKind] = useState<"all" | "stock" | "service">("all");
  const [cat, setCat] = useState("");
  const [brand, setBrand] = useState("");
  const list = stockedOnly ? products.filter((p) => p.isStocked) : products;
  const kindList = useMemo(() => {
    if (!filterProducts || kind === "all") return list;
    return list.filter((p) => (kind === "stock" ? p.isStocked : !p.isStocked));
  }, [list, filterProducts, kind]);
  const cats = useMemo(
    () => [...new Set(kindList.map((p) => p.category).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "zh")),
    [kindList],
  );
  const brands = useMemo(
    () => [...new Set(kindList.map((p) => p.brand).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "zh")),
    [kindList],
  );
  const filtered = useMemo(() => {
    if (!filterProducts) return list;
    return kindList.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (brand && p.brand !== brand) return false;
      return true;
    });
  }, [list, filterProducts, kindList, cat, brand]);
  const pickerList = useMemo(() => {
    if (!filterProducts) return list;
    const keep = new Set(lines.map((l) => l.productId).filter(Boolean));
    const extra = list.filter((p) => keep.has(p.id) && !filtered.some((x) => x.id === p.id));
    return extra.length ? [...filtered, ...extra] : filtered;
  }, [filterProducts, list, filtered, lines]);
  const colSpan =
    4 +
    (showSlot ? 1 : 0) +
    (hideUnit ? 0 : 1) +
    (hideStock ? 0 : 1) +
    (hidePrice ? 0 : 1) +
    (hideAmount ? 0 : 1) +
    (showWorkFlags ? 2 : 0);

  function patch(i: number, next: Partial<DocLine>) {
    onChange(lines.map((l, idx) => (idx === i ? { ...l, ...next } : l)));
  }

  function pick(i: number, productId: string) {
    const prod = products.find((x) => x.id === productId);
    const remembered = rememberedPrices?.[productId];
    const price = pickCost
      ? prod?.lastCost && prod.lastCost !== "0"
        ? prod.lastCost
        : lines[i].price
      : remembered && remembered !== "0"
        ? remembered
        : prod?.salePrice && prod.salePrice !== "0"
          ? prod.salePrice
          : lines[i].price;
    patch(i, {
      productId,
      price,
      qty:
        !hideSerial && prod?.trackSerial && !(defer && parseSerials(lines[i].serials).length === 0)
          ? String(Math.max(parseSerials(lines[i].serials).length, 1))
          : lines[i].qty || "1",
      // 售后：只把实物材料默认勾保内；上门/工时不要跟着免
      isWarrantyFree: defaultWarrantyFree ? !!prod?.isStocked : lines[i].isWarrantyFree,
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      {filterProducts ? (
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2">
          <select
            className="h-8 rounded-lg border bg-background px-2 text-sm"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as "all" | "stock" | "service");
              setCat("");
              setBrand("");
            }}
          >
            <option value="all">全部</option>
            <option value="stock">实物</option>
            <option value="service">服务</option>
          </select>
          <select className="h-8 min-w-36 rounded-lg border bg-background px-2 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">全部分类</option>
            {cats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select className="h-8 min-w-28 rounded-lg border bg-background px-2 text-sm" value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">全部品牌</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground">可选 {filtered.length} 款，商品格输入名称/编码筛选</span>
        </div>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-10">#</TableHead>
            {showSlot ? <TableHead className="w-24">配件位</TableHead> : null}
            <TableHead>商品</TableHead>
            {hideUnit ? null : <TableHead className="w-16">单位</TableHead>}
            {hideStock ? null : <TableHead className="w-20 text-right">库存</TableHead>}
            <TableHead className="w-24">数量</TableHead>
            {hidePrice ? null : <TableHead className="min-w-40 w-40">{priceLabel}</TableHead>}
            {hideAmount ? null : <TableHead className="w-28 text-right">金额</TableHead>}
            {showWorkFlags ? (
              <>
                <TableHead className="w-24">保内免费</TableHead>
                <TableHead className="w-28">合同外增项</TableHead>
              </>
            ) : null}
            <TableHead className="w-14" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, i) => {
            const p = products.find((x) => x.id === line.productId);
            const sns = parseSerials(line.serials);
            const over = p?.isStocked && p.stockQty != null && Number(line.qty) > Number(p.stockQty);
            return (
              <Fragment key={i}>
                <TableRow>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  {showSlot ? (
                    <TableCell>
                      {filterBySlot && (BUILD_SLOTS as readonly string[]).includes(line.slot ?? "") ? (
                        <span className="text-sm">{line.slot}</span>
                      ) : (
                        <Input value={line.slot ?? ""} onChange={(e) => patch(i, { slot: e.target.value })} placeholder="如 主板" />
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell className="min-w-56 whitespace-normal">
                    <SlotProductSelect
                      products={filterBySlot ? list : pickerList}
                      value={line.productId}
                      slot={filterBySlot ? line.slot : undefined}
                      showMeta
                      onPick={(id) => pick(i, id)}
                    />
                    {p && !p.isStocked ? <p className="mt-1 text-xs text-muted-foreground">服务行，不扣库存</p> : null}
                    {!hideStock && stockMode === "out" && over ? (
                      <p className="mt-1 text-xs text-destructive">
                        {walkIn ? "库存不够，不能成交、也不转待采购" : "库存不足，开单时会生成待采购"}
                      </p>
                    ) : null}
                  </TableCell>
                  {hideUnit ? null : <TableCell>{p?.unit ?? "—"}</TableCell>}
                  {hideStock ? null : (
                    <TableCell className="text-right tabular-nums">{p?.isStocked ? (p.stockQty ?? "0") : "—"}</TableCell>
                  )}
                  <TableCell>
                    <Input value={line.qty} onChange={(e) => patch(i, { qty: e.target.value })} />
                  </TableCell>
                  {hidePrice ? null : (
                    <TableCell className="min-w-40">
                      <Input
                        className="h-11 min-w-[9rem] px-3 text-base tabular-nums"
                        inputMode="decimal"
                        value={line.price}
                        onChange={(e) => patch(i, { price: e.target.value })}
                      />
                    </TableCell>
                  )}
                  {hideAmount ? null : (
                    <TableCell className="text-right tabular-nums">{line.productId ? formatAmount(lineAmt(line)) : "—"}</TableCell>
                  )}
                  {showWorkFlags ? (
                    <>
                      <TableCell>
                        <Checkbox
                          checked={!!line.isWarrantyFree}
                          onCheckedChange={(v) => patch(i, { isWarrantyFree: !!v })}
                        />
                        {p && !p.isStocked ? <p className="mt-1 text-[11px] text-muted-foreground">服务费默认收</p> : null}
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={!!line.isContractExtra}
                          onCheckedChange={(v) => patch(i, { isContractExtra: !!v })}
                        />
                      </TableCell>
                    </>
                  ) : null}
                  <TableCell>
                    <Button type="button" variant="ghost" size="sm" onClick={() => onChange(lines.filter((_, idx) => idx !== i))}>
                      删
                    </Button>
                  </TableCell>
                </TableRow>
                {p?.trackSerial && !hideSerial ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={colSpan} className="whitespace-normal bg-muted/20">
                      <SerialScanField
                        sns={sns}
                        expectedQty={Number(line.qty) || sns.length}
                        unit={p.unit || "件"}
                        defer={defer}
                        onChange={(next) =>
                          patch(i, {
                            serials: next.join("\n"),
                            qty:
                              defer && next.length === 0
                                ? line.qty || "1"
                                : qtyAfterScan(line.qty, next.length),
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
      <div className="border-t p-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...lines, emptyDocLine(showSlot ? "其它" : undefined)])}>
          加一行
        </Button>
      </div>
    </div>
  );
}
