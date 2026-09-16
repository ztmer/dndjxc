import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { SETTLEMENT, label } from "@/lib/labels";
import { money } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { EmptyHint } from "@/components/empty-hint";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q, page: pageRaw } = await searchParams;
  const where = q
      ? {
          OR: [
            { name: { contains: q } },
            { contactName: { contains: q } },
            { phone: { contains: q } },
            { address: { contains: q } },
            { code: { contains: q } },
            { taxNo: { contains: q } },
          ],
        }
      : undefined;
  const total = await prisma.customer.count({ where });
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { arEntries: true, sites: true },
    skip,
    take,
  });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="客户档案" description="点开客户即可看上次工单、更换件、未收款和保修。" actionHref="/customers/new" actionLabel="新建客户" />
      <FilterBar action="/customers" q={q} placeholder="名称 / 联系人 / 电话 / 地址 / 编码" />
      {rows.length === 0 ? (
        <EmptyHint title="没有客户" hint="先建一个单位客户或散客。" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>编码</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead>电话</TableHead>
                <TableHead>地址</TableHead>
                <TableHead>上门地点</TableHead>
                <TableHead>结算</TableHead>
                <TableHead className="text-right">未收</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const unpaid = c.arEntries.filter((a) => !a.voided).reduce((s, a) => s + Number(a.totalAmt) - Number(a.receivedAmt), 0);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link className="font-medium text-primary" href={`/customers/${c.id}`}>
                        {c.code}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {c.name}
                      {c.isWalkIn ? (
                        <Badge variant="secondary" className="ml-2">
                          散客
                        </Badge>
                      ) : null}
                      {c.needInvoice ? (
                        <Badge variant="outline" className="ml-2">
                          开票
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{c.contactName || "—"}</TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell className="max-w-48 truncate">{c.address || "—"}</TableCell>
                    <TableCell>{c.sites.length ? c.sites.map((s) => s.name).join("、") : "—"}</TableCell>
                    <TableCell>{label(SETTLEMENT, c.settlement)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(unpaid)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <ListPager path="/customers" page={page} total={total} query={{ q }} />
        </Card>
      )}
    </div>
  );
}
