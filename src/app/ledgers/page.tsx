import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { qty } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { EmptyHint } from "@/components/empty-hint";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function LedgersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q, page: pageRaw } = await searchParams;
  const where = q
      ? { OR: [{ refNo: { contains: q } }, { product: { name: { contains: q } } }, { product: { code: { contains: q } } }] }
      : undefined;
  const total = await prisma.stockLedger.count({ where });
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.stockLedger.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    include: { product: true },
  });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="库存流水" description="唯一账本。禁止直接改结存。" />
      <FilterBar action="/ledgers" q={q} placeholder="单号 / 商品" />
      {rows.length === 0 ? (
        <EmptyHint title="还没有流水" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>单号</TableHead>
                <TableHead>商品</TableHead>
                <TableHead>变动</TableHead>
                <TableHead>结存</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(r.createdAt)}</TableCell>
                  <TableCell>{r.refNo}</TableCell>
                  <TableCell>{r.product.name}</TableCell>
                  <TableCell className="tabular-nums">{qty(r.qty)}</TableCell>
                  <TableCell className="tabular-nums">{qty(r.balanceAfter)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPager path="/ledgers" page={page} total={total} query={{ q }} />
        </Card>
      )}
    </div>
  );
}
