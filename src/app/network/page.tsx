import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NetworkHomePage() {
  const [devices, accounts] = await Promise.all([
    prisma.customerNetDevice.count(),
    prisma.customerBroadband.count(),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="客户网络" description="宽带账号、设备、IP 与客户档案同一份数据，改一处两边都更新。" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/network/devices", title: "网络设备", desc: `${devices} 台 · 交换机/路由/光猫` },
          { href: "/network/ips", title: "IP 扫描", desc: "扫局域网，写入所选客户资料" },
          { href: "/network/tools", title: "调试工具", desc: "Ping、DNS、子网、常用命令" },
        ].map((x) => (
          <Link key={x.href} href={x.href}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{x.title}</CardTitle>
                <CardDescription>{x.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">宽带账号 {accounts} 条，点开客户档案即可改。接口：/api/customers/客户id/network</p>
    </div>
  );
}
