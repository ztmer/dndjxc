"use client";

import { Button } from "@/components/ui/button";

export function PrintToolbar({
  paper,
  formats,
  currentFormatId,
}: {
  paper: string;
  formats?: { id: string; name: string }[];
  currentFormatId?: string;
}) {
  return (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3 print:hidden">
      <p className="text-sm text-neutral-600">纸张请选 {paper}。点打印后在系统对话框里核对尺寸。</p>
      <div className="flex flex-wrap items-center gap-2">
        {formats && formats.length > 1 ? (
          <select
            className="h-8 rounded-lg border bg-white px-2 text-sm"
            value={currentFormatId || ""}
            onChange={(e) => {
              const u = new URL(window.location.href);
              if (e.target.value) u.searchParams.set("formatId", e.target.value);
              else u.searchParams.delete("formatId");
              window.location.href = u.toString();
            }}
          >
            {formats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        ) : null}
        <Button type="button" onClick={() => window.print()}>
          打印
        </Button>
      </div>
    </div>
  );
}
