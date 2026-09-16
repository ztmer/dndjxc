import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { EmptyHint } from "@/components/empty-hint";
import { Card } from "@/components/ui/card";
import { DOC_STATUS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

const statusOptions = Object.entries(DOC_STATUS).map(([value, label]) => ({ value, label }));

export default async function WorkOrdersPage({
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
    include: { customer: true, project: true },
    skip,
    take,
  });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="工单" description="零星维修只开工单；监控工程挂合同后，材料默认不另计应收。软件/网络可先搜知识库。" actionHref="/work-orders/new" actionLabel="开工单" />
      <p className="text-sm">
        <Link className="text-primary underline-offset-4 hover:underline" href="/knowledge">
          打开知识库
        </Link>
      </p>
      <FilterBar action="/work-orders" q={q} status={status} statusOptions={statusOptions} placeholder="单号 / 客户 / 过程" />
      {rows.length === 0 ? (
        <EmptyHint title="还没有工单" hint="点右上角开工单。" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单号</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>工程</TableHead>
                <TableHead className="text-right">本单应收</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link className="font-medium text-primary" href={`/work-orders/${r.id}`}>
                      {r.docNo}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(r.bizDate)}</TableCell>
                  <TableCell>{r.customer.name}</TableCell>
                  <TableCell>{r.project?.name ?? "零星"}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.billableAmt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPager path="/work-orders" page={page} total={total} query={{ q, status }} />
        </Card>
      )}
    </div>
  );
}
