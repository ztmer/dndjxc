import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { SETTLEMENT, label } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MobileCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.customer.findUnique({
    where: { id },
    include: {
      sites: true,
      workOrders: { orderBy: { createdAt: "desc" }, take: 8 },
      buildConfigs: { orderBy: { createdAt: "desc" }, take: 8 },
      timeline: { orderBy: { createdAt: "desc" }, take: 20 },
      arEntries: true,
    },
  });
  if (!c) notFound();
  const unpaid = c.arEntries.filter((a) => !a.voided).reduce((s, a) => s + Number(a.totalAmt) - Number(a.receivedAmt), 0);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">{c.name}</h1>
        <p className="text-sm text-muted-foreground">
          {c.code} · {label(SETTLEMENT, c.settlement)}
          {c.address ? ` · ${c.address}` : ""}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {c.phone ? (
          <a href={`tel:${c.phone}`} className={cn(buttonVariants(), "h-11")}>
            打电话 {c.phone}
          </a>
        ) : (
          <span className={cn(buttonVariants({ variant: "outline" }), "h-11 justify-center opacity-50")}>无电话</span>
        )}
        <Link className={cn(buttonVariants({ variant: "outline" }), "h-11")} href={`/m/work-orders/new?customerId=${c.id}`}>
          开工单
        </Link>
        <Link className={cn(buttonVariants({ variant: "outline" }), "h-11")} href={`/m/builds/new?customerId=${c.id}`}>
          组装配置
        </Link>
      </div>
      {unpaid > 0.009 ? (
        <Link className={cn(buttonVariants({ variant: "outline" }), "h-11")} href={`/m/receipts/new?customerId=${c.id}`}>
          收款 · 未收 ¥{money(unpaid)}
        </Link>
      ) : (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">未收款 ¥0.00</CardTitle>
          </CardHeader>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近工单</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {c.workOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有工单</p>
          ) : (
            c.workOrders.map((w) => (
              <Link key={w.id} href={`/m/work-orders/${w.id}`} className="flex justify-between rounded-lg border px-3 py-2 text-sm">
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
          <CardTitle className="text-base">最近组装配置</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {c.buildConfigs.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有配置单</p>
          ) : (
            c.buildConfigs.map((b) => (
              <Link key={b.id} href={`/m/builds/${b.id}`} className="flex justify-between rounded-lg border px-3 py-2 text-sm">
                <span>
                  {b.docNo} · {b.modelName}
                </span>
                <StatusBadge status={b.status} />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">时间线</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {c.timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有往来记录</p>
          ) : (
            c.timeline.map((t) => (
              <div key={t.id} className="rounded-lg border px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</p>
                <p>
                  {t.refNo} · {t.summary.replace("工单审核", "工单完工").replace("合同审核", "合同下单")}
                </p>
                <p className="tabular-nums">¥{money(t.amount)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
