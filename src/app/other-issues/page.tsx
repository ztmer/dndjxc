import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ISSUE_REASON, label } from "@/lib/labels";
import { PageHeader } from "@/components/page-header";
import { EmptyHint } from "@/components/empty-hint";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function OtherIssuesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageRaw } = await searchParams;
  const total = await prisma.otherIssue.count();
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.otherIssue.findMany({ orderBy: { createdAt: "desc" }, skip, take });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="其它出库" description="自用、报损、赠送，不产生客户应收。" actionHref="/other-issues/new" actionLabel="新建" />
      {total === 0 ? (
        <EmptyHint title="还没有其它出库" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单号</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>原因</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link className="font-medium text-primary" href={`/other-issues/${r.id}`}>
                      {r.docNo}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(r.bizDate)}</TableCell>
                  <TableCell>{label(ISSUE_REASON, r.reason)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPager path="/other-issues" page={page} total={total} />
        </Card>
      )}
    </div>
  );
}
