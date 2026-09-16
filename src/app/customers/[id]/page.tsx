import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { SETTLEMENT, label } from "@/lib/labels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/format";
import { EmptyHint } from "@/components/empty-hint";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { AssetForm } from "@/components/forms/asset-form";
import { CustomerNetworkSection } from "@/components/customer-network-section";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.customer.findUnique({
    where: { id },
    include: {
      sites: true,
      assets: true,
      contracts: { orderBy: { createdAt: "desc" }, take: 6 },
      workOrders: { orderBy: { createdAt: "desc" }, take: 8 },
      salesOrders: { orderBy: { createdAt: "desc" }, take: 6 },
      timeline: { orderBy: { createdAt: "desc" }, take: 30 },
      arEntries: true,
      serials: { where: { status: { in: ["sold", "installed"] } }, include: { product: { select: { name: true, brand: true } } } },
      broadbandAccounts: { orderBy: { updatedAt: "desc" } },
      netDevices: { orderBy: { updatedAt: "desc" } },
      ipAddrs: { orderBy: { address: "asc" } },
      wifiNetworks: { orderBy: { updatedAt: "desc" } },
    },
  });
  if (!c) notFound();
  const unpaid = c.arEntries.filter((a) => !a.voided).reduce((s, a) => s + Number(a.totalAmt) - Number(a.receivedAmt), 0);
  const material = c.arEntries.filter((a) => !a.voided).reduce((s, a) => s + Number(a.materialAmt), 0);
  const assetSns = new Set(c.assets.map((a) => a.sn).filter(Boolean));
  const soldUnits = c.serials.filter((s) => !assetSns.has(s.sn));
  const inWarranty = c.assets.length + soldUnits.length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{c.name}</h1>
          <p className="text-sm text-muted-foreground">
            {c.code}
            {c.contactName ? ` · ${c.contactName}` : ""}
            {` · ${c.phone || "无电话"}`}
            {c.address ? ` · ${c.address}` : ""}
            {` · ${label(SETTLEMENT, c.settlement)}`}
            {c.isWalkIn ? " · 散客不可月结" : ""}
            {c.needInvoice ? ` · 开票 ${c.invoiceTitle || c.name}` : ""}
            {c.remark ? ` · ${c.remark}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className={cn(buttonVariants({ variant: "outline" }))} href={`/customers/${c.id}/edit`}>
            编辑资料
          </Link>
          <Link className={cn(buttonVariants())} href={`/sales/new?customerId=${c.id}`}>
            销售开单
          </Link>
          <Link className={cn(buttonVariants({ variant: "outline" }))} href={`/work-orders/new?customerId=${c.id}`}>
            开工单
          </Link>
          <Link className={cn(buttonVariants({ variant: "outline" }))} href={`/builds/new?customerId=${c.id}`}>
            组装配置
          </Link>
          <Link className={cn(buttonVariants({ variant: "outline" }))} href={`/contracts/new?customerId=${c.id}`}>
            新建合同
          </Link>
          <Link className={cn(buttonVariants({ variant: "outline" }))} href={`/receipts/new?customerId=${c.id}`}>
            收款
          </Link>
          <Link className={cn(buttonVariants({ variant: "outline" }))} href={`/statements?customerId=${c.id}`}>
            对账单
          </Link>
          <Link className={cn(buttonVariants({ variant: "outline" }))} href={`#network`}>
            网络资料
          </Link>
        </div>
      </div>
      {c.needInvoice ? (
        <Card>
          <CardHeader>
            <CardTitle>开票信息</CardTitle>
            <CardDescription>只存资料，方便对单位开票；不做税务申报</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <div>抬头：{c.invoiceTitle || c.name}</div>
            <div>税号：{c.taxNo || "—"}</div>
            <div>开户行：{c.invoiceBank || "—"}</div>
            <div>账号：{c.invoiceAccount || "—"}</div>
            <div className="sm:col-span-2">开票地址电话：{[c.invoiceAddress || c.address, c.invoicePhone || c.phone].filter(Boolean).join(" ") || "—"}</div>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>未收款</CardDescription>
            <CardTitle className="tabular-nums">¥{money(unpaid)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>累计材料应收</CardDescription>
            <CardTitle className="tabular-nums">¥{money(material)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>上门地点</CardDescription>
            <CardTitle className="text-base font-normal">
              {c.sites.length === 0 ? (
                <span>
                  未建。同一单位有几个办公场所时，到
                  <Link className="text-primary" href={`/customers/${c.id}/edit`}>
                    编辑资料
                  </Link>
                  里添加。
                </span>
              ) : (
                <ul className="mt-1 space-y-1 text-sm">
                  {c.sites.map((s) => (
                    <li key={s.id}>
                      <span className="font-medium">{s.name}</span>
                      {s.address ? <span className="text-muted-foreground"> · {s.address}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>在保设备</CardDescription>
            <CardTitle>{inWarranty}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近工单</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {c.workOrders.length === 0 ? (
              <EmptyHint title="还没有工单" />
            ) : (
              c.workOrders.map((w) => (
                <Link key={w.id} href={`/work-orders/${w.id}`} className="flex justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted">
                  <span>{w.docNo}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <StatusBadge status={w.status} />
                    {money(w.billableAmt)}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>合同 / 设备台账</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {c.contracts.map((ct) => (
              <Link key={ct.id} href={`/contracts/${ct.id}`} className="rounded-lg border px-3 py-2 text-sm hover:bg-muted">
                {ct.docNo} {ct.title} · {money(ct.amount)}
              </Link>
            ))}
            {c.assets.map((a) => (
              <div key={a.id} className="rounded-lg border px-3 py-2 text-sm">
                {a.name}
                {a.sn ? ` · SN ${a.sn}` : ""}
                {a.warrantyEnd ? ` · 保至 ${formatDate(a.warrantyEnd)}` : ""}
              </div>
            ))}
            {soldUnits.map((s) => (
              <div key={s.id} className="rounded-lg border px-3 py-2 text-sm">
                {s.product.brand ? `${s.product.brand} ` : ""}
                {s.product.name}
                {` · SN ${s.sn}`}
                {s.saleWarranty ? ` · 保至 ${formatDate(s.saleWarranty)}` : ""}
                {s.saleDocNo ? ` · ${s.saleDocNo}` : ""}
              </div>
            ))}
            {c.contracts.length === 0 && c.assets.length === 0 && soldUnits.length === 0 ? <EmptyHint title="无合同、无设备台账" /> : null}
            <div className="border-t pt-3">
              <p className="mb-2 text-sm font-medium">记入设备</p>
              <AssetForm customerId={c.id} sites={c.sites.map((s) => ({ id: s.id, name: s.name }))} />
            </div>
          </CardContent>
        </Card>
      </div>

      <CustomerNetworkSection
        customerId={c.id}
        sites={c.sites.map((s) => ({ id: s.id, name: s.name }))}
        accounts={c.broadbandAccounts}
        devices={c.netDevices}
        ips={c.ipAddrs}
        wifis={c.wifiNetworks}
      />

      <Card>
        <CardHeader>
          <CardTitle>时间线</CardTitle>
          <CardDescription>销售、工单、合同、收款自动生成，不可手改</CardDescription>
        </CardHeader>
        <CardContent>
          {c.timeline.length === 0 ? (
            <EmptyHint title="还没有往来记录" hint="开一张销售单或工单后会出现在这里。" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>单号</TableHead>
                  <TableHead>摘要</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.timeline.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(t.createdAt)}</TableCell>
                    <TableCell>{t.eventType}</TableCell>
                    <TableCell>{t.refNo}</TableCell>
                    <TableCell>{t.summary.replace("工单审核", "工单完工").replace("合同审核", "合同下单")}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(t.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
