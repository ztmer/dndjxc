import { SN_STATUS, label } from "@/lib/labels";
import { SerialSearch } from "@/components/serial-search";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { addMonths } from "@/lib/guards";
import { formatDate, formatDateTime } from "@/lib/format";
import { lookupSn } from "@/lib/sn-lookup";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

function soldLabel(status: string) {
  if (status === "in_stock" || status === "returned") return "尚未出售";
  if (status === "scrapped") return "已报废/其它出库";
  if (status === "rma") return "已返厂";
  return null;
}

export default async function MobileSerialsPage({ searchParams }: { searchParams: Promise<{ sn?: string; page?: string }> }) {
  const { sn, page: pageRaw } = await searchParams;
  const result = sn?.trim() ? await lookupSn(sn, pageRaw) : null;
  const unique = result?.unique ?? null;
  const purchase = unique?.purchaseDocNo
    ? await prisma.purchaseReceipt.findFirst({ where: { docNo: unique.purchaseDocNo } })
    : null;
  const sale = unique?.saleDocNo ? await prisma.salesOrder.findFirst({ where: { docNo: unique.saleDocNo } }) : null;
  const wo = unique?.saleDocNo && !sale ? await prisma.workOrder.findFirst({ where: { docNo: unique.saleDocNo } }) : null;

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader>
          <CardTitle>扫码或手输</CardTitle>
          <CardDescription>点「扫码」打开相机拍条码。右边「拍照」可从相册选图。</CardDescription>
        </CardHeader>
        <CardContent>
          <SerialSearch query={sn} foundUnique={!!unique} action="/m/serials" enableCamera />
        </CardContent>
      </Card>
      {result && !unique && !result.unitsTotal && !result.commonProduct ? (
        <p className="text-sm text-destructive">未找到串号 {result.q}</p>
      ) : null}
      {unique ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {unique.sn} · {unique.product.name}
              <Badge>{label(SN_STATUS, unique.status)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <p>供应商：{unique.supplier?.name ?? "未登记"}</p>
            <p>
              入库单：{unique.purchaseDocNo ? (purchase ? unique.purchaseDocNo : unique.purchaseDocNo) : "—"}
            </p>
            <p>
              进货保修至：
              {unique.purchaseWarranty
                ? formatDate(unique.purchaseWarranty)
                : unique.inboundAt && unique.product.purchaseWarrantyMonths
                  ? formatDate(addMonths(unique.inboundAt, unique.product.purchaseWarrantyMonths))
                  : "—"}
            </p>
            <p>
              客户：
              {unique.customer ? (
                <Link className="text-primary" href={`/m/customers/${unique.customer.id}`}>
                  {unique.customer.name}
                </Link>
              ) : (
                soldLabel(unique.status) ?? "—"
              )}
            </p>
            <p>
              销售/工单：
              {wo ? (
                <Link className="text-primary" href={`/m/work-orders/${wo.id}`}>
                  {unique.saleDocNo}
                </Link>
              ) : (
                unique.saleDocNo ?? "—"
              )}
            </p>
            <p>销售保修至：{unique.saleWarranty ? formatDate(unique.saleWarranty) : "—"}</p>
            <p>售出：{unique.soldAt ? formatDateTime(unique.soldAt) : "—"}</p>
          </CardContent>
        </Card>
      ) : null}
      {result && !unique && (result.commonProduct || result.unitsTotal) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">通用 SN{result.commonProduct ? ` · ${result.commonProduct.name}` : ""}</CardTitle>
            <CardDescription>请再扫包装上的唯一 SN</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {result.units.map((u) => (
              <Link key={u.id} className="rounded-lg border px-3 py-2" href={`/m/serials?sn=${encodeURIComponent(u.sn)}`}>
                {u.sn} · {label(SN_STATUS, u.status)} · {u.customer?.name ?? soldLabel(u.status) ?? "—"}
              </Link>
            ))}
          </CardContent>
          {sn ? <ListPager path="/m/serials" page={result.unitsPage} total={result.unitsTotal} query={{ sn }} /> : null}
        </Card>
      ) : null}
    </div>
  );
}
