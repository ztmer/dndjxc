import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { EmptyHint } from "@/components/empty-hint";
import { Card } from "@/components/ui/card";
import { DOC_STATUS } from "@/lib/labels";
import { money } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

const statusOptions = Object.entries(DOC_STATUS).map(([value, label]) => ({ value, label }));

export default async function PurchaseList({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const { q, status, page: pageRaw } = await searchParams;
  const where = {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ docNo: { contains: q } }, { supplier: { name: { contains: q } } }] } : {}),
  };
  const total = await prisma.purchaseReceipt.count({ where });
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.purchaseReceipt.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { supplier: true, lines: true },
    skip,
    take,
  });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="采购入库" description="资料只建一条商品，数量 + 扫唯一 SN。确认入库后才入库存。" actionHref="/purchase/new" actionLabel="新建入库" />
      <FilterBar action="/purchase" q={q} status={status} statusOptions={statusOptions} placeholder="单号 / 供应商" />
      {rows.length === 0 ? (
        <EmptyHint title="还没有采购入库" hint="从待采购点入库，或直接新建。" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单号</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link className="font-medium text-primary" href={`/purchase/${r.id}`}>
                      {r.docNo}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(r.bizDate)}</TableCell>
                  <TableCell>{r.supplier?.name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(r.lines.reduce((s, l) => s + Number(l.qty) * Number(l.cost), 0))}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPager path="/purchase" page={page} total={total} query={{ q, status }} />
        </Card>
      )}
    </div>
  );
}
