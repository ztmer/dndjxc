import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyHint } from "@/components/empty-hint";
import { FilterBar } from "@/components/filter-bar";
import { CustomerQueryFilter } from "@/components/customer-query-filter";
import { NetDeviceForm } from "@/components/forms/customer-network-forms";
import { label, NET_DEVICE_KIND, NET_VENDOR } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function NetworkDevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; customerId?: string }>;
}) {
  const { q, customerId } = await searchParams;
  const where = {
    AND: [
      customerId ? { customerId } : {},
      q
        ? {
            OR: [{ name: { contains: q } }, { ip: { contains: q } }, { model: { contains: q } }, { serial: { contains: q } }, { location: { contains: q } }],
          }
        : {},
    ],
  };
  const [rows, customers] = await Promise.all([
    prisma.customerNetDevice.findMany({
      where,
      include: { customer: { select: { id: true, name: true, code: true } }, site: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, phone: true }, take: 300 }),
  ]);
  const sites = customerId
    ? await prisma.site.findMany({ where: { customerId }, select: { id: true, name: true } })
    : [];
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="网络设备" description="改完会同步到对应客户资料。" />
      <div className="flex max-w-3xl flex-wrap items-start gap-2">
        <CustomerQueryFilter action="/network/devices" customers={customers} customerId={customerId} extra={{ q }} />
        <FilterBar action="/network/devices" q={q} placeholder="名称 / IP / 型号 / 序列号" hidden={customerId ? { customerId } : undefined} />
      </div>
      {rows.length === 0 ? (
        <EmptyHint title="还没有网络设备" hint="在客户档案里添加，或下方选定客户后新增。" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>客户</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>厂商/型号</TableHead>
                <TableHead>位置</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link className="text-primary" href={`/customers/${d.customer.id}#network`}>
                      {d.customer.name}
                    </Link>
                  </TableCell>
                  <TableCell>{d.name}</TableCell>
                  <TableCell>{label(NET_DEVICE_KIND, d.kind)}</TableCell>
                  <TableCell className="font-mono text-sm">{d.ip || "—"}</TableCell>
                  <TableCell>
                    {d.vendor ? label(NET_VENDOR, d.vendor) : ""} {d.model}
                  </TableCell>
                  <TableCell>
                    {d.site?.name ? `${d.site.name} ` : ""}
                    {d.location}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {customerId ? (
        <Card className="p-4">
          <p className="mb-3 text-sm font-medium">为当前客户添加设备</p>
          <NetDeviceForm customerId={customerId} sites={sites} />
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">先筛选客户，才能在本页直接添加设备。</p>
      )}
    </div>
  );
}
