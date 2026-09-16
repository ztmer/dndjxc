"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { generateStatement } from "@/actions/finance";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CustomerPickField } from "@/components/customer-pick-field";
import { cn } from "@/lib/utils";
import type { StatementPeriodKind } from "@/lib/periods";
import type { CustomerOpt } from "@/components/forms/sales-form";

const KINDS: { value: StatementPeriodKind; label: string }[] = [
  { value: "week", label: "本周" },
  { value: "lastWeek", label: "上周" },
  { value: "month", label: "本月" },
  { value: "lastMonth", label: "上月" },
  { value: "year", label: "本年" },
  { value: "lastYear", label: "上年" },
  { value: "custom", label: "自定义" },
];

function todayYmd() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function monthStartYmd() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-01`;
}

export function StatementGenerateForm({
  customers,
  defaultCustomerId,
}: {
  customers: CustomerOpt[];
  defaultCustomerId?: string;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [kind, setKind] = useState<StatementPeriodKind>("lastMonth");
  const [customStart, setCustomStart] = useState(monthStartYmd());
  const [customEnd, setCustomEnd] = useState(todayYmd());
  const [busy, setBusy] = useState(false);
  const selected = useMemo(() => customers.find((c) => c.id === customerId), [customers, customerId]);

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel>客户</FieldLabel>
        <CustomerPickField customers={customers} value={customerId} onChange={(id) => setCustomerId(id)} />
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium">期间</p>
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={cn(
                "h-8 rounded-lg border px-3 text-sm",
                kind === k.value ? "border-primary bg-primary/10 text-primary" : "bg-background hover:bg-muted",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>
      {kind === "custom" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel>开始日期</FieldLabel>
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>结束日期</FieldLabel>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </Field>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy}
          onClick={async () => {
            if (!customerId) {
              toast.error("请先选客户");
              return;
            }
            setBusy(true);
            const r = await generateStatement({
              customerId,
              periodKind: kind,
              customStart,
              customEnd,
            });
            setBusy(false);
            if (r.ok) {
              toast.success("已出对账单");
              router.push(`/statements/${r.id}`);
            } else toast.error(r.error);
          }}
        >
          出对账单
        </Button>
        {selected ? (
          <Button type="button" variant="outline" onClick={() => router.push(`/statements?customerId=${customerId}`)}>
            只看该客户
          </Button>
        ) : null}
        {defaultCustomerId ? (
          <Button type="button" variant="ghost" onClick={() => router.push("/statements")}>
            看全部
          </Button>
        ) : null}
      </div>
    </div>
  );
}
