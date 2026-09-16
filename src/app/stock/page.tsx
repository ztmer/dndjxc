import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { qty } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyHint } from "@/components/empty-hint";
import { StockJump } from "@/components/stock-jump";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function StockPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageRaw } = await searchParams;
  const total = await prisma.stockBalance.count();
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.stockBalance.findMany({
    include: { product: true, warehouse: true },
    orderBy: { productId: "asc" },
    skip,
    take,
  });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="门店库存" description="看还有多少货。每一台的唯一 SN 在「SN 查询」。只有流水能改结存。" />
      <StockJump />
      {rows.length === 0 ? (
        <EmptyHint title="还没有库存" hint="采购入库或其它入库后会出现。" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>仓库</TableHead>
                <TableHead>编码</TableHead>
                <TableHead>商品</TableHead>
                <TableHead>类型</TableHead>
                <TableHead className="text-right">结存</TableHead>
                <TableHead className="text-right">预警</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const low = Number(r.product.lowStock) > 0 && Number(r.qty) <= Number(r.product.lowStock);
                return (
                  <TableRow key={r.id} id={`p-${r.productId}`}>
                    <TableCell>{r.warehouse.name}</TableCell>
                    <TableCell>{r.product.code}</TableCell>
                    <TableCell>{r.product.name}</TableCell>
                    <TableCell>{r.product.trackSerial ? "串号" : "数量"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {qty(r.qty)} {r.product.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {low ? <Badge variant="destructive">偏低</Badge> : qty(r.product.lowStock)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <ListPager path="/stock" page={page} total={total} />
        </Card>
      )}
    </div>
  );
}
