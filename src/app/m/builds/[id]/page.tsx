import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { money, qty } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { DocButtons } from "@/components/doc-buttons";
import { submitBuild, voidBuild, unsubmitBuild } from "@/actions/service";
import { formatSerialsDisplay, parseSerials } from "@/lib/serials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BuildForm } from "@/components/forms/build-form";
import { customerOpts, productOpts } from "@/lib/queries";
import { listDiyKits } from "@/lib/diy-kits";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MobileBuildDetail({ params }: { params: Promise<{ id: string }> }) {
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
  const ar = await prisma.arEntry.findFirst({
    where: { sourceType: "buildConfig", sourceId: doc.id, voided: false },
  });
  const arOpen = ar ? Number(ar.totalAmt) - Number(ar.receivedAmt) : 0;

  if (doc.status === "draft") {
    const [customers, productList, kits] = await Promise.all([customerOpts(), productOpts(), listDiyKits()]);
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {doc.docNo} 草稿 · {doc.customer.name}
        </p>
        <Card>
          <CardContent className="pt-4">
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
              detailHref="/m/builds/:id"
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
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
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
        extraPrints={[{ href: `/print/installSheet/${doc.id}`, label: "装机单" }]}
        printHref={`/print/buildConfig/${doc.id}`}
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
          <p className="text-sm tabular-nums text-muted-foreground">
            配件 {money(part)} · 工时 {money(doc.laborFee)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">成交价</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums">¥{money(deal)}</CardContent>
      </Card>
      {doc.salesOrder ? (
        <p className="text-sm text-muted-foreground">已挂销售 {doc.salesOrder.docNo}（完整开单请用电脑）</p>
      ) : null}
      {doc.remark ? <p className="text-sm text-muted-foreground">备注：{doc.remark}</p> : null}
      <div className="flex flex-col gap-2">
        {doc.lines.map((l) => (
          <div key={l.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">{l.slot || "配件"}</p>
            <p className="font-medium">{pmap[l.productId]?.name}</p>
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
