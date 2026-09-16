import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { FilterBar } from "@/components/filter-bar";
import { DOC_STATUS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

const statusOptions = Object.entries(DOC_STATUS).map(([value, label]) => ({ value, label }));

export default async function MobileWorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status, page: pageRaw } = await searchParams;
  const where = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [{ docNo: { contains: q } }, { customer: { name: { contains: q } } }, { processNote: { contains: q } }],
          }
        : {}),
  };
  const total = await prisma.workOrder.count({ where });
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.workOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { customer: true },
    skip,
    take,
  });
  return (
    <div className="flex flex-col gap-3">
      <Link className={cn(buttonVariants(), "h-11")} href="/m/work-orders/new">
        开工单
      </Link>
      <FilterBar action="/m/work-orders" q={q} status={status} statusOptions={statusOptions} placeholder="单号 / 客户 / 过程" />
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">还没有工单</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <Link key={r.id} href={`/m/work-orders/${r.id}`} className="rounded-lg border bg-card px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{r.docNo}</span>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-sm">{r.customer.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(r.bizDate)} · 应收 ¥{money(r.billableAmt)}
              </p>
            </Link>
          ))}
          <ListPager path="/m/work-orders" page={page} total={total} query={{ q, status }} />
        </div>
      )}
    </div>
  );
}
