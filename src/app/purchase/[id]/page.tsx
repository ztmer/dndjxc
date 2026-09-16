import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { qty, money } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { DocButtons } from "@/components/doc-buttons";
import { submitPurchaseReceipt, voidPurchaseReceipt, unsubmitPurchaseReceipt, savePurchaseReceiptDraft } from "@/actions/warehouse";
import { formatSerialsDisplay, parseSerials } from "@/lib/serials";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { PurchaseForm } from "@/components/forms/purchase-form";
import { productOpts } from "@/lib/queries";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PurchaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.purchaseReceipt.findUnique({ where: { id }, include: { lines: true, supplier: true } });
  if (!doc) notFound();
  const products = await prisma.product.findMany({ where: { id: { in: doc.lines.map((l) => l.productId) } } });
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
  const total = doc.lines.reduce((s, l) => s + Number(l.qty) * Number(l.cost), 0);

  if (doc.status === "draft") {
    const [productList, suppliers] = await Promise.all([productOpts(), prisma.supplier.findMany()]);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader title={`${doc.docNo} 草稿`} description={doc.supplier?.name ?? "无供应商"} />
          <DocButtons id={doc.id} status={doc.status} onSubmit={submitPurchaseReceipt} onUnsubmit={unsubmitPurchaseReceipt} onVoid={voidPurchaseReceipt} printHref={`/print/purchaseReceipt/${doc.id}`} submitLabel="入库" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <PurchaseForm
              suppliers={suppliers}
              products={productList}
              openPrLines={[]}
              docId={doc.id}
              defaultSupplierId={doc.supplierId ?? ""}
              defaultRemark={doc.remark}
              defaultLines={doc.lines.map((l) => ({
                productId: l.productId,
                qty: qty(l.qty),
                price: money(l.cost),
                serials: parseSerials(l.serialsJson).join("\n"),
                purchaseRequestLineId: l.purchaseRequestLineId ?? undefined,
              }))}
              save={savePurchaseReceiptDraft}
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
          <p className="text-sm text-muted-foreground">{formatDate(doc.bizDate)}</p>
        </div>
        <DocButtons id={doc.id} status={doc.status} onSubmit={submitPurchaseReceipt} onUnsubmit={unsubmitPurchaseReceipt} onVoid={voidPurchaseReceipt} printHref={`/print/purchaseReceipt/${doc.id}`} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">供应商</CardTitle>
          </CardHeader>
          <CardContent>{doc.supplier?.name ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">进货合计</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">¥{money(total)}</CardContent>
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
              <TableHead className="text-right">进价</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>唯一 SN</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doc.lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{pmap[l.productId]?.name}</TableCell>
                <TableCell>{pmap[l.productId]?.unit || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{qty(l.qty)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(l.cost)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(Number(l.qty) * Number(l.cost))}</TableCell>
                <TableCell className="whitespace-normal">{formatSerialsDisplay(l.serialsJson)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4}>合计</TableCell>
              <TableCell className="text-right tabular-nums">{money(total)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </Card>
    </div>
  );
}
