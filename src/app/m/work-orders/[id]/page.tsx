import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { money, qty } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { DocButtons } from "@/components/doc-buttons";
import { submitWorkOrder, submitWorkOrderAndCollect, voidWorkOrder, unsubmitWorkOrder, saveWorkOrderDraft } from "@/actions/service";
import { formatSerialsDisplay, parseSerials } from "@/lib/serials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkOrderForm } from "@/components/forms/work-order-form";
import { customerOpts, productOpts } from "@/lib/queries";
import { SETTLEMENT, VISIT_TYPE, label } from "@/lib/labels";
import { formatDate, formatDateTime, formatDateTimeLocal } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MobileWoDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.workOrder.findUnique({
    where: { id },
    include: { customer: true, lines: true, labors: true, project: true, site: true },
  });
  if (!doc) notFound();
  const products = await prisma.product.findMany({ where: { id: { in: doc.lines.map((l) => l.productId) } } });
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
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
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {doc.docNo} 草稿 · {doc.customer.name}
        </p>
        <Card>
          <CardContent className="pt-4">
            <WorkOrderForm
              customers={customers}
              products={productList}
              sites={sites.map((s) => ({ id: s.id, name: s.name, customerId: s.customerId }))}
              projects={projects.map((p) => ({ id: p.id, name: `${p.docNo} ${p.name}`, customerId: p.contract.customerId }))}
              defaultCustomerId={doc.customerId}
              docId={doc.id}
              detailHref="/m/work-orders/:id"
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
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
          {doc.docNo}
          <StatusBadge status={doc.status} />
        </h1>
        <p className="text-sm text-muted-foreground">
          {label(VISIT_TYPE, doc.visitType)}
          {doc.booksOnly ? " · 期初旧单" : ""}
          {doc.appointedAt ? ` · ${formatDateTime(doc.appointedAt)}` : ""}
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
        collectHref={arOpen > 0.009 ? `/m/receipts/new?customerId=${doc.customerId}` : undefined}
        collectLabel="收款"
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">客户</CardTitle>
        </CardHeader>
        <CardContent>
          <Link className="font-medium text-primary" href={`/m/customers/${doc.customerId}`}>
            {doc.customer.name}
          </Link>
          <p className="text-sm text-muted-foreground">
            {doc.site?.name ?? "未指定上门地点"} · {label(SETTLEMENT, doc.settlement)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">本单应收</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums">¥{money(doc.billableAmt)}</CardContent>
      </Card>
      {doc.processNote ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">过程</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{doc.processNote}</CardContent>
        </Card>
      ) : null}
      {doc.nextAdvice ? <p className="text-sm text-muted-foreground">下次建议：{doc.nextAdvice}</p> : null}
      <div className="flex flex-col gap-2">
        {doc.lines.map((l) => (
          <div key={l.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
            <p className="font-medium">
              {pmap[l.productId]?.name}
              {!l.isStocked ? <span className="ml-2 text-xs text-muted-foreground">服务</span> : null}
            </p>
            <p className="tabular-nums">
              {qty(l.qty)} {pmap[l.productId]?.unit || ""} × {money(l.price)} = {money(l.amount)}
            </p>
            {formatSerialsDisplay(l.serialsJson) ? (
              <p className="text-xs text-muted-foreground">{formatSerialsDisplay(l.serialsJson)}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
