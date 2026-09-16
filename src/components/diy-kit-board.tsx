import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { money } from "@/lib/money";
import { parseDiyHighlights } from "@/lib/build-presets";

/** 京东装机宝典式卡片：CPU / 显卡 / 主板 / 内存 + 去看看 / 开配置 */
export function DiyKitBoard({
  rows,
}: {
  rows: {
    id: string;
    code: string;
    name: string;
    spec: string;
    params: string;
    imageUrl: string;
    suggestedSale: { toString(): string } | number;
  }[];
}) {
  if (!rows.length) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">没有符合场景或价位的套餐</p>;
  }
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((p) => {
        const h = parseDiyHighlights(p.params);
        return (
          <article key={p.id} className="flex flex-col rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex gap-3">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-md border bg-muted object-contain" />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-md border bg-muted" />
              )}
              <div className="min-w-0">
                <h3 className="font-medium leading-snug">{p.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{h.scene || p.spec}</p>
              </div>
            </div>
            <dl className="mt-3 grid gap-1.5 text-sm">
              <div className="flex gap-2">
                <dt className="w-10 shrink-0 text-muted-foreground">CPU</dt>
                <dd className="min-w-0">{h.cpu || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-10 shrink-0 text-muted-foreground">显卡</dt>
                <dd className="min-w-0">{h.gpu || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-10 shrink-0 text-muted-foreground">主板</dt>
                <dd className="min-w-0">{h.mb || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-10 shrink-0 text-muted-foreground">内存</dt>
                <dd className="min-w-0">{h.ram || "—"}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-lg font-semibold tabular-nums text-primary">{money(p.suggestedSale)}</div>
              <div className="flex gap-2">
                {p.id.startsWith("KIT-") ? null : (
                  <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/catalog/${p.id}`}>
                    去看看
                  </Link>
                )}
                <Link className={buttonVariants({ size: "sm" })} href={`/builds/new?kit=${encodeURIComponent(p.code)}`}>
                  开配置
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
