import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { qty } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { DocButtons } from "@/components/doc-buttons";
import { submitOtherIssue, voidOtherIssue, unsubmitOtherIssue } from "@/actions/warehouse";
import { formatSerialsDisplay, parseSerials } from "@/lib/serials";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { OtherStockForm } from "@/components/forms/other-stock-form";
import { productOpts } from "@/lib/queries";
import { ISSUE_REASON, label } from "@/lib/labels";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.otherIssue.findUnique({ where: { id }, include: { lines: true } });
  if (!doc) notFound();
  const products = await prisma.product.findMany({ where: { id: { in: doc.lines.map((l) => l.productId) } } });
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]));

  if (doc.status === "draft") {
    const productList = await productOpts();
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader title={`${doc.docNo} 草稿`} description={label(ISSUE_REASON, doc.reason)} />
          <DocButtons id={doc.id} status={doc.status} onSubmit={submitOtherIssue} onUnsubmit={unsubmitOtherIssue} onVoid={voidOtherIssue} />
        </div>
        <Card>
          <CardContent className="pt-6">
            <OtherStockForm
              products={productList}
              mode="out"
              docId={doc.id}
              defaultReason={doc.reason}
              defaultRemark={doc.remark}
              defaultLines={doc.lines.map((l) => ({
                productId: l.productId,
                qty: qty(l.qty),
                price: "0",
                serials: parseSerials(l.serialsJson).join("\n"),
              }))}
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
            {label(ISSUE_REASON, doc.reason)} · {formatDate(doc.bizDate)}（无客户应收）
          </p>
        </div>
        <DocButtons id={doc.id} status={doc.status} onSubmit={submitOtherIssue} onUnsubmit={unsubmitOtherIssue} onVoid={voidOtherIssue} />
      </div>
      {doc.remark ? <p className="text-sm text-muted-foreground">备注：{doc.remark}</p> : null}
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>商品</TableHead>
              <TableHead>单位</TableHead>
              <TableHead className="text-right">数量</TableHead>
              <TableHead>串号</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doc.lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{pmap[l.productId]?.name}</TableCell>
                <TableCell>{pmap[l.productId]?.unit || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{qty(l.qty)}</TableCell>
                <TableCell className="whitespace-normal">{formatSerialsDisplay(l.serialsJson)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
