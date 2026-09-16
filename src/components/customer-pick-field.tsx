"use client";

import { FilterPickField } from "@/components/filter-pick-field";
import type { CustomerOpt } from "@/components/forms/sales-form";

export function CustomerPickField({
  customers,
  value,
  onChange,
}: {
  customers: CustomerOpt[];
  value: string;
  onChange: (id: string, customer: CustomerOpt | undefined) => void;
}) {
  return (
    <FilterPickField
      items={customers.map((c) => ({
        id: c.id,
        title: c.name,
        hint: c.phone || undefined,
        search: `${c.name} ${c.phone ?? ""}`,
      }))}
      value={value}
      onChange={(id) => onChange(id, customers.find((c) => c.id === id))}
      placeholder="输入姓名或电话筛选"
      emptyText="没有匹配的客户，换个字再试"
    />
  );
}
