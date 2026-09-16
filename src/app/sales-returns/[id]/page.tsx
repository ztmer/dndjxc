import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { money, qty } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { DocButtons } from "@/components/doc-buttons";
import { submitSalesReturn, voidSalesReturn, unsubmitSalesReturn } from "@/actions/sales-return";
import { formatSerialsDisplay } from "@/lib/serials";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { SalesReturnForm } from "@/components/forms/return-forms";
import Link from "next/link";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.salesReturn.findUnique({
    where: { id },
    include: { customer: true, lines: true, salesOrder: true },
  });
  if (!doc) notFound();
  const products = await prisma.product.findMany({ where: { id: { in: doc.lines.map((l) => l.productId) } } });
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]));

  if (doc.status === "draft") {
    const so = await prisma.salesOrder.findUnique({
      where: { id: doc.salesOrderId },
      include: { lines: true, customer: true },
    });
    const catalog = await prisma.product.findMany();
    const names = Object.fromEntries(catalog.map((p) => [p.id, p.name]));
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader title={`${doc.docNo} 草稿`} description={`${doc.customer.name} · 反审后可改退货数量，再确认入库`} />
          <DocButtons id={doc.id} status={doc.status} onSubmit={submitSalesReturn} onUnsubmit={unsubmitSalesReturn} onVoid={voidSalesReturn} />
        </div>
        <Card>
          <CardContent className="pt-6">
            <SalesReturnForm
              docId={doc.id}
              defaultOrderId={doc.salesOrderId}
              defaultRemark={doc.remark}
              defaultQtys={Object.fromEntries(doc.lines.map((l) => [l.salesOrderLineId, qty(l.qty)]))}
              orders={
                so
                  ? [
                      {
                        id: so.id,
                        docNo: `${so.docNo} ${so.customer.name}`,
                        lines: so.lines.map((l) => ({
                          id: l.id,
                          label: names[l.productId] ?? l.productId,
                          max: qty(l.qty.sub(l.returnedQty)),
                          price: money(l.price),
                          unit: catalog.find((p) => p.id === l.productId)?.unit,
                        })),
                      },
                    ]
                  : []
              }
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
            {formatDate(doc.bizDate)} ·{" "}
            <Link className="text-primary" href={`/customers/${doc.customerId}`}>
              {doc.customer.name}
            </Link>
            {" · 原单 "}
            <Link className="text-primary" href={`/sales/${doc.salesOrderId}`}>
              {doc.salesOrder.docNo}
            </Link>
          </p>
        </div>
        <DocButtons id={doc.id} status={doc.status} onSubmit={submitSalesReturn} onUnsubmit={unsubmitSalesReturn} onVoid={voidSalesReturn} />
      </div>
      {doc.remark ? <p className="text-sm text-muted-foreground">备注：{doc.remark}</p> : null}
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>商品</TableHead>
              <TableHead>单位</TableHead>
              <TableHead className="text-right">数量</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>串号</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doc.lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{pmap[l.productId]?.name}</TableCell>
                <TableCell>{pmap[l.productId]?.unit || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{qty(l.qty)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(l.amount)}</TableCell>
                <TableCell className="whitespace-normal">{formatSerialsDisplay(l.serialsJson)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>合计</TableCell>
              <TableCell className="text-right tabular-nums">{money(doc.totalAmt)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </Card>
    </div>
  );
}
