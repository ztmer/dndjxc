"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";

export function OpeningBooksFields({
  openingMode,
  booksOnly,
  onBooksOnly,
  bizDate,
  onBizDate,
}: {
  openingMode: boolean;
  booksOnly: boolean;
  onBooksOnly: (v: boolean) => void;
  bizDate: string;
  onBizDate: (v: string) => void;
}) {
  if (!openingMode && !booksOnly) return null;
  return (
    <div className="rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-3 text-sm">
      <p className="mb-2 font-medium text-amber-950">期初旧单</p>
      <p className="mb-3 text-xs leading-relaxed text-amber-900/80">
        补以前已经卖出/修好、店里还没收齐的账。勾上后<strong>不扣库存、不扫串号</strong>，金额进客户未收。录完请关掉系统设置里的期初开关。
      </p>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex items-start gap-2">
          <Checkbox checked={booksOnly} onCheckedChange={(v) => onBooksOnly(!!v)} className="mt-0.5" />
          <span>
            这张是期初旧单
            <span className="mt-0.5 block text-xs text-muted-foreground">只记账，不走出库</span>
          </span>
        </label>
        <Field className="w-44">
          <FieldLabel>开单日期</FieldLabel>
          <input
            type="date"
            className="h-8 w-full rounded-lg border bg-background px-2 text-sm"
            value={bizDate}
            onChange={(e) => onBizDate(e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}
