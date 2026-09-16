import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { money, qty } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { DocButtons } from "@/components/doc-buttons";
import { submitWorkOrder, submitWorkOrderAndCollect, voidWorkOrder, unsubmitWorkOrder, saveWorkOrderDraft } from "@/actions/service";
import { formatSerialsDisplay, parseSerials } from "@/lib/serials";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { WorkOrderForm } from "@/components/forms/work-order-form";
import { customerOpts, productOpts } from "@/lib/queries";
import { SETTLEMENT, VISIT_TYPE, label } from "@/lib/labels";
import { formatDate, formatDateTime, formatDateTimeLocal } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function WoDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.workOrder.findUnique({
    where: { id },
    include: { customer: true, lines: true, labors: true, project: true, site: true },
  });
  if (!doc) notFound();
  const products = await prisma.product.findMany({ where: { id: { in: doc.lines.map((l) => l.productId) } } });
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
  const laborCost = doc.labors.reduce((s, l) => s + Number(l.amount), 0);
  const ar = await prisma.arEntry.findFirst({
    where: { sourceType: "workOrder", sourceId: doc.id, voided: false },
  });
  const arOpen = ar ? Number(ar.totalAmt) - Number(ar.receivedAmt) : doc.status === "submitted" ? Number(doc.billableAmt) : 0;

  if (doc.status === "draft") {
    const [customers, productList, sites, projects] = await Promise.all([
      customerOpts(),
      productOpts(),
      prisma.site.findMany(),
      prisma.project.findMany({ include: { contract: true } }),
    ]);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader title={`${doc.docNo} 草稿`} description={`${doc.customer.name}。软件/网络问题可先查知识库。`} />
          <DocButtons id={doc.id} status={doc.status} printHref={`/print/workOrder/${doc.id}`} />
        </div>
        <Card>
          <CardContent className="pt-6">
            <WorkOrderForm
              customers={customers}
              products={productList}
              sites={sites.map((s) => ({ id: s.id, name: s.name, customerId: s.customerId }))}
              projects={projects.map((p) => ({ id: p.id, name: `${p.docNo} ${p.name}`, customerId: p.contract.customerId }))}
              defaultCustomerId={doc.customerId}
              docId={doc.id}
              initial={{
                siteId: doc.siteId ?? "",
                projectId: doc.projectId ?? "",
                visitType: doc.visitType,
                appointedAt: doc.appointedAt ? formatDateTimeLocal(doc.appointedAt) : "",
                processNote: doc.processNote,
                nextAdvice: doc.nextAdvice,
                settlement: doc.settlement,
                booksOnly: doc.booksOnly,
                bizDate: formatDate(doc.bizDate),
                lines: doc.lines.map((l) => ({
                  productId: l.productId,
                  qty: qty(l.qty),
                  price: money(l.price),
                  serials: parseSerials(l.serialsJson).join("\n"),
                  isWarrantyFree: l.isWarrantyFree,
                  isContractExtra: l.isContractExtra,
                })),
                labors: doc.labors.map((l) => ({
                  name: l.name,
                  workDate: formatDate(l.workDate),
                  days: qty(l.days),
                  dayRate: money(l.dayRate),
                })),
              }}
              save={saveWorkOrderDraft}
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
            {label(VISIT_TYPE, doc.visitType)}
            {doc.booksOnly ? " · 期初旧单（只记账）" : ""}
            {doc.appointedAt ? ` · 预约 ${formatDateTime(doc.appointedAt)}` : ""}
            {doc.project ? ` · 工程 ${doc.project.name}` : " · 零星工单"}
          </p>
        </div>
        <DocButtons
          id={doc.id}
          status={doc.status}
          onSubmit={submitWorkOrder}
          onSubmitPay={submitWorkOrderAndCollect}
          submitLabel="完工，迟点收款"
          onUnsubmit={unsubmitWorkOrder}
          onVoid={voidWorkOrder}
          printHref={`/print/workOrder/${doc.id}`}
          collectHref={
            arOpen > 0.009
              ? doc.settlement === "cash"
                ? `/receipts/new?customerId=${doc.customerId}`
                : `/statements?customerId=${doc.customerId}`
              : undefined
          }
          collectLabel={doc.settlement === "cash" ? "收款" : "对账单"}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">客户</CardTitle>
          </CardHeader>
          <CardContent>
            <Link className="font-medium text-primary" href={`/customers/${doc.customerId}`}>
              {doc.customer.name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {doc.site?.name ?? "未指定上门地点"} · {label(SETTLEMENT, doc.settlement)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">本单应收</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">¥{money(doc.billableAmt)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">构成</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            材料 {money(doc.materialAmt)}　服务 {money(doc.serviceAmt)}
            <p className="mt-1 text-muted-foreground">临时工成本 {money(laborCost)}（不对客户出账）</p>
          </CardContent>
        </Card>
      </div>
      {doc.processNote ? <p className="text-sm">过程：{doc.processNote}</p> : null}
      {doc.nextAdvice ? <p className="text-sm text-muted-foreground">下次建议：{doc.nextAdvice}</p> : null}
      {doc.settlement !== "cash" && Number(doc.billableAmt) > 0 ? (
        <p className="text-sm text-muted-foreground">月结/年结：本单进对账单。系统按「上月」出账，本月单子要到下月 1 日才能生成对账单再收款。</p>
      ) : null}
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>项目</TableHead>
              <TableHead>单位</TableHead>
              <TableHead className="text-right">数量</TableHead>
              <TableHead className="text-right">单价</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>增项</TableHead>
              <TableHead>保内免费</TableHead>
              <TableHead>串号</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doc.lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  {pmap[l.productId]?.name}
                  {!l.isStocked ? <span className="ml-2 text-xs text-muted-foreground">服务</span> : null}
                </TableCell>
                <TableCell>{pmap[l.productId]?.unit || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{qty(l.qty)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(l.price)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(l.amount)}</TableCell>
                <TableCell>{l.isContractExtra ? "是" : "—"}</TableCell>
                <TableCell>{l.isWarrantyFree ? "是" : "—"}</TableCell>
                <TableCell className="whitespace-normal">{formatSerialsDisplay(l.serialsJson)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4}>本单应收</TableCell>
              <TableCell className="text-right tabular-nums">{money(doc.billableAmt)}</TableCell>
              <TableCell colSpan={3} />
            </TableRow>
          </TableFooter>
        </Table>
      </Card>
      {doc.labors.length ? (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>临时工</TableHead>
                <TableHead>日期</TableHead>
                <TableHead className="text-right">天数</TableHead>
                <TableHead className="text-right">日薪</TableHead>
                <TableHead className="text-right">金额</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doc.labors.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.name}</TableCell>
                  <TableCell>{formatDate(l.workDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{qty(l.days)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(l.dayRate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(l.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}
    </div>
  );
}
