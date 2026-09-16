import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { money } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { EmptyHint } from "@/components/empty-hint";
import { cn } from "@/lib/utils";
import {
  CalendarClockIcon,
  WalletIcon,
  ClipboardListIcon,
  TriangleAlertIcon,
  ShoppingCartIcon,
  WrenchIcon,
  CpuIcon,
  ScanLineIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);

  const [visits, unpaid, openPr, low, visitRows, warranty, draftSales, draftWo, pendingSt, products] = await Promise.all([
    prisma.workOrder.count({
      where: { appointedAt: { gte: today, lt: tomorrow }, status: { not: "voided" } },
    }),
    prisma.arEntry.findMany({
      where: { voided: false },
      select: { customerId: true, totalAmt: true, receivedAmt: true, customer: { select: { name: true } } },
    }),
    prisma.purchaseRequest.findMany({
      where: { status: "open" },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.stockBalance.findMany({ include: { product: { select: { name: true, lowStock: true, trackSerial: true } } } }),
    prisma.workOrder.findMany({
      where: { appointedAt: { gte: today, lt: tomorrow }, status: { not: "voided" } },
      include: { customer: true, site: true },
      orderBy: { appointedAt: "asc" },
    }),
    prisma.project.findMany({
      where: { warrantyEnd: { gte: today, lte: in30 } },
      include: { contract: { include: { customer: true } } },
      take: 8,
    }),
    prisma.salesOrder.count({ where: { status: "draft" } }),
    prisma.workOrder.count({ where: { status: "draft" } }),
    prisma.statement.findMany({
      where: { status: "draft" },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.product.findMany({ select: { id: true, name: true } }),
  ]);

  const unpaidOpen = unpaid.filter((a) => Number(a.totalAmt) > Number(a.receivedAmt));
  const unpaidAmt = unpaidOpen.reduce((s, a) => s + Number(a.totalAmt) - Number(a.receivedAmt), 0);
  const byCustomer = new Map<string, { name: string; amt: number; id: string }>();
  for (const a of unpaidOpen) {
    const cur = byCustomer.get(a.customerId) ?? { name: a.customer.name, amt: 0, id: a.customerId };
    cur.amt += Number(a.totalAmt) - Number(a.receivedAmt);
    byCustomer.set(a.customerId, cur);
  }
  const unpaidCustomers = [...byCustomer.values()].sort((a, b) => b.amt - a.amt).slice(0, 8);
  const lowStock = low.filter((b) => Number(b.qty) <= Number(b.product.lowStock) && Number(b.product.lowStock) > 0);
  const pmap = Object.fromEntries(products.map((p) => [p.id, p.name]));

  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
  const dateLabel = new Intl.DateTimeFormat("zh-CN", { dateStyle: "full" }).format(now);

  const stats = [
    {
      href: "/work-orders",
      label: "今日上门",
      value: String(visits),
      hint: "预约在今天的工单",
      icon: CalendarClockIcon,
      stripe: "linear-gradient(90deg,#3b82f6,#60a5fa)",
      iconBg: "bg-[#eff6ff] text-[#2563eb]",
    },
    {
      href: "/receipts",
      label: "待收款",
      value: `¥${money(unpaidAmt)}`,
      hint: `${unpaidCustomers.length} 家客户未结清`,
      icon: WalletIcon,
      stripe: "linear-gradient(90deg,#10b981,#34d399)",
      iconBg: "bg-[#ecfdf5] text-[#059669]",
    },
    {
      href: "/statements",
      label: "待对账",
      value: String(pendingSt.length),
      hint: "已生成未确认的对账单",
      icon: ClipboardListIcon,
      stripe: "linear-gradient(90deg,#8b5cf6,#a78bfa)",
      iconBg: "bg-[#f5f3ff] text-[#7c3aed]",
    },
    {
      href: "/purchase-requests",
      label: "待采购",
      value: String(openPr.length),
      hint: "缺货需向批发商拿货",
      icon: TriangleAlertIcon,
      stripe: "linear-gradient(90deg,#f59e0b,#fbbf24)",
      iconBg: "bg-[#fffbeb] text-[#d97706]",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="shop-page-banner">
        <div className="min-w-0">
          <p className="text-[18px] font-bold">{greet}，店里看板</p>
          <p className="mt-1 text-xs text-white/75">{dateLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="shop-wb-btn" href="/sales/new">
            <ShoppingCartIcon className="size-3.5" />
            柜台开单
          </Link>
          <Link className="shop-wb-btn" href="/work-orders/new">
            <WrenchIcon className="size-3.5" />
            开工单
          </Link>
          <Link className="shop-wb-btn" href="/builds/new">
            <CpuIcon className="size-3.5" />
            组装配置
          </Link>
          <Link className="shop-wb-btn" href="/serials">
            <ScanLineIcon className="size-3.5" />
            查串号
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="h-full py-4" style={{ ["--card-stripe" as string]: s.stripe }}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <CardDescription>{s.label}</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{s.value}</CardTitle>
                  </div>
                  <div className={cn("flex size-9 items-center justify-center rounded-lg", s.iconBg)}>
                    <Icon className="size-4" />
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">{s.hint}</CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      {(draftSales > 0 || draftWo > 0) && (
        <div className="flex flex-wrap gap-2">
          {draftSales > 0 ? <Badge variant="secondary">草稿销售 {draftSales}</Badge> : null}
          {draftWo > 0 ? <Badge variant="secondary">草稿工单 {draftWo}</Badge> : null}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card style={{ ["--ch-bar" as string]: "#2b5ba8" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="shop-ch-bar" />
              今日上门
            </CardTitle>
            <CardDescription>预约今天的维修/施工</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {visitRows.length === 0 ? (
              <EmptyHint title="今天没有预约上门" hint="在工单里填预约时间后会出现在这里。" />
            ) : (
              visitRows.map((w) => (
                <Link
                  key={w.id}
                  href={`/work-orders/${w.id}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                >
                  <span>
                    {w.customer.name}
                    {w.site ? ` · ${w.site.name}` : ""}
                  </span>
                  <span className="text-muted-foreground">{w.appointedAt ? formatDateTime(w.appointedAt) : w.docNo}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card style={{ ["--ch-bar" as string]: "#10b981" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="shop-ch-bar" />
              待收款客户
            </CardTitle>
            <CardDescription>现金未收或月结/年结未核销</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {unpaidCustomers.length === 0 ? (
              <EmptyHint title="没有未收款" />
            ) : (
              unpaidCustomers.map((c) => (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                >
                  <span>{c.name}</span>
                  <span className="font-medium tabular-nums">¥{money(c.amt)}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>待采购</CardTitle>
            <CardDescription>开单缺货时自动生成，入库后才能再开单出库</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {openPr.length === 0 ? (
              <EmptyHint title="没有待采购" />
            ) : (
              openPr.map((p) => (
                <Link
                  key={p.id}
                  href={`/purchase/new?pr=${p.id}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                >
                  <span>
                    {p.docNo} ← {p.sourceNo}
                  </span>
                  <span className="text-muted-foreground">{p.lines.map((l) => pmap[l.productId] ?? "").join("、")}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>30 天内质保到期</CardTitle>
            <CardDescription>工程验收后的合同质保</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {warranty.length === 0 ? (
              <EmptyHint title="近期没有到期质保" />
            ) : (
              warranty.map((p) => (
                <Link
                  key={p.id}
                  href="/projects"
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                >
                  <span>
                    {p.contract.customer.name} · {p.name}
                  </span>
                  <span className="text-muted-foreground">{p.warrantyEnd ? formatDateTime(p.warrantyEnd).slice(0, 10) : ""}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>库存预警</CardTitle>
            <CardDescription>结存低于商品资料里的预警数量</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {lowStock.length === 0 ? (
              <EmptyHint title="没有偏低库存" />
            ) : (
              lowStock.slice(0, 8).map((b) => (
                <Link
                  key={b.id}
                  href={`/stock#p-${b.productId}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                >
                  <span>
                    {b.product.name}
                    {b.product.trackSerial ? " · 串号" : ""}
                  </span>
                  <span className="text-muted-foreground">
                    {Number(b.qty)} / 预警 {Number(b.product.lowStock)}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>待确认对账单</CardTitle>
            <CardDescription>确认后才能收款核销</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {pendingSt.length === 0 ? (
              <EmptyHint title="没有待确认对账单" />
            ) : (
              pendingSt.map((s) => (
                <Link
                  key={s.id}
                  href={`/statements/${s.id}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                >
                  <span>
                    {s.customer.name} · {s.docNo}
                  </span>
                  <span className="font-medium tabular-nums">¥{money(s.totalAmt)}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
