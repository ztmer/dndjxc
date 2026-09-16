import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { qty } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { DocButtons } from "@/components/doc-buttons";
import { submitWorkReturn, voidWorkReturn, unsubmitWorkReturn } from "@/actions/service";
import { formatSerialsDisplay } from "@/lib/serials";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WorkReturnForm } from "@/components/forms/return-forms";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.workOrderReturn.findUnique({
    where: { id },
    include: { workOrder: { include: { customer: true } }, lines: true },
  });
  if (!doc) notFound();
  const products = await prisma.product.findMany({ where: { id: { in: doc.lines.map((l) => l.productId) } } });
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]));

  if (doc.status === "draft") {
    const wo = await prisma.workOrder.findUnique({
      where: { id: doc.workOrderId },
      include: { lines: true, customer: true },
    });
    const catalog = await prisma.product.findMany();
    const names = Object.fromEntries(catalog.map((p) => [p.id, p.name]));
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader title={`${doc.docNo} 草稿`} description={`${doc.workOrder.customer.name} · 反审后可改退料，再确认入库`} />
          <DocButtons id={doc.id} status={doc.status} onSubmit={submitWorkReturn} onUnsubmit={unsubmitWorkReturn} onVoid={voidWorkReturn} />
        </div>
        <Card>
          <CardContent className="pt-6">
            <WorkReturnForm
              docId={doc.id}
              defaultWorkOrderId={doc.workOrderId}
              defaultRemark={doc.remark}
              defaultQtys={Object.fromEntries(doc.lines.map((l) => [l.workOrderLineId, qty(l.qty)]))}
              orders={
                wo
                  ? [
                      {
                        id: wo.id,
                        docNo: `${wo.docNo} ${wo.customer.name}`,
                        lines: wo.lines
                          .filter((l) => l.isStocked)
                          .map((l) => ({
                            id: l.id,
                            label: names[l.productId] ?? l.productId,
                            max: qty(l.qty.sub(l.returnedQty)),
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
            {formatDate(doc.bizDate)} · {doc.workOrder.customer.name} · 原工单{" "}
            <Link className="text-primary" href={`/work-orders/${doc.workOrderId}`}>
              {doc.workOrder.docNo}
            </Link>
          </p>
        </div>
        <DocButtons id={doc.id} status={doc.status} onSubmit={submitWorkReturn} onUnsubmit={unsubmitWorkReturn} onVoid={voidWorkReturn} />
      </div>
      {doc.remark ? <p className="text-sm text-muted-foreground">备注：{doc.remark}</p> : null}
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>材料</TableHead>
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
