import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { money, qty } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { DocButtons } from "@/components/doc-buttons";
import { submitBuild, voidBuild, unsubmitBuild } from "@/actions/service";
import { formatSerialsDisplay, parseSerials } from "@/lib/serials";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { BuildForm } from "@/components/forms/build-form";
import { customerOpts, productOpts } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { listDiyKits } from "@/lib/diy-kits";

export const dynamic = "force-dynamic";

export default async function BuildDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.buildConfig.findUnique({
    where: { id },
    include: { customer: true, lines: true, salesOrder: true },
  });
  if (!doc) notFound();
  const products = await prisma.product.findMany({ where: { id: { in: doc.lines.map((l) => l.productId) } } });
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
  const part = doc.lines.reduce((s, l) => s + Number(l.amount), 0);
  const deal = part + Number(doc.laborFee);

  if (doc.status === "draft") {
    const [customers, productList, kits] = await Promise.all([customerOpts(), productOpts(), listDiyKits()]);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader title={`${doc.docNo} 草稿`} description={`${doc.customer.name} · ${doc.modelName}`} />
          <DocButtons
            id={doc.id}
            status={doc.status}
            onSubmit={submitBuild}
            onUnsubmit={unsubmitBuild}
            onVoid={voidBuild}
            printHref={`/print/buildConfig/${doc.id}`}
            extraPrints={[{ href: `/print/installSheet/${doc.id}`, label: "装机单" }]}
          />
        </div>
        <Card>
          <CardContent className="pt-6">
            <BuildForm
              customers={customers}
              products={productList}
              kits={kits}
              defaultCustomerId={doc.customerId}
              docId={doc.id}
              defaultModelName={doc.modelName}
              defaultLaborFee={money(doc.laborFee)}
              defaultUnitSn={doc.unitSn}
              defaultRemark={doc.remark}
              defaultLines={doc.lines.map((l) => ({
                productId: l.productId,
                qty: qty(l.qty),
                price: money(l.price),
                serials: parseSerials(l.serialsJson).join("\n"),
                slot: l.slot || undefined,
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
            {doc.modelName} · {formatDate(doc.bizDate)}
            {doc.unitSn ? ` · 整机 SN ${doc.unitSn}` : ""}
          </p>
        </div>
        <DocButtons
          id={doc.id}
          status={doc.status}
          onSubmit={submitBuild}
          onUnsubmit={unsubmitBuild}
          onVoid={voidBuild}
          printHref={`/print/buildConfig/${doc.id}`}
          extraPrints={[{ href: `/print/installSheet/${doc.id}`, label: "装机单" }]}
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">成交价</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">¥{money(deal)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">构成</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            配件 {money(part)}　工时 {money(doc.laborFee)}
            {doc.salesOrder ? (
              <p className="mt-1">
                已挂销售{" "}
                <Link className="text-primary" href={`/sales/${doc.salesOrder.id}`}>
                  {doc.salesOrder.docNo}
                </Link>
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
      {doc.remark ? <p className="text-sm text-muted-foreground">备注：{doc.remark}</p> : null}
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>配件位</TableHead>
              <TableHead>配件</TableHead>
              <TableHead>单位</TableHead>
              <TableHead className="text-right">数量</TableHead>
              <TableHead className="text-right">单价</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>串号</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doc.lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-muted-foreground">{l.slot || "—"}</TableCell>
                <TableCell>{pmap[l.productId]?.name}</TableCell>
                <TableCell>{pmap[l.productId]?.unit || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{qty(l.qty)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(l.price)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(l.amount)}</TableCell>
                <TableCell className="whitespace-normal">{formatSerialsDisplay(l.serialsJson)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5}>配件小计</TableCell>
              <TableCell className="text-right tabular-nums">{money(part)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </Card>
    </div>
  );
}
