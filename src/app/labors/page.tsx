import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { money, qty } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { EmptyHint } from "@/components/empty-hint";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import Link from "next/link";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function LaborsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageRaw } = await searchParams;
  const [sum, total] = await Promise.all([
    prisma.dayLabor.aggregate({ _sum: { amount: true } }),
    prisma.dayLabor.count(),
  ]);
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.dayLabor.findMany({
    include: { workOrder: { include: { customer: true, project: true } } },
    orderBy: { workDate: "desc" },
    skip,
    take,
  });
  const totalAmt = Number(sum._sum.amount ?? 0);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="临时工记工" description={`合计 ¥${money(totalAmt)}，只记店内成本，不进入客户对账单。`} />
      {total === 0 ? (
        <EmptyHint title="还没有记工" hint="在工单里填写临时工天数和日薪。" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>天数</TableHead>
                <TableHead className="text-right">日薪</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>工单</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDate(r.workDate)}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{qty(r.days)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.dayRate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.amount)}</TableCell>
                  <TableCell>
                    <Link className="text-primary" href={`/work-orders/${r.workOrder.id}`}>
                      {r.workOrder.docNo}
                    </Link>
                    {" / "}
                    {r.workOrder.customer.name}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPager path="/labors" page={page} total={total} />
        </Card>
      )}
    </div>
  );
}
