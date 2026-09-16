"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { postReceipt } from "@/actions/finance";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatAmount } from "@/lib/format-amount";
import type { ArPickRow } from "@/lib/ar-display";
import { cn } from "@/lib/utils";

const sel = "h-8 w-full rounded-lg border bg-background px-2 text-sm";

export function ReceiptForm({
  customerId,
  customerName,
  entries,
  docId,
  defaultMethod,
  defaultRemark,
  defaultAmounts,
  afterSaveHref,
}: {
  customerId: string;
  customerName?: string;
  entries: ArPickRow[];
  docId?: string;
  defaultMethod?: string;
  defaultRemark?: string;
  defaultAmounts?: Record<string, string>;
  afterSaveHref?: string;
}) {
  const router = useRouter();
  const [method, setMethod] = useState(defaultMethod ?? "wechat");
  const [remark, setRemark] = useState(defaultRemark ?? "");
  const [amounts, setAmounts] = useState<Record<string, string>>(defaultAmounts ?? {});
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [settlementFilter, setSettlementFilter] = useState("");
  const total = useMemo(
    () => Object.values(amounts).reduce((s, a) => s + (Number(a) || 0), 0),
    [amounts],
  );
  const types = useMemo(() => [...new Map(entries.map((e) => [e.sourceType, e.typeLabel])).entries()], [entries]);
  const settlements = useMemo(
    () => [...new Map(entries.map((e) => [e.settlement, e.settlementLabel])).entries()],
    [entries],
  );
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (typeFilter && e.sourceType !== typeFilter) return false;
      if (settlementFilter && e.settlement !== settlementFilter) return false;
      if (!needle) return true;
      const hay = [e.sourceNo, e.typeLabel, e.title, e.content, e.detail, e.date, e.settlementLabel].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [entries, q, typeFilter, settlementFilter]);
  const fillVisible = () =>
    setAmounts((p) => {
      const next = { ...p };
      for (const e of visible) next[e.id] = e.open;
      return next;
    });

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const lines = Object.entries(amounts)
          .filter(([, a]) => Number(a) > 0)
          .map(([arEntryId, amount]) => ({ arEntryId, amount }));
        const r = await postReceipt({ id: docId, customerId, method, remark, lines });
        if (r.ok) {
          toast.success("已收款");
          router.push((afterSaveHref ?? "/receipts/:id").replace(":id", r.id));
        } else toast.error(r.error);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {customerName ? (
          <Field>
            <FieldLabel>客户</FieldLabel>
            <Input value={customerName} disabled />
          </Field>
        ) : null}
        <Field>
          <FieldLabel>收款方式</FieldLabel>
          <select className={sel} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">现金</option>
            <option value="wechat">微信</option>
            <option value="alipay">支付宝</option>
            <option value="transfer">转账</option>
          </select>
        </Field>
        <Field className="sm:col-span-2 lg:col-span-1">
          <FieldLabel>备注</FieldLabel>
          <Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium">核销应收</div>
          <Button type="button" variant="outline" size="sm" onClick={fillVisible} disabled={visible.length === 0}>
            收齐当前筛选
          </Button>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜单号 / 合同标题 / 商品 / 工单内容" autoComplete="off" />
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={!typeFilter} onClick={() => setTypeFilter("")}>
              全部类型
            </FilterChip>
            {types.map(([v, lab]) => (
              <FilterChip key={v} active={typeFilter === v} onClick={() => setTypeFilter(v)}>
                {lab}
              </FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={!settlementFilter} onClick={() => setSettlementFilter("")}>
              全部结算
            </FilterChip>
            {settlements.map(([v, lab]) => (
              <FilterChip key={v} active={settlementFilter === v} onClick={() => setSettlementFilter(v)}>
                {lab}
              </FilterChip>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            共 {entries.length} 笔未收，当前显示 {visible.length} 笔
          </p>
        </div>
        {visible.length === 0 ? (
          <p className="rounded-xl border px-3 py-8 text-center text-sm text-muted-foreground">没有匹配的应收</p>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((en) => (
              <div key={en.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">{en.typeLabel} </span>
                    {en.href ? (
                      <Link className="font-medium text-primary" href={en.href}>
                        {en.sourceNo}
                      </Link>
                    ) : (
                      <span className="font-medium">{en.sourceNo}</span>
                    )}
                    <span className="text-muted-foreground">{` · ${en.date} · ${en.settlementLabel}`}</span>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-3 py-2">
                    <div className="text-xs text-muted-foreground">单据内容</div>
                    <div className="whitespace-pre-wrap break-words text-base font-medium leading-snug">
                      {en.content || en.title || "（原单无摘要）"}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">{en.detail}</div>
                </div>
                <div className="flex shrink-0 items-end gap-3">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">未收</div>
                    <div className="tabular-nums font-medium">¥{en.open}</div>
                  </div>
                  <Field className="w-36 gap-1">
                    <FieldLabel className="text-xs">本次收款</FieldLabel>
                    <Input
                      value={amounts[en.id] ?? ""}
                      onChange={(e) => setAmounts((p) => ({ ...p, [en.id]: e.target.value }))}
                      placeholder={en.open}
                      inputMode="decimal"
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-4">
        <div className="text-lg font-semibold tabular-nums">本次合计 ¥{formatAmount(total)}</div>
        <Button type="submit" size="lg">
          确认收款
        </Button>
      </div>
    </form>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-lg border px-3 text-sm",
        active ? "border-primary bg-primary/10 text-primary" : "bg-background hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
