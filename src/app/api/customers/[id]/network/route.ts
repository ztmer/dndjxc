import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** 客户网络档案接口：客户页与网络页同一数据源。 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请重新登录" }, { status: 401 });
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { id: true, code: true, name: true, phone: true, address: true },
  });
  if (!customer) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
    const [accounts, devices, ips, sites, wifis] = await Promise.all([
    prisma.customerBroadband.findMany({ where: { customerId: id }, orderBy: { updatedAt: "desc" } }),
    prisma.customerNetDevice.findMany({ where: { customerId: id }, orderBy: { updatedAt: "desc" } }),
    prisma.customerIpAddr.findMany({ where: { customerId: id }, orderBy: { address: "asc" } }),
    prisma.site.findMany({ where: { customerId: id }, select: { id: true, name: true, address: true } }),
    prisma.customerWifi.findMany({ where: { customerId: id }, orderBy: { updatedAt: "desc" } }),
  ]);
  return NextResponse.json({ customer, sites, accounts, devices, ips, wifis });
}
