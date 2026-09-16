"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveSalesReturnDraft, submitSalesReturn } from "@/actions/sales-return";
import { saveWorkReturnDraft, submitWorkReturn } from "@/actions/service";
import { persistThenConfirm } from "@/lib/persist-then-confirm";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAmount } from "@/lib/format-amount";

const sel = "h-8 w-full rounded-lg border bg-background px-2 text-sm";

type ReturnSrc = { id: string; docNo: string; lines: { id: string; label: string; max: string; unit?: string; price?: string }[] };

export function SalesReturnForm({
  orders,
  defaultOrderId,
  docId,
  defaultRemark,
  defaultQtys,
}: {
  orders: ReturnSrc[];
  defaultOrderId?: string;
  docId?: string;
  defaultRemark?: string;
  defaultQtys?: Record<string, string>;
}) {
  const router = useRouter();
  const [salesOrderId, setSo] = useState(defaultOrderId && orders.some((o) => o.id === defaultOrderId) ? defaultOrderId : (orders[0]?.id ?? ""));
  const [remark, setRemark] = useState(defaultRemark ?? "");
  const so = orders.find((o) => o.id === salesOrderId);
  const [qtys, setQtys] = useState<Record<string, string>>(() =>
    defaultQtys ?? Object.fromEntries((so?.lines ?? []).map((l) => [l.id, l.max])),
  );

  const total = useMemo(() => {
    if (!so) return 0;
    return so.lines.reduce((s, l) => s + (Number(qtys[l.id]) || 0) * (Number(l.price) || 0), 0);
  }, [so, qtys]);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const lines = Object.entries(qtys)
          .filter(([, q]) => Number(q) > 0)
          .map(([salesOrderLineId, qty]) => ({ salesOrderLineId, qty }));
        const r = await persistThenConfirm(
          () => saveSalesReturnDraft({ id: docId, salesOrderId, remark, lines }),
          submitSalesReturn,
          true,
        );
        if (r.ok) {
          toast.success("已退货入库");
          router.push(`/sales-returns/${r.id}`);
        } else toast.error(r.error);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>原销售单</FieldLabel>
          <select
            className={sel}
            disabled={!!docId}
            value={salesOrderId}
            onChange={(e) => {
              const id = e.target.value;
              setSo(id);
              const next = orders.find((o) => o.id === id);
              setQtys(Object.fromEntries((next?.lines ?? []).map((l) => [l.id, l.max])));
            }}
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.docNo}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel>备注</FieldLabel>
          <Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="退货原因" />
        </Field>
      </div>
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>商品</TableHead>
              <TableHead>单位</TableHead>
              <TableHead className="text-right">可退</TableHead>
              <TableHead className="w-28">本次退</TableHead>
              <TableHead className="text-right">金额</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {so?.lines.map((l) => {
              const n = Number(qtys[l.id]) || 0;
              const amt = n * (Number(l.price) || 0);
              return (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-normal">{l.label}</TableCell>
                  <TableCell>{l.unit || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.max}</TableCell>
                  <TableCell>
                    <Input value={qtys[l.id] ?? ""} onChange={(e) => setQtys((p) => ({ ...p, [l.id]: e.target.value }))} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{n ? formatAmount(amt) : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-4">
        <div className="text-lg font-semibold tabular-nums">退货合计 ¥{formatAmount(total)}</div>
        <Button type="submit" size="lg">
          确认退货
        </Button>
      </div>
    </form>
  );
}

export function WorkReturnForm({
  orders,
  docId,
  defaultWorkOrderId,
  defaultRemark,
  defaultQtys,
}: {
  orders: ReturnSrc[];
  docId?: string;
  defaultWorkOrderId?: string;
  defaultRemark?: string;
  defaultQtys?: Record<string, string>;
}) {
  const router = useRouter();
  const [workOrderId, setWo] = useState(
    defaultWorkOrderId && orders.some((o) => o.id === defaultWorkOrderId) ? defaultWorkOrderId : (orders[0]?.id ?? ""),
  );
  const [remark, setRemark] = useState(defaultRemark ?? "");
  const wo = orders.find((o) => o.id === workOrderId);
  const [qtys, setQtys] = useState<Record<string, string>>(defaultQtys ?? {});

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const lines = Object.entries(qtys)
          .filter(([, q]) => Number(q) > 0)
          .map(([workOrderLineId, qty]) => ({ workOrderLineId, qty }));
        const r = await persistThenConfirm(
          () => saveWorkReturnDraft({ id: docId, workOrderId, remark, lines }),
          submitWorkReturn,
          true,
        );
        if (r.ok) {
          toast.success("已退料入库");
          router.push(`/work-returns/${r.id}`);
        } else toast.error(r.error);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>原工单</FieldLabel>
          <select
            className={sel}
            disabled={!!docId}
            value={workOrderId}
            onChange={(e) => {
              setWo(e.target.value);
              setQtys({});
            }}
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.docNo}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel>备注</FieldLabel>
          <Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="退料原因" />
        </Field>
      </div>
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>材料</TableHead>
              <TableHead>单位</TableHead>
              <TableHead className="text-right">可退</TableHead>
              <TableHead className="w-28">本次退</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(wo?.lines.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  这张工单没有可退的实物材料
                </TableCell>
              </TableRow>
            ) : (
              wo?.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-normal">{l.label}</TableCell>
                  <TableCell>{l.unit || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.max}</TableCell>
                  <TableCell>
                    <Input value={qtys[l.id] ?? ""} onChange={(e) => setQtys((p) => ({ ...p, [l.id]: e.target.value }))} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end border-t pt-4">
        <Button type="submit" size="lg">
          确认退料
        </Button>
      </div>
    </form>
  );
}
