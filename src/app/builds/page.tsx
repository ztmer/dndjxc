import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { EmptyHint } from "@/components/empty-hint";
import { Card } from "@/components/ui/card";
import { DOC_STATUS } from "@/lib/labels";
import { money } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

const statusOptions = Object.entries(DOC_STATUS).map(([value, label]) => ({ value, label }));

export default async function BuildsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const { q, status, page: pageRaw } = await searchParams;
  const where = {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ docNo: { contains: q } }, { modelName: { contains: q } }, { customer: { name: { contains: q } } }] } : {}),
  };
  const total = await prisma.buildConfig.count({ where });
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.buildConfig.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { customer: true, salesOrder: true, lines: true },
    skip,
    take,
  });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="组装配置单" description="必须写配件清单。可从产品目录「组装电脑」装机宝典带入。确认出库后扣门店仓配件并生成销售单，不入成品仓。" actionHref="/builds/new" actionLabel="新建配置" />
      <FilterBar action="/builds" q={q} status={status} statusOptions={statusOptions} placeholder="单号 / 机型 / 客户" />
      {rows.length === 0 ? (
        <EmptyHint title="还没有配置单" hint="点右上角新建，必须写配件。" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单号</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>机型</TableHead>
                <TableHead className="text-right">成交估价</TableHead>
                <TableHead>销售单</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link className="font-medium text-primary" href={`/builds/${r.id}`}>
                      {r.docNo}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(r.bizDate)}</TableCell>
                  <TableCell>{r.customer.name}</TableCell>
                  <TableCell>{r.modelName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(r.lines.reduce((s, l) => s + Number(l.amount), 0) + Number(r.laborFee))}
                  </TableCell>
                  <TableCell>
                    {r.salesOrder ? (
                      <Link className="text-primary" href={`/sales/${r.salesOrder.id}`}>
                        {r.salesOrder.docNo}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPager path="/builds" page={page} total={total} query={{ q, status }} />
        </Card>
      )}
    </div>
  );
}
