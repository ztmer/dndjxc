import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { EmptyHint } from "@/components/empty-hint";
import { Card } from "@/components/ui/card";
import { SETTLEMENT, DOC_STATUS, label } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const { q, status, page: pageRaw } = await searchParams;
  const where = {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ docNo: { contains: q } }, { customer: { name: { contains: q } } }] } : {}),
  };
  const total = await prisma.salesOrder.count({ where });
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.salesOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { customer: true },
    skip,
    take,
  });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="销售单" description="散客卖现货；其它客户谈单开单，缺货采购后送货结款。" actionHref="/sales/new" actionLabel="开单" />
      <FilterBar
        action="/sales"
        q={q}
        status={status}
        statusOptions={Object.entries(DOC_STATUS).map(([value, label]) => ({ value, label }))}
        placeholder="单号 / 客户"
      />
      {rows.length === 0 ? (
        <EmptyHint title="还没有销售单" hint="点右上角开单，或从组装配置确认出库后自动生成。" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单号</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>结算</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link className="font-medium text-primary" href={`/sales/${r.id}`}>
                      {r.docNo}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(r.bizDate)}</TableCell>
                  <TableCell>{r.customer.name}</TableCell>
                  <TableCell>{label(SETTLEMENT, r.settlement)}</TableCell>
                  <TableCell className="max-w-48 truncate text-muted-foreground">{r.remark || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.totalAmt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPager path="/sales" page={page} total={total} query={{ q, status }} />
        </Card>
      )}
    </div>
  );
}
