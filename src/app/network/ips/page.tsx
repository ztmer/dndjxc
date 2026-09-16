import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { LanScanPanel } from "@/components/forms/lan-scan-panel";
import { CustomerQueryFilter } from "@/components/customer-query-filter";

export const dynamic = "force-dynamic";

export default async function NetworkIpsPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, phone: true }, take: 300 });
  const sites = customerId ? await prisma.site.findMany({ where: { customerId }, select: { id: true, name: true } }) : [];
  const selected = customers.find((c) => c.id === customerId);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="IP 扫描" description="选客户后扫描，结果写入该客户资料。本页不留清单；再扫同一客户只补充新地址。" />
      <CustomerQueryFilter
        action="/network/ips"
        customers={customers}
        customerId={customerId}
        emptyLabel="请选择客户"
        placeholder="输入客户名或电话筛选"
      />
      {selected ? (
        <p className="text-sm">
          将写入{" "}
          <Link className="text-primary underline" href={`/customers/${selected.id}#network`}>
            {selected.name}
          </Link>{" "}
          的客户资料。
        </p>
      ) : null}
      <LanScanPanel customerId={customerId} sites={sites} />
    </div>
  );
}
