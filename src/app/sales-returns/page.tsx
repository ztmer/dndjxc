import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { EmptyHint } from "@/components/empty-hint";
import { Card } from "@/components/ui/card";
import { money } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageRaw } = await searchParams;
  const total = await prisma.salesReturn.count();
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.salesReturn.findMany({ include: { customer: true }, orderBy: { createdAt: "desc" }, skip, take });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="销售退货" description="按已完成销售单退回门店仓。" actionHref="/sales-returns/new" actionLabel="新建退货" />
      {total === 0 ? (
        <EmptyHint title="还没有退货单" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单号</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>客户</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link className="font-medium text-primary" href={`/sales-returns/${r.id}`}>
                      {r.docNo}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(r.bizDate)}</TableCell>
                  <TableCell>{r.customer.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.totalAmt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPager path="/sales-returns" page={page} total={total} />
        </Card>
      )}
    </div>
  );
}
