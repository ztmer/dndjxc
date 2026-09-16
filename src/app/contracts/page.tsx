import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { EmptyHint } from "@/components/empty-hint";
import { Card } from "@/components/ui/card";
import { SETTLEMENT, label } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { invoiceLabel } from "@/lib/job-flow";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageRaw } = await searchParams;
  const total = await prisma.contract.count();
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.contract.findMany({ orderBy: { createdAt: "desc" }, include: { customer: true }, skip, take });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="合同" description="报价可暂存，点下单。工程必须挂合同。含税带票写在合同上。" actionHref="/contracts/new" actionLabel="新建合同" />
      {rows.length === 0 ? (
        <EmptyHint title="还没有合同" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单号</TableHead>
                <TableHead>签订</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>项目</TableHead>
                <TableHead>结算</TableHead>
                <TableHead>开票</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>质保</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link className="font-medium text-primary" href={`/contracts/${r.id}`}>
                      {r.docNo}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(r.signDate)}</TableCell>
                  <TableCell>{r.customer.name}</TableCell>
                  <TableCell>{r.title}</TableCell>
                  <TableCell>{label(SETTLEMENT, r.settlement)}</TableCell>
                  <TableCell>
                    {r.taxInclusive ? "含税" : "不含税"} / {invoiceLabel(r.needInvoice, r.invoiceType)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.amount)}</TableCell>
                  <TableCell>{r.warrantyMonths} 月</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPager path="/contracts" page={page} total={total} />
        </Card>
      )}
    </div>
  );
}
