import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { money, qty, d } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { DocButtons } from "@/components/doc-buttons";
import { submitSales, voidSales, unsubmitSales, saveSalesDraft } from "@/actions/sales";
import { formatSerialsDisplay, parseSerials } from "@/lib/serials";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { SalesForm } from "@/components/forms/sales-form";
import { customerOpts, productOpts } from "@/lib/queries";
import { SETTLEMENT, label } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { JobFlowBar } from "@/components/job-flow-bar";
import { buildSalesFlow, invoiceLabel } from "@/lib/job-flow";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SalesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.salesOrder.findUnique({
    where: { id },
    include: { customer: true, lines: true, buildConfig: true },
  });
  if (!doc) notFound();
  const products = await prisma.product.findMany({ where: { id: { in: doc.lines.map((l) => l.productId) } } });
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
  const [prs, ar] = await Promise.all([
    prisma.purchaseRequest.findMany({ where: { sourceType: "salesOrder", sourceId: doc.id } }),
    prisma.arEntry.findFirst({ where: { sourceType: "salesOrder", sourceId: doc.id, voided: false } }),
  ]);
  const hasOpenPurchase = prs.some((p) => p.status === "open");
  const arTotal = ar ? Number(ar.totalAmt) : Number(doc.totalAmt);
  const arOpen = ar ? Number(ar.totalAmt) - Number(ar.receivedAmt) : doc.status === "submitted" ? Number(doc.totalAmt) : 0;
  const steps = buildSalesFlow({
    isWalkIn: doc.customer.isWalkIn,
    status: doc.status,
    hasOpenPurchase,
    arTotal,
    arOpen,
  });

  if (doc.status === "draft") {
    const [customers, productList] = await Promise.all([customerOpts(), productOpts()]);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader
            title={`${doc.docNo} 草稿`}
            description={
              doc.customer.isWalkIn
                ? `${doc.customer.name} · 柜台现货`
                : `${doc.customer.name} · 谈单中 · ${doc.taxInclusive ? "含税" : "不含税"} · ${invoiceLabel(doc.needInvoice, doc.invoiceType)}`
            }
          />
          <DocButtons
            id={doc.id}
            status={doc.status}
            printHref={`/print/salesOrder/${doc.id}`}
            printLabel="销售小票"
            extraPrints={[
              { href: `/print/deliveryNote/${doc.id}`, label: "送货单" },
              { href: `/print/warrantyLabel/${doc.id}`, label: "保修箱贴" },
            ]}
          />
        </div>
        <JobFlowBar steps={steps} />
        {hasOpenPurchase ? (
          <p className="text-sm text-destructive">
            缺货已转待采购 {prs.filter((p) => p.status === "open").map((p) => p.docNo).join("、")}。入库后再点本单「开单出库」。
            <Link className="ml-2 text-primary" href="/purchase-requests">
              去待采购
            </Link>
          </p>
        ) : null}
        <Card>
          <CardContent className="pt-6">
            <SalesForm
              customers={customers}
              products={productList}
              defaultCustomerId={doc.customerId}
              defaultSettlement={doc.settlement}
              defaultRemark={doc.remark}
              defaultLaterDelivery={doc.laterDelivery}
              defaultTaxInclusive={doc.taxInclusive}
              defaultNeedInvoice={doc.needInvoice}
              defaultInvoiceType={doc.invoiceType}
              defaultBooksOnly={doc.booksOnly}
              defaultBizDate={formatDate(doc.bizDate)}
              docId={doc.id}
              defaultLines={doc.lines.map((l) => ({
                productId: l.productId,
                qty: qty(l.qty),
                price: money(l.price),
                serials: parseSerials(l.serialsJson).join("\n"),
              }))}
              save={saveSalesDraft}
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
            {formatDate(doc.bizDate)} · {label(SETTLEMENT, doc.settlement)} · {doc.taxInclusive ? "含税" : "不含税"} ·{" "}
            {invoiceLabel(doc.needInvoice, doc.invoiceType)}
            {doc.booksOnly ? " · 期初旧单（只记账）" : ""}
            {doc.buildConfig ? ` · 来自配置 ${doc.buildConfig.docNo}` : ""}
            {doc.laterDelivery ? " · 先开单后送货" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {doc.status === "submitted" ? (
            <>
              <Link className={cn(buttonVariants({ variant: "outline" }))} href={`/work-orders/new?customerId=${doc.customerId}&warranty=1&salesOrderId=${doc.id}`}>
                售后工单
              </Link>
              <Link className={cn(buttonVariants({ variant: "outline" }))} href={`/sales-returns/new?salesOrderId=${doc.id}`}>
                退货
              </Link>
            </>
          ) : null}
          <DocButtons
            id={doc.id}
            status={doc.status}
            onSubmit={submitSales}
            onUnsubmit={unsubmitSales}
            onVoid={voidSales}
            printHref={`/print/salesOrder/${doc.id}`}
            printLabel="销售小票"
            extraPrints={[
              { href: `/print/deliveryNote/${doc.id}`, label: "送货单" },
              { href: `/print/warrantyLabel/${doc.id}`, label: "保修箱贴" },
            ]}
            submitLabel="开单"
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
      </div>
      <JobFlowBar steps={steps} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">客户</CardTitle>
          </CardHeader>
          <CardContent>
            <Link className="font-medium text-primary" href={`/customers/${doc.customerId}`}>
              {doc.customer.name}
            </Link>
            <p className="text-sm text-muted-foreground">{doc.customer.phone || "无电话"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">合计</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            ¥{money(doc.totalAmt)}
            <p className="text-sm font-normal text-muted-foreground">未收 ¥{money(d(Math.max(0, arOpen)))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">构成</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            材料 {money(doc.materialAmt)}　服务 {money(doc.serviceAmt)}
          </CardContent>
        </Card>
      </div>
      {doc.remark ? <p className="text-sm text-muted-foreground">备注：{doc.remark}</p> : null}
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>商品</TableHead>
              <TableHead>单位</TableHead>
              <TableHead className="text-right">数量</TableHead>
              <TableHead className="text-right">单价</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>串号</TableHead>
              <TableHead>保修</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doc.lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  {(() => {
                    const p = pmap[l.productId];
                    if (!p) return "—";
                    const brand = (p.brand || "").trim();
                    const model = (p.name || "").trim();
                    const name = brand && model ? (model.startsWith(brand) ? model : `${brand}${model}`) : model;
                    return name;
                  })()}
                  {!l.isStocked ? <span className="ml-2 text-xs text-muted-foreground">服务</span> : null}
                </TableCell>
                <TableCell>{pmap[l.productId]?.unit || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{qty(l.qty)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(l.price)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(l.amount)}</TableCell>
                <TableCell className="whitespace-normal">{formatSerialsDisplay(l.serialsJson)}</TableCell>
                <TableCell>{l.saleWarrantyMonths} 月</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4}>合计</TableCell>
              <TableCell className="text-right tabular-nums">{money(doc.totalAmt)}</TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      </Card>
    </div>
  );
}
