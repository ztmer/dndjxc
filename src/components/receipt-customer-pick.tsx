"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ReceiptCustomerPick({
  list,
  hrefOf,
}: {
  list: { id: string; name: string; extra: string; amount: string }[];
  hrefOf: (id: string) => string;
}) {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return list;
    return list.filter((c) => `${c.name} ${c.extra}`.toLowerCase().includes(n));
  }, [list, q]);

  return (
    <div className="flex flex-col gap-2">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="输入客户名筛选" autoComplete="off" />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">没有匹配的客户</p>
      ) : (
        rows.map((c) => (
          <Link
            key={c.id}
            className={cn(buttonVariants({ variant: "outline" }), "h-auto justify-between py-3")}
            href={hrefOf(c.id)}
          >
            <span className="text-left">
              <span className="block font-medium">{c.name}</span>
              <span className="block text-xs font-normal text-muted-foreground">{c.extra}</span>
            </span>
            <span className="tabular-nums">{c.amount}</span>
          </Link>
        ))
      )}
    </div>
  );
}
