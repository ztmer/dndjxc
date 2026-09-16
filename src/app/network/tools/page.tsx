import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { NetworkToolsPanel } from "@/components/forms/network-tools-panel";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NetworkToolsPage({ searchParams }: { searchParams: Promise<{ customerId?: string; host?: string }> }) {
  const { customerId, host } = await searchParams;
  const customer = customerId
    ? await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, name: true, netDevices: { select: { ip: true, name: true }, take: 8 } },
      })
    : null;
  const defaultHost = host || customer?.netDevices.find((d) => d.ip)?.ip || "";
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="网络调试工具"
        description={customer ? `${customer.name} · 从客户设备带出管理 IP` : "Ping、DNS、子网计算、现场常用命令"}
      />
      {customer ? (
        <p className="text-sm">
          <Link className="text-primary underline-offset-4 hover:underline" href={`/customers/${customer.id}#network`}>
            回到客户网络资料
          </Link>
          {customer.netDevices.length
            ? ` · 设备 IP：${customer.netDevices
                .filter((d) => d.ip)
                .map((d) => d.ip)
                .join("、")}`
            : ""}
        </p>
      ) : null}
      <NetworkToolsPanel defaultHost={defaultHost} />
    </div>
  );
}
