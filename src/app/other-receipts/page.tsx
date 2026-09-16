import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { EmptyHint } from "@/components/empty-hint";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function OtherReceiptsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageRaw } = await searchParams;
  const total = await prisma.otherReceipt.count();
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.otherReceipt.findMany({ orderBy: { createdAt: "desc" }, skip, take });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="其它入库" description="盘盈、调入等，不挂供应商。" actionHref="/other-receipts/new" actionLabel="新建" />
      {total === 0 ? (
        <EmptyHint title="还没有其它入库" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单号</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link className="font-medium text-primary" href={`/other-receipts/${r.id}`}>
                      {r.docNo}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(r.bizDate)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPager path="/other-receipts" page={page} total={total} />
        </Card>
      )}
    </div>
  );
}
