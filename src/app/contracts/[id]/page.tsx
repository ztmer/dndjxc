import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { DocButtons } from "@/components/doc-buttons";
import { submitContract, voidContract, unsubmitContract } from "@/actions/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { ContractForm } from "@/components/forms/contract-form";
import { customerOpts } from "@/lib/queries";
import { JobFlowBar } from "@/components/job-flow-bar";
import { buildJobFlow, invoiceLabel } from "@/lib/job-flow";
import { INVOICE_TYPE, SETTLEMENT, PROJECT_PROGRESS, label } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { shopInfo } from "@/lib/print";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.contract.findUnique({
    where: { id },
    include: { customer: true, schedules: true, projects: { include: { workOrders: true } } },
  });
  if (!doc) notFound();
  const shop = await shopInfo();

  const extraWoIds = doc.projects.flatMap((p) => p.workOrders.map((w) => w.id));
  const ar = await prisma.arEntry.findMany({
    where: {
      voided: false,
      customerId: doc.customerId,
      OR: [
        { sourceType: "contract", sourceId: doc.id },
        ...(extraWoIds.length ? [{ sourceType: "workOrder" as const, sourceId: { in: extraWoIds } }] : []),
      ],
    },
  });
  const arTotal = ar.reduce((s, a) => s + Number(a.totalAmt), 0);
  const arOpen = ar.reduce((s, a) => s + Number(a.totalAmt) - Number(a.receivedAmt), 0);
  const lead = doc.projects[0];
  const hasAfterSales = doc.projects.some(
    (p) =>
      !!p.acceptedAt &&
      p.workOrders.some((w) => w.createdAt >= p.acceptedAt! && w.status !== "voided"),
  );
  const steps = buildJobFlow({
    contractStatus: doc.status,
    hasProject: doc.projects.length > 0,
    progress: lead?.progress ?? "not_started",
    accepted: !!lead?.acceptedAt,
    arTotal,
    arOpen,
    hasAfterSales,
  });

  if (doc.status === "draft") {
    const customers = await customerOpts();
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader title={`${doc.docNo} 草稿`} description="报价阶段。谈妥后点下单，合同额进应收。" />
          <DocButtons
            id={doc.id}
            status={doc.status}
            printHref={`/print/contract/${doc.id}`}
            printLabel="打印合同"
          />
        </div>
        <JobFlowBar steps={steps} />
        <Card>
          <CardContent className="pt-6">
            <ContractForm
              customers={customers}
              defaultCustomerId={doc.customerId}
              docId={doc.id}
              initial={{
                title: doc.title,
                amount: money(doc.amount),
                warrantyMonths: String(doc.warrantyMonths),
                settlement: doc.settlement,
                durationNote: doc.durationNote,
                remark: doc.remark,
                signDate: formatDate(doc.signDate),
                taxInclusive: doc.taxInclusive,
                needInvoice: doc.needInvoice,
                invoiceType: doc.invoiceType,
                schedules: doc.schedules.map((s) => ({
                  name: s.name,
                  amount: money(s.amount),
                  dueDate: s.dueDate ? formatDate(s.dueDate) : "",
                })),
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
            {doc.docNo}
            <StatusBadge status={doc.status} />
          </h1>
          <p className="text-sm text-muted-foreground">
            {doc.title} · {doc.taxInclusive ? "含税" : "不含税"} · {invoiceLabel(doc.needInvoice, doc.invoiceType)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {doc.status === "submitted" ? (
            <Link className={cn(buttonVariants({ variant: "outline" }))} href={`/projects/new?contractId=${doc.id}`}>
              建工程
            </Link>
          ) : null}
          <DocButtons
            id={doc.id}
            status={doc.status}
            onSubmit={submitContract}
            onUnsubmit={unsubmitContract}
            onVoid={voidContract}
            printHref={`/print/contract/${doc.id}`}
            printLabel="打印合同"
            collectHref={`/receipts/new?customerId=${doc.customerId}`}
            collectLabel="收款"
          />
        </div>
      </div>
      <JobFlowBar steps={steps} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">甲乙双方</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              甲方（客户）{" "}
              <Link className="font-medium text-primary" href={`/customers/${doc.customerId}`}>
                {doc.customer.name}
              </Link>
            </p>
            <p className="text-sm">乙方（本店）{shop.shop}</p>
            <p className="text-sm text-muted-foreground">{label(SETTLEMENT, doc.settlement)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">合同额</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            ¥{money(doc.amount)}
            <p className="text-sm font-normal text-muted-foreground">
              {doc.taxInclusive ? "含税" : "不含税"} · {invoiceLabel(doc.needInvoice, doc.invoiceType)}
              {doc.needInvoice && doc.invoiceType ? `（${label(INVOICE_TYPE, doc.invoiceType)}）` : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">签订 / 质保</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {formatDate(doc.signDate)}　质保 {doc.warrantyMonths} 月
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">未收</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">¥{money(arOpen)}</CardContent>
        </Card>
      </div>
      {doc.remark ? <p className="text-sm text-muted-foreground">备注：{doc.remark}</p> : null}
      <Card>
        <CardHeader>
          <CardTitle>收款计划</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>款项</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>预计日期</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doc.schedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    未拆款项
                  </TableCell>
                </TableRow>
              ) : (
                doc.schedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(s.amount)}</TableCell>
                    <TableCell>{s.dueDate ? formatDate(s.dueDate) : "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>工程</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {doc.projects.length === 0 ? (
            <p className="text-muted-foreground">尚未建工程。下单后点右上角「建工程」，再开工、做施工工单。</p>
          ) : (
            doc.projects.map((p) => (
              <Link key={p.id} className="rounded-lg border px-3 py-2 hover:bg-muted/40" href={`/projects/${p.id}`}>
                {p.docNo} {p.name} · {label(PROJECT_PROGRESS, p.progress)}
              </Link>
            ))
          )}
          <p className="text-muted-foreground">工单材料默认不另计应收，只计本合同额 + 增项。订金/尾款随时可收。</p>
        </CardContent>
      </Card>
    </div>
  );
}
