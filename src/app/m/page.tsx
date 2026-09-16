import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { pad2 } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpenIcon, CpuIcon, ScanLineIcon, TagIcon, UsersIcon, WalletIcon, WrenchIcon } from "lucide-react";

export const dynamic = "force-dynamic";

function clock(d: Date | null) {
  if (!d) return "--:--";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default async function MobileHomePage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [visits, unpaid, visitRows] = await Promise.all([
    prisma.workOrder.count({
      where: { appointedAt: { gte: today, lt: tomorrow }, status: { not: "voided" } },
    }),
    prisma.arEntry.findMany({
      where: { voided: false },
      select: { totalAmt: true, receivedAmt: true, customerId: true },
    }),
    prisma.workOrder.findMany({
      where: { appointedAt: { gte: today, lt: tomorrow }, status: { not: "voided" } },
      include: { customer: true, site: true },
      orderBy: { appointedAt: "asc" },
      take: 8,
    }),
  ]);
  const unpaidOpen = unpaid.filter((a) => Number(a.totalAmt) > Number(a.receivedAmt));
  const unpaidAmt = unpaidOpen.reduce((s, a) => s + Number(a.totalAmt) - Number(a.receivedAmt), 0);
  const unpaidCustomers = new Set(unpaidOpen.map((a) => a.customerId)).size;

  const shortcuts = [
    { href: "/m/work-orders/new", label: "开工单", icon: WrenchIcon, primary: true },
    { href: "/m/products/new", label: "建商品", icon: TagIcon, primary: false },
    { href: "/m/builds/new", label: "组装配置", icon: CpuIcon, primary: false },
    { href: "/m/customers", label: "查客户", icon: UsersIcon, primary: false },
    { href: "/m/serials", label: "查串号", icon: ScanLineIcon, primary: false },
    { href: "/m/knowledge", label: "知识库", icon: BookOpenIcon, primary: false },
    { href: "/m/receipts/new", label: "收款", icon: WalletIcon, primary: false },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Link href="#today-visits">
          <Card className="min-h-[88px]">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">今日上门</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[28px] font-semibold tabular-nums leading-8">{visits}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{visits ? "预约今天" : "没有预约"}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/m/receipts/new">
          <Card className="min-h-[88px]">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">待收款</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[28px] font-semibold tabular-nums leading-8">¥{money(unpaidAmt)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {unpaidCustomers ? `${unpaidCustomers} 家未结清` : "没有未收"}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {shortcuts.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className={cn(
                "flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-medium",
                s.primary ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
              )}
            >
              <Icon className="size-6" />
              {s.label}
            </Link>
          );
        })}
      </div>
      <div id="today-visits">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">今日上门</h2>
          <Link href="/m/work-orders" className="flex h-11 items-center text-[13px] text-primary">
            全部
          </Link>
        </div>
        {visitRows.length === 0 ? (
          <div className="flex min-h-[120px] flex-col items-start justify-center gap-2 rounded-xl border bg-card px-4 py-6">
            <p className="font-medium">今天没有预约上门</p>
            <p className="text-sm text-muted-foreground">到了现场也可以先开工单，回来再补预约时间。</p>
            <Link className={cn(buttonVariants(), "h-11")} href="/m/work-orders/new">
              开工单
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {visitRows.map((w) => (
              <Link key={w.id} href={`/m/work-orders/${w.id}`} className="flex min-h-[72px] items-center gap-3 rounded-xl border bg-card px-3 py-3">
                <div className="w-14 shrink-0">
                  <p className="text-[15px] font-semibold tabular-nums">{clock(w.appointedAt)}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{w.docNo}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">
                    {w.customer.name}
                    {w.site?.name ? ` · ${w.site.name}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{w.visitType === "onsite" ? "上门" : w.visitType === "outsource" ? "委外" : "到店"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
