"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { SerialScanField } from "@/components/serial-scan-field";
import { parseSerials, qtyAfterScan } from "@/lib/serials";
import type { ProductOpt } from "@/components/forms/sales-form";
import { SlotProductSelect } from "@/components/slot-product-select";

type LineVal = { productId: string; qty: string; price: string; serials: string };

/** 开单/组装/工单共用：管唯一 SN 的配件扫码，键鼠风扇等只填数量。 */
export function LineSerialRow({
  products,
  value,
  onChange,
  extra,
  pricePlaceholder = "单价",
  stockedOnly,
}: {
  products: ProductOpt[];
  value: LineVal;
  onChange: (next: LineVal) => void;
  extra?: ReactNode;
  pricePlaceholder?: string;
  stockedOnly?: boolean;
}) {
  const list = stockedOnly ? products.filter((p) => p.isStocked) : products;
  const p = products.find((x) => x.id === value.productId);
  const sns = parseSerials(value.serials);

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <SlotProductSelect
          products={list}
          value={value.productId}
          showMeta
          onPick={(id) => {
            const prod = products.find((x) => x.id === id);
            onChange({
              ...value,
              productId: id,
              price: prod?.salePrice ?? value.price,
            });
          }}
        />
        <Input
          value={value.qty}
          onChange={(e) => onChange({ ...value, qty: e.target.value })}
          placeholder="数量"
        />
        <Input
          value={value.price}
          onChange={(e) => onChange({ ...value, price: e.target.value })}
          placeholder={pricePlaceholder}
        />
      </div>
      {extra ? <div className="flex flex-wrap gap-3">{extra}</div> : null}
      {p?.trackSerial ? (
        <SerialScanField
          sns={sns}
          expectedQty={Number(value.qty) || sns.length}
          unit={p.unit || "件"}
          onChange={(next) =>
            onChange({
              ...value,
              serials: next.join("\n"),
              qty: qtyAfterScan(value.qty, next.length),
            })
          }
        />
      ) : p ? (
        <p className="text-xs text-muted-foreground">此商品不按唯一 SN 管理，填数量即可。</p>
      ) : null}
    </div>
  );
}
