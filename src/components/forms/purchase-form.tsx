"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { ProductOpt } from "@/components/forms/sales-form";
import { parseSerials } from "@/lib/serials";
import { formatAmount } from "@/lib/format-amount";
import { DocLineEditor, docLinesTotal, emptyDocLine, type DocLine } from "@/components/doc-line-editor";
import { submitPurchaseReceipt } from "@/actions/warehouse";
import { persistThenConfirm } from "@/lib/persist-then-confirm";
import { FilterPickField } from "@/components/filter-pick-field";

const sel = "h-8 w-full rounded-lg border bg-background px-2 text-sm";

export function PurchaseForm({
  suppliers,
  products,
  openPrLines,
  docId,
  defaultSupplierId,
  defaultRemark,
  defaultLines,
  save,
}: {
  suppliers: { id: string; name: string }[];
  products: ProductOpt[];
  openPrLines: { id: string; label: string; productId: string; qty: string }[];
  docId?: string;
  defaultSupplierId?: string;
  defaultRemark?: string;
  defaultLines?: (DocLine & { purchaseRequestLineId?: string })[];
  save: (input: {
    id?: string;
    supplierId?: string;
    remark?: string;
    lines: { productId: string; qty: string; cost: string; serials?: string; purchaseRequestLineId?: string }[];
  }) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(defaultSupplierId ?? suppliers[0]?.id ?? "");
  const [remark, setRemark] = useState(defaultRemark ?? "");
  const [lines, setLines] = useState<DocLine[]>(
    defaultLines?.length
      ? defaultLines
      : openPrLines.length
        ? openPrLines.map((l) => ({
            productId: l.productId,
            qty: l.qty,
            price: products.find((p) => p.id === l.productId)?.lastCost ?? "0",
            serials: "",
          }))
        : [emptyDocLine(), emptyDocLine(), emptyDocLine()],
  );
  const total = docLinesTotal(lines);

  async function persist(confirm: boolean) {
    for (const line of lines) {
      if (!line.productId) continue;
      const p = products.find((x) => x.id === line.productId);
      if (!p?.trackSerial) continue;
      const sns = parseSerials(line.serials);
      if (sns.length !== Number(line.qty)) {
        toast.error(`${p.name} 管唯一 SN：数量 ${line.qty}，已扫 ${sns.length} 个码，必须一样多`);
        return;
      }
    }
    const prMap = new Map(openPrLines.map((l) => [l.productId, l.id]));
    const r = await persistThenConfirm(
      () =>
        save({
          id: docId,
          supplierId: supplierId || undefined,
          remark,
          lines: lines.map((l) => ({
            productId: l.productId,
            qty: l.qty,
            cost: l.price,
            serials: l.serials,
            purchaseRequestLineId: defaultLines?.find((x) => x.productId === l.productId)?.purchaseRequestLineId || prMap.get(l.productId),
          })),
        }),
      submitPurchaseReceipt,
      confirm,
    );
    if (r.ok) {
      toast.success(confirm ? "已入库" : "已暂存");
      router.push(`/purchase/${r.id}`);
      router.refresh();
    } else toast.error(r.error);
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void persist(true);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>供应商（谁卖给我的）</FieldLabel>
          <FilterPickField
            items={suppliers.map((s) => ({ id: s.id, title: s.name }))}
            value={supplierId}
            onChange={setSupplierId}
            placeholder="输入供应商名称筛选"
            emptyText="没有匹配的供应商"
            allowEmpty
            emptyLabel="无"
          />
        </Field>
        <Field>
          <FieldLabel>备注</FieldLabel>
          <Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="送货单号、批次等" />
        </Field>
      </div>
      {openPrLines.length ? (
        <p className="text-sm text-muted-foreground">已带入待采购：{openPrLines.map((l) => l.label).join("，")}</p>
      ) : null}
      <div className="flex flex-col gap-2">
        <div>
          <div className="text-sm font-medium">入库明细</div>
          <p className="text-xs text-muted-foreground">同款硬盘只选一条商品，数量填 10，再扫 10 个唯一 SN。不要建 10 条资料。</p>
        </div>
        <DocLineEditor products={products} lines={lines} onChange={setLines} stockedOnly pickCost priceLabel="进价" stockMode="in" filterProducts />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-4">
        <div className="text-lg font-semibold tabular-nums">进货合计 ¥{formatAmount(total)}</div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="lg" onClick={() => void persist(false)}>
            暂存
          </Button>
          <Button type="submit" size="lg">
            确认入库
          </Button>
        </div>
      </div>
    </form>
  );
}
