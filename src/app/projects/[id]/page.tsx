import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { PROJECT_PROGRESS, SETTLEMENT, label } from "@/lib/labels";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { JobFlowBar } from "@/components/job-flow-bar";
import { AcceptButton, StartProjectButton } from "@/components/accept-project";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { buildJobFlow, invoiceLabel } from "@/lib/job-flow";
import { d } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pj = await prisma.project.findUnique({
    where: { id },
    include: {
      site: true,
      workOrders: { include: { labors: true }, orderBy: { createdAt: "desc" } },
      contract: { include: { customer: true, schedules: true } },
    },
  });
  if (!pj) notFound();

  const ar = await prisma.arEntry.findMany({
    where: {
      voided: false,
      customerId: pj.contract.customerId,
      OR: [{ sourceType: "contract", sourceId: pj.contractId }, { sourceType: "workOrder", sourceId: { in: pj.workOrders.map((w) => w.id) } }],
    },
  });
  const arTotal = ar.reduce((s, a) => s + Number(a.totalAmt), 0);
  const arReceived = ar.reduce((s, a) => s + Number(a.receivedAmt), 0);
  const arOpen = arTotal - arReceived;
  const materialOut = pj.workOrders.filter((w) => w.status === "submitted").reduce((s, w) => s + Number(w.materialAmt), 0);
  const laborCost = pj.workOrders.reduce((s, w) => s + w.labors.reduce((x, l) => x + Number(l.amount), 0), 0);
  const extraBill = pj.workOrders.filter((w) => w.status === "submitted").reduce((s, w) => s + Number(w.billableAmt), 0);
  const accepted = !!pj.acceptedAt;
  const hasAfterSales =
    accepted &&
    pj.workOrders.some((w) => pj.acceptedAt && w.createdAt >= pj.acceptedAt && w.status !== "voided");
  const steps = buildJobFlow({
    contractStatus: pj.contract.status,
    hasProject: true,
    progress: pj.progress,
    accepted,
    arTotal,
    arOpen,
    hasAfterSales,
  });
  const warrantyMode = pj.progress === "in_warranty";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={`${pj.docNo} ${pj.name}`}
          description={`${pj.contract.customer.name} · ${pj.contract.docNo} ${pj.contract.title} · ${label(PROJECT_PROGRESS, pj.progress)}`}
        />
        <div className="flex flex-wrap gap-2">
          {pj.progress === "not_started" ? <StartProjectButton id={pj.id} /> : null}
          {pj.progress !== "in_warranty" ? <AcceptButton id={pj.id} /> : null}
          <Link className={cn(buttonVariants({ variant: "outline" }))} href={`/contracts/${pj.contractId}`}>
            合同
          </Link>
          <Link className={cn(buttonVariants())} href={`/work-orders/new?customerId=${pj.contract.customerId}&projectId=${pj.id}`}>
            {warrantyMode ? "售后工单" : "施工工单"}
          </Link>
          {arOpen > 0.009 ? (
            <Link className={cn(buttonVariants({ variant: "outline" }))} href={`/receipts/new?customerId=${pj.contract.customerId}`}>
              收款
            </Link>
          ) : null}
        </div>
      </div>

      <JobFlowBar steps={steps} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">合同额 / 开票</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">¥{money(pj.contract.amount)}</div>
            <p className="text-sm text-muted-foreground">
              {pj.contract.taxInclusive ? "含税" : "不含税"} · {invoiceLabel(pj.contract.needInvoice, pj.contract.invoiceType)}
              {" · "}
              {label(SETTLEMENT, pj.contract.settlement)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">已收 / 未收</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">¥{money(d(arReceived))}</div>
            <p className="text-sm text-muted-foreground">未收 ¥{money(d(Math.max(0, arOpen)))}（合同+增项）</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">出库材料 / 临时工</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">¥{money(d(materialOut))}</div>
            <p className="text-sm text-muted-foreground">临时工成本 ¥{money(d(laborCost))}，不对客户出账</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">质保</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {pj.acceptedAt ? (
              <>
                验收 {formatDate(pj.acceptedAt)}
                <div>截止 {pj.warrantyEnd ? formatDate(pj.warrantyEnd) : "—"}</div>
              </>
            ) : (
              <>未验收，质保 {pj.contract.warrantyMonths} 月从验收日起算</>
            )}
            {extraBill > 0 ? <p className="mt-1 text-muted-foreground">合同外增项 ¥{money(d(extraBill))}</p> : null}
            {pj.site ? <p className="mt-1 text-muted-foreground">点位 {pj.site.name}</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>工单</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单号</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">材料</TableHead>
                <TableHead className="text-right">增项应收</TableHead>
                <TableHead>过程</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pj.workOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    还没有工单。施工先开施工工单；验收后开售后工单。
                  </TableCell>
                </TableRow>
              ) : (
                pj.workOrders.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>
                      <Link className="font-medium text-primary" href={`/work-orders/${w.id}`}>
                        {w.docNo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={w.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(w.materialAmt)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(w.billableAmt)}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{w.processNote || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
