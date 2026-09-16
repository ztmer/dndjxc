import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { FilterBar } from "@/components/filter-bar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function MobileProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageRaw } = await searchParams;
  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { brand: { contains: q } },
          { spec: { contains: q } },
          { code: { contains: q } },
          { barcode: { contains: q } },
        ],
      }
    : undefined;
  const total = await prisma.product.count({ where });
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.product.findMany({
    where,
    orderBy: [{ brand: "asc" }, { name: "asc" }],
    skip,
    take,
  });
  return (
    <div className="flex flex-col gap-3">
      <Link className={cn(buttonVariants(), "h-14 text-base")} href="/m/products/new">
        添加商品资料
      </Link>
      <FilterBar action="/m/products" q={q} placeholder="名称 / 品牌 / 型号" />
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">{q ? "没有这款" : "还没有本店商品。可拍照建档。"}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((p) => (
            <Link key={p.id} href={`/m/products/${p.id}`} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-3">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-md border bg-muted object-contain" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border bg-muted text-[10px] text-muted-foreground">
                  无图
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[p.brand, p.spec].filter(Boolean).join(" · ") || p.code} · ¥{money(p.salePrice)}
                </p>
              </div>
            </Link>
          ))}
          <ListPager path="/m/products" page={page} total={total} query={{ q }} />
        </div>
      )}
    </div>
  );
}
