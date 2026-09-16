import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SETTLEMENT, label } from "@/lib/labels";
import { money } from "@/lib/money";
import { FilterBar } from "@/components/filter-bar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function MobileCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageRaw } = await searchParams;
  const where = q
      ? {
          OR: [
            { name: { contains: q } },
            { contactName: { contains: q } },
            { phone: { contains: q } },
            { address: { contains: q } },
            { code: { contains: q } },
          ],
        }
      : undefined;
  const total = await prisma.customer.count({ where });
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { arEntries: true },
    skip,
    take,
  });
  return (
    <div className="flex flex-col gap-3">
      <Link className={cn(buttonVariants(), "h-12")} href="/m/customers/new">
        新建现金客户
      </Link>
      <FilterBar action="/m/customers" q={q} placeholder="姓名、电话、地址" />
      {total === 0 ? (
        <div className="flex min-h-[120px] flex-col items-start justify-center gap-2 rounded-lg border bg-card px-4 py-6">
          <p className="font-medium">{q ? "没有叫这个的客户" : "还没有客户"}</p>
          <p className="text-sm text-muted-foreground">
            {q ? "换个电话或店名再搜。" : "出门也能建现金客户。月结/年结单位请回店用电脑开。"}
          </p>
          <Link className={cn(buttonVariants(), "h-11")} href="/m/customers/new">
            新建现金客户
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((c) => {
            const unpaid = c.arEntries.filter((a) => !a.voided).reduce((s, a) => s + Number(a.totalAmt) - Number(a.receivedAmt), 0);
            return (
              <div key={c.id} className="rounded-lg border bg-card px-3 py-3">
                <Link href={`/m/customers/${c.id}`} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">
                      {c.name}
                      {c.isWalkIn ? (
                        <Badge variant="secondary" className="ml-2">
                          散客
                        </Badge>
                      ) : null}
                    </p>
                    <span className={cn("shrink-0 text-sm tabular-nums", unpaid > 0.009 ? "text-foreground" : "text-muted-foreground")}>
                      {unpaid > 0.009 ? `未收 ¥${money(unpaid)}` : "已结清"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{label(SETTLEMENT, c.settlement)}</p>
                </Link>
                {c.phone ? (
                  <a href={`tel:${c.phone}`} className={cn(buttonVariants({ variant: "outline" }), "mt-2 h-11 w-full")}>
                    打电话 {c.phone}
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">无电话</p>
                )}
              </div>
            );
          })}
          <ListPager path="/m/customers" page={page} total={total} query={{ q }} />
        </div>
      )}
    </div>
  );
}
