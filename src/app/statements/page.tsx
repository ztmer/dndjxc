import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { StatementGenerateForm } from "@/components/forms/statement-generate-form";
import { statementPeriodLabel } from "@/lib/periods";
import { PageHeader } from "@/components/page-header";
import { EmptyHint } from "@/components/empty-hint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { describeArPicks } from "@/lib/ar-display";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function StatementsPage({ searchParams }: { searchParams: Promise<{ customerId?: string; page?: string; upage?: string }> }) {
  const { customerId, page: pageRaw, upage: upageRaw } = await searchParams;
  const stWhere = customerId ? { customerId } : undefined;
  const stTotal = await prisma.statement.count({ where: stWhere });
  const { page, skip, take } = listPageState(pageRaw, stTotal);
  const rows = await prisma.statement.findMany({
    where: stWhere,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
  const customers = await prisma.customer.findMany({ where: { isWalkIn: false }, orderBy: { name: "asc" } });
  const unbilled = await prisma.arEntry.findMany({
    where: {
      voided: false,
      statementId: null,
      settlement: { in: ["monthly", "yearly"] },
      ...(customerId ? { customerId } : {}),
    },
    include: { customer: true },
    orderBy: { bizDate: "desc" },
  });
  const openUnbilled = unbilled.filter((a) => Number(a.totalAmt) - Number(a.receivedAmt) > 0.009);
  const uState = listPageState(upageRaw, openUnbilled.length);
  const openUnbilledPage = openUnbilled.slice(uState.skip, uState.skip + uState.take);
  const unbilledViews = await describeArPicks(
    openUnbilled,
    Object.fromEntries(openUnbilled.map((a) => [a.id, Number(a.totalAmt) - Number(a.receivedAmt)])),
  );
  const unbilledById = Object.fromEntries(unbilledViews.map((v) => [v.id, v]));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="对账单" description="选客户和期间后出对账单。周结/自定义会收入该时间内尚未入账的月结、年结应收。" />
      <Card>
        <CardHeader>
          <CardTitle>筛选并出对账单</CardTitle>
        </CardHeader>
        <CardContent>
          <StatementGenerateForm
            customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, settlement: c.settlement }))}
            defaultCustomerId={customerId}
          />
        </CardContent>
      </Card>
      {stTotal === 0 ? (
        <EmptyHint title="还没有对账单" hint="上面选客户和期间后点「出对账单」。" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单号</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>期间</TableHead>
                <TableHead className="text-right">合计</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link className="font-medium text-primary" href={`/statements/${r.id}`}>
                      {r.docNo}
                    </Link>
                  </TableCell>
                  <TableCell>{r.customer.name}</TableCell>
                  <TableCell>
                    {statementPeriodLabel(r.periodType)}　{formatDate(r.periodStart)} ~ {formatDate(r.periodEnd)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.totalAmt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPager path="/statements" page={page} total={stTotal} query={{ customerId }} />
        </Card>
      )}
      {openUnbilled.length ? (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-normal">尚未入对账单</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>结算</TableHead>
                <TableHead className="text-right">未收</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openUnbilledPage.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-normal">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm">{a.sourceNo}</span>
                      <span className="font-medium">{unbilledById[a.id]?.content || unbilledById[a.id]?.title || ""}</span>
                    </div>
                  </TableCell>
                  <TableCell>{a.customer.name}</TableCell>
                  <TableCell>{a.settlement === "yearly" ? "年结" : "月结"}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(Number(a.totalAmt) - Number(a.receivedAmt))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPager path="/statements" page={uState.page} total={openUnbilled.length} query={{ customerId, page: pageRaw }} pageKey="upage" />
        </Card>
      ) : null}
    </div>
  );
}
