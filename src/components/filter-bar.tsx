"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function FilterBar({
  action,
  q,
  placeholder = "搜索",
  status,
  statusOptions,
  hidden,
}: {
  action: string;
  q?: string;
  placeholder?: string;
  status?: string;
  statusOptions?: { value: string; label: string }[];
  hidden?: Record<string, string>;
}) {
  return (
    <form action={action} className="flex max-w-xl flex-wrap gap-2">
      {hidden
        ? Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))
        : null}
      <Input name="q" defaultValue={q} placeholder={placeholder} autoComplete="off" className="h-11 min-w-[8rem] flex-1 text-base" />
      {statusOptions ? (
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-11 min-w-[7rem] rounded-lg border bg-background px-2 text-sm"
        >
          <option value="">全部状态</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : null}
      <Button type="submit" variant="outline" className="h-11">
        筛选
      </Button>
    </form>
  );
}
