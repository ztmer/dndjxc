import { SN_STATUS, label } from "@/lib/labels";
import { SerialSearch } from "@/components/serial-search";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { addMonths } from "@/lib/guards";
import { formatDate, formatDateTime } from "@/lib/format";
import { lookupSn } from "@/lib/sn-lookup";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PrintOpenButton } from "@/components/print-open-button";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

function soldLabel(status: string) {
  if (status === "in_stock" || status === "returned") return "尚未出售";
  if (status === "scrapped") return "已报废/其它出库";
  if (status === "rma") return "已返厂";
  return null;
}

export default async function SerialsPage({ searchParams }: { searchParams: Promise<{ sn?: string; page?: string }> }) {
  const { sn, page: pageRaw } = await searchParams;
  const result = sn?.trim() ? await lookupSn(sn, pageRaw) : null;
  const unique = result?.unique ?? null;
  const purchase = unique?.purchaseDocNo
    ? await prisma.purchaseReceipt.findFirst({ where: { docNo: unique.purchaseDocNo } })
    : null;
  const sale = unique?.saleDocNo
    ? await prisma.salesOrder.findFirst({ where: { docNo: unique.saleDocNo } })
    : null;
  const wo =
    unique?.saleDocNo && !sale
      ? await prisma.workOrder.findFirst({ where: { docNo: unique.saleDocNo } })
      : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="SN 查询"
        description="扫唯一 SN：立刻看到谁卖给我、卖给了谁。扫通用 SN：只识别这一款，列出每台唯一码的去向。"
      />
      <Card>
        <CardHeader>
          <CardTitle>扫码或手输</CardTitle>
          <CardDescription>演示：唯一码 SN-HDD-001，通用码 HDD-GENERIC</CardDescription>
        </CardHeader>
        <CardContent>
          <SerialSearch query={sn} foundUnique={!!unique} />
        </CardContent>
      </Card>

      {result && !unique && !result.unitsTotal && !result.commonProduct ? (
        <p className="text-sm text-destructive">未找到串号 {result.q}</p>
      ) : null}

      {unique ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>谁卖给我的</CardTitle>
              <CardDescription>进货批发商 / 供应商</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p>
                供应商：<span className="font-medium">{unique.supplier?.name ?? "未登记"}</span>
              </p>
              <p>电话：{unique.supplier?.phone || "—"}</p>
              <p>
                入库单：
                {unique.purchaseDocNo ? (
                  purchase ? (
                    <Link className="text-primary underline-offset-4 hover:underline" href={`/purchase/${purchase.id}`}>
                      {unique.purchaseDocNo}
                    </Link>
                  ) : unique.purchaseDocNo === "SEED" ? (
                    "期初入库"
                  ) : (
                    unique.purchaseDocNo
                  )
                ) : (
                  "—"
                )}
              </p>
              <p>入库时间：{unique.inboundAt ? formatDateTime(unique.inboundAt) : "—"}</p>
              <p>
                进货保修至：
                {unique.purchaseWarranty
                  ? formatDate(unique.purchaseWarranty)
                  : unique.inboundAt && unique.product.purchaseWarrantyMonths
                    ? formatDate(addMonths(unique.inboundAt, unique.product.purchaseWarrantyMonths))
                    : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>卖给谁了</CardTitle>
              <CardDescription>客户 / 销售或工单</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {soldLabel(unique.status) && !unique.customer ? (
                <p className="font-medium">{soldLabel(unique.status)}</p>
              ) : (
                <>
                  <p>
                    客户：
                    {unique.customer ? (
                      <Link className="font-medium text-primary underline-offset-4 hover:underline" href={`/customers/${unique.customer.id}`}>
                        {unique.customer.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </p>
                  <p>电话：{unique.customer?.phone || "—"}</p>
                  <p>
                    销售/工单：
                    {unique.saleDocNo ? (
                      sale ? (
                        <Link className="text-primary underline-offset-4 hover:underline" href={`/sales/${sale.id}`}>
                          {unique.saleDocNo}
                        </Link>
                      ) : wo ? (
                        <Link className="text-primary underline-offset-4 hover:underline" href={`/work-orders/${wo.id}`}>
                          {unique.saleDocNo}
                        </Link>
                      ) : (
                        unique.saleDocNo
                      )
                    ) : (
                      "—"
                    )}
                  </p>
                  <p>售出时间：{unique.soldAt ? formatDateTime(unique.soldAt) : "—"}</p>
                  <p>销售保修至：{unique.saleWarranty ? formatDate(unique.saleWarranty) : "—"}</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {unique ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              唯一 SN {unique.sn} · {unique.product.name}
              <Badge>{label(SN_STATUS, unique.status)}</Badge>
              <PrintOpenButton href={`/print/warrantyLabel/${unique.id}`}>打保修箱贴</PrintOpenButton>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p>通用 SN：{unique.commonSn || unique.product.commonSn || "—"}</p>
            <p>维修次数：{unique.repairCount}</p>
          </CardContent>
        </Card>
      ) : null}

      {result && !unique && (result.commonProduct || result.unitsTotal) ? (
        <Card>
          <CardHeader>
            <CardTitle>
              这是通用 SN
              {result.commonProduct ? ` · ${result.commonProduct.name}` : ""}
            </CardTitle>
            <CardDescription>
              同款共用此码，不能对应某一台的买家。请再扫包装上的唯一 SN。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {result.unitsTotal === 0 ? (
              <p>已登记该款，但还没有入库唯一 SN。</p>
            ) : (
              result.units.map((u) => (
                <p key={u.id}>
                  <Link className="font-medium text-primary underline-offset-4 hover:underline" href={`/serials?sn=${encodeURIComponent(u.sn)}`}>
                    {u.sn}
                  </Link>
                  {" · "}
                  {label(SN_STATUS, u.status)}
                  {" · 进货 "}
                  {u.supplier?.name ?? "—"}
                  {" · 客户 "}
                  {u.customer?.name ?? soldLabel(u.status) ?? "—"}
                </p>
              ))
            )}
          </CardContent>
          {sn ? <ListPager path="/serials" page={result.unitsPage} total={result.unitsTotal} query={{ sn }} /> : null}
        </Card>
      ) : null}
    </div>
  );
}
