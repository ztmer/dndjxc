import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { PAY_METHOD, label } from "@/lib/labels";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/format";
import { EmptyHint } from "@/components/empty-hint";
import { Card } from "@/components/ui/card";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageRaw } = await searchParams;
  const total = await prisma.receipt.count();
  const { page, skip, take } = listPageState(pageRaw, total);
  const [rows, unpaid] = await Promise.all([
    prisma.receipt.findMany({ include: { customer: true }, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.arEntry.findMany({ where: { voided: false } }),
  ]);
  const hasOpen = unpaid.some((a) => Number(a.totalAmt) > Number(a.receivedAmt));
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="收款单" description="现金当场收；月结/年结在对账单确认后核销。" actionHref="/receipts/new" actionLabel="新建收款" />
      {hasOpen ? <p className="text-sm text-muted-foreground">还有未收款，点右上角核销。</p> : null}
      {rows.length === 0 ? (
        <EmptyHint title="还没有收款单" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单号</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>方式</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link className="font-medium text-primary" href={`/receipts/${r.id}`}>
                      {r.docNo}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(r.bizDate)}</TableCell>
                  <TableCell>{r.customer.name}</TableCell>
                  <TableCell>{label(PAY_METHOD, r.method)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.amount)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPager path="/receipts" page={page} total={total} />
        </Card>
      )}
    </div>
  );
}
