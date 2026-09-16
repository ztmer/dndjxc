"use client";

import { useRouter } from "next/navigation";
import { FilterPickField } from "@/components/filter-pick-field";

export function CustomerQueryFilter({
  action,
  customers,
  customerId,
  extra,
  emptyLabel = "全部客户",
  placeholder = "输入客户名或电话筛选",
}: {
  action: string;
  customers: { id: string; name: string; phone?: string | null }[];
  customerId?: string;
  extra?: Record<string, string | undefined>;
  emptyLabel?: string;
  placeholder?: string;
}) {
  const router = useRouter();

  function go(id: string) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(extra ?? {})) {
      if (v) p.set(k, v);
    }
    if (id) p.set("customerId", id);
    const s = p.toString();
    router.push(s ? `${action}?${s}` : action);
  }

  return (
    <div className="min-w-[16rem] max-w-md flex-1">
      <FilterPickField
        items={customers.map((c) => ({
          id: c.id,
          title: c.name,
          hint: c.phone || undefined,
          search: `${c.name} ${c.phone ?? ""}`,
        }))}
        value={customerId ?? ""}
        onChange={go}
        placeholder={placeholder}
        allowEmpty
        emptyLabel={emptyLabel}
      />
    </div>
  );
}
