"use client";

import { useState } from "react";
import { toast } from "sonner";
import { importCatalogXlsx } from "@/actions/catalog";
import { Button } from "@/components/ui/button";

/** 本店自己的 Excel 批量进目录，不是京东抓取。 */
export function CatalogImport() {
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a className="text-sm text-primary underline-offset-4 hover:underline" href="/api/export/catalog">
        下载导入模板
      </a>
      <label className="inline-flex h-8 cursor-pointer items-center rounded-lg border px-2.5 text-sm">
        {busy ? "正在导入…" : "从 Excel 导入"}
        <input
          type="file"
          accept=".xlsx"
          className="sr-only"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            const fd = new FormData();
            fd.set("file", file);
            const r = await importCatalogXlsx(fd);
            setBusy(false);
            if (!r.ok) {
              toast.error(r.error);
              return;
            }
            toast.success(`新增 ${r.created}、更新 ${r.updated}${r.error ? `。${r.error}` : ""}`);
          }}
        />
      </label>
    </div>
  );
}
