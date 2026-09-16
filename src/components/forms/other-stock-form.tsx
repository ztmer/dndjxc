"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { ProductOpt } from "@/components/forms/sales-form";
import { saveOtherReceiptDraft, saveOtherIssueDraft, submitOtherReceipt, submitOtherIssue } from "@/actions/warehouse";
import { persistThenConfirm } from "@/lib/persist-then-confirm";
import { serialQtyError } from "@/lib/serials";
import { formatAmount } from "@/lib/format-amount";
import { DocLineEditor, docLinesTotal, emptyDocLine, type DocLine } from "@/components/doc-line-editor";
import { useForceOutboundSn } from "@/components/use-force-outbound-sn";

const sel = "h-8 w-full rounded-lg border bg-background px-2 text-sm";

export function OtherStockForm({
  products,
  mode,
  docId,
  defaultReason,
  defaultRemark,
  defaultLines,
}: {
  products: ProductOpt[];
  mode: "in" | "out";
  docId?: string;
  defaultReason?: string;
  defaultRemark?: string;
  defaultLines?: DocLine[];
}) {
  const router = useRouter();
  const forceSn = useForceOutboundSn();
  const [reason, setReason] = useState(defaultReason ?? "self_use");
  const [remark, setRemark] = useState(defaultRemark ?? "");
  const [lines, setLines] = useState<DocLine[]>(defaultLines?.length ? defaultLines : [emptyDocLine(), emptyDocLine(), emptyDocLine()]);
  const total = docLinesTotal(lines);

  async function persist(confirm: boolean) {
    const err = serialQtyError(products, lines, { optionalSerial: mode === "out" && !forceSn });
    if (err) {
      toast.error(err);
      return;
    }
    const payload = { id: docId, remark, lines: lines.map((l) => ({ productId: l.productId, qty: l.qty, cost: l.price, serials: l.serials })) };
    const r =
      mode === "in"
        ? await persistThenConfirm(() => saveOtherReceiptDraft(payload), submitOtherReceipt, confirm)
        : await persistThenConfirm(
            () => saveOtherIssueDraft({ id: docId, reason, remark, lines: payload.lines }),
            submitOtherIssue,
            confirm,
          );
    if (r.ok) {
      toast.success(confirm ? "已记账" : "已暂存");
      router.push(mode === "in" ? `/other-receipts/${r.id}` : `/other-issues/${r.id}`);
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
        {mode === "out" ? (
          <Field>
            <FieldLabel>原因</FieldLabel>
            <select className={sel} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="self_use">自用</option>
              <option value="scrap">报损</option>
              <option value="gift">赠送</option>
            </select>
            <p className="text-xs text-muted-foreground">不产生客户应收。</p>
          </Field>
        ) : (
          <Field>
            <FieldLabel>说明</FieldLabel>
            <p className="text-sm text-muted-foreground pt-1">盘盈、调入等，不挂供应商。进价可填 0。</p>
          </Field>
        )}
        <Field>
          <FieldLabel>备注</FieldLabel>
          <Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} />
        </Field>
      </div>
      <DocLineEditor
        products={products}
        lines={lines}
        onChange={setLines}
        stockedOnly
        pickCost={mode === "in"}
        priceLabel={mode === "in" ? "成本" : "单价"}
        hidePrice={mode === "out"}
        hideAmount={mode === "out"}
        stockMode={mode === "in" ? "in" : "out"}
        filterProducts
      />
      <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-4">
        {mode === "in" ? <div className="text-lg font-semibold tabular-nums">合计 ¥{formatAmount(total)}</div> : <div />}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="lg" onClick={() => void persist(false)}>
            暂存
          </Button>
          <Button type="submit" size="lg">
            {mode === "in" ? "确认入库" : "确认出库"}
          </Button>
        </div>
      </div>
    </form>
  );
}
